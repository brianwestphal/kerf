// Every high or critical npm audit finding fails the site gate. There are no
// reviewed exceptions; a report whose totals disagree with its findings is
// treated as incomplete rather than as clean.
export function classifyAudit(report) {
  if (
    !report ||
    typeof report.vulnerabilities !== 'object' ||
    report.vulnerabilities === null ||
    !report.metadata?.vulnerabilities
  ) {
    throw new Error('npm audit did not return a complete vulnerability report');
  }
  const blocked = Object.entries(report.vulnerabilities)
    .filter(([, value]) => ['high', 'critical'].includes(value.severity))
    .map(([name]) => name);
  const expectedCount =
    report.metadata.vulnerabilities.high +
    report.metadata.vulnerabilities.critical;
  if (blocked.length !== expectedCount)
    throw new Error('npm audit vulnerability totals do not match its findings');
  return { blocked };
}
