import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canonicalAiRegressionJson,
  detectAiRegressionEnvironment,
  loadAiRegressionV3Context,
  readAiRegressionArtifact,
  replayAiRegressionRunV3,
} from './lib/ai-regression-run-v3.mjs';

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
const draftPath = resolve(root, required('--draft'));
const artifactRoot = resolve(
  root,
  valueAfter('--artifacts') ?? dirname(draftPath),
);
const environmentPath = valueAfter('--environment');
const [run, context, environment] = await Promise.all([
  readFile(draftPath, 'utf8').then(JSON.parse),
  loadAiRegressionV3Context(root),
  environmentPath
    ? readFile(resolve(root, environmentPath), 'utf8').then(JSON.parse)
    : detectAiRegressionEnvironment(root),
]);
const replay = await replayAiRegressionRunV3(run, {
  context,
  environment,
  readArtifact: (path) => readAiRegressionArtifact(artifactRoot, path),
});
if (replay.status !== 'replayed')
  throw new Error(
    `Cannot record invalid suite-v3 run:\n${replay.errors.join('\n')}`,
  );
await writeFile(
  resolve(root, required('--out')),
  canonicalAiRegressionJson(replay.run),
);
console.log(
  `[record-ai-regression-run-v3] ${run.runId}: ${run.summary.cleanCells}/${run.summary.totalCells} terminal clean`,
);
