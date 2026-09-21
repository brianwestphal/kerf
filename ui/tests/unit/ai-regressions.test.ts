import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createCannedRepairLoopFixture } from '../../ai-regressions/fixtures/v3-canned-repair-loop.mjs';
import { compileAiRegressionResponse } from '../../scripts/lib/ai-regression-compile.mjs';
import {
  AI_REGRESSION_V1_CONTEXT_SNAPSHOTS,
  buildAiRegressionContext,
} from '../../scripts/lib/ai-regression-context.mjs';
import {
  summarizeAiRegressionEvidenceV3,
  validateAiRegressionEvidenceV3,
  validateAiRegressionResponseV3,
} from '../../scripts/lib/ai-regression-contract-v3.mjs';
import {
  canonicalAiRegressionJson,
  createAiRegressionToolOptionsV3,
  detectAiRegressionEnvironment,
  isSafeAiRegressionArtifactPath,
  loadAiRegressionV3Context,
  normalizeAiRegressionReport,
  readAiRegressionArtifact,
  replayAiRegressionRunV3,
  sha256AiRegression,
  validateAiRegressionMeasuredCohortV3,
  validateAiRegressionRunV3,
} from '../../scripts/lib/ai-regression-run-v3.mjs';
import { scoreAiRegression } from '../../scripts/lib/ai-regression-score.mjs';
import { scoreAiRegressionV2 } from '../../scripts/lib/ai-regression-score-v2.mjs';

const compileTestTimeout = 15_000;
const root = resolve(import.meta.dirname, '../..');
const readJson = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));

describe('local AI regression foundation', () => {
  it('assembles each context deterministically with source hashes', async () => {
    const conditions = await readJson('ai-regressions/conditions.json');
    for (const condition of conditions.conditions) {
      const snapshotPath = AI_REGRESSION_V1_CONTEXT_SNAPSHOTS.get(condition.id);
      const first = await buildAiRegressionContext(root, condition, {
        snapshotPath,
      });
      const second = await buildAiRegressionContext(root, condition, {
        snapshotPath,
      });
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
      const response = await readJson(
        `ai-regressions/fixtures/${fixture.file}`,
      );
      const testCase = corpus.cases.find(
        ({ id }: { id: string }) => id === response.caseId,
      );
      const result = scoreAiRegression(testCase, response, catalog);
      expect(result.pass, fixture.file).toBe(fixture.pass);
      const failed = result.checks
        .filter(({ pass }: { pass: boolean }) => !pass)
        .map(({ code }: { code: string }) => code);
      expect(failed, fixture.file).toEqual(
        expect.arrayContaining(fixture.mustFail),
      );
    }
  });

  it('accepts equivalent public wiring imports while the base scorer keeps its exact-import boundary', async () => {
    const [corpus, overrides, catalog, resize, delegation] = await Promise.all([
      readJson('ai-regressions/corpus.json'),
      readJson('ai-regressions/corpus-v2-overrides.json'),
      readJson('ai/component-catalog.json'),
      readJson(
        'ai-regressions/fixtures/responses/v2-resize-dedicated-import.json',
      ),
      readJson(
        'ai-regressions/fixtures/responses/v2-delegate-root-import.json',
      ),
    ]);
    for (const [response, code] of [
      [resize, 'wiring:wireResizableRegions'],
      [delegation, 'wiring:delegated-actions'],
    ] as const) {
      const base = corpus.cases.find(
        ({ id }: { id: string }) => id === response.caseId,
      );
      const definition = { ...base, ...overrides.cases[response.caseId] };
      const result = scoreAiRegressionV2(definition, response, catalog);
      expect(
        result.checks.find((check: { code: string }) => check.code === code)
          ?.pass,
      ).toBe(true);
    }
    const frozen = scoreAiRegression(corpus.cases[0], resize, catalog);
    expect(
      frozen.checks.find(
        ({ code }: { code: string }) => code === 'wiring:wireResizableRegions',
      )?.pass,
    ).toBe(false);
  });

  it('allows cataloged public-class anatomy and rejects private class or tag descendants', async () => {
    const [
      corpus,
      catalog,
      publicOverride,
      privateClass,
      privateTag,
      privateNamespacedClass,
    ] = await Promise.all([
      readJson('ai-regressions/corpus.json'),
      readJson('ai/component-catalog.json'),
      readJson(
        'ai-regressions/fixtures/responses/public-anatomy-override.json',
      ),
      readJson(
        'ai-regressions/fixtures/responses/private-class-descendant.json',
      ),
      readJson('ai-regressions/fixtures/responses/private-tag-descendant.json'),
      readJson(
        'ai-regressions/fixtures/responses/private-namespaced-class.json',
      ),
    ]);
    const definition = corpus.cases.find(
      ({ id }: { id: string }) => id === 'compact-exclusive-choice',
    );
    const publicResult = scoreAiRegression(definition, publicOverride, catalog);
    expect(
      publicResult.checks.find(
        ({ code }: { code: string }) => code === 'css:public-boundary',
      )?.pass,
    ).toBe(true);
    const withStyles = (styles: string) => ({
      ...publicOverride,
      files: { ...publicOverride.files, 'styles.css': styles },
    });
    const publicRelational = withStyles(
      '.workspace-choice .kui-segmented-control:has(.kui-segmented-control__item) { color: inherit; }',
    );
    expect(
      scoreAiRegression(definition, publicRelational, catalog).checks.find(
        ({ code }: { code: string }) => code === 'css:public-boundary',
      )?.pass,
    ).toBe(true);
    const privateRelational = withStyles(
      '.workspace-choice .kui-segmented-control:has(button) { color: inherit; }',
    );
    expect(
      scoreAiRegression(definition, privateRelational, catalog).checks.find(
        ({ code }: { code: string }) => code === 'css:public-boundary',
      )?.pass,
    ).toBe(false);
    const nestedPrivateRelational = withStyles(
      '.workspace-choice .kui-segmented-control:has(:is(button)) { color: inherit; }',
    );
    expect(
      scoreAiRegression(
        definition,
        nestedPrivateRelational,
        catalog,
      ).checks.find(
        ({ code }: { code: string }) => code === 'css:public-boundary',
      )?.pass,
    ).toBe(false);
    const privateSiblingDescendant = withStyles(
      '.workspace-choice .kui-segmented-control .kui-segmented-control__item + button { color: inherit; }',
    );
    expect(
      scoreAiRegression(
        definition,
        privateSiblingDescendant,
        catalog,
      ).checks.find(
        ({ code }: { code: string }) => code === 'css:public-boundary',
      )?.pass,
    ).toBe(false);
    const publicRelationalList = withStyles(
      '.workspace-choice .kui-segmented-control:has(.kui-segmented-control__item, .kui-segmented-control__item:hover) { color: inherit; }',
    );
    expect(
      scoreAiRegression(definition, publicRelationalList, catalog).checks.find(
        ({ code }: { code: string }) => code === 'css:public-boundary',
      )?.pass,
    ).toBe(true);
    const negatedPrivateRelational = withStyles(
      '.workspace-choice .kui-segmented-control:has(:not(.kui-segmented-control__item)) { color: inherit; }',
    );
    expect(
      scoreAiRegression(
        definition,
        negatedPrivateRelational,
        catalog,
      ).checks.find(
        ({ code }: { code: string }) => code === 'css:public-boundary',
      )?.pass,
    ).toBe(false);
    for (const response of [privateClass, privateTag, privateNamespacedClass]) {
      const result = scoreAiRegression(definition, response, catalog);
      expect(
        result.checks.find(
          ({ code }: { code: string }) => code === 'css:public-boundary',
        )?.pass,
      ).toBe(false);
    }
  });

  it(
    'records deterministic opt-in compile evidence against the published signatures',
    async () => {
      const valid = {
        caseId: 'public-api-signatures',
        files: {
          'app.tsx':
            `import { TokenSearchField } from '@kerfjs/ui/token-search-field';\n` +
            `import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';\n` +
            `declare const root: HTMLElement;\n` +
            `const stop = wireResizableRegions(root, { onCommit: () => undefined });\n` +
            `const field = <TokenSearchField id="search" label="Search" />;\n` +
            `const dialog = <wa-dialog label="Confirm"><wa-button appearance="accent">Save</wa-button></wa-dialog>;\n` +
            `stop(); void field; void dialog;\n`,
          'app.css': '.app { display: block; }\n',
        },
      };
      const first = await compileAiRegressionResponse(root, valid);
      const second = await compileAiRegressionResponse(root, valid);
      expect(first).toEqual(second);
      expect(first.passed).toBe(true);
      expect(first.compiledFiles).toBe(1);
      expect(first.packages.map(({ name }) => name)).toEqual([
        '@kerfjs/ui',
        'kerfjs',
      ]);
      expect(first.responseSha256).toMatch(/^[a-f0-9]{64}$/);
    },
    compileTestTimeout,
  );

  it('reports incompatible callbacks and props without executing generated code', async () => {
    const result = await compileAiRegressionResponse(root, {
      files: {
        'app.tsx':
          `import { TokenSearchField } from '@kerfjs/ui/token-search-field';\n` +
          `import { wireResizableRegions } from '@kerfjs/ui/wire-resizable-regions';\n` +
          `declare const root: HTMLElement;\n` +
          `wireResizableRegions(root, { onResize: () => undefined });\n` +
          `const field = <TokenSearchField id="search" label="Search" unknownProp />;\n` +
          `void field;\n`,
      },
    });
    expect(result.passed).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(
      result.diagnostics.every(
        ({ file }) => !file || file.startsWith('response/'),
      ),
    ).toBe(true);
  });

  it(
    'compiles and scores semantic ListHeader counts while rejecting each ambiguous composition',
    async () => {
      const [
        catalog,
        valid,
        competing,
        missingLabel,
        numericBadge,
        labelCount,
        directValid,
        directInvalid,
        invalidLiteral,
      ] = await Promise.all([
        readJson('ai/component-catalog.json'),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-valid.json',
        ),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-invalid.json',
        ),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-missing-label.json',
        ),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-numeric-badge.json',
        ),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-in-label.json',
        ),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-direct-valid.json',
        ),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-direct-invalid.json',
        ),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-invalid-literal.json',
        ),
      ]);
      const validResult = await compileAiRegressionResponse(root, valid);
      const competingResult = await compileAiRegressionResponse(
        root,
        competing,
      );
      const missingLabelResult = await compileAiRegressionResponse(
        root,
        missingLabel,
      );
      expect(validResult.passed).toBe(true);
      expect(competingResult.passed).toBe(false);
      expect(missingLabelResult.passed).toBe(false);

      const definition = {
        id: 'list-header-count-contract',
        requiredComponentIds: ['list-header'],
        requiredImports: ['@kerfjs/ui/list-header'],
        requiredClasses: [],
        requiredWiring: [],
        forbiddenComponentIds: [],
        forbiddenPatterns: [],
        forbidHardcodedSpacing: false,
        maxScrollOwners: 0,
        requiresFollowUp: false,
      };
      const expected = [
        [valid, []],
        [competing, ['duplicate:list-header-count-badge']],
        [missingLabel, ['a11y:list-header-count-label']],
        [numericBadge, ['duplicate:list-header-numeric-badge']],
        [labelCount, ['duplicate:list-header-label-count']],
        [directValid, []],
        [
          directInvalid,
          [
            'a11y:list-header-count-label',
            'duplicate:list-header-count-badge',
            'duplicate:list-header-numeric-badge',
            'duplicate:list-header-label-count',
          ],
        ],
        [invalidLiteral, ['a11y:list-header-count-value']],
      ] as const;
      for (const [fixture, failedCodes] of expected) {
        const result = scoreAiRegression(definition, fixture, catalog);
        const failed = result.checks
          .filter(({ pass }) => !pass)
          .map(({ code }) => code);
        expect(failed, JSON.stringify(fixture)).toEqual(failedCodes);
      }
      const historical = scoreAiRegression(definition, numericBadge, catalog, {
        legacyPublicBoundary: true,
      });
      expect(
        historical.checks.some(
          ({ code }) => code === 'duplicate:list-header-numeric-badge',
        ),
      ).toBe(false);
    },
    compileTestTimeout,
  );

  it(
    'compiles direct ListHeader calls and invalid numeric literals without executing them',
    async () => {
      const [directValid, invalidLiteral] = await Promise.all([
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-direct-valid.json',
        ),
        readJson(
          'ai-regressions/fixtures/responses/list-header-count-invalid-literal.json',
        ),
      ]);
      const [directValidResult, invalidLiteralResult] = await Promise.all([
        compileAiRegressionResponse(root, directValid),
        compileAiRegressionResponse(root, invalidLiteral),
      ]);
      expect(directValidResult.passed).toBe(true);
      expect(invalidLiteralResult.passed).toBe(true);
    },
    compileTestTimeout,
  );

  it('rejects response paths that could escape the compile sandbox', async () => {
    await expect(
      compileAiRegressionResponse(root, {
        files: { '../escape.ts': 'export {}' },
      }),
    ).rejects.toThrow('Unsafe or unsupported response file path');
  });

  it('keeps suite-v3 evidence stages distinct and applies bounded visual thresholds', async () => {
    const contract = await readJson('ai-regressions/quality-contract-v3.json');
    const common = {
      schemaVersion: 3 as const,
      suiteId: 'kerf-ui-authoring-v3' as const,
      caseId: 'extend-application-navigation',
      condition: 'guidance-static-browser',
      attempt: 1,
      requestSha256: 'c'.repeat(64),
      responseSha256: 'a'.repeat(64),
      recordedAt: '2026-09-21T00:00:00Z',
      sourceTool: {
        name: '@kerfjs/ui/doctor',
        packageVersion: '1.0.0',
        reportVersion: 1,
        schemaVersion: 1,
      },
      durationMs: 1,
      environmentId: 'test',
    };
    const staticEvidence = {
      ...common,
      stage: 'static' as const,
      records: [
        {
          code: 'static.component-selection',
          outcome: 'pass' as const,
          detail: 'Uses the selected public primitive.',
          diagnosticIds: [],
        },
      ],
    };
    const visualEvidence = {
      ...common,
      stage: 'human-visual' as const,
      reviewer: 'reviewer-1',
      artifacts: ['wide', 'intermediate', 'narrow', 'zoom-200'].map(
        (context, index) => ({
          path: `${context}.png`,
          sha256: (index + 10).toString(16).repeat(64),
          context,
        }),
      ),
      records: contract.diagnostics
        .filter(({ stage }: { stage: string }) => stage === 'human-visual')
        .map(({ code }: { code: string }) => ({
          code,
          outcome: 'pass' as const,
          rating: 1.5,
          detail: 'Meets the recorded v3 baseline threshold.',
          rationale:
            'The named reviewer applied the recorded dimension rubric.',
          diagnosticIds: [],
        })),
    };
    expect(validateAiRegressionEvidenceV3(contract, staticEvidence)).toEqual(
      [],
    );
    expect(validateAiRegressionEvidenceV3(contract, visualEvidence)).toEqual(
      [],
    );
    expect(
      validateAiRegressionEvidenceV3(contract, {
        ...visualEvidence,
        artifacts: Array.from({ length: 4 }, () => ({
          path: 'generic.png',
          sha256: 'b'.repeat(64),
          context: 'wide',
        })),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('map exactly once'),
        expect.stringContaining('unique paths and hashes'),
      ]),
    );
    expect(
      validateAiRegressionEvidenceV3(contract, {
        ...staticEvidence,
        records: [
          {
            code: 'visual.hierarchy',
            outcome: 'pass',
            rating: 2,
            detail: 'Wrong evidence stage.',
            diagnosticIds: [],
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        'visual.hierarchy belongs to human-visual, not static',
      ]),
    );
    expect(
      summarizeAiRegressionEvidenceV3(contract, [
        staticEvidence,
        visualEvidence,
      ]),
    ).toMatchObject({
      hardPass: true,
      hardChecks: 1,
      visualMean: 1.5,
      visualPass: true,
    });
  });

  it('rejects suite-v3 edits outside the frozen application context', () => {
    const definition = {
      id: 'contextual-case',
      editableFiles: ['existing/app.tsx', 'existing/app.css'],
    };
    expect(
      validateAiRegressionResponseV3(definition, {
        caseId: 'contextual-case',
        files: { 'existing/app.tsx': 'export const changed = true;\n' },
      }),
    ).toEqual([]);
    expect(
      validateAiRegressionResponseV3(definition, {
        caseId: 'wrong-case',
        files: { 'replacement.tsx': 'export {};\n' },
      }),
    ).toEqual([
      'response.caseId must be contextual-case',
      'replacement.tsx is not editable in contextual-case',
    ]);
  });

  it('replays the canned repair loop and derives first-pass, repair, residual, timing, usage, and adjudication metrics', async () => {
    const fixture = createCannedRepairLoopFixture();
    const context = await loadAiRegressionV3Context(root);
    const { conditions, compatibility } = context;
    expect(
      validateAiRegressionRunV3(fixture.run, conditions, compatibility),
    ).toEqual([]);
    const replay = await replayAiRegressionRunV3(fixture.run, {
      context,
      environment: fixture.environment,
      readArtifact: async (path) => fixture.artifacts.get(path)!,
    });
    expect(replay).toMatchObject({
      status: 'replayed',
      errors: [],
      browserArtifactsCompared: true,
      run: {
        summary: {
          totalCells: 3,
          firstPassSuccesses: 0,
          cleanCells: 2,
          repairIterations: [0, 1, 1],
          falsePositives: 0,
          adjudicatedFindings: 11,
          runtimeMs: 70,
          runtimeByStageMs: {
            provider: 50,
            static: 5,
            compile: 5,
            browser: 5,
            humanVisual: 5,
          },
          totalTokens: 50,
          contextBytes: 500,
        },
      },
    });
    expect(canonicalAiRegressionJson(replay.run)).toBe(
      canonicalAiRegressionJson(fixture.run),
    );
  });

  it('fails closed on mutated artifacts, policy leakage, session reuse, and unequal initial model inputs', async () => {
    const fixture = createCannedRepairLoopFixture();
    const context = await loadAiRegressionV3Context(root);
    const { conditions, compatibility } = context;
    const changed = JSON.parse(JSON.stringify(fixture.run));
    changed.results[1].attempts[1].feedbackExposed.push('browser');
    changed.results[1].sessionId = changed.results[0].sessionId;
    changed.results[1].attempts.forEach(
      (attempt: { sessionId: string }) =>
        (attempt.sessionId = changed.results[0].sessionId),
    );
    changed.results[2].initialModelInputSha256 = 'f'.repeat(64);
    expect(
      validateAiRegressionRunV3(changed, conditions, compatibility),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('reuses session'),
        expect.stringContaining('attempt-1 model inputs differ'),
        expect.stringContaining('outside its policy'),
      ]),
    );
    const firstPath = fixture.run.results[0].attempts[0].response.path;
    const replay = await replayAiRegressionRunV3(fixture.run, {
      context,
      environment: fixture.environment,
      readArtifact: async (path) =>
        path === firstPath ? 'mutated' : fixture.artifacts.get(path)!,
    });
    expect(replay.status).toBe('invalid');
    expect(replay.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('hash mismatch')]),
    );
  });

  it('reports incompatible browser environments and normalizes volatile timestamps without claiming artifact comparison', async () => {
    const fixture = createCannedRepairLoopFixture();
    const context = await loadAiRegressionV3Context(root);
    const replay = await replayAiRegressionRunV3(fixture.run, {
      context,
      environment: { ...fixture.environment, platform: 'different' },
      readArtifact: async (path) => fixture.artifacts.get(path)!,
    });
    expect(replay).toMatchObject({
      status: 'incompatible-environment',
      errors: [],
      browserArtifactsCompared: false,
    });
    expect(
      normalizeAiRegressionReport({
        recordedAt: 'now',
        nested: { startedAt: 'later' },
      }),
    ).toEqual({
      recordedAt: '<normalized-timestamp>',
      nested: { startedAt: '<normalized-timestamp>' },
    });
    expect(isSafeAiRegressionArtifactPath('../escape.json')).toBe(false);
    expect(isSafeAiRegressionArtifactPath('/absolute.json')).toBe(false);
    expect(isSafeAiRegressionArtifactPath('case/attempt.json')).toBe(true);
    const detected = await detectAiRegressionEnvironment(root);
    expect(Object.keys(detected.browsers).sort()).toEqual([
      'chromium',
      'firefox',
      'webkit',
    ]);
    const defaultWithoutEngines = await detectAiRegressionEnvironment(root, {
      browsers: {},
    });
    const noEngineReplay = await replayAiRegressionRunV3(fixture.run, {
      context,
      environment: {
        ...fixture.environment,
        browsers: defaultWithoutEngines.browsers,
      },
      readArtifact: async (path) => fixture.artifacts.get(path)!,
    });
    expect(noEngineReplay).toMatchObject({
      status: 'incompatible-environment',
      browserArtifactsCompared: false,
    });
  });

  it('normalizes nested source reports, gates browser artifacts by environment, and requires visual evidence for measured runs', async () => {
    const fixture = createCannedRepairLoopFixture();
    const context = await loadAiRegressionV3Context(root);
    const staticRef = fixture.run.results[0].attempts[0].evidence[0];
    const staticEvidence = JSON.parse(fixture.artifacts.get(staticRef.path)!);
    const rawReport = canonicalAiRegressionJson({
      recordedAt: '2026-09-21T12:00:00.000Z',
      diagnostics: [{ id: 'KUI-CANNED-0' }],
    });
    const normalizedReport = canonicalAiRegressionJson({
      recordedAt: '<normalized-timestamp>',
      diagnostics: [{ id: 'KUI-CANNED-0' }],
    });
    fixture.artifacts.set('reports/raw.json', rawReport);
    fixture.artifacts.set('reports/normalized.json', normalizedReport);
    staticEvidence.rawReport = {
      path: 'reports/raw.json',
      sha256: sha256AiRegression(rawReport),
    };
    staticEvidence.normalizedReport = {
      path: 'reports/normalized.json',
      sha256: sha256AiRegression(normalizedReport),
    };
    const staticBytes = canonicalAiRegressionJson(staticEvidence);
    fixture.artifacts.set(staticRef.path, staticBytes);
    staticRef.sha256 = sha256AiRegression(staticBytes);

    const browserRef = fixture.run.results[0].attempts[0].evidence[2];
    const browserEvidence = JSON.parse(fixture.artifacts.get(browserRef.path)!);
    browserEvidence.artifacts = [
      { path: 'screenshots/wide.png', sha256: 'f'.repeat(64) },
    ];
    fixture.artifacts.set('screenshots/wide.png', 'different bytes');
    const browserBytes = canonicalAiRegressionJson(browserEvidence);
    fixture.artifacts.set(browserRef.path, browserBytes);
    browserRef.sha256 = sha256AiRegression(browserBytes);

    const incompatible = await replayAiRegressionRunV3(fixture.run, {
      context,
      environment: { ...fixture.environment, platform: 'different' },
      readArtifact: async (path) => fixture.artifacts.get(path)!,
    });
    expect(incompatible).toMatchObject({
      status: 'incompatible-environment',
      errors: [],
      browserArtifactsCompared: false,
    });
    const compatible = await replayAiRegressionRunV3(fixture.run, {
      context,
      environment: fixture.environment,
      readArtifact: async (path) => fixture.artifacts.get(path)!,
    });
    expect(compatible.status).toBe('invalid');
    expect(compatible.errors).toContain(
      'screenshots/wide.png browser artifact hash mismatch',
    );

    const measured = createCannedRepairLoopFixture();
    measured.run.evidence = 'measured';
    for (const result of measured.run.results) {
      const visualRef = result.attempts.at(-1).evidence[3];
      const visual = JSON.parse(measured.artifacts.get(visualRef.path)!);
      delete visual.reviewer;
      delete visual.artifacts;
      visual.records.pop();
      delete visual.records[0].rationale;
      const bytes = canonicalAiRegressionJson(visual);
      measured.artifacts.set(visualRef.path, bytes);
      visualRef.sha256 = sha256AiRegression(bytes);
    }
    const measuredReplay = await replayAiRegressionRunV3(measured.run, {
      context,
      environment: measured.environment,
      readArtifact: async (path) => measured.artifacts.get(path)!,
    });
    expect(measuredReplay.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('human-visual evidence requires reviewer'),
        expect.stringContaining(
          'visual.hierarchy requires a rating and written rationale',
        ),
        expect.stringContaining('requires exactly one visual.scroll-ownership'),
      ]),
    );
  });

  it('rejects schema-invalid responses, incomplete required diagnostics, and stale harness digests even when hashes are internally consistent', async () => {
    const context = await loadAiRegressionV3Context(root);
    const fixture = createCannedRepairLoopFixture();
    const responseRef = fixture.run.results[0].attempts[0].response;
    const invalidResponse = canonicalAiRegressionJson({
      caseId: 'extend-application-navigation',
      files: { 'ux-demo/recipes/app-shell.tsx': 'fixed' },
      unexpected: true,
    });
    fixture.artifacts.set(responseRef.path, invalidResponse);
    const invalidResponseSha = sha256AiRegression(invalidResponse);
    for (const result of fixture.run.results)
      for (const attempt of result.attempts)
        attempt.response.sha256 = invalidResponseSha;

    const staticRef = fixture.run.results[0].attempts[0].evidence[0];
    const staticEvidence = JSON.parse(fixture.artifacts.get(staticRef.path)!);
    staticEvidence.records = staticEvidence.records.filter(
      ({ code }: { code: string }) => code !== 'static.consumer-reuse',
    );
    const staticBytes = canonicalAiRegressionJson(staticEvidence);
    fixture.artifacts.set(staticRef.path, staticBytes);
    staticRef.sha256 = sha256AiRegression(staticBytes);
    fixture.run.harness.suiteSha256 = 'f'.repeat(64);

    const replay = await replayAiRegressionRunV3(fixture.run, {
      context,
      environment: fixture.environment,
      readArtifact: async (path) => fixture.artifacts.get(path)!,
    });
    expect(replay.status).toBe('invalid');
    expect(replay.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('response schema'),
        expect.stringContaining('requires exactly one static.consumer-reuse'),
        expect.stringContaining('suiteSha256 does not match'),
      ]),
    );
  });

  it('requires a balanced full case-condition-replicate matrix for each of two measured identities', async () => {
    const context = await loadAiRegressionV3Context(root);
    const makeRun = (modelVersion: string) => ({
      executor: { provider: 'fixture', model: 'model', modelVersion },
      results: context.corpus.cases.flatMap(({ id }: { id: string }) =>
        context.conditions.conditions.flatMap(
          ({ id: condition }: { id: string }) =>
            [1, 2, 3].map((replicate) => ({
              caseId: id,
              condition,
              replicate,
            })),
        ),
      ),
    });
    const balanced = [makeRun('one'), makeRun('two')];
    expect(
      validateAiRegressionMeasuredCohortV3(
        balanced,
        context.corpus,
        context.conditions,
      ),
    ).toEqual([]);
    balanced[1].results.pop();
    balanced[0].results.push({ ...balanced[0].results[0] });
    expect(
      validateAiRegressionMeasuredCohortV3(
        balanced,
        context.corpus,
        context.conditions,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('is duplicated'),
        expect.stringContaining('requires balanced replicates 1,2,3'),
      ]),
    );
  });

  it('rejects symlinked artifacts even when their resolved target stays inside the artifact root', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kerf-ai-replay-'));
    try {
      await writeFile(join(directory, 'target.json'), '{}\n');
      await symlink('target.json', join(directory, 'linked.json'));
      await expect(
        readAiRegressionArtifact(directory, 'linked.json'),
      ).rejects.toThrow('cannot be a symlink');
    } finally {
      await rm(directory, { recursive: true });
    }
  });

  it('constructs cache-disabled static doctor and explicit evaluator options with one AbortSignal', async () => {
    const compatibility = await readJson(
      'ai-regressions/compatibility-v3.json',
    );
    const controller = new AbortController();
    const options = createAiRegressionToolOptionsV3({
      compatibility,
      url: 'http://127.0.0.1:4173/case',
      recordedAt: '2026-09-21T00:00:00.000Z',
      signal: controller.signal,
    });
    expect(options.doctor).toMatchObject({
      mode: 'full',
      cache: false,
      config: { schemaVersion: 1, cache: false, stages: { browser: false } },
    });
    expect(options.doctor.signal).toBe(controller.signal);
    expect(options.evaluator).toMatchObject({
      url: 'http://127.0.0.1:4173/case',
      recordedAt: '2026-09-21T00:00:00.000Z',
      contexts: compatibility.browserContexts,
    });
    expect(options.evaluator.signal).toBe(controller.signal);
  });
});
