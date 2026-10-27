import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import prettier from 'prettier';

import { requireExistingSketchProcess } from '../check-runner-process.mjs';
import { runSketchJob } from '../runner.mjs';
import { captureLists, defaultOutput, verifyTargets } from './capture.mjs';

const exec = promisify(execFile);
const output = resolve(process.env.KERF_SKETCH_LISTS_OUTPUT ?? defaultOutput);
const task = (name) =>
  fileURLToPath(new URL(`./tasks/${name}.js`, import.meta.url));
const paths = {
  fixturesPath: join(output, 'fixtures.json'),
  libraryPath: join(output, 'Kerf-Lists.sketch'),
  manifestPath: join(output, 'symbol-manifest.json'),
  reportPath: join(output, 'build-report.json'),
  exportsPath: join(output, 'exports'),
  consumerPath: join(output, 'Lists-Consumer-Test.sketch'),
  verifyExportsPath: join(output, 'consumer-exports'),
  verificationPath: join(output, 'verification.json'),
  assetReportPath: join(output, 'asset-report.json'),
};

async function exists(path) {
  return access(path).then(
    () => true,
    () => false,
  );
}

async function processIds() {
  const { stdout } = await exec('/bin/ps', ['-axo', 'pid=,comm=']);
  return stdout
    .split('\n')
    .filter((line) => line.endsWith('/Sketch.app/Contents/MacOS/Sketch'))
    .map((line) => Number(line.trim().split(/\s+/)[0]))
    .sort((a, b) => a - b);
}

async function generate() {
  verifyTargets();
  const before = requireExistingSketchProcess(await processIds());
  const fixtures = JSON.parse(await readFile(paths.fixturesPath, 'utf8'));
  assert.equal(
    fixtures.length,
    42,
    'Capture all 21 list/data variants in two themes',
  );
  const enriched = fixtures.map((fixture) => ({
    ...fixture,
    sourceHash: createHash('sha256').update(fixture.svg).digest('hex'),
  }));
  const published = await exists(paths.libraryPath);
  const manifested = await exists(paths.manifestPath);
  assert.equal(
    published,
    manifested,
    'Library and Symbol manifest must coexist',
  );
  const oldManifest = manifested
    ? JSON.parse(await readFile(paths.manifestPath, 'utf8'))
    : { version: 1, symbols: {} };
  const previous = oldManifest.symbols;
  const staged = join(output, `.Kerf-Lists-${randomUUID()}.sketch`);
  if (published) await copyFile(paths.libraryPath, staged);
  const nativeFixtures = join(output, '.native-fixtures.json');
  await writeFile(nativeFixtures, `${JSON.stringify(enriched)}\n`);
  await mkdir(paths.exportsPath, { recursive: true });
  let status;
  try {
    status = await runSketchJob({
      task: task('build'),
      parameters: {
        fixturesPath: nativeFixtures,
        libraryPath: staged,
        manifestPath: paths.manifestPath,
        exportsPath: paths.exportsPath,
        hasManifest: manifested,
        seedExisting: published,
      },
      timeoutMs: 600_000,
    });
  } finally {
    await unlink(nativeFixtures);
  }
  assert.equal(status.cleanupComplete, true);
  assert.deepEqual(
    [...status.documentsAfter].sort(),
    [...status.documentsBefore].sort(),
  );
  assert.deepEqual(
    [...status.librariesAfter].sort(),
    [...status.librariesBefore].sort(),
  );
  assert.deepEqual(await processIds(), before, 'Sketch process list changed');
  const report = status.result;
  assert.equal(report.length, 42);
  const symbols = Object.fromEntries(report.map((entry) => [entry.id, entry]));
  assert.equal(Object.keys(symbols).length, 42);
  for (const [id, old] of Object.entries(previous)) {
    assert.ok(
      symbols[id],
      `Previously published list/data Symbol retired without migration: ${id}`,
    );
    assert.equal(symbols[id].symbolId, old.symbolId, `${id} Symbol ID changed`);
    assert.equal(
      symbols[id].layerId,
      old.layerId,
      `${id} master layer ID changed`,
    );
    assert.deepEqual(
      symbols[id].text.map((item) => item.id),
      old.text.map((item) => item.id),
      `${id} Text IDs changed`,
    );
  }
  await rename(staged, paths.libraryPath);
  await writeFile(
    paths.manifestPath,
    `${JSON.stringify({ ...oldManifest, symbols }, null, 2)}\n`,
  );
  await writeFile(
    paths.reportPath,
    `${JSON.stringify({ sketchPid: status.processId, symbols: report }, null, 2)}\n`,
  );
  console.log(
    `Built ${report.length} native list/data Symbols in existing Sketch PID ${status.processId}.`,
  );
}

async function assets() {
  const before = requireExistingSketchProcess(await processIds());
  const oldManifest = JSON.parse(await readFile(paths.manifestPath, 'utf8'));
  const staged = join(output, `.Kerf-Lists-assets-${randomUUID()}.sketch`);
  await copyFile(paths.libraryPath, staged);
  let status;
  try {
    status = await runSketchJob({
      task: task('assets'),
      parameters: {
        fixturesPath: paths.fixturesPath,
        libraryPath: staged,
        manifestPath: paths.manifestPath,
      },
      timeoutMs: 600_000,
    });
  } catch (error) {
    await unlink(staged);
    throw error;
  }
  assert.equal(status.cleanupComplete, true);
  assert.deepEqual(
    [...status.documentsAfter].sort(),
    [...status.documentsBefore].sort(),
  );
  assert.deepEqual(
    [...status.librariesAfter].sort(),
    [...status.librariesBefore].sort(),
  );
  assert.deepEqual(await processIds(), before, 'Sketch process list changed');
  const report = status.result;
  assert.ok(Object.keys(report.swatches).length >= 8);
  for (const [key, old] of Object.entries(oldManifest.assets ?? {})) {
    assert.equal(report.swatches[key]?.id, old.id, `${key} asset ID changed`);
  }
  await rename(staged, paths.libraryPath);
  await writeFile(
    paths.manifestPath,
    `${JSON.stringify({ ...oldManifest, assets: report.swatches }, null, 2)}\n`,
  );
  await writeFile(
    paths.assetReportPath,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `Bound ${Object.keys(report.swatches).length} shared list/data Color Variables in existing Sketch PID ${status.processId}.`,
  );
}

async function verify() {
  const before = requireExistingSketchProcess(await processIds());
  await mkdir(paths.verifyExportsPath, { recursive: true });
  const status = await runSketchJob({
    task: task('verify'),
    parameters: {
      fixturesPath: paths.fixturesPath,
      manifestPath: paths.manifestPath,
      libraryPath: paths.libraryPath,
      consumerPath: paths.consumerPath,
      exportsPath: paths.verifyExportsPath,
    },
    timeoutMs: 600_000,
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
  assert.deepEqual(await processIds(), before, 'Sketch process list changed');
  assert.equal(status.result.symbols, 42);
  assert.equal(status.result.instances.length, 10);
  assert.equal(status.result.reopened.length, 10);
  await writeFile(
    paths.verificationPath,
    await prettier.format(`${JSON.stringify(status.result, null, 2)}\n`, {
      filepath: paths.verificationPath,
    }),
  );
  console.log(
    `Verified 10 linked list/data consumers after save/reopen in Sketch PID ${status.processId}.`,
  );
}

const command = process.argv[2] ?? 'all';
if (command === 'capture' || command === 'all') await captureLists(output);
if (command === 'generate' || command === 'all') await generate();
if (command === 'assets' || command === 'all') await assets();
if (command === 'verify' || command === 'all') await verify();
if (!['capture', 'generate', 'assets', 'verify', 'all'].includes(command))
  throw new Error(`Unknown list/data command: ${command}`);
