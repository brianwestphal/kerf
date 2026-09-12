import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAiRegressionRun } from './lib/ai-regression-run.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const entries = await readdir(resolve(root, 'ai-regressions/results'), { recursive: true, withFileTypes: true });
const runPaths = entries.filter((entry) => entry.isFile() && entry.name === 'run.json').map((entry) => resolve(entry.parentPath ?? entry.path, entry.name)).sort();
if (runPaths.length < 2) throw new Error('measured conclusions require at least two checked-in model runs');

const modelVersions = new Set();
for (const runPath of runPaths) {
  const recorded = JSON.parse(await readFile(runPath, 'utf8'));
  const rebuilt = await buildAiRegressionRun(root, {
    runId: recorded.runId, responsesDir: relative(root, dirname(runPath)), executedAt: recorded.executedAt,
    settings: recorded.executor.settings, provider: recorded.executor.provider, model: recorded.executor.model,
    modelVersion: recorded.executor.modelVersion, conditionSessions: recorded.executor.conditionSessions,
    baseRevision: recorded.harness.baseRevision,
  });
  if (JSON.stringify(recorded) !== JSON.stringify(rebuilt)) throw new Error(`${relative(root, runPath)} does not replay exactly; regenerate it with ai:regressions:record`);
  if (recorded.results.length !== 21) throw new Error(`${relative(root, runPath)} must contain 3 conditions × 7 cases`);
  modelVersions.add(recorded.executor.modelVersion);
}
if (modelVersions.size < 2) throw new Error('measured conclusions require at least two model/version identities');
console.log(`[audit-ai-regression-results] OK — ${runPaths.length} measured runs replay exactly across ${modelVersions.size} model/version identities.`);
