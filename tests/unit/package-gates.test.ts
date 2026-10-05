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
  function runAdvisory(output: string, status = 0, skip = false) {
    const root = mkdtempSync(join(tmpdir(), 'kerf-ci-advisory-'));
    const gh = join(root, 'gh');
    const argsFile = join(root, 'args.json');
    writeFileSync(
      gh,
      `#!/usr/bin/env node\nimport fs from 'node:fs';
fs.writeFileSync(process.env.KERF_TEST_GH_ARGS, JSON.stringify(process.argv.slice(2)));
process.stdout.write(process.env.KERF_TEST_GH_OUTPUT);
process.exit(Number(process.env.KERF_TEST_GH_STATUS));\n`,
    );
    chmodSync(gh, 0o755);
    try {
      const before = Date.now();
      const result = spawnSync(execPath, ['scripts/check-package-gates.mjs'], {
        cwd: resolve('.'),
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${root}${delimiter}${process.env.PATH ?? ''}`,
          KERF_SKIP_PACKAGE_GATES: '1',
          KERF_SKIP_CI_STATUS: skip ? '1' : '0',
          KERF_TEST_GH_ARGS: argsFile,
          KERF_TEST_GH_OUTPUT: output,
          KERF_TEST_GH_STATUS: String(status),
        },
      });
      if (!skip) {
        expect(result.status, result.stderr).toBe(0);
        expect(existsSync(argsFile), result.stderr + result.stdout).toBe(true);
        const args = JSON.parse(readFileSync(argsFile, 'utf8')) as string[];
        expect(args).toHaveLength(2);
        expect(args[0]).toBe('api');
        const endpoint = new URL(args[1], 'https://api.github.com/');
        expect(endpoint.pathname).toBe(
          '/repos/%7Bowner%7D/%7Brepo%7D/actions/workflows/ci.yml/runs',
        );
        expect([...endpoint.searchParams.keys()]).toEqual([
          'branch',
          'status',
          'per_page',
          'created',
        ]);
        expect(endpoint.searchParams.get('branch')).toBe('main');
        expect(endpoint.searchParams.get('status')).toBe('completed');
        expect(endpoint.searchParams.get('per_page')).toBe('1');
        const created = endpoint.searchParams.get('created')!;
        expect(created).toMatch(/^<=\d{4}-\d{2}-\d{2}T/);
        const upperBound = Date.parse(created.slice(2));
        expect(upperBound).toBeGreaterThanOrEqual(before);
        expect(upperBound).toBeLessThanOrEqual(Date.now());
      }
      return result;
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it('asks for the latest completed run with a fresh upper bound and no age cutoff', () => {
    const result = runAdvisory(
      JSON.stringify({
        workflow_runs: [
          {
            status: 'completed',
            conclusion: 'failure',
            head_sha: 'old123456789',
            html_url: 'https://github.com/example/repo/actions/runs/1',
          },
        ],
      }),
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('failure at old12345');
    expect(result.stderr).toContain('/actions/runs/1');
  });

  it('reports no red-CI warning for a fresh successful result', () => {
    const result = runAdvisory(
      '{"workflow_runs":[{"status":"completed","conclusion":"success"}]}',
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it.each([
    ['', 1],
    ['not json', 0],
    ['{}', 0],
  ])(
    'reports unavailable CI honestly without failing local gates (%s)',
    (output, status) => {
      const result = runAdvisory(output as string, status as number);
      expect(result.status).toBe(0);
      expect(result.stderr).toContain('CI status on main is unavailable');
      expect(result.stderr).not.toContain('CI on main is success');
    },
  );

  it('honors the explicit CI-status opt out', () => {
    const result = runAdvisory('', 1, true);
    expect(result.status).toBe(0);
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
