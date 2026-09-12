import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAiRegressionRun } from './lib/ai-regression-run.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const required = (flag) => {
  const value = valueAfter(flag);
  if (!value) throw new Error(`Missing ${flag}`);
  return value;
};
const outputPath = required('--out');
const manifest = await buildAiRegressionRun(root, {
  runId: required('--run-id'),
  responsesDir: required('--responses-dir'),
  executedAt: required('--executed-at'),
  settings: JSON.parse(required('--settings')),
  provider: required('--provider'),
  model: required('--model'),
  modelVersion: required('--model-version'),
  conditionSessions: JSON.parse(required('--condition-sessions')),
  baseRevision: required('--base-revision'),
});

await writeFile(resolve(root, outputPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[record-ai-regression-run] ${manifest.runId}: ${manifest.summary.map(({ condition, staticHardPasses, totalCases }) => `${condition} ${staticHardPasses}/${totalCases}`).join(', ')}`);
