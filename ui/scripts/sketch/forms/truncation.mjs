import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { requireExistingSketchProcess } from '../check-runner-process.mjs';
import { runSketchJob } from '../runner.mjs';
import { defaultOutput } from './capture.mjs';

const exec = promisify(execFile);
const output = resolve(process.env.KERF_SKETCH_FORMS_OUTPUT ?? defaultOutput);
const temp = await mkdtemp(join(tmpdir(), 'kerf-split-truncation-'));
const libraryPath = join(temp, 'Kerf-Forms-Probe.sketch');
const exportsPath = join(output, 'truncation-exports');
const consumerPath = join(output, 'Split-Truncation-Consumer.sketch');
const task = fileURLToPath(new URL('./tasks/truncation.js', import.meta.url));
const processIds = async () => {
  const { stdout } = await exec('/bin/ps', ['-axo', 'pid=,comm=']);
  return stdout
    .split('\n')
    .filter((line) => line.endsWith('/Sketch.app/Contents/MacOS/Sketch'))
    .map((line) => Number(line.trim().split(/\s+/)[0]))
    .sort((a, b) => a - b);
};

try {
  const before = requireExistingSketchProcess(await processIds());
  await copyFile(join(output, 'Kerf-Forms.sketch'), libraryPath);
  await mkdir(exportsPath, { recursive: true });
  const status = await runSketchJob({
    task,
    parameters: { libraryPath, exportsPath, consumerPath },
    timeoutMs: 300_000,
  });
  assert.equal(status.cleanupComplete, true);
  assert.deepEqual(
    [...status.documentsAfter].sort(),
    [...status.documentsBefore].sort(),
  );
  assert.deepEqual(
    [...status.librariesAfter].sort(),
    [...status.librariesBefore].sort(),
  );
  assert.deepEqual(await processIds(), before);
  assert.equal(status.result.length, 6);
  assert.ok(status.result.filter((item) => item.reopened).length === 2);
  await writeFile(
    join(output, 'truncation-report.json'),
    `${JSON.stringify({ sketchPid: status.processId, cases: status.result }, null, 2)}\n`,
  );
  console.log(
    'Verified six SplitButton truncation cases in the existing Sketch process.',
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
