import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCannedRepairLoopFixture } from '../ai-regressions/fixtures/v3-canned-repair-loop.mjs';
import {
  detectAiRegressionEnvironment,
  loadAiRegressionV3Context,
  readAiRegressionArtifact,
  replayAiRegressionRunV3,
  validateAiRegressionMeasuredCohortV3,
} from './lib/ai-regression-run-v3.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const environmentPath = valueAfter('--environment');
const [context, currentEnvironment] = await Promise.all([
  loadAiRegressionV3Context(root),
  environmentPath
    ? readFile(resolve(root, environmentPath), 'utf8').then(JSON.parse)
    : detectAiRegressionEnvironment(root),
]);
const canned = createCannedRepairLoopFixture();
const cannedReplay = await replayAiRegressionRunV3(canned.run, {
  context,
  environment: canned.environment,
  readArtifact: async (path) => canned.artifacts.get(path),
});
if (cannedReplay.status !== 'replayed')
  throw new Error(
    `Canned suite-v3 replay failed:\n${cannedReplay.errors.join('\n')}`,
  );

const resultRoot = resolve(root, 'ai-regressions/results-v3');
const findRuns = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    },
  );
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? findRuns(resolve(directory, entry.name))
        : Promise.resolve(
            entry.name === 'run.json' ? [resolve(directory, entry.name)] : [],
          ),
    ),
  );
  return nested.flat();
};
const runPaths = await findRuns(resultRoot);
const measured = [];
let incompatibleEnvironments = 0;
for (const runPath of runPaths) {
  const run = JSON.parse(await readFile(runPath, 'utf8'));
  const replay = await replayAiRegressionRunV3(run, {
    context,
    environment: currentEnvironment,
    readArtifact: (path) => readAiRegressionArtifact(dirname(runPath), path),
  });
  if (replay.status === 'invalid')
    throw new Error(`${runPath} failed replay:\n${replay.errors.join('\n')}`);
  if (replay.status === 'incompatible-environment')
    incompatibleEnvironments += 1;
  if (run.evidence === 'measured') measured.push(run);
}
if (measured.length) {
  const cohortErrors = validateAiRegressionMeasuredCohortV3(
    measured,
    context.corpus,
    context.conditions,
  );
  if (cohortErrors.length)
    throw new Error(
      `Measured suite-v3 cohort is incomplete:\n${cohortErrors.join('\n')}`,
    );
}
console.log(
  `[audit-ai-regression-results-v3] OK — canned repair replayed; ${measured.length} measured runs audited; ${incompatibleEnvironments} skipped exact browser artifact comparison for an incompatible environment.`,
);
