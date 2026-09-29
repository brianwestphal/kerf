// Measures the serialized attempt-one context of suite-v3 requests without
// calling a model: UTF-8 bytes of the canonical modelInput (the value recorded
// as a run attempt's contextBytes), of the guidance text alone, and a rough
// 4-bytes-per-token estimate. Real token counts come from the provider.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { canonicalAiRegressionJson } from './lib/ai-regression-run-v3.mjs';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const valuesAfter = (flag) =>
  process.argv.flatMap((value, index) =>
    process.argv[index - 1] === flag ? [value] : [],
  );
const corpus = JSON.parse(
  await readFile(resolve(root, 'ai-regressions/corpus-v3.json'), 'utf8'),
);
const cases = valuesAfter('--case');
const conditions = valuesAfter('--condition');
const selectedCases = cases.length ? cases : corpus.cases.map(({ id }) => id);
const selectedConditions = conditions.length
  ? conditions
  : ['guidance-only', 'markdown-reference-guidance-only'];
const bytes = (text) => Buffer.byteLength(text, 'utf8');
const rows = [];
for (const caseId of selectedCases)
  for (const condition of selectedConditions) {
    const { stdout } = await exec(
      process.execPath,
      [
        resolve(root, 'scripts/prepare-ai-regression.mjs'),
        '--suite',
        '3',
        '--case',
        caseId,
        '--condition',
        condition,
      ],
      { cwd: root, maxBuffer: 64 * 1024 * 1024 },
    );
    const request = JSON.parse(stdout);
    const contextBytes = bytes(canonicalAiRegressionJson(request.modelInput));
    rows.push({
      caseId,
      condition,
      guidanceSources: request.modelInput.guidanceContext.sources.length,
      guidanceBytes: bytes(request.modelInput.guidanceContext.text),
      contextBytes,
      estimatedTokens: Math.round(contextBytes / 4),
    });
  }
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(
    '| case | condition | guidance sources | guidance bytes | context bytes | est. tokens |',
  );
  console.log('| --- | --- | ---: | ---: | ---: | ---: |');
  for (const row of rows)
    console.log(
      `| ${row.caseId} | ${row.condition} | ${row.guidanceSources} | ${row.guidanceBytes} | ${row.contextBytes} | ${row.estimatedTokens} |`,
    );
}
