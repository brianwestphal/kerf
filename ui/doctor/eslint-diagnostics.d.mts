export interface EslintDiagnosticLike {
  ruleId?: string | null;
  message: string;
}

export function isForeignRuleDefinitionDiagnostic(
  item: EslintDiagnosticLike,
): boolean;
