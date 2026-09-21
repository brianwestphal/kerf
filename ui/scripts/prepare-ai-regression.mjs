import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AI_REGRESSION_V1_CONTEXT_SNAPSHOTS,
  AI_REGRESSION_V2_CONTEXT_SNAPSHOTS,
  buildAiRegressionContext,
} from './lib/ai-regression-context.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = async (path) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const suiteVersion = Number(valueAfter('--suite') ?? 1);
if (![1, 2, 3].includes(suiteVersion))
  throw new Error(`Unknown AI regression suite: ${suiteVersion}`);
const [corpus, conditions, responseSchema, suite] = await Promise.all([
  readJson(
    suiteVersion === 3
      ? 'ai-regressions/corpus-v3.json'
      : 'ai-regressions/corpus.json',
  ),
  readJson(
    suiteVersion >= 2
      ? 'ai-regressions/conditions-v2.json'
      : 'ai-regressions/conditions.json',
  ),
  readJson(
    suiteVersion === 3
      ? 'ai-regressions/response-v3.schema.json'
      : 'ai-regressions/response.schema.json',
  ),
  suiteVersion >= 2
    ? readJson(`ai-regressions/suite-v${suiteVersion}.json`)
    : Promise.resolve(null),
]);
const requestedCase = valueAfter('--case');
const requestedCondition = valueAfter('--condition');
const selectedCases = requestedCase
  ? corpus.cases.filter(({ id }) => id === requestedCase)
  : corpus.cases;
const selectedConditions = requestedCondition
  ? conditions.conditions.filter(({ id }) => id === requestedCondition)
  : conditions.conditions;
if (!selectedCases.length)
  throw new Error(`Unknown AI regression case: ${requestedCase}`);
if (!selectedConditions.length)
  throw new Error(`Unknown AI regression condition: ${requestedCondition}`);

const requests = [];
for (const testCase of selectedCases) {
  const prompt = (
    await readFile(resolve(root, 'ai-regressions', testCase.prompt), 'utf8')
  ).trim();
  const caseContext =
    suiteVersion === 3
      ? await Promise.all(
          testCase.contextFiles.map(async (path) => {
            const content = await readFile(resolve(root, path), 'utf8');
            return {
              path,
              sha256: createHash('sha256').update(content).digest('hex'),
              content,
              editable: testCase.editableFiles.includes(path),
            };
          }),
        )
      : null;
  for (const condition of selectedConditions) {
    const context = await buildAiRegressionContext(root, condition, {
      snapshotPath: (suiteVersion === 1
        ? AI_REGRESSION_V1_CONTEXT_SNAPSHOTS
        : AI_REGRESSION_V2_CONTEXT_SNAPSHOTS
      ).get(condition.id),
    });
    requests.push({
      schemaVersion: suiteVersion,
      ...(suite ? { suite: { id: suite.id } } : {}),
      caseId: testCase.id,
      condition: condition.id,
      prompt,
      promptSha256: createHash('sha256').update(prompt).digest('hex'),
      context: {
        sourceRevision: context.sourceRevision,
        sources: context.sources,
        sha256: context.sha256,
        text: context.text,
      },
      ...(caseContext
        ? {
            caseContext: {
              sources: caseContext,
              sha256: createHash('sha256')
                .update(
                  caseContext
                    .map(
                      ({ path, content }) =>
                        `--- ${path} ---\n${content.trim()}\n`,
                    )
                    .join('\n'),
                )
                .digest('hex'),
            },
          }
        : {}),
      responseContract:
        suiteVersion === 3
          ? 'Return only JSON matching responseSchema. Put the complete contents of every changed editable file in files, keyed by its original repository-relative path. Do not return unchanged files or prose outside JSON.'
          : 'Return only JSON matching responseSchema. Put every proposed TypeScript, TSX, and CSS file in files. Do not include prose outside JSON.',
      responseSchema,
    });
  }
}
console.log(
  JSON.stringify(requests.length === 1 ? requests[0] : requests, null, 2),
);
