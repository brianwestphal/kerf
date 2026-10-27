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
import {
  captureVariants,
  variants as variantCases,
} from './variant-capture.mjs';

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
  assetReportPath: join(output, 'asset-report.json'),
  variantFixturesPath: join(output, 'variant-fixtures.json'),
  variantManifestPath: join(output, 'variant-manifest.json'),
  variantAssetReportPath: join(output, 'variant-asset-report.json'),
  iconPathIdentitiesPath: join(output, 'icon-path-identities.json'),
  variantExportsPath: join(output, 'variant-exports'),
  variantConsumerPath: join(output, 'Button-Variant-Consumer-Test.sketch'),
  variantConsumerExportsPath: join(output, 'variant-consumer-exports'),
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
  const extra = JSON.parse(await readFile(paths.variantFixturesPath, 'utf8'));
  assert.equal(extra.length, variantCases.length * 2);
  assert.equal(new Set(extra.map((fixture) => fixture.id)).size, extra.length);
  for (const fixture of extra) {
    assert.ok(
      variantCases.some((item) => `${item.id}-${fixture.theme}` === fixture.id),
    );
    assert.ok(fixture.layout.width > 0);
    assert.equal(
      fixture.layout.height,
      fixture.props.size === 'compact' ? 33 : 44,
    );
    assert.equal(
      fixture.layout.label === null,
      fixture.props.children === undefined,
    );
    if (fixture.props.children === undefined)
      assert.equal(fixture.layout.width, fixture.layout.height);
    assert.ok(fixture.layout.icon || fixture.layout.label);
    assert.ok(
      !fixture.layout.icon || !fixture.layout.icon.svg.includes('<image'),
    );
  }
  console.log(
    `${extra.length} production visual variants passed source checks.`,
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
    variants: 'variant-build-report.json',
    'verify-variants': 'variant-verification.json',
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
    const result =
      name === 'layout'
        ? status.result.layout
        : name === 'variants'
          ? status.result.variants
          : status.result;
    await writeFile(
      join(output, reports[name]),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    if (name === 'layout')
      await writeFile(
        parameters.assetReportPath,
        `${JSON.stringify(status.result.assets, null, 2)}\n`,
      );
    if (name === 'variants')
      await writeFile(
        parameters.variantAssetReportPath,
        `${JSON.stringify(status.result.assets, null, 2)}\n`,
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
  await exec(process.execPath, [
    join(scriptDirectory, 'variant-compare.mjs'),
    output,
  ]);
  await exec(process.execPath, [
    join(scriptDirectory, 'variant-resize-review.mjs'),
    output,
  ]);
  console.log(
    'Browser/native pilot and variant comparisons, and resizing checks passed.',
  );
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
  return layers
    .filter((layer) => layer.type !== 'ShapePath')
    .map((layer) => ({
      id: layer.id,
      type: layer.type,
      children: identityIds(layer.children),
    }));
}

function nativeIconPaths(layers) {
  const icon = layers.find((layer) => layer.name === 'Icon');
  if (!icon) return [];
  assert.equal(icon.children.length, 1, 'Icon needs one vector group');
  const result = icon.children[0].children;
  assert.ok(result.every((layer) => layer.type === 'ShapePath'));
  return result;
}

async function pathMappings() {
  const data = JSON.parse(await readFile(paths.iconPathIdentitiesPath, 'utf8'));
  assert.equal(data.version, 1);
  return data.fixtures;
}

function validatePathMapping(fixture, mapping, before) {
  const geometry = iconGeometry(fixture.layout.icon);
  if (!geometry) {
    assert.equal(mapping, undefined, `${fixture.id} has keys but no icon`);
    return;
  }
  assert.ok(mapping, `${fixture.id} needs explicit icon path keys`);
  assert.equal(
    mapping.active.length,
    geometry.parts.length,
    `${fixture.id} key count`,
  );
  for (const list of [mapping.active, mapping.retired]) {
    assert.ok(Array.isArray(list));
    for (const key of list) assert.match(key, /^[a-z][a-z0-9-]*$/);
  }
  assert.equal(
    new Set([...mapping.active, ...mapping.retired]).size,
    mapping.active.length + mapping.retired.length,
    `${fixture.id} duplicate/reused key`,
  );
  if (!before?.iconPaths) {
    if (before?.iconGeometryParts)
      assert.deepEqual(
        geometry.parts,
        before.iconGeometryParts,
        `${fixture.id} must migrate baseline keys before structural edits`,
      );
    return;
  }
  const active = new Set(before.iconPaths.active.map(({ key }) => key));
  for (const { key } of before.iconPaths.retired) {
    assert.ok(
      mapping.retired.includes(key),
      `${fixture.id} lost retired key ${key}`,
    );
    assert.ok(
      !mapping.active.includes(key),
      `${fixture.id} reused retired key ${key}`,
    );
  }
  for (const key of active)
    assert.ok(
      mapping.active.includes(key) || mapping.retired.includes(key),
      `${fixture.id} must retire removed key ${key}`,
    );
}

function keyedPathState(fixture, mapping, layers, before) {
  if (!fixture.layout.icon) return null;
  const current = nativeIconPaths(layers);
  assert.equal(
    current.length,
    mapping.active.length,
    `${fixture.id} native path count`,
  );
  const oldActive = new Map(
    (before?.iconPaths?.active ?? []).map((entry) => [entry.key, entry.id]),
  );
  const oldRetired = before?.iconPaths?.retired ?? [];
  const active = current.map((layer, index) => {
    const key = mapping.active[index];
    assert.equal(layer.name, `Icon Path / ${key}`);
    if (oldActive.has(key))
      assert.equal(
        layer.id,
        oldActive.get(key),
        `${fixture.id}/${key} path ID changed`,
      );
    assert.ok(
      !oldRetired.some(({ id }) => id === layer.id),
      `${fixture.id} reused retired ID`,
    );
    return { key, id: layer.id };
  });
  const retired = [...oldRetired];
  for (const entry of before?.iconPaths?.active ?? [])
    if (!mapping.active.includes(entry.key)) retired.push(entry);
  assert.deepEqual(
    retired.map(({ key }) => key).toSorted(),
    mapping.retired.toSorted(),
    `${fixture.id} retired key record disagrees`,
  );
  return { active, retired };
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
  const mappings = await pathMappings();
  const changed = [];
  for (const fixture of fixtures) {
    const before = previous.variants[fixture.id];
    validatePathMapping(fixture, mappings[fixture.id], before);
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
    changed.push(fixture.id);
  }
  return changed;
}

async function updateIdentityManifest(libraryPath, assetReportPath) {
  const fixtures = JSON.parse(await readFile(paths.fixturesPath, 'utf8'));
  const report = JSON.parse(
    await readFile(join(output, 'layout-report.json'), 'utf8'),
  );
  const previous = await readIdentityManifest();
  const assets = JSON.parse(await readFile(assetReportPath, 'utf8'));
  const mappings = await pathMappings();
  for (const kind of ['swatches', 'layerStyles', 'textStyles']) {
    for (const [key, oldAsset] of Object.entries(
      previous.assets?.[kind] ?? {},
    )) {
      assert.equal(
        assets[kind]?.[key]?.id,
        oldAsset.id,
        `${kind} ${key} identity changed`,
      );
    }
  }
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
    identity.iconPaths = keyedPathState(
      fixture,
      mappings[fixture.id],
      identity.layers,
      before,
    );
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
    `${JSON.stringify({ version: 2, libraryDocumentId, variants, assets }, null, 2)}\n`,
  );
  return temporary;
}

async function updateVariantManifest(assetReportPath) {
  const fixtures = JSON.parse(
    await readFile(paths.variantFixturesPath, 'utf8'),
  );
  const report = JSON.parse(
    await readFile(join(output, 'variant-build-report.json'), 'utf8'),
  );
  const previous = await readFile(paths.variantManifestPath, 'utf8').then(
    JSON.parse,
    (error) => {
      if (error.code === 'ENOENT') return { version: 1, variants: {} };
      throw error;
    },
  );
  const assets = JSON.parse(await readFile(assetReportPath, 'utf8'));
  for (const kind of ['swatches', 'layerStyles', 'textStyles'])
    for (const [key, before] of Object.entries(previous.assets?.[kind] ?? {}))
      assert.equal(
        assets[kind]?.[key]?.id,
        before.id,
        `${kind} ${key} identity changed`,
      );
  assert.equal(report.length, fixtures.length);
  const variants = {};
  const mappings = await pathMappings();
  for (const fixture of fixtures) {
    const current = report.find((entry) => entry.id === fixture.id);
    assert.ok(current, `Missing native variant ${fixture.id}`);
    const icon = iconGeometry(fixture.layout.icon);
    const before = previous.variants[fixture.id];
    const iconPaths = fixture.layout.icon
      ? keyedPathState(
          fixture,
          mappings[fixture.id],
          [
            {
              name: 'Icon',
              children: [
                {
                  children: current.iconPaths.map(({ id, name }) => ({
                    id,
                    name,
                    type: 'ShapePath',
                  })),
                },
              ],
            },
          ],
          before,
        )
      : null;
    if (before) {
      assert.equal(
        current.masterId,
        before.masterId,
        `${fixture.id} master changed`,
      );
      assert.equal(
        current.symbolId,
        before.symbolId,
        `${fixture.id} Symbol changed`,
      );
      for (const layer of current.layers) {
        const prior = before.layers.find((entry) => entry.name === layer.name);
        if (prior)
          assert.equal(
            layer.id,
            prior.id,
            `${fixture.id}/${layer.name} changed`,
          );
      }
    }
    variants[fixture.id] = {
      masterId: current.masterId,
      symbolId: current.symbolId,
      name: current.name,
      layers: current.layers.map(({ id, name, type }) => ({ id, name, type })),
      iconGeometryHash: icon?.hash ?? null,
      iconSourceHash: icon?.sourceHash ?? null,
      iconGeometryParts: icon?.parts ?? null,
      iconStructure: icon?.structure ?? null,
      iconPaths,
    };
  }
  return `${JSON.stringify({ version: 2, variants, assets }, null, 2)}\n`;
}

async function changedVariantIcons() {
  const fixtures = JSON.parse(
    await readFile(paths.variantFixturesPath, 'utf8'),
  );
  const previous = await readFile(paths.variantManifestPath, 'utf8').then(
    JSON.parse,
    (error) => {
      if (error.code === 'ENOENT') return { variants: {} };
      throw error;
    },
  );
  const changed = [];
  const mappings = await pathMappings();
  for (const fixture of fixtures) {
    const before = previous.variants[fixture.id];
    validatePathMapping(fixture, mappings[fixture.id], before);
    if (!before?.iconGeometryParts) continue;
    const next = iconGeometry(fixture.layout.icon);
    if (
      (next?.hash ?? null) === before.iconGeometryHash &&
      (next?.sourceHash ?? null) === before.iconSourceHash
    )
      continue;
    assert.ok(next, `${fixture.id} removed its icon`);
    changed.push(fixture.id);
  }
  return changed;
}

async function prepareOutput() {
  await mkdir(output, { recursive: true });
  for (const directory of [
    'exports',
    'consumer-exports',
    'resize-exports',
    'fill-exports',
    'variant-exports',
    'variant-consumer-exports',
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
    'verify-variants',
    'render',
    'fill',
    'all',
  ].includes(command)
)
  throw new Error(
    'Usage: npm run sketch:button -- capture|check-source|generate|verify|verify-variants|render|fill|all',
  );
await prepareOutput();
if (command === 'capture' || command === 'all') await captureButtons(output);
if (command === 'capture' || command === 'all') await captureVariants(output);
if (command === 'fill' || command === 'all') await captureFillCases(output);
if (command === 'capture' || command === 'check-source') await verifySource();
if (command === 'generate' || command === 'all') {
  await verifySource();
  // A new Sketch document saving over an existing .sketch file can open a
  // blocking Save panel. Build to a unique sibling, then atomically replace
  // the published library only after both native jobs finish and clean up.
  const stagingPath = join(output, `.Kerf-Button-${randomUUID()}.sketch`);
  const assetStagingPath = join(output, `.asset-report-${randomUUID()}.json`);
  const variantAssetStagingPath = join(
    output,
    `.variant-asset-report-${randomUUID()}.json`,
  );
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
  const hasVariantManifest = await access(paths.variantManifestPath).then(
    () => true,
    () => false,
  );
  const variantIconGeometryUpdates = hasVariantManifest
    ? await changedVariantIcons()
    : [];
  const originalDocumentId = seedExisting
    ? (
        await exec('python3', [
          join(scriptDirectory, 'document-id.py'),
          paths.libraryPath,
        ])
      ).stdout.trim()
    : null;
  try {
    await runNative(['build', 'layout', 'variants'], {
      ...paths,
      libraryPath: stagingPath,
      assetReportPath: assetStagingPath,
      variantAssetReportPath: variantAssetStagingPath,
      seedExisting,
      hasIdentityManifest,
      iconGeometryUpdates,
      hasVariantManifest,
      variantIconGeometryUpdates,
      iconPathIdentitiesPath: paths.iconPathIdentitiesPath,
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
  const identityStagingPath = await updateIdentityManifest(
    stagingPath,
    assetStagingPath,
  );
  const variantManifest = await updateVariantManifest(variantAssetStagingPath);
  await rename(stagingPath, paths.libraryPath);
  await rename(identityStagingPath, paths.identitiesPath);
  await rename(assetStagingPath, paths.assetReportPath);
  await rename(variantAssetStagingPath, paths.variantAssetReportPath);
  await writeFile(paths.variantManifestPath, variantManifest);
}
if (command === 'verify' || command === 'all')
  await runNative(['verify', 'resize', 'verify-variants']);
if (command === 'verify-variants') await runNative(['verify-variants']);
if (command === 'fill' || command === 'all') await runNative(['fill']);
if (command === 'render' || command === 'all') await renderComparisons();
if (command === 'fill' || command === 'all') {
  await exec(process.execPath, [
    join(scriptDirectory, 'fill-compare.mjs'),
    output,
  ]);
  console.log('Real Button(fill:true) and native fill-width checks passed.');
}
