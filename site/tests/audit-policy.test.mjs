import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyAudit } from '../scripts/audit-policy.mjs';

const finding = (name, via) => ({
  severity: 'high',
  nodes: [`node_modules/${name}`],
  via,
});

function report() {
  return {
    metadata: { vulnerabilities: { high: 5, critical: 0 } },
    vulnerabilities: {
      'http-cache-semantics': finding('http-cache-semantics', [
        {
          name: 'http-cache-semantics',
          url: 'https://github.com/advisories/GHSA-ch52-4w7c-c8xp',
          range: '<=4.2.0',
        },
      ]),
      astro: finding('astro', ['http-cache-semantics']),
      '@astrojs/mdx': finding('@astrojs/mdx', ['astro']),
      'astro-expressive-code': finding('astro-expressive-code', ['astro']),
      '@astrojs/starlight': finding('@astrojs/starlight', [
        '@astrojs/mdx',
        'astro',
        'astro-expressive-code',
      ]),
    },
  };
}

test('accepts only the reviewed advisory and its propagated Astro findings', () => {
  assert.deepEqual(classifyAudit(report()).blocked, []);
  assert.equal(classifyAudit(report()).allowed.length, 5);
});

test('fails a new direct advisory even when it propagates through Astro', () => {
  const input = report();
  input.vulnerabilities.astro.via.push({
    name: 'astro',
    url: 'https://github.com/advisories/GHSA-new-advisory',
  });
  assert.deepEqual(classifyAudit(input).blocked.sort(), [
    '@astrojs/mdx',
    '@astrojs/starlight',
    'astro',
    'astro-expressive-code',
  ]);
});

test('fails changed advisory ranges, unexpected packages, and dependency paths', () => {
  const changed = report();
  changed.vulnerabilities['http-cache-semantics'].via[0].range = '<=4.3.0';
  assert.equal(classifyAudit(changed).blocked.length, 5);

  const extra = report();
  extra.vulnerabilities.other = finding('other', ['astro']);
  extra.metadata.vulnerabilities.high++;
  assert.deepEqual(classifyAudit(extra).blocked, ['other']);

  const nested = report();
  nested.vulnerabilities.astro.nodes = [
    'node_modules/other/node_modules/astro',
  ];
  assert.equal(classifyAudit(nested).blocked.length, 4);
});

test('rejects incomplete audit output and inconsistent totals', () => {
  assert.throws(() => classifyAudit({ error: 'network unavailable' }));
  const input = report();
  input.metadata.vulnerabilities.high = 6;
  assert.throws(() => classifyAudit(input));
});
