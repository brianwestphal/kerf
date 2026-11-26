import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import prettier from 'prettier';

import { runSketchJob } from '../runner.mjs';
import { pinDocumentId, readDocumentId } from '../shared/document-id.mjs';
import { representativeVariantSets } from './variant-plan.mjs';

const task = (name) => join(import.meta.dirname, 'tasks', `${name}.js`);
const edit = 'Library sync check';

export async function runVariantSetSyncGate({
  libraryPath,
  manifest,
  reportPath,
}) {
  const directory = await mkdtemp(join(tmpdir(), 'kerf-variant-sync-'));
  const run = async (name, parameters) =>
    (
      await runSketchJob({
        task: task(name),
        parameters,
        timeoutMs: 300_000,
      })
    ).result;
  try {
    const v1 = join(directory, 'Library.sketch');
    const v2 = join(directory, 'Library-next.sketch');
    await copyFile(libraryPath, v1);
    await copyFile(libraryPath, v2);
    const libraryDocumentId = await readDocumentId(v1);
    const choices = representativeVariantSets(manifest);
    const consumers = [];
    for (const choice of choices) {
      const consumerPath = join(
        directory,
        `${choice.setName.replaceAll(' ', '-')}-Consumer.sketch`,
      );
      const probe = await run('variant-link-probe', {
        libraryPath: v1,
        consumerPath,
        setName: choice.setName,
        variants: choice.variants,
        forceFixedWidth: choice.setName === 'Button',
      });
      assert.equal(probe.before.set.foreign, true, choice.setName);
      assert.equal(probe.reopened.foreignVariantSetCount, 1, choice.setName);
      assert.equal(probe.reopened.instances.length, 2, choice.setName);
      for (const [index, instance] of probe.reopened.instances.entries()) {
        assert.equal(
          instance.width,
          probe.before.entries[index].width,
          `${choice.setName} resized width lost on reopen`,
        );
        assert.ok(
          instance.overrides.includes(`Linked probe override ${index}`),
          `${choice.setName} text override lost on reopen`,
        );
      }
      consumers.push({ choice, consumerPath, probe });
    }
    await run('variant-family-edit', {
      libraryPath: v2,
      symbolIds: choices.flatMap((choice) =>
        choice.variants.map((variant) => variant.symbolId),
      ),
      edit,
    });
    await pinDocumentId(v2, { libraryDocumentId }, null);
    const synced = [];
    const after = [];
    const reopened = [];
    for (const { choice, consumerPath, probe } of consumers) {
      const result = await run('variant-sync-update', {
        libraryPath: v2,
        consumerPath,
      });
      assert.equal(result.outOfDateBefore, true, choice.setName);
      assert.equal(result.outOfDateAfter, false, choice.setName);
      assert.equal(result.foreignSetCountAfter, 1, choice.setName);
      synced.push({
        set: choice.setName,
        outOfDateBefore: result.outOfDateBefore,
        outOfDateAfter: result.outOfDateAfter,
      });
      for (const phase of ['after', 'reopened'])
        result[phase].forEach((instance, index) => {
          assert.equal(instance.firstText, edit, `${choice.setName} ${phase}`);
          assert.equal(
            instance.width,
            probe.before.entries[index].width,
            `${choice.setName} resized width lost after sync (${phase})`,
          );
          assert.ok(
            instance.overrides.includes(`Linked probe override ${index}`),
            `${choice.setName} override lost after sync (${phase})`,
          );
          const record = {
            set: choice.setName,
            state: choice.state,
            theme: choice.variants[index].theme,
            name: instance.name,
            firstText: instance.firstText,
            width: instance.width,
            override: `Linked probe override ${index}`,
          };
          (phase === 'after' ? after : reopened).push(record);
        });
    }
    const report = {
      libraryDocumentId,
      variantSets: manifest.variantSets.length,
      names: choices.map((choice) => choice.setName),
      synced,
      after,
      reopened,
    };
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
