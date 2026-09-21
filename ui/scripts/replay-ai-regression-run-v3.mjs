import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
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
const runPath = resolve(root, required('--run'));
const artifactRoot = resolve(
  root,
  valueAfter('--artifacts') ?? dirname(runPath),
);
const environmentPath = valueAfter('--environment');
const [run, context, environment] = await Promise.all([
  readFile(runPath, 'utf8').then(JSON.parse),
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
if (replay.errors.length) throw new Error(replay.errors.join('\n'));
console.log(
  `[replay-ai-regression-run-v3] ${run.runId}: ${replay.status}; browser artifacts ${replay.browserArtifactsCompared ? 'compared' : 'not compared'}`,
);
if (replay.status === 'incompatible-environment') process.exitCode = 2;
