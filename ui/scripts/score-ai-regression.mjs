import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scoreAiRegression } from './lib/ai-regression-score.mjs';
import { scoreAiRegressionV2 } from './lib/ai-regression-score-v2.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const caseId = valueAfter('--case');
const responsePath = valueAfter('--response');
const suiteVersion = Number(valueAfter('--suite') ?? 1);
if (!caseId || !responsePath) {
  console.error(
    'Usage: npm run ai:regressions:score -- --suite <1|2> --case <id> --response <response.json>',
  );
  process.exit(2);
}
if (suiteVersion === 3)
  throw new Error(
    'Suite v3 uses separate static, compile, browser, and human-visual evidence records; it has no single structural score command.',
  );
if (suiteVersion !== 1 && suiteVersion !== 2)
  throw new Error(`Unknown AI regression suite: ${suiteVersion}`);
const [corpus, catalog, response, overrides] = await Promise.all([
  readFile(resolve(root, 'ai-regressions/corpus.json'), 'utf8').then(
    JSON.parse,
  ),
  readFile(resolve(root, 'ai/component-catalog.json'), 'utf8').then(JSON.parse),
  readFile(resolve(process.cwd(), responsePath), 'utf8').then(JSON.parse),
  suiteVersion === 2
    ? readFile(
        resolve(root, 'ai-regressions/corpus-v2-overrides.json'),
        'utf8',
      ).then(JSON.parse)
    : Promise.resolve(null),
]);
const testCase = corpus.cases.find(({ id }) => id === caseId);
if (!testCase) throw new Error(`Unknown AI regression case: ${caseId}`);
const definition =
  suiteVersion === 2
    ? { ...testCase, ...overrides.cases[testCase.id] }
    : testCase;
const result =
  suiteVersion === 2
    ? scoreAiRegressionV2(definition, response, catalog)
    : scoreAiRegression(definition, response, catalog);
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
