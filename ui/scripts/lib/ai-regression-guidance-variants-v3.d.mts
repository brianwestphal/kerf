export interface AiRegressionGuidanceVariantV3 {
  id: string;
  description: string;
  feedbackPolicy:
    'guidance-only' | 'guidance-static' | 'guidance-static-browser';
  replaces: string;
  with: {
    index: string;
    pageDirectory: string;
    pageSelection: 'case-context-references';
  };
}

export interface AiRegressionContextReferences {
  specifiers: Set<string>;
  names: Set<string>;
  tags: Set<string>;
}

export const AI_REGRESSION_GUIDANCE_VARIANTS_V3: string;
export function loadAiRegressionGuidanceVariantsV3(
  root: string,
): Promise<AiRegressionGuidanceVariantV3[]>;
export function aiRegressionV3PolicyTable(conditions: any): Map<
  string,
  {
    id: string;
    description: string;
    feedbackStages: string[];
    feedbackPolicy: string;
    variant: boolean;
  }
>;
export function collectAiRegressionContextReferences(
  sources: string[],
): AiRegressionContextReferences;
export function selectAiRegressionReferencePages(
  catalog: { entries: any[] },
  references: AiRegressionContextReferences,
): string[];
export function resolveAiRegressionVariantGuidanceV3(
  root: string,
  conditions: any,
  variant: AiRegressionGuidanceVariantV3,
  caseDefinition: { contextFiles: string[] },
): Promise<{ id: string; sourcePaths: string[] }>;
