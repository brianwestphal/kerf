import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyAudit } from '../scripts/audit-policy.mjs';

const finding = (name, severity, via = []) => ({
  severity,
  nodes: [`node_modules/${name}`],
  via,
});

function report(vulnerabilities, high = 0, critical = 0) {
  return {
    metadata: {
      vulnerabilities: { low: 0, moderate: 0, high, critical },
    },
    vulnerabilities,
  };
}

test('passes a report with only low and moderate findings', () => {
  const input = report({
    astro: finding('astro', 'low'),
    'smol-toml': finding('smol-toml', 'moderate'),
  });
  assert.deepEqual(classifyAudit(input).blocked, []);
});

test('blocks every high and critical finding, including propagated ones', () => {
  const input = report(
    {
      'http-cache-semantics': finding('http-cache-semantics', 'high', [
        {
          name: 'http-cache-semantics',
          url: 'https://github.com/advisories/GHSA-ch52-4w7c-c8xp',
          range: '<=4.2.0',
        },
      ]),
      astro: finding('astro', 'high', ['http-cache-semantics']),
      sharp: finding('sharp', 'critical'),
      'smol-toml': finding('smol-toml', 'moderate'),
    },
    2,
    1,
  );
  assert.deepEqual(classifyAudit(input).blocked.sort(), [
    'astro',
    'http-cache-semantics',
    'sharp',
  ]);
});

test('rejects incomplete audit output and inconsistent totals', () => {
  assert.throws(() => classifyAudit({ error: 'network unavailable' }));
  assert.throws(() =>
    classifyAudit(report({ astro: finding('astro', 'high') }, 2)),
  );
  assert.throws(() => classifyAudit(report({}, 0, 1)));
});
