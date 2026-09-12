import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const AI_REGRESSION_V1_CONTEXT_SNAPSHOTS = new Map([
  ['revised-recipes-catalog', 'ai-regressions/contexts/revised-recipes-catalog-v1.snapshot.json'],
]);

export async function buildAiRegressionContext(root, condition, { snapshotPath } = {}) {
  if (snapshotPath) {
    const snapshot = JSON.parse(await readFile(resolve(root, snapshotPath), 'utf8'));
    if (snapshot.schemaVersion !== 1 || snapshot.condition !== condition.id) throw new Error(`${snapshotPath} is not a valid ${condition.id} context snapshot`);
    if (JSON.stringify(snapshot.sources.map(({ path }) => path)) !== JSON.stringify(condition.sourcePaths)) throw new Error(`${snapshotPath} source paths drifted from ${condition.id}`);
    if (sha256(snapshot.text) !== snapshot.sha256) throw new Error(`${snapshotPath} text hash does not match its content`);
    return { condition: condition.id, sourceRevision: condition.sourceRevision ?? null, sources: snapshot.sources, sha256: snapshot.sha256, text: snapshot.text };
  }
  const sources = [];
  for (const path of condition.sourcePaths) {
    const content = await readFile(resolve(root, path), 'utf8');
    sources.push({ path, sha256: sha256(content), content });
  }
  const text = sources.map(({ path, content }) => `--- ${path} ---\n${content.trim()}\n`).join('\n');
  return {
    condition: condition.id,
    sourceRevision: condition.sourceRevision ?? null,
    sources: sources.map(({ path, sha256: digest }) => ({ path, sha256: digest })),
    sha256: sha256(text),
    text,
  };
}
