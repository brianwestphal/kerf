const advisoryUrl = 'https://github.com/advisories/GHSA-ch52-4w7c-c8xp';

// This site's Astro build uses the package for remote-asset caching. The
// published site is static, so it has no cross-user request cache at runtime.
// Keep the exception limited to this one unpatched advisory and its exact
// dependency propagation; any other high/critical finding still fails CI.
const expectedNodes = new Map([
  ['http-cache-semantics', 'node_modules/http-cache-semantics'],
  ['astro', 'node_modules/astro'],
  ['@astrojs/mdx', 'node_modules/@astrojs/mdx'],
  ['astro-expressive-code', 'node_modules/astro-expressive-code'],
  ['@astrojs/starlight', 'node_modules/@astrojs/starlight'],
]);

export function classifyAudit(report) {
  if (
    !report ||
    typeof report.vulnerabilities !== 'object' ||
    report.vulnerabilities === null ||
    !report.metadata?.vulnerabilities
  ) {
    throw new Error('npm audit did not return a complete vulnerability report');
  }
  const findings = Object.entries(report.vulnerabilities).filter(([, value]) =>
    ['high', 'critical'].includes(value.severity),
  );
  const expectedCount =
    report.metadata.vulnerabilities.high +
    report.metadata.vulnerabilities.critical;
  if (findings.length !== expectedCount)
    throw new Error('npm audit vulnerability totals do not match its findings');

  const permitted = (name, path = new Set()) => {
    const finding = report.vulnerabilities[name];
    if (
      !finding ||
      !expectedNodes.has(name) ||
      finding.severity !== 'high' ||
      finding.nodes?.length !== 1 ||
      finding.nodes[0] !== expectedNodes.get(name) ||
      !Array.isArray(finding.via) ||
      path.has(name)
    )
      return false;
    if (name === 'http-cache-semantics')
      return (
        finding.via.length === 1 &&
        finding.via[0]?.url === advisoryUrl &&
        finding.via[0]?.name === name &&
        finding.via[0]?.range === '<=4.2.0'
      );
    if (finding.via.length === 0) return false;
    const nextPath = new Set(path).add(name);
    return finding.via.every(
      (dependency) =>
        typeof dependency === 'string' && permitted(dependency, nextPath),
    );
  };

  return {
    allowed: findings.filter(([name]) => permitted(name)).map(([name]) => name),
    blocked: findings
      .filter(([name]) => !permitted(name))
      .map(([name]) => name),
  };
}
