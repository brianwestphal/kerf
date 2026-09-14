import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAiRegressionRun, historicalScorerSha256 } from './lib/ai-regression-run.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const entries = await readdir(resolve(root, 'ai-regressions/results'), { recursive: true, withFileTypes: true });
const runPaths = entries.filter((entry) => entry.isFile() && entry.name === 'run.json').map((entry) => resolve(entry.parentPath ?? entry.path, entry.name)).sort();
if (runPaths.length < 2) throw new Error('measured conclusions require at least two checked-in model runs');

const digest = (value) => createHash('sha256').update(value).digest('hex');
const currentCatalog = await readFile(resolve(root, 'ai/component-catalog.json'), 'utf8');
const currentCorpus = await readFile(resolve(root, 'ai-regressions/corpus.json'), 'utf8');
const legacyCorpus = await readFile(resolve(root, 'ai-regressions/corpus-legacy-sidebar.snapshot.json'), 'utf8');
const currentPublicApiSignatures = await readFile(resolve(root, 'ai/public-api-signatures-v1.md'), 'utf8');
const frozenContext = JSON.parse(await readFile(resolve(root, 'ai-regressions/contexts/revised-recipes-catalog-v2.snapshot.json'), 'utf8'));
const frozenSource = (path) => {
  const marker = `--- ${path} ---\n`;
  const start = frozenContext.text.indexOf(marker) + marker.length;
  const end = frozenContext.text.indexOf('\n\n--- ', start);
  if (start < marker.length || end < start) throw new Error(`suite-v2 context snapshot is missing ${path}`);
  return `${frozenContext.text.slice(start, end)}\n`;
};
const frozenCatalog = frozenSource('ai/component-catalog.json');
const frozenPublicApiSignatures = frozenSource('ai/public-api-signatures-v1.md');
const catalogsByDigest = new Map([[digest(currentCatalog), currentCatalog], [digest(frozenCatalog), frozenCatalog]]);
const corporaByDigest = new Map([[digest(currentCorpus), currentCorpus], [digest(legacyCorpus), legacyCorpus]]);
const publicApiSignaturesByDigest = new Map([[digest(currentPublicApiSignatures), currentPublicApiSignatures], [digest(frozenPublicApiSignatures), frozenPublicApiSignatures]]);

const modelVersions = new Set();
for (const runPath of runPaths) {
  const recorded = JSON.parse(await readFile(runPath, 'utf8'));
  const catalogText = catalogsByDigest.get(recorded.harness.catalogSha256);
  if (!catalogText) throw new Error(`${relative(root, runPath)} references an unavailable catalog snapshot ${recorded.harness.catalogSha256}`);
  const corpusText = corporaByDigest.get(recorded.harness.corpusSha256);
  if (!corpusText) throw new Error(`${relative(root, runPath)} references an unavailable corpus snapshot ${recorded.harness.corpusSha256}`);
  const publicApiSignaturesText = recorded.schemaVersion === 2 ? publicApiSignaturesByDigest.get(recorded.harness.publicApiSignaturesSha256) : undefined;
  if (recorded.schemaVersion === 2 && !publicApiSignaturesText) throw new Error(`${relative(root, runPath)} references an unavailable public API signature snapshot ${recorded.harness.publicApiSignaturesSha256}`);
  const rebuilt = await buildAiRegressionRun(root, {
    suiteVersion: recorded.schemaVersion,
    runId: recorded.runId, responsesDir: relative(root, dirname(runPath)), executedAt: recorded.executedAt,
    settings: recorded.executor.settings, provider: recorded.executor.provider, model: recorded.executor.model,
    modelVersion: recorded.executor.modelVersion, conditionSessions: recorded.executor.conditionSessions,
    baseRevision: recorded.harness.baseRevision,
    catalogText,
    corpusText,
    publicApiSignaturesText,
    legacyPublicBoundary: recorded.harness.scorerSha256 === historicalScorerSha256[recorded.schemaVersion],
  });
  if (JSON.stringify(recorded) !== JSON.stringify(rebuilt)) throw new Error(`${relative(root, runPath)} does not replay exactly; regenerate it with ai:regressions:record`);
  if (recorded.results.length !== 21) throw new Error(`${relative(root, runPath)} must contain 3 conditions × 7 cases`);
  modelVersions.add(recorded.executor.modelVersion);
}
if (modelVersions.size < 2) throw new Error('measured conclusions require at least two model/version identities');
console.log(`[audit-ai-regression-results] OK — ${runPaths.length} measured runs replay exactly across ${modelVersions.size} model/version identities.`);
