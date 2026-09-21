export function isForeignRuleDefinitionDiagnostic(item) {
  return (
    typeof item.ruleId === 'string' &&
    !item.ruleId.startsWith('kerfjs/') &&
    item.message === `Definition for rule '${item.ruleId}' was not found.`
  );
}
