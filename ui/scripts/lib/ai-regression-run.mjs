import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import ts from 'typescript';

import { buildAiRegressionContext } from './ai-regression-context.mjs';
import { scoreAiRegression } from './ai-regression-score.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const read = (root, path) => readFile(resolve(root, path), 'utf8');
const dimensionChecks = {
  reuse: /^(?:import|component|avoid|duplicate):/,
  wiring: /^wiring:/,
  layout: /^(?:class|layout|css):/,
  accessibility: /^a11y:/,
  escalation: /^follow-up:/,
};

function validateResponse(response, responsePath) {
  if (!response || typeof response !== 'object' || Array.isArray(response)
      || Object.keys(response).some((key) => !['caseId', 'files', 'followUp'].includes(key))) throw new Error(`${responsePath} has unknown or invalid response fields`);
  if (typeof response.caseId !== 'string' || !response.caseId) throw new Error(`${responsePath} must declare caseId`);
  if (!response.files || typeof response.files !== 'object' || Array.isArray(response.files) || Object.keys(response.files).length === 0
      || Object.values(response.files).some((value) => typeof value !== 'string')) throw new Error(`${responsePath} must contain a non-empty string-valued files object`);
  if (response.followUp !== undefined && (!response.followUp || typeof response.followUp !== 'object' || Array.isArray(response.followUp)
      || Object.keys(response.followUp).some((key) => !['suggested', 'concept'].includes(key))
      || typeof response.followUp.suggested !== 'boolean' || typeof response.followUp.concept !== 'string')) throw new Error(`${responsePath} has an invalid followUp`);
}

export async function buildAiRegressionRun(root, options) {
  const paths = ['ai-regressions/corpus.json', 'ai-regressions/conditions.json', 'ai/component-catalog.json', 'scripts/lib/ai-regression-score.mjs', 'ai/component-catalog.schema.json', 'ai-regressions/corpus.schema.json', 'ai-regressions/conditions.schema.json', 'ai-regressions/response.schema.json', 'ai-regressions/run.schema.json'];
  const [corpusText, conditionsText, catalogText, scorerText, catalogSchemaText, corpusSchemaText, conditionsSchemaText, responseSchemaText, runSchemaText] = await Promise.all(paths.map((path) => read(root, path)));
  const corpus = JSON.parse(corpusText);
  const conditions = JSON.parse(conditionsText).conditions;
  const catalog = JSON.parse(catalogText);
  if (new Set(Object.values(options.conditionSessions)).size !== conditions.length
      || conditions.some(({ id }) => !options.conditionSessions[id])) throw new Error('each condition requires its own unique session identity');

  const contextRecords = [];
  const results = [];
  for (const condition of conditions) {
    const context = await buildAiRegressionContext(root, condition);
    contextRecords.push({ id: condition.id, sourceRevision: context.sourceRevision, sha256: context.sha256, sources: context.sources });
    for (const [requestIndex, testCase] of corpus.cases.entries()) {
      const responsePath = `${options.responsesDir}/${condition.id}/${testCase.id}.json`;
      const responseText = await read(root, responsePath);
      const response = JSON.parse(responseText);
      validateResponse(response, responsePath);
      if (response.caseId !== testCase.id) throw new Error(`${responsePath} declares caseId ${response.caseId}`);
      const promptText = (await read(root, `ai-regressions/${testCase.prompt}`)).trim();
      results.push({ caseId: testCase.id, condition: condition.id, sessionId: options.conditionSessions[condition.id], requestOrdinal: requestIndex + 1, promptSha256: sha256(promptText), contextSha256: context.sha256, responsePath, responseSha256: sha256(responseText), score: scoreAiRegression(testCase, response, catalog) });
    }
  }

  const summary = conditions.map((condition) => {
    const conditionResults = results.filter((result) => result.condition === condition.id);
    return {
      condition: condition.id,
      staticHardPasses: conditionResults.filter((result) => result.score.pass).length,
      totalCases: conditionResults.length,
      dimensions: Object.fromEntries(Object.entries(dimensionChecks).map(([dimension, pattern]) => {
        const applicable = conditionResults.filter((result) => result.score.checks.some((check) => pattern.test(check.code)));
        return [dimension, { passes: applicable.filter((result) => result.score.dimensions[dimension]).length, applicable: applicable.length }];
      })),
    };
  });

  return {
    schemaVersion: 1, evidence: 'measured', runId: options.runId, executedAt: options.executedAt,
    executor: { provider: options.provider, model: options.model, modelVersion: options.modelVersion, settings: options.settings, isolationUnit: 'condition', conditionSessions: options.conditionSessions },
    harness: {
      baseRevision: options.baseRevision, corpusSha256: sha256(corpusText), conditionsSha256: sha256(conditionsText), catalogSha256: sha256(catalogText), scorerSha256: sha256(scorerText),
      catalogSchemaSha256: sha256(catalogSchemaText), corpusSchemaSha256: sha256(corpusSchemaText), conditionsSchemaSha256: sha256(conditionsSchemaText), responseSchemaSha256: sha256(responseSchemaText), runSchemaSha256: sha256(runSchemaText), typescriptVersion: ts.version,
    },
    conditions: contextRecords, results, summary,
  };
}
