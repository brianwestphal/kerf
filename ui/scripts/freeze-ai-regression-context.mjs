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
if (!conditionId || !outputPath) throw new Error('Usage: freeze-ai-regression-context --condition <id> --out <path>');
const conditions = JSON.parse(await readFile(resolve(root, 'ai-regressions/conditions.json'), 'utf8')).conditions;
const condition = conditions.find(({ id }) => id === conditionId);
if (!condition) throw new Error(`Unknown AI regression condition: ${conditionId}`);
const context = await buildAiRegressionContext(root, condition);
const output = resolve(root, outputPath);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ schemaVersion: 1, ...context }, null, 2)}\n`);
console.log(`[freeze-ai-regression-context] ${conditionId} -> ${outputPath} (${context.sha256})`);
