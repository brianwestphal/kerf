import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import process, { execPath } from 'node:process';

import { describe, expect, it } from 'vitest';

import {
  ciStatusWarning,
  PACKAGE_GATES,
  selectPackageGates,
} from '../../scripts/lib/package-gates.mjs';

const names = (paths: string[] | null) =>
  selectPackageGates(paths).map((gate) => gate.name);

describe('selectPackageGates', () => {
  it('runs the ui check for core source and ui changes', () => {
    expect(names(['src/mount.ts'])).toEqual(['ui:check']);
    expect(names(['ui/src/button.ts'])).toEqual(['ui:check']);
    expect(names(['package-lock.json'])).toEqual(['ui:check']);
  });

  it('scopes the sibling package tests to their own directories', () => {
    expect(names(['eslint-plugin/lib/rules/x.js'])).toEqual([
      'eslint-plugin:test',
    ]);
    expect(names(['create-kerf-component/index.js'])).toEqual([
      'create-kerf-component:test',
    ]);
  });

  it('runs nothing for changes no package gate covers', () => {
    expect(
      names(['docs/4-render.md', 'CHANGELOG.md', 'tests/unit/a.ts']),
    ).toEqual([]);
    // A root file trigger matches exactly, not as a prefix.
    expect(names(['package.json.bak'])).toEqual([]);
  });

  it('runs every gate when the changed set is unknown', () => {
    expect(names(null)).toEqual(PACKAGE_GATES.map((gate) => gate.name));
  });
});

describe('package gate CI advisory CLI', { timeout: 30_000 }, () => {
  const old = {
    id: 1,
    head_branch: 'main',
    status: 'completed',
    conclusion: 'failure',
    head_sha: 'a'.repeat(40),
    html_url: 'https://github.com/example/repo/actions/runs/1',
    created_at: '2020-01-01T00:00:00Z',
  };
  const fresh = {
    ...old,
    id: 3,
    conclusion: 'success',
    head_sha: 'b'.repeat(40),
    html_url: 'https://github.com/example/repo/actions/runs/3',
    created_at: '2022-01-01T12:00:00Z',
  };
  const list = (runs: object[] = [], count = runs.length) => ({
    total_count: count,
    workflow_runs: runs,
  });
  type Reply = { body: unknown; status?: number; delay?: number };
  function runAdvisory(replies: Reply[], skip = false) {
    const root = mkdtempSync(join(tmpdir(), 'kerf-ci-advisory-'));
    const gh = join(root, 'gh');
    const argsFile = join(root, 'args.jsonl');
    writeFileSync(
      gh,
      `#!/usr/bin/env node
import fs from 'node:fs';
const path = process.env.KERF_TEST_GH_ARGS;
const calls = fs.existsSync(path) ? fs.readFileSync(path, 'utf8').trim().split('\\n').length : 0;
fs.appendFileSync(path, JSON.stringify(process.argv.slice(2)) + '\\n');
const reply = JSON.parse(process.env.KERF_TEST_GH_REPLIES)[calls];
if (!reply) process.exit(2);
setTimeout(() => {
process.stdout.write(typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body));
process.exit(reply.status ?? 0);
}, reply.delay ?? 0);
`,
    );
    chmodSync(gh, 0o755);
    try {
      const before = Date.now();
      const result = spawnSync(execPath, ['scripts/check-package-gates.mjs'], {
        cwd: resolve('.'),
        encoding: 'utf8',
        timeout: 12_000,
        env: {
          ...process.env,
          PATH: `${root}${delimiter}${process.env.PATH ?? ''}`,
          KERF_SKIP_PACKAGE_GATES: '1',
          KERF_SKIP_CI_STATUS: skip ? '1' : '0',
          KERF_TEST_GH_ARGS: argsFile,
          KERF_TEST_GH_REPLIES: JSON.stringify(replies),
        },
      });
      expect(result.status, result.stderr).toBe(0);
      const calls: string[][] = existsSync(argsFile)
        ? readFileSync(argsFile, 'utf8')
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line))
        : [];
      expect(calls).toHaveLength(skip ? 0 : replies.length);
      for (const args of calls) {
        expect(args.slice(0, 3)).toEqual([
          'api',
          '-H',
          'Cache-Control: no-cache',
        ]);
        expect(args).toHaveLength(4);
        const endpoint = new URL(args[3], 'https://api.github.com/');
        if (endpoint.pathname.endsWith('/ci.yml/runs')) {
          expect([...endpoint.searchParams.keys()]).toEqual([
            'branch',
            'status',
            'per_page',
            'created',
          ]);
          expect(endpoint.searchParams.get('branch')).toBe('main');
          expect(endpoint.searchParams.get('status')).toBe('completed');
          expect(['1', '100']).toContain(endpoint.searchParams.get('per_page'));
          const created = endpoint.searchParams.get('created')!;
          const upper = Date.parse(
            created.split('..').at(-1)!.replace('<=', ''),
          );
          expect(upper).toBeLessThanOrEqual(Date.now() + 2);
        } else expect(endpoint.pathname).toMatch(/\/actions\/runs\/\d+$/);
      }
      const initial = calls[0]?.[3];
      if (initial) {
        const bound = new URL(
          initial,
          'https://api.github.com/',
        ).searchParams.get('created')!;
        expect(bound).toMatch(/^<=\d{4}-/);
        expect(Date.parse(bound.slice(2))).toBeGreaterThanOrEqual(before);
      }
      return { ...result, calls, elapsed: Date.now() - before };
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  const bodies = (...payloads: unknown[]) => payloads.map((body) => ({ body }));

  it('advances a stale candidate to current global CI, confirms no newer run, then verifies details', () => {
    const result = runAdvisory(
      bodies(list([old]), list([fresh]), list(), list([fresh]), fresh),
    );
    expect(result.stderr).toBe('');
    const filters = result.calls
      .slice(1, 3)
      .map((args) =>
        new URL(args[3], 'https://api.github.com/').searchParams.get(
          'created',
        )!,
      );
    expect(filters[0].split('..')[0]).toBe('2020-01-01T00:00:00.001Z');
    expect(filters[1].split('..')[0]).toBe('2022-01-01T12:00:00.001Z');
    expect(result.calls.at(-1)![3]).toContain('/actions/runs/3');
  });

  it('walks multiple newer candidates without interpreting ancestry as run order', () => {
    const middle = { ...old, id: 2, created_at: '2021-01-01T00:00:00Z' };
    const result = runAdvisory(
      bodies(
        list([old]),
        list([middle]),
        list([fresh]),
        list(),
        list([fresh]),
        fresh,
      ),
    );
    expect(result.stderr).toBe('');
  });

  it('keeps the previous completed failure while the current main run is active', () => {
    const result = runAdvisory(bodies(list([old]), list(), list([old]), old));
    expect(result.stderr).toContain('failure at aaaaaaaa');
    expect(result.stderr).toContain('/actions/runs/1');
  });

  it('orders same-second runs by ID and reads their current rerun conclusion', () => {
    const tie = { ...fresh, id: 4, conclusion: 'failure' };
    const current = { ...tie, conclusion: 'success' };
    const result = runAdvisory(
      bodies(list([fresh]), list(), list([fresh, tie]), current),
    );
    expect(result.calls.at(-1)![3]).toContain('/actions/runs/4');
    expect(result.stderr).toBe('');
  });

  it('reports unavailable when fresh moving bounds still provide no completed evidence', () => {
    const result = runAdvisory(bodies(list(), list()));
    expect(result.stderr).toContain('CI status on main is unavailable');
    expect(result.calls[1][3]).not.toBe(result.calls[0][3]);
  });

  it('recovers an initial cached empty list', () => {
    expect(
      runAdvisory(bodies(list(), list([fresh]), list(), list([fresh]), fresh))
        .stderr,
    ).toBe('');
  });

  it.each([
    ['', 1],
    ['not json', 0],
    ['{}', 0],
    [JSON.stringify(list([{ ...old, created_at: '2026-02-30T00:00:00Z' }])), 0],
    [JSON.stringify(list([{ ...old, created_at: 'not a date' }])), 0],
    [JSON.stringify(list([{ ...old, created_at: '2999-01-01T00:00:00Z' }])), 0],
    [JSON.stringify(list([{ ...old, head_branch: 'topic' }])), 0],
    [
      JSON.stringify(
        list([{ ...old, status: 'in_progress', conclusion: null }]),
      ),
      0,
    ],
    [JSON.stringify(list([{ ...old, id: -1 }])), 0],
    [JSON.stringify(list([{ ...old, head_sha: 'short' }])), 0],
    [JSON.stringify(list([], -1)), 0],
    [JSON.stringify(list([], 1)), 0],
  ])(
    'reports unavailable for malformed or unavailable evidence (%s)',
    (body, status) => {
      const result = runAdvisory([{ body, status }]);
      expect(result.stderr).toContain('CI status on main is unavailable');
      expect(result.stderr).not.toContain('failure at');
    },
  );

  it('rejects a cached old run outside the strict-newer filter', () => {
    const result = runAdvisory(bodies(list([old]), list([old])));
    expect(result.stderr).toContain('CI status on main is unavailable');
    expect(result.stderr).not.toContain('failure at');
  });

  it('requires confirmed same-time evidence and consistent completed details', () => {
    for (const tail of [
      [list()],
      [list([fresh]), { ...fresh, id: 4 }],
      [list([fresh]), { ...fresh, status: 'in_progress', conclusion: null }],
      [list([fresh]), { ...fresh, head_sha: 'c'.repeat(40) }],
    ]) {
      expect(
        runAdvisory(bodies(list([fresh]), list(), ...tail)).stderr,
      ).toContain('CI status on main is unavailable');
    }
  });

  it('bounds hop exhaustion without warning about an unvalidated candidate', () => {
    const candidates = Array.from({ length: 6 }, (_, index) =>
      list([
        { ...old, id: index + 1, created_at: `202${index}-01-01T00:00:00Z` },
      ]),
    );
    const result = runAdvisory(bodies(...candidates));
    expect(result.stderr).toContain('CI status on main is unavailable');
    expect(result.stderr).not.toContain('failure at');
  });

  it('rejects an incomplete same-second page rather than guessing its newest ID', () => {
    const runs = Array.from({ length: 100 }, (_, index) => ({
      ...fresh,
      id: index + 1,
    }));
    const result = runAdvisory(bodies(list([fresh]), list(), list(runs, 101)));
    expect(result.stderr).toContain('CI status on main is unavailable');
  });

  it('shares one deadline across successive subprocesses', () => {
    const result = runAdvisory([
      { body: list([old]), delay: 4000 },
      { body: list([fresh]), delay: 5000 },
    ]);
    expect(result.stderr).toContain('CI status on main is unavailable');
    expect(result.elapsed).toBeGreaterThanOrEqual(7900);
    expect(result.elapsed).toBeLessThan(10_000);
  });

  it('bounds the whole subprocess lookup deadline and remains non-blocking', () => {
    const result = runAdvisory([{ body: list([old]), delay: 9000 }]);
    expect(result.stderr).toContain('CI status on main is unavailable');
    expect(result.elapsed).toBeGreaterThanOrEqual(7900);
    expect(result.elapsed).toBeLessThan(10_000);
  });

  it('honors the explicit CI-status opt out', () => {
    const result = runAdvisory([], true);
    expect(result.stderr).toBe('');
  });
});

describe('ciStatusWarning', () => {
  it('is silent when the latest completed run passed', () => {
    expect(
      ciStatusWarning([
        { status: 'in_progress' },
        { status: 'completed', conclusion: 'success', headSha: 'abc' },
      ]),
    ).toBeNull();
    expect(ciStatusWarning([])).toBeNull();
    expect(ciStatusWarning([{ status: 'queued' }])).toBeNull();
  });

  it('warns with the sha and link when the latest completed run failed', () => {
    const warning = ciStatusWarning([
      { status: 'in_progress' },
      {
        status: 'completed',
        conclusion: 'failure',
        headSha: '8b2cf6bf0123',
        url: 'https://example.test/run/1',
      },
    ]);
    expect(warning).toContain('failure at 8b2cf6bf');
    expect(warning).toContain('https://example.test/run/1');
  });

  it('treats a cancelled run as not green', () => {
    expect(
      ciStatusWarning([{ status: 'completed', conclusion: 'cancelled' }]),
    ).toMatch(/^CI on main is cancelled at /);
  });
});
