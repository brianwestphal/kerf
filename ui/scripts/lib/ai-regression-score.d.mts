export interface AiRegressionCheck {
  code: string;
  pass: boolean;
  detail: string;
}

export interface AiRegressionScore {
  caseId: string;
  pass: boolean;
  dimensions: Record<'reuse' | 'wiring' | 'layout' | 'accessibility' | 'escalation', boolean>;
  checks: AiRegressionCheck[];
}

export function scoreAiRegression(caseDefinition: Record<string, unknown>, response: Record<string, unknown>, catalog: { entries: Array<Record<string, unknown>> }): AiRegressionScore;
