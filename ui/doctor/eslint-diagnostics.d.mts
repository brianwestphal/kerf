export interface EslintDiagnosticLike {
  ruleId?: string | null;
  message: string;
}

export function isForeignRuleDefinitionDiagnostic(
  item: EslintDiagnosticLike,
): boolean;

export interface ConsumerEslintConfigLike {
  rules?: Record<string, unknown>;
  linterOptions?: Record<string, unknown>;
}

export interface ProjectedConsumerCoreConfig {
  files: string[];
  rules?: Record<string, unknown>;
  linterOptions?: Record<string, unknown>;
}

export function projectConsumerCoreConfig(
  config: ConsumerEslintConfigLike | undefined,
  file: string,
): ProjectedConsumerCoreConfig | undefined;
