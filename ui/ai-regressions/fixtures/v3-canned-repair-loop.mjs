import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  calculateAiRegressionRunV3Metrics,
  canonicalAiRegressionJson,
  sha256AiRegression,
} from '../../scripts/lib/ai-regression-run-v3.mjs';

const digest = (value) => sha256AiRegression(canonicalAiRegressionJson(value));
const zero = '0'.repeat(64);
const [suiteText, compatibilityText, registryText] = await Promise.all([
  readFile(resolve(import.meta.dirname, '../suite-v3.json'), 'utf8'),
  readFile(resolve(import.meta.dirname, '../compatibility-v3.json'), 'utf8'),
  readFile(
    resolve(
      import.meta.dirname,
      '../../ai/application-ui-diagnostic-ids-v1.json',
    ),
    'utf8',
  ),
]);
const expectedDigests = {
  suiteSha256: sha256AiRegression(suiteText),
  compatibilitySha256: sha256AiRegression(compatibilityText),
  diagnosticRegistrySha256: sha256AiRegression(registryText),
};
const codesByStage = {
  static: [
    'static.component-selection',
    'static.consumer-reuse',
    'static.public-api',
    'static.wiring-cleanup',
    'static.composition',
    'static.geometry-ownership',
    'static.accessibility',
  ],
  compile: ['compile.types'],
  browser: ['browser.interaction', 'browser.keyboard', 'browser.responsive'],
  'human-visual': [
    'visual.hierarchy',
    'visual.rhythm',
    'visual.density',
    'visual.alignment',
    'visual.scroll-ownership',
  ],
};
const hardCodes = [
  ...codesByStage.static,
  ...codesByStage.compile,
  ...codesByStage.browser,
];

export function createCannedRepairLoopFixture() {
  const artifacts = new Map();
  const addJson = (path, value) => {
    const content = canonicalAiRegressionJson(value);
    artifacts.set(path, content);
    return { path, sha256: sha256AiRegression(content) };
  };
  const addRaw = (path, content) => {
    artifacts.set(path, content);
    return { path, sha256: sha256AiRegression(content) };
  };
  const modelInput = {
    prompt: 'Repair the existing application.',
    guidanceContext: { sha256: zero, sources: [], text: 'Frozen guidance.' },
    caseContext: { sha256: zero, sources: [] },
    responseContract: 'Return only JSON matching responseSchema.',
    responseSchema: { type: 'object' },
  };
  const modelInputSha256 = digest(modelInput);
  const response = {
    caseId: 'extend-application-navigation',
    files: { 'ux-demo/recipes/app-shell.tsx': 'fixed' },
  };
  const responseRef = addJson('shared/response.json', response);
  const rawResponseRef = addRaw(
    'shared/response.raw',
    canonicalAiRegressionJson(response),
  );
  const screenshots = ['wide', 'intermediate', 'narrow', 'zoom-200'].map(
    (context) => ({
      ...addRaw(`shared/${context}.png`, `canned ${context} screenshot bytes`),
      context,
    }),
  );
  const makeEvidence = (condition, ordinal, stage, pass, request) => {
    return addJson(`${condition}/a${ordinal}/${stage}.evidence.json`, {
      schemaVersion: 3,
      suiteId: 'kerf-ui-authoring-v3',
      caseId: 'extend-application-navigation',
      condition,
      attempt: ordinal,
      requestSha256: request.sha256,
      responseSha256: responseRef.sha256,
      stage,
      recordedAt: '2026-09-21T00:00:00.000Z',
      sourceTool: {
        name:
          stage === 'browser' ? '@kerfjs/ui/evaluator' : '@kerfjs/ui/doctor',
        packageVersion: '0.0.0-canned',
        reportVersion: 1,
        schemaVersion: 1,
      },
      durationMs: 1,
      environmentId: 'canned-environment',
      ...(stage === 'browser'
        ? {
            browserAssertions: [
              {
                id: 'case-specific-repair-flow',
                outcome: pass ? 'pass' : 'fail',
                detail: pass
                  ? 'The frozen interaction, keyboard, announcement, and remount oracle passed.'
                  : 'The frozen case oracle detected the seeded defect.',
              },
            ],
          }
        : stage === 'human-visual'
          ? { reviewer: 'canned-reviewer', artifacts: screenshots }
          : {}),
      records: codesByStage[stage].map((code, index) => ({
        code,
        outcome: stage === 'human-visual' || pass ? 'pass' : 'fail',
        ...(stage === 'human-visual' ? { rating: 1.5 } : {}),
        detail: pass ? 'Canned repair is clean.' : 'Canned defect detected.',
        diagnosticIds:
          stage === 'human-visual' || pass ? [] : [`KUI-CANNED-${index}`],
        adjudication:
          stage === 'human-visual' || pass ? 'not-reviewed' : 'true-positive',
        ...(stage === 'human-visual'
          ? { rationale: `Canned bounded rationale for ${code}.` }
          : pass
            ? {}
            : { adjudicator: 'canned-fixture', rationale: 'Seeded defect.' }),
      })),
    });
  };
  const environment = {
    node: '22.12.0',
    platform: 'canned',
    arch: 'canned',
    typescript: '7.0.0',
    playwright: '1.0.0',
    browsers: { chromium: 'canned', firefox: 'canned', webkit: 'canned' },
    lockfileSha256: zero,
  };
  const browser = {
    owner: '@kerfjs/ui/evaluator',
    url: 'http://127.0.0.1:4173/canned',
    contexts: ['wide', 'intermediate', 'narrow', 'zoom-200'],
    signalForwarded: true,
  };
  const makeAttempt = (condition, ordinal, pass, sessionId, feedback) => {
    const requestValue = {
      schemaVersion: 3,
      suiteId: 'kerf-ui-authoring-v3',
      caseId: 'extend-application-navigation',
      condition,
      attempt: ordinal,
      modelInput:
        ordinal === 1
          ? modelInput
          : {
              ...modelInput,
              repair: {
                priorResponseSha256: responseRef.sha256,
                currentFiles: response.files,
                feedback: feedback.map((stage) => ({
                  id: `canned.${stage}`,
                  severity: 'error',
                  stage,
                  message: `Repair the seeded ${stage} defect.`,
                })),
              },
            },
      modelInputSha256:
        ordinal === 1
          ? modelInputSha256
          : digest({
              ...modelInput,
              repair: {
                priorResponseSha256: responseRef.sha256,
                currentFiles: response.files,
                feedback: feedback.map((stage) => ({
                  id: `canned.${stage}`,
                  severity: 'error',
                  stage,
                  message: `Repair the seeded ${stage} defect.`,
                })),
              },
            }),
    };
    const request = addJson(
      `${condition}/a${ordinal}/request.json`,
      requestValue,
    );
    return {
      ordinal,
      request,
      rawResponse: rawResponseRef,
      response: responseRef,
      sessionId,
      startedAt: `2026-09-21T00:00:0${ordinal}.000Z`,
      providerDurationMs: 10,
      usage: {
        inputTokens: 6,
        outputTokens: 4,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 10,
        unavailableReason: null,
      },
      contextBytes: 100,
      tooling: { doctorCache: false, doctorBrowser: false, browser },
      feedbackExposed: ordinal === 1 ? [] : feedback,
      evidence: ['static', 'compile', 'browser', 'human-visual'].map((stage) =>
        makeEvidence(condition, ordinal, stage, pass, request),
      ),
    };
  };
  const definitions = [
    ['guidance-only', [], 1],
    ['guidance-static', ['static', 'compile'], 2],
    ['guidance-static-browser', ['static', 'compile', 'browser'], 2],
  ];
  const results = definitions.map(
    ([condition, feedback, count], conditionIndex) => {
      const sessionId = `canned-session-${conditionIndex + 1}`;
      const attempts = Array.from({ length: count }, (_, index) =>
        makeAttempt(condition, index + 1, index > 0, sessionId, feedback),
      );
      const clean = count > 1;
      return {
        caseId: 'extend-application-navigation',
        condition,
        replicate: 1,
        sessionId,
        initialModelInputSha256: modelInputSha256,
        attempts,
        terminalReason: clean ? 'clean' : 'max-attempts',
        metrics: {
          firstPass: false,
          clean,
          repairIterations: count - 1,
          residualDiagnostics: clean
            ? []
            : [
                'browser.assertion:case-specific-repair-flow',
                ...hardCodes,
              ].sort(),
          falsePositives: 0,
          adjudicatedFindings: clean ? 0 : hardCodes.length,
          runtimeMs: count * 14,
          runtimeByStageMs: {
            provider: count * 10,
            static: count,
            compile: count,
            browser: count,
            humanVisual: count,
          },
          totalTokens: count * 10,
          contextBytes: count * 100,
        },
      };
    },
  );
  const summary = calculateAiRegressionRunV3Metrics(results);
  return {
    artifacts,
    run: {
      schemaVersion: 3,
      evidence: 'canned',
      runId: 'canned-repair-loop-v3',
      executedAt: '2026-09-21T00:00:00.000Z',
      executor: {
        provider: 'fixture',
        model: 'deterministic-canned-model',
        modelVersion: '1',
        settings: {},
      },
      harness: {
        baseRevision: '0'.repeat(40),
        ...expectedDigests,
        environment,
      },
      results,
      summary,
      limitations: [
        'Deterministic canned evidence exercises the repair protocol but is not a measured model result.',
      ],
    },
    environment,
  };
}
