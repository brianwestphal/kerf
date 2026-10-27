import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { requireExistingSketchProcess } from './check-runner-process.mjs';
import { defaultStateDirectory, runSketchJob } from './runner.mjs';

const exec = promisify(execFile);
const task = fileURLToPath(
  new URL(
    './runner.sketchplugin/Contents/Sketch/check-task.js',
    import.meta.url,
  ),
);
const processIds = async () => {
  const { stdout } = await exec('/bin/ps', ['-axo', 'pid=,comm=']);
  return stdout
    .split('\n')
    .filter((line) => line.endsWith('/Sketch.app/Contents/MacOS/Sketch'))
    .map((line) => Number(line.trim().split(/\s+/)[0]))
    .sort((a, b) => a - b);
};
const beforeProcesses = requireExistingSketchProcess(await processIds());
const records = [];
for (const mode of ['success', 'failure', 'cancel', 'deadline', 'success']) {
  const controller = new AbortController();
  const before = new Set(
    await readdir(join(defaultStateDirectory, 'jobs')).catch(() => []),
  );
  let timer;
  if (mode === 'cancel')
    timer = setTimeout(
      () => controller.abort(new Error('Intentional check cancellation.')),
      1500,
    );
  let failure;
  try {
    await runSketchJob({
      task,
      parameters: {
        mode: mode === 'cancel' || mode === 'deadline' ? 'hold' : mode,
      },
      signal: controller.signal,
      timeoutMs: mode === 'deadline' ? 2000 : 30_000,
    });
  } catch (error) {
    failure = error.message;
  } finally {
    clearTimeout(timer);
  }
  if (mode === 'success') {
    if (failure)
      throw new Error(`Sketch lifecycle success check failed: ${failure}`);
  } else assert.ok(failure, `${mode} must fail explicitly`);
  const directories = (
    await readdir(join(defaultStateDirectory, 'jobs'))
  ).filter((name) => !before.has(name));
  assert.equal(directories.length, 1);
  const status = JSON.parse(
    await readFile(
      join(defaultStateDirectory, 'jobs', directories[0], 'status.json'),
      'utf8',
    ),
  );
  assert.equal(status.cleanupComplete, true);
  assert.deepEqual(status.documentsAfter.sort(), status.documentsBefore.sort());
  assert.deepEqual(status.librariesAfter.sort(), status.librariesBefore.sort());
  records.push({ mode, failure, ...status });
}
const afterProcesses = await processIds();
// The preflight requires an existing app, so no test-owned app remains open.
assert.deepEqual(afterProcesses, beforeProcesses);
assert.equal(new Set(records.map((r) => r.processId)).size, 1);
const report = { passed: true, beforeProcesses, afterProcesses, records };
const reportPath = resolve(
  process.argv[2] ?? join(defaultStateDirectory, 'lifecycle-check.json'),
);
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(
  `Sketch lifecycle passed: ${records.length} jobs reused PID ${records[0].processId}; documents and Libraries preserved. ${reportPath}`,
);
