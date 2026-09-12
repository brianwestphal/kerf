import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AI_REGRESSION_V1_CONTEXT_SNAPSHOTS, AI_REGRESSION_V2_CONTEXT_SNAPSHOTS, buildAiRegressionContext } from './lib/ai-regression-context.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const suiteVersion = Number(valueAfter('--suite') ?? 1);
if (suiteVersion !== 1 && suiteVersion !== 2) throw new Error(`Unknown AI regression suite: ${suiteVersion}`);
const [corpus, conditions, responseSchema, suite] = await Promise.all([
  readJson('ai-regressions/corpus.json'),
  readJson(suiteVersion === 2 ? 'ai-regressions/conditions-v2.json' : 'ai-regressions/conditions.json'),
  readJson('ai-regressions/response.schema.json'),
  suiteVersion === 2 ? readJson('ai-regressions/suite-v2.json') : Promise.resolve(null),
]);
const requestedCase = valueAfter('--case');
const requestedCondition = valueAfter('--condition');
const selectedCases = requestedCase ? corpus.cases.filter(({ id }) => id === requestedCase) : corpus.cases;
const selectedConditions = requestedCondition ? conditions.conditions.filter(({ id }) => id === requestedCondition) : conditions.conditions;
if (!selectedCases.length) throw new Error(`Unknown AI regression case: ${requestedCase}`);
if (!selectedConditions.length) throw new Error(`Unknown AI regression condition: ${requestedCondition}`);

const requests = [];
for (const testCase of selectedCases) {
  const prompt = (await readFile(resolve(root, 'ai-regressions', testCase.prompt), 'utf8')).trim();
  for (const condition of selectedConditions) {
    const context = await buildAiRegressionContext(root, condition, {
      snapshotPath: (suiteVersion === 1 ? AI_REGRESSION_V1_CONTEXT_SNAPSHOTS : AI_REGRESSION_V2_CONTEXT_SNAPSHOTS).get(condition.id),
    });
    requests.push({
      schemaVersion: suiteVersion,
      ...(suite ? { suite: { id: suite.id } } : {}),
      caseId: testCase.id,
      condition: condition.id,
      prompt,
      promptSha256: createHash('sha256').update(prompt).digest('hex'),
      context: { sourceRevision: context.sourceRevision, sources: context.sources, sha256: context.sha256, text: context.text },
      responseContract: 'Return only JSON matching responseSchema. Put every proposed TypeScript, TSX, and CSS file in files. Do not include prose outside JSON.',
      responseSchema,
    });
  }
}
console.log(JSON.stringify(requests.length === 1 ? requests[0] : requests, null, 2));
