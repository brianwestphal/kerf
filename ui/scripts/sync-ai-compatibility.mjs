import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAiRegressionContext } from './lib/ai-regression-context.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const compatibilityPath = resolve(root, 'ai-regressions/compatibility-v3.json');
const write = process.argv.includes('--write');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (path) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
const compatibility = await readJson('ai-regressions/compatibility-v3.json');
const conditions = await readJson('ai-regressions/conditions-v3.json');
const artifacts = {
  selectionCatalog: 'ai/component-catalog.json',
  behaviorCatalog: 'ai/component-catalog-v2.json',
  diagnosticRegistry: 'ai/application-ui-diagnostic-ids-v1.json',
  qualityContract: 'ai-regressions/quality-contract-v3.json',
};
const expected = {};
for (const [id, path] of Object.entries(artifacts))
  expected[id] = sha256(await readFile(resolve(root, path), 'utf8'));
expected.guidanceContext = (
  await buildAiRegressionContext(root, conditions.guidance)
).sha256;

const current = compatibility.artifactDigests ?? {};
const drift = Object.entries(expected).filter(
  ([id, digest]) => current[id] !== digest,
);
if (drift.length === 0) {
  console.log('[sync-ai-compatibility] compatibility digests are current.');
} else if (write) {
  compatibility.artifactDigests = { ...current, ...expected };
  await writeFile(
    compatibilityPath,
    `${JSON.stringify(compatibility, null, 2)}\n`,
  );
  console.log(
    `[sync-ai-compatibility] updated ${drift.map(([id]) => id).join(', ')}.`,
  );
} else {
  for (const [id, digest] of drift)
    console.error(
      `[sync-ai-compatibility] ${id}: ${current[id] ?? 'missing'} -> ${digest}`,
    );
  console.error(
    'Run npm run ai:compatibility:sync after reviewing the catalog/signature changes.',
  );
  process.exitCode = 1;
}
