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

export function buildAiRegressionContext(root: string, condition: AiRegressionCondition): Promise<AiRegressionContext>;
