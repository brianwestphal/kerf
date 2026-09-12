import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildAiRegressionContext } from '../../scripts/lib/ai-regression-context.mjs';
import { scoreAiRegression } from '../../scripts/lib/ai-regression-score.mjs';

const root = resolve(import.meta.dirname, '../..');
const readJson = async (path: string) => JSON.parse(await readFile(resolve(root, path), 'utf8'));

describe('local AI regression foundation', () => {
  it('assembles each context deterministically with source hashes', async () => {
    const conditions = await readJson('ai-regressions/conditions.json');
    for (const condition of conditions.conditions) {
      const first = await buildAiRegressionContext(root, condition);
      const second = await buildAiRegressionContext(root, condition);
      expect(first).toEqual(second);
      expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(first.sources).toHaveLength(condition.sourcePaths.length);
    }
  });

  it('requires real imported invocations and rejects the pinned adversarial failures', async () => {
    const [corpus, catalog, expected] = await Promise.all([
      readJson('ai-regressions/corpus.json'),
      readJson('ai/component-catalog.json'),
      readJson('ai-regressions/fixtures/expected-scores.json'),
    ]);
    for (const fixture of expected.fixtures) {
      const response = await readJson(`ai-regressions/fixtures/${fixture.file}`);
      const testCase = corpus.cases.find(({ id }: { id: string }) => id === response.caseId);
      const result = scoreAiRegression(testCase, response, catalog);
      expect(result.pass, fixture.file).toBe(fixture.pass);
      const failed = result.checks.filter(({ pass }: { pass: boolean }) => !pass).map(({ code }: { code: string }) => code);
      expect(failed, fixture.file).toEqual(expect.arrayContaining(fixture.mustFail));
    }
  });
});
