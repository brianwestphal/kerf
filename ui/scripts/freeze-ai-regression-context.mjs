import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAiRegressionContext } from './lib/ai-regression-context.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const conditionId = valueAfter('--condition');
const outputPath = valueAfter('--out');
const suiteVersion = Number(valueAfter('--suite') ?? 1);
if (!conditionId || !outputPath)
  throw new Error(
    'Usage: freeze-ai-regression-context --suite <1|2> --condition <id> --out <path>',
  );
if (suiteVersion !== 1 && suiteVersion !== 2)
  throw new Error(`Unknown AI regression suite: ${suiteVersion}`);
const conditionsPath =
  suiteVersion === 2
    ? 'ai-regressions/conditions-v2.json'
    : 'ai-regressions/conditions.json';
const conditions = JSON.parse(
  await readFile(resolve(root, conditionsPath), 'utf8'),
).conditions;
const condition = conditions.find(({ id }) => id === conditionId);
if (!condition)
  throw new Error(`Unknown AI regression condition: ${conditionId}`);
const context = await buildAiRegressionContext(root, condition);
const output = resolve(root, outputPath);
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `${JSON.stringify({ schemaVersion: 1, ...context }, null, 2)}\n`,
);
console.log(
  `[freeze-ai-regression-context] ${conditionId} -> ${outputPath} (${context.sha256})`,
);
