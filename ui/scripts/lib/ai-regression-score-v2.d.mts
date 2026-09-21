import type {
  AiRegressionScore,
  AiRegressionScoreOptions,
} from './ai-regression-score.mjs';

export function scoreAiRegressionV2(
  caseDefinition: Record<string, any>,
  response: Record<string, any>,
  catalog: { entries: Array<Record<string, any>> },
  options?: AiRegressionScoreOptions,
): AiRegressionScore;
