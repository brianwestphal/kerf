import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  splitCheckChain,
  stepIdentifiers,
  stepTimingFields,
} from '../../scripts/lib/check-steps.mjs';
import {
  ciRecordFromRun,
  hasRecordedRun,
  planCiImports,
} from '../../scripts/lib/ticket-timing-ci.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);

function run(overrides: Record<string, unknown> = {}) {
  return {
    databaseId: 100,
    headSha: SHA_B,
    headBranch: 'main',
    workflowName: 'CI',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
    createdAt: '2026-09-25T12:44:51Z',
    startedAt: '2026-09-25T12:44:51Z',
    updatedAt: '2026-09-25T12:52:19Z',
    ...overrides,
  };
}

describe('check chain step timing', () => {
  it('names every step of the real root check chain uniquely and safely', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    const names = stepIdentifiers(
      splitCheckChain(manifest.scripts['check:core']),
    );
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z0-9][a-z0-9:._-]*$/);
    expect(names).toEqual(
      expect.arrayContaining([
        'lint',
        'typecheck',
        'test',
        'build',
        'check-bundle-size',
        'vitest:dist',
        'vitest:dist-full',
        'tsc:jsx-typing',
        'tsc:complete',
        'tsc:scaffold-typing',
      ]),
    );
  });

  it('suffixes repeated steps and falls back to a positional name', () => {
    expect(
      stepIdentifiers(['npm run lint', 'npm run lint', 'vitest run', '!!!']),
    ).toEqual(['lint', 'lint-2', 'vitest', 'step-4']);
    expect(
      stepIdentifiers(['npm run --silent ok', 'node -e "x"', 'npm run']),
    ).toEqual(['ok', 'node', 'npm']);
  });

  it('refuses chains whose semantics a sequential split would change', () => {
    expect(() => splitCheckChain('a || b')).toThrow(/&&/);
    expect(() => splitCheckChain('a; b')).toThrow(/&&/);
    expect(() => splitCheckChain('a | b')).toThrow(/&&/);
    expect(() => splitCheckChain('a & b')).toThrow(/&&/);
    expect(() => splitCheckChain('')).toThrow(/empty/);
    expect(splitCheckChain(' a  &&  b ')).toEqual(['a', 'b']);
  });

  it('keeps only identifiers and durations, naming the first failed step', () => {
    expect(
      stepTimingFields({
        steps: [
          { name: 'lint', duration_ms: 1200.4, outcome: 'passed' },
          { name: '/etc/passwd', duration_ms: 5, outcome: 'passed' },
          { name: 'test', duration_ms: -1, outcome: 'passed' },
          { name: 'build', duration_ms: 900, outcome: 'failed' },
        ],
      }),
    ).toEqual({ steps: { lint: 1200, build: 900 }, failed_step: 'build' });
    expect(stepTimingFields(null)).toEqual({});
    expect(stepTimingFields({ steps: 'nope' })).toEqual({});
  });
});

describe('CI run import planning', () => {
  it('maps conclusions and workflow kinds to timing records', () => {
    expect(ciRecordFromRun(run())).toEqual({
      schema_version: 1,
      event: 'interval',
      phase: 'ci',
      gate: 'github:ci',
      started_at: '2026-09-25T12:44:51.000Z',
      finished_at: '2026-09-25T12:52:19.000Z',
      outcome: 'passed',
      run_id: '100',
    });
    expect(
      ciRecordFromRun(run({ workflowName: 'Pages', conclusion: 'failure' })),
    ).toMatchObject({
      phase: 'publication',
      gate: 'github:pages',
      outcome: 'failed',
      failure_category: 'workflow_failure',
    });
    expect(ciRecordFromRun(run({ conclusion: 'cancelled' }))).toMatchObject({
      outcome: 'interrupted',
      failure_category: 'cancelled',
    });
    expect(ciRecordFromRun(run({ status: 'in_progress' }))).toBeNull();
    expect(ciRecordFromRun(run({ conclusion: 'skipped' }))).toBeNull();
    expect(ciRecordFromRun(run({ workflowName: '!!' }))).toBeNull();
    expect(
      ciRecordFromRun(run({ updatedAt: '2026-09-25T12:00:00Z' })),
    ).toBeNull();
    expect(
      ciRecordFromRun(run({ startedAt: undefined, updatedAt: 'garbage' })),
    ).toBeNull();
  });

  it('pairs each run with its workflow/branch predecessor and skips the oldest', () => {
    const plans = planCiImports([
      run({ databaseId: 3, headSha: SHA_C, createdAt: '2026-09-25T14:00:00Z' }),
      run({ databaseId: 1, headSha: SHA_A, createdAt: '2026-09-25T10:00:00Z' }),
      run({
        databaseId: 2,
        headSha: SHA_B,
        createdAt: '2026-09-25T12:00:00Z',
        startedAt: '2026-09-25T12:00:00Z',
        updatedAt: '2026-09-25T12:05:00Z',
      }),
      run({ databaseId: 9, workflowName: 'Pages', headSha: SHA_C }),
      run({ databaseId: 10, event: 'pull_request', headSha: SHA_C }),
      run({ databaseId: 11, headSha: 'not-a-sha' }),
      run({ databaseId: 'x', headSha: SHA_C }),
    ]);
    expect(
      plans.map((plan) => [
        plan.record.run_id,
        plan.previous_sha,
        plan.head_sha,
      ]),
    ).toEqual([
      ['2', SHA_A, SHA_B],
      ['3', SHA_B, SHA_C],
    ]);
  });

  it('detects an already-imported run by id', () => {
    expect(hasRecordedRun([{ event: 'interval', run_id: '7' }], '7')).toBe(
      true,
    );
    expect(hasRecordedRun([{ event: 'interval' }], '7')).toBe(false);
  });
});
