import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

import { runSketchJob } from '../runner.mjs';
import { pinDocumentId, readDocumentId } from './document-id.mjs';

const task = (name) => fileURLToPath(new URL(`./${name}.js`, import.meta.url));
const EDIT = 'Library sync check';

/**
 * Prove a linked consumer follows a Library update: build a consumer on the
 * published Library with a Text override per instance, publish a next version
 * with one master text edited under the same document ID, then sync and check
 * the edit arrives, the override survives, and save/reopen keeps both. One
 * representative master per theme with at least two Text layers is used.
 */
export async function runSyncGate({ libraryPath, manifestPath, reportPath }) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const names = ['light', 'dark'].map((theme) => {
    const entry = Object.entries(manifest.symbols).find(
      ([id, symbol]) => id.endsWith(`-${theme}`) && symbol.text.length >= 2,
    );
    assert.ok(entry, `No ${theme} master with two Text layers for the gate`);
    return entry[1].name;
  });
  const directory = await mkdtemp(join(tmpdir(), 'kerf-sketch-sync-'));
  try {
    const v1 = join(directory, 'Library.sketch');
    const v2 = join(directory, 'Library-next.sketch');
    const consumerPath = join(directory, 'Consumer.sketch');
    await copyFile(libraryPath, v1);
    const documentId = await readDocumentId(v1);
    await runSketchJob({
      task: task('sync-consumer-task'),
      parameters: { libraryPath: v1, consumerPath, names },
      timeoutMs: 300_000,
    });
    await copyFile(libraryPath, v2);
    await runSketchJob({
      task: task('sync-edit-task'),
      parameters: { libraryPath: v2, names, edit: EDIT },
      timeoutMs: 300_000,
    });
    // The edit's save assigns a new document ID; an update keeps the old one.
    await pinDocumentId(v2, { libraryDocumentId: documentId }, null);
    const status = await runSketchJob({
      task: task('sync-update-task'),
      parameters: { libraryPath: v2, consumerPath },
      timeoutMs: 300_000,
    });
    const result = status.result;
    for (const entry of result.synced) {
      assert.equal(entry.outOfDateBefore, true, `${entry.name} not outdated`);
      assert.equal(entry.outOfDateAfter, false, `${entry.name} did not sync`);
    }
    for (const phase of ['after', 'reopened'])
      result[phase].forEach((instance, index) => {
        assert.equal(
          instance.firstText,
          EDIT,
          `${instance.name} lost the Library edit (${phase})`,
        );
        assert.ok(
          instance.overrides.includes(`Kept override ${index}`),
          `${instance.name} lost its override (${phase})`,
        );
      });
    const report = { libraryDocumentId: documentId, names, ...result };
    await writeFile(
      reportPath,
      await prettier.format(`${JSON.stringify(report, null, 2)}\n`, {
        filepath: reportPath,
      }),
    );
    return report;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
