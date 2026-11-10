import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

import { loadScaledTimeout } from '../helpers/load-scaled-timeout.js';

describe('actual stable CLI diagnostic', () => {
  it(
    'runs from a clean disposable main and proves complete byte/ref immutability',
    () => {
      const evidence = mkdtempSync(join(tmpdir(), 'kerf-stable-evidence-'));
      try {
        const result = spawnSync(
          process.execPath,
          ['scripts/stable-release-plan-probe.mjs', '.'],
          {
            env: { ...process.env, BUN_QUALIFICATION_EVIDENCE: evidence },
            encoding: 'utf8',
            timeout: loadScaledTimeout(60_000),
          },
        );
        expect(result.error).toBeUndefined();
        expect(result.signal).toBeNull();
        expect(result.status, result.stdout + result.stderr).toBe(0);
        const report = JSON.parse(
          readFileSync(join(evidence, 'stable-plan.json'), 'utf8'),
        );
        expect(report.sourceSha).toMatch(/^[a-f0-9]{40}$/);
        expect(report.before.status).toBe('');
        expect(Object.keys(report.before.hashes).length).toBeGreaterThan(1000);
        expect(report.after).toEqual(report.before);
        expect(report.status).toBe(0);
        expect(report.scope).toContain('checks explicitly skipped');
        expect(
          readFileSync(join(evidence, 'stable-plan.stdout.log'), 'utf8'),
        ).toContain('local tags only');
      } finally {
        rmSync(evidence, { recursive: true, force: true });
      }
    },
    loadScaledTimeout(90_000),
  );

  it('refuses to run without an explicit evidence destination', () => {
    const env = { ...process.env };
    delete env.BUN_QUALIFICATION_EVIDENCE;
    const result = spawnSync(
      process.execPath,
      ['scripts/stable-release-plan-probe.mjs', '.'],
      { env, encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('BUN_QUALIFICATION_EVIDENCE is required');
  });
});
