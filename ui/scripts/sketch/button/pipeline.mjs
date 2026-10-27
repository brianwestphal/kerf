import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { requireExistingSketchProcess } from '../check-runner-process.mjs';
import { runSketchJob } from '../runner.mjs';
import { captureButtons, defaultOutput } from './capture.mjs';

const exec = promisify(execFile);
const scriptDirectory = fileURLToPath(new URL('./', import.meta.url));
const sketchtool = '/Applications/Sketch.app/Contents/MacOS/sketchtool';
const task = (name) => join(scriptDirectory, 'tasks', `${name}.js`);
const output = resolve(process.env.KERF_SKETCH_BUTTON_OUTPUT ?? defaultOutput);
const paths = {
  fixturesPath: join(output, 'fixtures.json'),
  libraryPath: join(output, 'Kerf-Button.sketch'),
  consumerPath: join(output, 'Button-Consumer-Test.sketch'),
  resizingPath: join(output, 'Button-Resizing-Test.sketch'),
  exportsPath: join(output, 'exports'),
  consumerExportsPath: join(output, 'consumer-exports'),
  resizeExportsPath: join(output, 'resize-exports'),
};

async function processIds() {
  const { stdout } = await exec('/bin/ps', ['-axo', 'pid=,comm=']);
  return stdout
    .split('\n')
    .filter((line) => line.endsWith('/Sketch.app/Contents/MacOS/Sketch'))
    .map((line) => Number(line.trim().split(/\s+/)[0]))
    .sort((a, b) => a - b);
}

async function verifySource() {
  const fixtures = JSON.parse(await readFile(paths.fixturesPath, 'utf8'));
  assert.equal(fixtures.length, 6, 'Expected six Button captures.');
  assert.equal(new Set(fixtures.map((fixture) => fixture.id)).size, 6);
  for (const fixture of fixtures) {
    assert.match(fixture.svg, /<svg\b/);
    assert.doesNotMatch(
      fixture.svg,
      /<image\b/i,
      `${fixture.id} contains a bitmap`,
    );
    assert.ok(
      fixture.svg.includes('<text'),
      `${fixture.id} lost editable text`,
    );
    assert.equal(fixture.height, 44);
    assert.equal(fixture.layout.height, 44);
    assert.equal(fixture.layout.fontSize, 16);
    assert.equal(fixture.layout.radius, 12);
    assert.equal(fixture.layout.gap, 8);
    assert.equal(fixture.layout.alignItems, 'center');
    assert.equal(fixture.layout.justifyContent, 'center');
    assert.equal(fixture.layout.whiteSpace, 'nowrap');
    assert.equal(
      fixture.layout.icon ? fixture.layout.icon.width : 0,
      fixture.id.startsWith('icon-brand') ? 16 : 0,
    );
    assert.ok(Math.abs(fixture.width - fixture.layout.width) < 1);
  }
  console.log(
    'Six production Button captures passed browser-only source checks.',
  );
}

async function runNative(names, parameters = paths) {
  await access(sketchtool).catch(() => {
    throw new Error(
      'Native verification unavailable: install and license Sketch before running this command.',
    );
  });
  const before = requireExistingSketchProcess(await processIds());
  const reports = {
    build: 'build-report.json',
    layout: 'layout-report.json',
    verify: 'verification.json',
    resize: 'resizing-verification.json',
  };
  let nativePid;
  for (const name of names) {
    const status = await runSketchJob({
      task: task(name),
      parameters,
      timeoutMs: 180_000,
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
    if (nativePid !== undefined) assert.equal(status.processId, nativePid);
    nativePid = status.processId;
    await writeFile(
      join(output, reports[name]),
      `${JSON.stringify(status.result, null, 2)}\n`,
    );
    console.log(
      `${name}: native cleanup acknowledged in Sketch PID ${nativePid}`,
    );
  }
  assert.deepEqual(await processIds(), before, 'Sketch process list changed.');
}

async function renderComparisons() {
  await exec(process.execPath, [join(scriptDirectory, 'compare.mjs'), output]);
  await exec(process.execPath, [
    join(scriptDirectory, 'resize-review.mjs'),
    output,
  ]);
  console.log('Browser/native comparison and 30 resizing checks passed.');
}

async function prepareOutput() {
  await mkdir(output, { recursive: true });
  for (const directory of ['exports', 'consumer-exports', 'resize-exports'])
    await mkdir(join(output, directory), { recursive: true });
}

const command = process.argv[2];
if (
  !['capture', 'check-source', 'generate', 'verify', 'render', 'all'].includes(
    command,
  )
)
  throw new Error(
    'Usage: npm run sketch:button -- capture|check-source|generate|verify|render|all',
  );
await prepareOutput();
if (command === 'capture' || command === 'all') await captureButtons(output);
if (command === 'capture' || command === 'check-source') await verifySource();
if (command === 'generate' || command === 'all') {
  await verifySource();
  // A new Sketch document saving over an existing .sketch file can open a
  // blocking Save panel. Build to a unique sibling, then atomically replace
  // the published library only after both native jobs finish and clean up.
  const stagingPath = join(output, `.Kerf-Button-${randomUUID()}.sketch`);
  try {
    await runNative(['build', 'layout'], {
      ...paths,
      libraryPath: stagingPath,
    });
  } catch (error) {
    throw new Error(
      `Button generation failed; recover Sketch cleanup before inspecting staged output at ${stagingPath}.`,
      { cause: error },
    );
  }
  await rename(stagingPath, paths.libraryPath);
}
if (command === 'verify' || command === 'all')
  await runNative(['verify', 'resize']);
if (command === 'render' || command === 'all') await renderComparisons();
