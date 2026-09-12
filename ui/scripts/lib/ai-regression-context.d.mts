export interface AiRegressionCondition {
  id: string;
  sourceRevision?: string;
  expectedSha256?: string;
  sourcePaths: string[];
}

export interface AiRegressionContext {
  condition: string;
  sourceRevision: string | null;
  sources: Array<{ path: string; sha256: string }>;
  sha256: string;
  text: string;
}

export const AI_REGRESSION_V1_CONTEXT_SNAPSHOTS: ReadonlyMap<string, string>;
export function buildAiRegressionContext(root: string, condition: AiRegressionCondition, options?: { snapshotPath?: string }): Promise<AiRegressionContext>;
