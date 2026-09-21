import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import ts from 'typescript';

import {
  AI_REGRESSION_V1_CONTEXT_SNAPSHOTS,
  AI_REGRESSION_V2_CONTEXT_SNAPSHOTS,
  buildAiRegressionContext,
} from './ai-regression-context.mjs';
import { scoreAiRegression } from './ai-regression-score.mjs';
import { scoreAiRegressionV2 } from './ai-regression-score-v2.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const read = (root, path) => readFile(resolve(root, path), 'utf8');
const dimensionChecks = {
  reuse: /^(?:import|component|avoid|duplicate):/,
  wiring: /^wiring:/,
  layout: /^(?:class|layout|css):/,
  accessibility: /^a11y:/,
  escalation: /^follow-up:/,
};
// Checked-in measured manifests used the pre-public-anatomy boundary. Replay
// that branch with the exact hashes they recorded instead of relabeling old
// scores under the current catalog-aware oracle.
export const historicalScorerSha256 = {
  1: '3abcb4b450067d744c5756b43fbefe2ced9bd35c0c34d3f9b83e18dc659e1768',
  2: '109bf8fba2a93036874b43b21b3235d18792b17bc292876b67df4aa6b87a27be',
};

function validateResponse(response, responsePath) {
  if (
    !response ||
    typeof response !== 'object' ||
    Array.isArray(response) ||
    Object.keys(response).some(
      (key) => !['caseId', 'files', 'followUp'].includes(key),
    )
  )
    throw new Error(`${responsePath} has unknown or invalid response fields`);
  if (typeof response.caseId !== 'string' || !response.caseId)
    throw new Error(`${responsePath} must declare caseId`);
  if (
    !response.files ||
    typeof response.files !== 'object' ||
    Array.isArray(response.files) ||
    Object.keys(response.files).length === 0 ||
    Object.values(response.files).some((value) => typeof value !== 'string')
  )
    throw new Error(
      `${responsePath} must contain a non-empty string-valued files object`,
    );
  if (
    response.followUp !== undefined &&
    (!response.followUp ||
      typeof response.followUp !== 'object' ||
      Array.isArray(response.followUp) ||
      Object.keys(response.followUp).some(
        (key) => !['suggested', 'concept'].includes(key),
      ) ||
      typeof response.followUp.suggested !== 'boolean' ||
      typeof response.followUp.concept !== 'string')
  )
    throw new Error(`${responsePath} has an invalid followUp`);
}

export async function buildAiRegressionRun(root, options) {
  const suiteVersion = options.suiteVersion ?? 1;
  if (suiteVersion !== 1 && suiteVersion !== 2)
    throw new Error(`Unknown AI regression suite: ${suiteVersion}`);
  const v2 = suiteVersion === 2;
  const conditionsPath = v2
    ? 'ai-regressions/conditions-v2.json'
    : 'ai-regressions/conditions.json';
  const conditionsSchemaPath = v2
    ? 'ai-regressions/conditions-v2.schema.json'
    : 'ai-regressions/conditions.schema.json';
  const scorerPath = v2
    ? 'scripts/lib/ai-regression-score-v2.mjs'
    : 'scripts/lib/ai-regression-score.mjs';
  const runSchemaPath = v2
    ? 'ai-regressions/run-v2.schema.json'
    : 'ai-regressions/run.schema.json';
  const paths = [
    'ai-regressions/corpus.json',
    conditionsPath,
    'ai/component-catalog.json',
    scorerPath,
    'ai/component-catalog.schema.json',
    'ai-regressions/corpus.schema.json',
    conditionsSchemaPath,
    'ai-regressions/response.schema.json',
    runSchemaPath,
  ];
  const [
    corpusText,
    conditionsText,
    catalogText,
    scorerText,
    catalogSchemaText,
    corpusSchemaText,
    conditionsSchemaText,
    responseSchemaText,
    runSchemaText,
  ] = await Promise.all(
    paths.map((path) => {
      if (
        path === 'ai-regressions/corpus.json' &&
        options.corpusText !== undefined
      )
        return Promise.resolve(options.corpusText);
      if (
        path === 'ai/component-catalog.json' &&
        options.catalogText !== undefined
      )
        return Promise.resolve(options.catalogText);
      return read(root, path);
    }),
  );
  const [suiteText, overridesText, publicApiSignaturesText, baseScorerText] = v2
    ? await Promise.all([
        read(root, 'ai-regressions/suite-v2.json'),
        read(root, 'ai-regressions/corpus-v2-overrides.json'),
        options.publicApiSignaturesText !== undefined
          ? Promise.resolve(options.publicApiSignaturesText)
          : read(root, 'ai/public-api-signatures-v1.md'),
        read(root, 'scripts/lib/ai-regression-score.mjs'),
      ])
    : [null, null, null, null];
  const corpus = JSON.parse(corpusText);
  const conditions = JSON.parse(conditionsText).conditions;
  const catalog = JSON.parse(catalogText);
  const overrides = overridesText ? JSON.parse(overridesText) : null;
  if (
    new Set(Object.values(options.conditionSessions)).size !==
      conditions.length ||
    conditions.some(({ id }) => !options.conditionSessions[id])
  )
    throw new Error('each condition requires its own unique session identity');

  const contextRecords = [];
  const results = [];
  for (const condition of conditions) {
    const context = await buildAiRegressionContext(root, condition, {
      snapshotPath: (v2
        ? AI_REGRESSION_V2_CONTEXT_SNAPSHOTS
        : AI_REGRESSION_V1_CONTEXT_SNAPSHOTS
      ).get(condition.id),
    });
    contextRecords.push({
      id: condition.id,
      sourceRevision: context.sourceRevision,
      sha256: context.sha256,
      sources: context.sources,
    });
    for (const [requestIndex, testCase] of corpus.cases.entries()) {
      const responsePath = `${options.responsesDir}/${condition.id}/${testCase.id}.json`;
      const responseText = await read(root, responsePath);
      const response = JSON.parse(responseText);
      validateResponse(response, responsePath);
      if (response.caseId !== testCase.id)
        throw new Error(`${responsePath} declares caseId ${response.caseId}`);
      const promptText = (
        await read(root, `ai-regressions/${testCase.prompt}`)
      ).trim();
      const caseDefinition = v2
        ? { ...testCase, ...overrides?.cases?.[testCase.id] }
        : testCase;
      const scoreOptions = options.legacyPublicBoundary
        ? { legacyPublicBoundary: true }
        : undefined;
      const score = v2
        ? scoreAiRegressionV2(caseDefinition, response, catalog, scoreOptions)
        : scoreAiRegression(caseDefinition, response, catalog, scoreOptions);
      results.push({
        caseId: testCase.id,
        condition: condition.id,
        sessionId: options.conditionSessions[condition.id],
        requestOrdinal: requestIndex + 1,
        promptSha256: sha256(promptText),
        contextSha256: context.sha256,
        responsePath,
        responseSha256: sha256(responseText),
        score,
      });
    }
  }

  const summary = conditions.map((condition) => {
    const conditionResults = results.filter(
      (result) => result.condition === condition.id,
    );
    return {
      condition: condition.id,
      staticHardPasses: conditionResults.filter((result) => result.score.pass)
        .length,
      totalCases: conditionResults.length,
      dimensions: Object.fromEntries(
        Object.entries(dimensionChecks).map(([dimension, pattern]) => {
          const applicable = conditionResults.filter((result) =>
            result.score.checks.some((check) => pattern.test(check.code)),
          );
          return [
            dimension,
            {
              passes: applicable.filter(
                (result) => result.score.dimensions[dimension],
              ).length,
              applicable: applicable.length,
            },
          ];
        }),
      ),
    };
  });

  const shared = {
    evidence: 'measured',
    runId: options.runId,
    executedAt: options.executedAt,
    executor: {
      provider: options.provider,
      model: options.model,
      modelVersion: options.modelVersion,
      settings: options.settings,
      isolationUnit: 'condition',
      conditionSessions: options.conditionSessions,
    },
  };
  const commonHarness = {
    baseRevision: options.baseRevision,
    corpusSha256: sha256(corpusText),
    conditionsSha256: sha256(conditionsText),
    catalogSha256: sha256(catalogText),
    scorerSha256: options.legacyPublicBoundary
      ? historicalScorerSha256[suiteVersion]
      : sha256(v2 ? `${baseScorerText}\0${scorerText}` : scorerText),
    catalogSchemaSha256: sha256(catalogSchemaText),
    corpusSchemaSha256: sha256(corpusSchemaText),
    conditionsSchemaSha256: sha256(conditionsSchemaText),
    responseSchemaSha256: sha256(responseSchemaText),
    runSchemaSha256: sha256(runSchemaText),
    typescriptVersion: ts.version,
  };
  if (v2)
    return {
      schemaVersion: 2,
      ...shared,
      harness: {
        baseRevision: commonHarness.baseRevision,
        suiteId: 'kerf-ui-authoring-v2',
        suiteSha256: sha256(suiteText),
        corpusSha256: commonHarness.corpusSha256,
        conditionsSha256: commonHarness.conditionsSha256,
        catalogSha256: commonHarness.catalogSha256,
        scorerSha256: commonHarness.scorerSha256,
        overridesSha256: sha256(overridesText),
        publicApiSignaturesSha256: sha256(publicApiSignaturesText),
        catalogSchemaSha256: commonHarness.catalogSchemaSha256,
        corpusSchemaSha256: commonHarness.corpusSchemaSha256,
        conditionsSchemaSha256: commonHarness.conditionsSchemaSha256,
        responseSchemaSha256: commonHarness.responseSchemaSha256,
        runSchemaSha256: commonHarness.runSchemaSha256,
        typescriptVersion: commonHarness.typescriptVersion,
      },
      conditions: contextRecords,
      results,
      summary,
    };
  return {
    schemaVersion: 1,
    evidence: 'measured',
    runId: options.runId,
    executedAt: options.executedAt,
    executor: shared.executor,
    harness: commonHarness,
    conditions: contextRecords,
    results,
    summary,
  };
}
