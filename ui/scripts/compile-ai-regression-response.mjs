import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileAiRegressionResponse } from './lib/ai-regression-compile.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const responsePath = valueAfter('--response');
if (!responsePath)
  throw new Error(
    'Usage: compile-ai-regression-response --response <response.json> [--out <evidence.json>]',
  );
const responseText = await readFile(resolve(root, responsePath), 'utf8');
const evidence = await compileAiRegressionResponse(
  root,
  JSON.parse(responseText),
  responseText,
);
const output = `${JSON.stringify(evidence, null, 2)}\n`;
const outputPath = valueAfter('--out');
if (outputPath) await writeFile(resolve(root, outputPath), output);
else process.stdout.write(output);
if (!evidence.passed) process.exitCode = 1;
