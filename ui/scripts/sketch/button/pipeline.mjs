import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises';
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
  identitiesPath: join(output, 'identity-manifest.json'),
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

function identityTree(layers) {
  return layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    type: layer.type,
    children: identityTree(layer.children ?? []),
  }));
}

function identityIds(layers) {
  return layers.map((layer) => ({
    id: layer.id,
    type: layer.type,
    children: identityIds(layer.children),
  }));
}

function iconGeometryHash(icon) {
  if (!icon) return null;
  const geometry = [
    ...icon.svg.matchAll(
      /<(?:path|line|polyline|polygon|rect|circle|ellipse)\b[^>]*>/g,
    ),
  ]
    .map(([tag]) =>
      tag.replace(/\s+(?:stroke|fill|color)="[^"]*"/g, '').replace(/\s+/g, ' '),
    )
    .join('');
  assert.ok(geometry, 'Icon SVG has no vector geometry.');
  return createHash('sha256').update(geometry).digest('hex');
}

async function updateIdentityManifest(libraryPath) {
  const fixtures = JSON.parse(await readFile(paths.fixturesPath, 'utf8'));
  const report = JSON.parse(
    await readFile(join(output, 'layout-report.json'), 'utf8'),
  );
  const previous = await readFile(paths.identitiesPath, 'utf8').then(
    (content) => JSON.parse(content),
    (error) => {
      if (error.code === 'ENOENT') return { version: 1, variants: {} };
      throw error;
    },
  );
  const libraryDocumentId = (
    await exec('python3', [
      join(scriptDirectory, 'document-id.py'),
      libraryPath,
    ])
  ).stdout.trim();
  if (previous.libraryDocumentId)
    assert.equal(
      libraryDocumentId,
      previous.libraryDocumentId,
      'Library document ID changed',
    );
  const variants = { ...previous.variants };
  for (const fixture of fixtures) {
    const current = report.find((entry) => entry.fixtureId === fixture.id);
    assert.ok(current, `Missing identity report for ${fixture.id}`);
    const identity = {
      name: current.name,
      id: current.id,
      symbolId: current.symbolId,
      layers: identityTree(current.layers),
      iconGeometryHash: iconGeometryHash(fixture.layout.icon),
      retired: false,
    };
    const before = previous.variants[fixture.id];
    if (before) {
      assert.equal(identity.id, before.id, `${fixture.id} master ID changed`);
      assert.equal(
        identity.symbolId,
        before.symbolId,
        `${fixture.id} Symbol ID changed`,
      );
      assert.deepEqual(
        identityIds(identity.layers),
        identityIds(before.layers),
        `${fixture.id} layer identities changed`,
      );
      if (before.iconGeometryHash)
        assert.equal(
          identity.iconGeometryHash,
          before.iconGeometryHash,
          `${fixture.id} icon geometry changed; update the existing vector paths in place before publishing`,
        );
    }
    variants[fixture.id] = identity;
  }
  const active = new Set(fixtures.map((fixture) => fixture.id));
  for (const id of Object.keys(variants)) {
    if (!active.has(id)) variants[id] = { ...variants[id], retired: true };
  }
  const temporary = `${paths.identitiesPath}.${randomUUID()}.tmp`;
  await writeFile(
    temporary,
    `${JSON.stringify({ version: 1, libraryDocumentId, variants }, null, 2)}\n`,
  );
  return temporary;
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
  const seedExisting = await access(paths.libraryPath).then(
    () => true,
    () => false,
  );
  if (seedExisting) await copyFile(paths.libraryPath, stagingPath);
  const originalDocumentId = seedExisting
    ? (
        await exec('python3', [
          join(scriptDirectory, 'document-id.py'),
          paths.libraryPath,
        ])
      ).stdout.trim()
    : null;
  const hasIdentityManifest = await access(paths.identitiesPath).then(
    () => true,
    () => false,
  );
  try {
    await runNative(['build', 'layout'], {
      ...paths,
      libraryPath: stagingPath,
      seedExisting,
      hasIdentityManifest,
    });
  } catch (error) {
    throw new Error(
      `Button generation failed; recover Sketch cleanup before inspecting staged output at ${stagingPath}.`,
      { cause: error },
    );
  }
  // Sketch's staged SaveTo and Save operations can assign the copied document
  // a new ID. Imported consumers use that ID as their Library link.
  if (originalDocumentId)
    await exec('python3', [
      join(scriptDirectory, 'document-id.py'),
      stagingPath,
      originalDocumentId,
    ]);
  const identityStagingPath = await updateIdentityManifest(stagingPath);
  await rename(stagingPath, paths.libraryPath);
  await rename(identityStagingPath, paths.identitiesPath);
}
if (command === 'verify' || command === 'all')
  await runNative(['verify', 'resize']);
if (command === 'render' || command === 'all') await renderComparisons();
