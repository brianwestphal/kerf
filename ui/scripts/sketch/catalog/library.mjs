import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import prettier from 'prettier';

import { requireExistingSketchProcess } from '../check-runner-process.mjs';
import { runSketchJob } from '../runner.mjs';
import { pinDocumentId } from '../shared/document-id.mjs';
import { runSyncGate } from '../shared/sync-gate.mjs';

const exec = promisify(execFile);
const sketchRoot = resolve(import.meta.dirname, '../../../docs/design/sketch');
const output = join(sketchRoot, 'unified');
const paths = {
  libraryPath: join(sketchRoot, 'Kerf-UI.sketch'),
  manifestPath: join(output, 'symbol-manifest.json'),
  reportPath: join(output, 'build-report.json'),
  pagesPath: join(output, 'pages'),
  consumerPath: join(output, 'Kerf-UI-Consumer-Test.sketch'),
  exportsPath: join(output, 'consumer-exports'),
  verificationPath: join(output, 'verification.json'),
  syncPath: join(output, 'sync-verification.json'),
};
const task = (name) =>
  fileURLToPath(new URL(`./tasks/${name}.js`, import.meta.url));

// Family Libraries in page order; the family pipelines own every master.
const families = [
  { key: 'button', title: 'Button', file: 'button/Kerf-Button.sketch' },
  {
    key: 'forms',
    title: 'Form Controls',
    file: 'forms/Kerf-Forms.sketch',
    swatchSegment: 'Forms',
  },
  {
    key: 'advanced',
    title: 'Advanced Inputs',
    file: 'advanced/Kerf-Advanced.sketch',
    swatchSegment: 'Advanced',
  },
  {
    key: 'lists',
    title: 'Lists and Data',
    file: 'lists/Kerf-Lists.sketch',
    swatchSegment: 'Lists',
  },
  {
    key: 'toolbar',
    title: 'Toolbars and Navigation',
    file: 'toolbar/Kerf-Toolbar.sketch',
    swatchSegment: 'Toolbar',
  },
  {
    key: 'content',
    title: 'Content and Feedback',
    file: 'content/Kerf-Content.sketch',
    swatchSegment: 'Content',
  },
];

async function json(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function processIds() {
  const { stdout } = await exec('/bin/ps', ['-axo', 'pid=,comm=']);
  return stdout
    .split('\n')
    .filter((line) => line.endsWith('/Sketch.app/Contents/MacOS/Sketch'))
    .map((line) => Number(line.trim().split(/\s+/)[0]))
    .sort((a, b) => a - b);
}

async function formatted(path, value) {
  await writeFile(
    path,
    await prettier.format(`${JSON.stringify(value, null, 2)}\n`, {
      filepath: path,
    }),
  );
}

// Unified IDs must equal the family IDs each family manifest records.
async function familyIdentities() {
  const expected = new Map();
  for (const family of families.slice(1)) {
    const manifest = await json(
      join(sketchRoot, family.key, 'symbol-manifest.json'),
    );
    for (const [id, symbol] of Object.entries(manifest.symbols))
      expected.set(symbol.symbolId, { family: family.key, id, ...symbol });
  }
  const button = await json(join(sketchRoot, 'button/identity-manifest.json'));
  for (const [id, variant] of Object.entries(button.variants))
    expected.set(variant.symbolId, {
      family: 'button',
      id,
      layerId: variant.id,
      name: variant.name,
    });
  return expected;
}

async function build() {
  const before = requireExistingSketchProcess(await processIds());
  const previous = await json(paths.manifestPath).catch(() => null);
  await mkdir(paths.pagesPath, { recursive: true });
  const staged = join(output, '.Kerf-UI-staged.sketch');
  const status = await runSketchJob({
    task: task('unify'),
    parameters: {
      families: families.map((family) => ({
        ...family,
        libraryPath: join(sketchRoot, family.file),
      })),
      libraryPath: staged,
      pagesPath: paths.pagesPath,
    },
    timeoutMs: 900_000,
  });
  assert.equal(status.cleanupComplete, true);
  assert.deepEqual(await processIds(), before, 'Sketch process list changed');
  const report = status.result;
  assert.equal(report.symbols.length, 308, 'Merge every family master');
  for (const family of report.families)
    assert.equal(
      family.boundPaints.unified,
      family.boundPaints.source,
      `${family.key} lost Color Variable bindings`,
    );
  const expected = await familyIdentities();
  const byFixture = {};
  for (const symbol of report.symbols) {
    const known = expected.get(symbol.symbolId);
    if (symbol.family !== 'button')
      assert.ok(known, `${symbol.name} is missing from its family manifest`);
    if (known) {
      assert.equal(symbol.layerId, known.layerId, `${symbol.name} master ID`);
      if (known.text)
        assert.deepEqual(
          symbol.text.map((item) => item.id),
          known.text.map((item) => item.id),
          `${symbol.name} Text IDs`,
        );
    }
    const key = `${symbol.family}/${known?.id ?? symbol.symbolId}`;
    byFixture[key] = symbol;
  }
  for (const [key, old] of Object.entries(previous?.symbols ?? {}))
    assert.equal(byFixture[key]?.symbolId, old.symbolId, `${key} Symbol ID`);
  for (const [name, old] of Object.entries(previous?.swatches ?? {}))
    assert.equal(
      report.swatches.find((swatch) => swatch.name === name)?.id,
      old.id,
      `${name} Color Variable ID`,
    );
  const libraryDocumentId = await pinDocumentId(staged, previous ?? {}, null);
  await rename(staged, paths.libraryPath);
  const swatches = Object.fromEntries(
    report.swatches.map((swatch) => [
      swatch.name,
      { id: swatch.id, color: swatch.color },
    ]),
  );
  await formatted(paths.manifestPath, {
    version: 1,
    libraryDocumentId,
    swatches,
    symbols: byFixture,
  });
  await formatted(paths.reportPath, {
    sketchPid: status.processId,
    families: report.families,
    styles: report.styles,
    styleBoundPaints: report.styleBoundPaints,
    swatches: report.swatches.length,
  });
  console.log(
    `Unified ${report.symbols.length} Symbols and ${report.swatches.length} Color Variables into Kerf-UI.sketch.`,
  );
}

async function verify() {
  const before = requireExistingSketchProcess(await processIds());
  await mkdir(paths.exportsPath, { recursive: true });
  const status = await runSketchJob({
    task: task('verify'),
    parameters: {
      libraryPath: paths.libraryPath,
      consumerPath: paths.consumerPath,
      exportsPath: paths.exportsPath,
      families: families.map((family) => family.title),
    },
    timeoutMs: 600_000,
  });
  assert.equal(status.cleanupComplete, true);
  assert.deepEqual(await processIds(), before, 'Sketch process list changed');
  const result = status.result;
  assert.equal(result.symbols, 308);
  assert.equal(result.instances.length, families.length * 2);
  assert.ok(result.instances.every((instance) => instance.linked));
  assert.deepEqual(
    result.reopened.map((instance) => instance.override),
    result.instances.map((instance) => instance.override),
  );
  await formatted(paths.verificationPath, result);
  console.log(
    `Verified ${result.instances.length} linked cross-family consumers after save/reopen.`,
  );
}

async function sync() {
  const manifest = await json(paths.manifestPath);
  const staged = join(output, '.sync-manifest.json');
  // The gate reads `symbols` keyed by an ID ending in the theme.
  await writeFile(staged, JSON.stringify(manifest));
  try {
    const report = await runSyncGate({
      libraryPath: paths.libraryPath,
      manifestPath: staged,
      reportPath: paths.syncPath,
    });
    console.log(
      `Synced ${report.names.length} linked consumers to a Kerf-UI.sketch update with overrides kept.`,
    );
  } finally {
    await rm(staged, { force: true });
  }
}

const command = process.argv[2] ?? 'all';
if (!['build', 'verify', 'sync', 'all'].includes(command))
  throw new Error(`Unknown library command: ${command}`);
if (command === 'build' || command === 'all') await build();
if (command === 'verify' || command === 'all') await verify();
if (command === 'sync' || command === 'all') await sync();
