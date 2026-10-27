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
import { captureFillCases } from './fill-capture.mjs';

const exec = promisify(execFile);
const scriptDirectory = fileURLToPath(new URL('./', import.meta.url));
const sketchtool = '/Applications/Sketch.app/Contents/MacOS/sketchtool';
const task = (name) => join(scriptDirectory, 'tasks', `${name}.js`);
const output = resolve(process.env.KERF_SKETCH_BUTTON_OUTPUT ?? defaultOutput);
const paths = {
  fixturesPath: join(output, 'fixtures.json'),
  fillLayoutPath: join(output, 'fill-layout.json'),
  fillDocumentPath: join(output, 'Button-Fill-Test.sketch'),
  fillExportsPath: join(output, 'fill-exports'),
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
    fill: 'fill-verification.json',
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

function iconGeometry(icon) {
  if (!icon) return null;
  const parts = [
    ...icon.svg.matchAll(
      /<(?:path|line|polyline|polygon|rect|circle|ellipse)\b[^>]*>/g,
    ),
  ].map(([tag]) =>
    tag.replace(/\s+(?:stroke|fill|color)="[^"]*"/g, '').replace(/\s+/g, ' '),
  );
  assert.ok(parts.length, 'Icon SVG has no vector geometry.');
  const structure = parts.map((part) => {
    const tag = part.match(/^<([a-z]+)/)?.[1];
    if (tag === 'path') {
      const data = part.match(/\bd="([^"]*)"/)?.[1];
      assert.ok(data, 'Icon path has no SVG data.');
      return `path:${[...data.matchAll(/[a-zA-Z]/g)].map(([command]) => command).join('')}`;
    }
    return `${tag}:${[...part.matchAll(/\s([a-z][a-z0-9-]*)=/g)]
      .map(([, name]) => name)
      .sort()
      .join(',')}`;
  });
  return {
    parts,
    structure,
    hash: createHash('sha256').update(parts.join('')).digest('hex'),
    sourceHash: createHash('sha256').update(icon.svg).digest('hex'),
  };
}

async function readIdentityManifest() {
  return readFile(paths.identitiesPath, 'utf8').then(
    (content) => JSON.parse(content),
    (error) => {
      if (error.code === 'ENOENT') return { version: 1, variants: {} };
      throw error;
    },
  );
}

async function changedIconFixtures() {
  const fixtures = JSON.parse(await readFile(paths.fixturesPath, 'utf8'));
  const previous = await readIdentityManifest();
  const changed = [];
  for (const fixture of fixtures) {
    const before = previous.variants[fixture.id];
    if (!before) continue;
    const next = iconGeometry(fixture.layout.icon);
    if (
      (next?.hash ?? null) === before.iconGeometryHash &&
      (!before.iconSourceHash ||
        (next?.sourceHash ?? null) === before.iconSourceHash)
    )
      continue;
    assert.ok(
      before.iconGeometryParts && next,
      `${fixture.id} added/removed an icon or lacks a geometry baseline`,
    );
    assert.equal(
      next.parts.length,
      before.iconGeometryParts.length,
      `${fixture.id} added/removed vector paths; explicit ID mapping is required`,
    );
    assert.deepEqual(
      next.structure,
      before.iconStructure,
      `${fixture.id} changed path types or commands; explicit ID mapping is required`,
    );
    if (next.hash !== before.iconGeometryHash)
      assert.notDeepEqual(
        next.parts.toSorted(),
        before.iconGeometryParts.toSorted(),
        `${fixture.id} reordered vector paths; consumer path overrides must not remap`,
      );
    const changedByStructure = new Map();
    next.parts.forEach((part, index) => {
      if (part === before.iconGeometryParts[index]) return;
      const signature = next.structure[index];
      const count = (changedByStructure.get(signature) ?? 0) + 1;
      assert.ok(
        count <= 1,
        `${fixture.id} changed multiple ${signature} paths; explicit ID mapping is required to distinguish edits from reordering`,
      );
      changedByStructure.set(signature, count);
    });
    changed.push(fixture.id);
  }
  return changed;
}

async function updateIdentityManifest(libraryPath) {
  const fixtures = JSON.parse(await readFile(paths.fixturesPath, 'utf8'));
  const report = JSON.parse(
    await readFile(join(output, 'layout-report.json'), 'utf8'),
  );
  const previous = await readIdentityManifest();
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
    const icon = iconGeometry(fixture.layout.icon);
    const identity = {
      name: current.name,
      id: current.id,
      symbolId: current.symbolId,
      layers: identityTree(current.layers),
      iconGeometryHash: icon?.hash ?? null,
      iconSourceHash: icon?.sourceHash ?? null,
      iconGeometryParts: icon?.parts ?? null,
      iconStructure: icon?.structure ?? null,
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
  for (const directory of [
    'exports',
    'consumer-exports',
    'resize-exports',
    'fill-exports',
  ])
    await mkdir(join(output, directory), { recursive: true });
}

const command = process.argv[2];
if (
  ![
    'capture',
    'check-source',
    'generate',
    'verify',
    'render',
    'fill',
    'all',
  ].includes(command)
)
  throw new Error(
    'Usage: npm run sketch:button -- capture|check-source|generate|verify|render|fill|all',
  );
await prepareOutput();
if (command === 'capture' || command === 'all') await captureButtons(output);
if (command === 'fill' || command === 'all') await captureFillCases(output);
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
  const hasIdentityManifest = await access(paths.identitiesPath).then(
    () => true,
    () => false,
  );
  const iconGeometryUpdates = hasIdentityManifest
    ? await changedIconFixtures()
    : [];
  if (seedExisting) await copyFile(paths.libraryPath, stagingPath);
  const originalDocumentId = seedExisting
    ? (
        await exec('python3', [
          join(scriptDirectory, 'document-id.py'),
          paths.libraryPath,
        ])
      ).stdout.trim()
    : null;
  try {
    await runNative(['build', 'layout'], {
      ...paths,
      libraryPath: stagingPath,
      seedExisting,
      hasIdentityManifest,
      iconGeometryUpdates,
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
if (command === 'fill' || command === 'all') await runNative(['fill']);
if (command === 'render' || command === 'all') await renderComparisons();
if (command === 'fill' || command === 'all') {
  await exec(process.execPath, [
    join(scriptDirectory, 'fill-compare.mjs'),
    output,
  ]);
  console.log('Real Button(fill:true) and native fill-width checks passed.');
}
