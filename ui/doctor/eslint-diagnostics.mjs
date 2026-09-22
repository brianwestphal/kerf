export function isForeignRuleDefinitionDiagnostic(item) {
  return (
    typeof item.ruleId === 'string' &&
    !item.ruleId.startsWith('kerfjs/') &&
    item.message === `Definition for rule '${item.ruleId}' was not found.`
  );
}

export function projectConsumerCoreConfig(config, file) {
  const rules = Object.fromEntries(
    Object.entries(config?.rules ?? {}).filter(
      ([ruleId]) => !ruleId.includes('/'),
    ),
  );
  const linterOptions = config?.linterOptions
    ? { ...config.linterOptions }
    : undefined;
  if (Object.keys(rules).length === 0 && !linterOptions) return undefined;
  return {
    files: [file],
    ...(Object.keys(rules).length > 0 ? { rules } : {}),
    ...(linterOptions ? { linterOptions } : {}),
  };
}
