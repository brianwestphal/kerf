import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { compileAiRegressionResponse } from '../../scripts/lib/ai-regression-compile.mjs';
import { AI_REGRESSION_V1_CONTEXT_SNAPSHOTS, buildAiRegressionContext } from '../../scripts/lib/ai-regression-context.mjs';
import { scoreAiRegression } from '../../scripts/lib/ai-regression-score.mjs';
import { scoreAiRegressionV2 } from '../../scripts/lib/ai-regression-score-v2.mjs';

const root = resolve(import.meta.dirname, '../..');
const readJson = async (path: string) => JSON.parse(await readFile(resolve(root, path), 'utf8'));

describe('local AI regression foundation', () => {
  it('assembles each context deterministically with source hashes', async () => {
    const conditions = await readJson('ai-regressions/conditions.json');
    for (const condition of conditions.conditions) {
      const snapshotPath = AI_REGRESSION_V1_CONTEXT_SNAPSHOTS.get(condition.id);
      const first = await buildAiRegressionContext(root, condition, { snapshotPath });
      const second = await buildAiRegressionContext(root, condition, { snapshotPath });
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

  it('accepts equivalent public wiring imports while the base scorer keeps its exact-import boundary', async () => {
    const [corpus, overrides, catalog, resize, delegation] = await Promise.all([
      readJson('ai-regressions/corpus.json'),
      readJson('ai-regressions/corpus-v2-overrides.json'),
      readJson('ai/component-catalog.json'),
      readJson('ai-regressions/fixtures/responses/v2-resize-dedicated-import.json'),
      readJson('ai-regressions/fixtures/responses/v2-delegate-root-import.json'),
    ]);
    for (const [response, code] of [[resize, 'wiring:wireResizableRegions'], [delegation, 'wiring:delegated-actions']] as const) {
      const base = corpus.cases.find(({ id }: { id: string }) => id === response.caseId);
      const definition = { ...base, ...overrides.cases[response.caseId] };
      const result = scoreAiRegressionV2(definition, response, catalog);
      expect(result.checks.find((check: { code: string }) => check.code === code)?.pass).toBe(true);
    }
    const frozen = scoreAiRegression(corpus.cases[0], resize, catalog);
    expect(frozen.checks.find(({ code }: { code: string }) => code === 'wiring:wireResizableRegions')?.pass).toBe(false);
  });

  it('allows cataloged public-class anatomy and rejects private class or tag descendants', async () => {
    const [corpus, catalog, publicOverride, privateClass, privateTag, privateNamespacedClass] = await Promise.all([
      readJson('ai-regressions/corpus.json'),
      readJson('ai/component-catalog.json'),
      readJson('ai-regressions/fixtures/responses/public-anatomy-override.json'),
      readJson('ai-regressions/fixtures/responses/private-class-descendant.json'),
      readJson('ai-regressions/fixtures/responses/private-tag-descendant.json'),
      readJson('ai-regressions/fixtures/responses/private-namespaced-class.json'),
    ]);
    const definition = corpus.cases.find(({ id }: { id: string }) => id === 'compact-exclusive-choice');
    const publicResult = scoreAiRegression(definition, publicOverride, catalog);
    expect(publicResult.checks.find(({ code }: { code: string }) => code === 'css:public-boundary')?.pass).toBe(true);
    const withStyles = (styles: string) => ({ ...publicOverride, files: { ...publicOverride.files, 'styles.css': styles } });
    const publicRelational = withStyles('.workspace-choice .kui-segmented-control:has(.kui-segmented-control__item) { color: inherit; }');
    expect(scoreAiRegression(definition, publicRelational, catalog).checks.find(({ code }: { code: string }) => code === 'css:public-boundary')?.pass).toBe(true);
    const privateRelational = withStyles('.workspace-choice .kui-segmented-control:has(button) { color: inherit; }');
    expect(scoreAiRegression(definition, privateRelational, catalog).checks.find(({ code }: { code: string }) => code === 'css:public-boundary')?.pass).toBe(false);
    const nestedPrivateRelational = withStyles('.workspace-choice .kui-segmented-control:has(:is(button)) { color: inherit; }');
    expect(scoreAiRegression(definition, nestedPrivateRelational, catalog).checks.find(({ code }: { code: string }) => code === 'css:public-boundary')?.pass).toBe(false);
    const privateSiblingDescendant = withStyles('.workspace-choice .kui-segmented-control .kui-segmented-control__item + button { color: inherit; }');
    expect(scoreAiRegression(definition, privateSiblingDescendant, catalog).checks.find(({ code }: { code: string }) => code === 'css:public-boundary')?.pass).toBe(false);
    const publicRelationalList = withStyles('.workspace-choice .kui-segmented-control:has(.kui-segmented-control__item, .kui-segmented-control__item:hover) { color: inherit; }');
    expect(scoreAiRegression(definition, publicRelationalList, catalog).checks.find(({ code }: { code: string }) => code === 'css:public-boundary')?.pass).toBe(true);
    const negatedPrivateRelational = withStyles('.workspace-choice .kui-segmented-control:has(:not(.kui-segmented-control__item)) { color: inherit; }');
    expect(scoreAiRegression(definition, negatedPrivateRelational, catalog).checks.find(({ code }: { code: string }) => code === 'css:public-boundary')?.pass).toBe(false);
    for (const response of [privateClass, privateTag, privateNamespacedClass]) {
      const result = scoreAiRegression(definition, response, catalog);
      expect(result.checks.find(({ code }: { code: string }) => code === 'css:public-boundary')?.pass).toBe(false);
    }
  });

  it('records deterministic opt-in compile evidence against the published signatures', async () => {
    const valid = {
      caseId: 'public-api-signatures',
      files: {
        'app.tsx': `import { TokenSearchField } from '@kerfjs/ui/token-search-field';\n`+
          `import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';\n`+
          `declare const root: HTMLElement;\n`+
          `const stop = wireResizableRegions(root, { onCommit: () => undefined });\n`+
          `const field = <TokenSearchField id="search" label="Search" />;\n`+
          `const dialog = <wa-dialog label="Confirm"><wa-button appearance="accent">Save</wa-button></wa-dialog>;\n`+
          `stop(); void field; void dialog;\n`,
        'app.css': '.app { display: block; }\n',
      },
    };
    const first = await compileAiRegressionResponse(root, valid);
    const second = await compileAiRegressionResponse(root, valid);
    expect(first).toEqual(second);
    expect(first.passed).toBe(true);
    expect(first.compiledFiles).toBe(1);
    expect(first.packages.map(({ name }) => name)).toEqual(['@kerfjs/ui', 'kerfjs']);
    expect(first.responseSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('reports incompatible callbacks and props without executing generated code', async () => {
    const result = await compileAiRegressionResponse(root, {
      files: {
        'app.tsx': `import { TokenSearchField } from '@kerfjs/ui/token-search-field';\n`+
          `import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';\n`+
          `declare const root: HTMLElement;\n`+
          `wireResizableRegions(root, { onResize: () => undefined });\n`+
          `const field = <TokenSearchField id="search" label="Search" unknownProp />;\n`+
          `void field;\n`,
      },
    });
    expect(result.passed).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.every(({ file }) => !file || file.startsWith('response/'))).toBe(true);
  });

  it('rejects response paths that could escape the compile sandbox', async () => {
    await expect(compileAiRegressionResponse(root, { files: { '../escape.ts': 'export {}' } }))
      .rejects.toThrow('Unsafe or unsupported response file path');
  });
});
