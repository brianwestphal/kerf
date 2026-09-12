import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export async function buildAiRegressionContext(root, condition) {
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
