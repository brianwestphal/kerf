import assert from 'node:assert/strict';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import prettier from 'prettier';

import { runSketchJob } from '../runner.mjs';
import { pinDocumentId } from '../shared/document-id.mjs';
import { runSyncGate } from '../shared/sync-gate.mjs';

const sketchRoot = resolve(import.meta.dirname, '../../../docs/design/sketch');
const librarySource = join(sketchRoot, 'Kerf-UI.sketch');
const manifestPath = join(sketchRoot, 'unified/symbol-manifest.json');
const reportPath = join(sketchRoot, 'unified/variant-link-report.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const variants = [
  ['Labeled / Project Name', 'Default', 'Light'],
  ['Labeled / Project Name', 'Default', 'Dark'],
  ['Error / Email Error', 'Error', 'Light'],
  ['Error / Email Error', 'Error', 'Dark'],
].map(([label, state, theme]) => ({
  name: `Text Field / ${label} / ${theme}`,
  state,
  theme,
}));
const directory = await mkdtemp(join(tmpdir(), 'kerf-variant-link-'));
const task = (name) => join(import.meta.dirname, 'tasks', name);
const run = async (name, parameters) =>
  (
    await runSketchJob({
      task: task(name),
      parameters,
      timeoutMs: 300_000,
    })
  ).result;

try {
  const libraryPath = join(directory, 'Library.sketch');
  const nextLibraryPath = join(directory, 'Library-next.sketch');
  const detachedPath = join(directory, 'Consumer-detached.sketch');
  const placedPath = join(directory, 'Consumer-placed.sketch');
  const previewPath = join(directory, 'previews');
  await copyFile(librarySource, libraryPath);
  await mkdir(previewPath);
  const grouped = await run('variant-prototype.js', {
    libraryPath,
    variants,
    previewPath,
  });
  assert.equal(grouped.before.length, 328);
  assert.equal(grouped.after.length, 328);
  assert.equal(grouped.swatchesAfter.length, 141);
  assert.deepEqual(grouped.swatchesAfter, grouped.swatchesBefore);
  const afterById = new Map(grouped.after.map((item) => [item.symbolId, item]));
  for (const before of grouped.before) {
    const after = afterById.get(before.symbolId);
    assert.ok(after, `Symbol ID missing: ${before.name}`);
    assert.equal(after.layerId, before.layerId);
    assert.deepEqual(after.descendants, before.descendants);
  }
  await pinDocumentId(libraryPath, manifest, null);
  const renamed = variants.map((variant) => {
    const source = grouped.before.find((item) => item.name === variant.name);
    assert.ok(source, `Source variant missing: ${variant.name}`);
    return {
      ...variant,
      name: afterById.get(source.symbolId).name,
      originalName: variant.name,
      symbolId: source.symbolId,
    };
  });
  const selected = [renamed[0], renamed[3]];
  const detached = await run('variant-link-probe.js', {
    libraryPath,
    consumerPath: detachedPath,
    variants: selected,
  });
  const placed = await run('variant-link-probe.js', {
    libraryPath,
    consumerPath: placedPath,
    variants: selected,
    attachSet: true,
  });
  assert.equal(detached.before.symbolReferenceCount, 325);
  assert.equal(detached.before.relatedSymbolReferences.length, 0);
  assert.equal(detached.before.setReference.type, 'VariantSet');
  assert.equal(detached.before.set.foreign, true);
  assert.equal(detached.reopened.foreignVariantSetCount, 1);
  assert.equal(detached.reopened.sets.length, 0);
  for (const [index, entry] of detached.before.entries.entries()) {
    assert.notEqual(entry.importedId, entry.sourceId);
    const reopened = detached.reopened.instances.find(
      (item) => item.id === entry.importedId,
    );
    assert.equal(reopened?.width, entry.width);
    assert.ok(reopened.overrides.includes(entry.override));
    assert.equal(entry.width, 440);
    assert.equal(entry.override, `Linked probe override ${index}`);
  }

  await copyFile(libraryPath, nextLibraryPath);
  const edit = 'Variant linked update';
  await runSketchJob({
    task: resolve(import.meta.dirname, '../shared/sync-edit-task.js'),
    parameters: {
      libraryPath: nextLibraryPath,
      names: selected.map((item) => item.name),
      edit,
    },
    timeoutMs: 300_000,
  });
  await pinDocumentId(nextLibraryPath, manifest, null);
  const detachedSync = await run('variant-sync-update.js', {
    libraryPath: nextLibraryPath,
    consumerPath: detachedPath,
  });
  const placedSync = await run('variant-sync-update.js', {
    libraryPath: nextLibraryPath,
    consumerPath: placedPath,
  });
  assert.equal(detachedSync.outOfDateBefore, true);
  assert.equal(detachedSync.outOfDateAfter, false);
  assert.equal(detachedSync.foreignSetCountAfter, 1);
  for (const phase of ['after', 'reopened'])
    detachedSync[phase].forEach((entry, index) => {
      assert.equal(entry.firstText, edit);
      assert.equal(entry.width, 440);
      assert.ok(entry.overrides.includes(`Linked probe override ${index}`));
    });

  const existingSync = await runSyncGate({
    libraryPath: librarySource,
    manifestPath,
    reportPath: join(directory, 'existing-sync.json'),
  });
  const report = {
    sketchVersion: '2026.4',
    component: 'Text Field / Form',
    sourceSymbolCount: grouped.after.length,
    sourceSwatchCount: grouped.swatchesAfter.length,
    sourceIdentitiesPreserved: true,
    variants: renamed,
    detached,
    placed,
    detachedSync,
    placedSync,
    existingLibrarySync: {
      names: existingSync.names,
      synced: existingSync.synced,
      after: existingSync.after,
      reopened: existingSync.reopened,
    },
    verifiedImportPath:
      'Import VariantSetReference; leave the set detached; create instances from selected child masters; sync the document foreignVariantSets record',
    variantImportPathVerified: true,
    otherFamiliesMigrated: false,
  };
  await writeFile(
    reportPath,
    await prettier.format(`${JSON.stringify(report, null, 2)}\n`, {
      filepath: reportPath,
    }),
  );
  console.log(`Verified detached Variant Set import and sync: ${reportPath}`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
