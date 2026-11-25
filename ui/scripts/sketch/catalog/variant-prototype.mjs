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
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

import { runSketchJob } from '../runner.mjs';
import { pinDocumentId, readDocumentId } from '../shared/document-id.mjs';

const root = resolve(import.meta.dirname, '../../../docs/design/sketch');
const source = join(root, 'Kerf-UI.sketch');
const manifest = JSON.parse(
  await readFile(join(root, 'unified/symbol-manifest.json'), 'utf8'),
);
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
const directory = await mkdtemp(join(tmpdir(), 'kerf-variant-prototype-'));
const libraryPath = join(directory, 'Kerf-UI-Variant-Prototype.sketch');
const previewPath = join(directory, 'previews');
const task = fileURLToPath(
  new URL('./tasks/variant-prototype.js', import.meta.url),
);
const consumerTask = fileURLToPath(
  new URL('./tasks/variant-consumer.js', import.meta.url),
);
try {
  await copyFile(source, libraryPath);
  await mkdir(previewPath);
  const status = await runSketchJob({
    task,
    parameters: { libraryPath, variants, previewPath },
    timeoutMs: 300_000,
  });
  const result = status.result;
  assert.equal(result.after.length, 328, 'Some Symbols went missing');
  const afterById = new Map(result.after.map((item) => [item.symbolId, item]));
  for (const before of result.before) {
    const after = afterById.get(before.symbolId);
    assert.ok(after, `Symbol ID missing: ${before.name}`);
    assert.equal(after.layerId, before.layerId, `${before.name} master ID`);
    assert.deepEqual(
      after.descendants,
      before.descendants,
      `${before.name} descendant IDs`,
    );
  }
  const namedVariants = variants.map((entry) => {
    const original = result.before.find((item) => item.name === entry.name);
    assert.ok(original, `Source master missing: ${entry.name}`);
    const actual = afterById.get(original.symbolId);
    return {
      ...entry,
      originalName: entry.name,
      name: actual.name,
      symbolId: original.symbolId,
    };
  });
  console.log(
    'Variant names:',
    namedVariants.map((entry) => `${entry.originalName} -> ${entry.name}`),
  );
  assert.deepEqual(
    result.swatchesAfter,
    result.swatchesBefore,
    'Color Variable IDs changed',
  );
  assert.ok(result.configured.every((entry) => entry.variant));
  assert.deepEqual(
    result.selection.map((entry) => entry.name),
    namedVariants.map((entry) => entry.name),
  );
  assert.deepEqual(result.properties, [
    { name: 'State', values: ['Default', 'Error'] },
    { name: 'Theme', values: ['Light', 'Dark'] },
  ]);
  await pinDocumentId(libraryPath, manifest, null);
  assert.equal(
    await readDocumentId(libraryPath),
    manifest.libraryDocumentId,
    'Library document ID changed',
  );
  const consumer = (
    await runSketchJob({
      task: consumerTask,
      parameters: {
        libraryPath,
        consumerPath: join(directory, 'Consumer.sketch'),
        variants: [namedVariants[0], namedVariants[3]],
      },
      timeoutMs: 300_000,
    })
  ).result;
  assert.equal(consumer.setName, 'Text Field / Form');
  assert.equal(consumer.setCount, 1);
  assert.equal(consumer.symbolReferenceCount, 325);
  for (const entry of consumer.entries) {
    const reopened = consumer.reopened.find(
      (item) => item.symbolId === entry.symbolId,
    );
    assert.equal(reopened?.override, entry.override);
    assert.equal(reopened.width, entry.width);
  }
  const linked = consumer.entries.every(
    (entry) => entry.linked && entry.foreign,
  );
  const consumerEvidence = {
    setName: consumer.setName,
    setCount: consumer.setCount,
    symbolReferenceCount: consumer.symbolReferenceCount,
    entries: consumer.entries.map((entry) => {
      const reopened = consumer.reopened.find(
        (item) => item.symbolId === entry.symbolId,
      );
      return {
        name: entry.name,
        importPath: entry.importPath,
        importedIdDiffersFromSource:
          entry.importedSymbolId !== entry.sourceSymbolId,
        linked: entry.linked,
        foreign: entry.foreign,
        setLinked: entry.setLinked,
        width: entry.width,
        override: entry.override,
        reopenedIdStable: !!reopened,
        reopenedWidth: reopened.width,
        reopenedOverride: reopened.override,
      };
    }),
  };
  const report = {
    sketchVersion: '2026.4',
    component: 'Text Field / Form',
    variants: namedVariants,
    symbolCount: result.after.length,
    swatchCount: result.swatchesAfter.length,
    identitiesPreserved: true,
    variantSetCreated: !!result.setId,
    properties: result.properties,
    consumer: consumerEvidence,
    comparison: {
      before:
        'Four individually importable masters with full Component / Variant / State / Theme names',
      after:
        'One importable Variant Set; masters renamed to State/Theme and selected through two properties',
      symbolReferenceCountBefore: result.before.length,
      symbolReferenceCountAfter: consumer.symbolReferenceCount,
      variantSetReferenceCount: consumer.setCount,
    },
    linked,
    sync: linked
      ? 'Not tested by this prototype'
      : 'Unavailable: imported Variant Set masters have no foreign library object required by the sync gate',
    migrationReady: false,
  };
  const reportPath = join(root, 'unified/variant-prototype-report.json');
  await writeFile(
    reportPath,
    await prettier.format(`${JSON.stringify(report, null, 2)}\n`, {
      filepath: reportPath,
    }),
  );
  await copyFile(
    join(previewPath, 'variant-prototype.png'),
    join(root, 'unified/variant-prototype-preview.png'),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}
