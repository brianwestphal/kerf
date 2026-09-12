import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scoreAiRegression } from './lib/ai-regression-score.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const caseId = valueAfter('--case');
const responsePath = valueAfter('--response');
if (!caseId || !responsePath) {
  console.error('Usage: npm run ai:regressions:score -- --case <id> --response <response.json>');
  process.exit(2);
}
const [corpus, catalog, response] = await Promise.all([
  readFile(resolve(root, 'ai-regressions/corpus.json'), 'utf8').then(JSON.parse),
  readFile(resolve(root, 'ai/component-catalog.json'), 'utf8').then(JSON.parse),
  readFile(resolve(process.cwd(), responsePath), 'utf8').then(JSON.parse),
]);
const testCase = corpus.cases.find(({ id }) => id === caseId);
if (!testCase) throw new Error(`Unknown AI regression case: ${caseId}`);
const result = scoreAiRegression(testCase, response, catalog);
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
