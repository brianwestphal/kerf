// @vitest-environment node
/**
 * scripts/lib/release-common.sh — the helpers release.sh and
 * release-beta-auto.sh share. Each case sources the library inside a
 * throwaway git repository, so nothing here can tag or push the real one.
 *
 * KF-RV39NE: pre-flight refuses a dirty tree, a non-main branch, and an
 * existing tag instead of asking to continue.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadScaledTimeout } from '../helpers/load-scaled-timeout.js';

const LIB = resolve('scripts/lib/release-common.sh');

// Strip inherited git variables (a hook may set GIT_DIR) and pin identity.
const GIT_ENV: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
);
Object.assign(GIT_ENV, {
  GIT_AUTHOR_NAME: 'Release Test',
  GIT_AUTHOR_EMAIL: 'release@example.test',
  GIT_COMMITTER_NAME: 'Release Test',
  GIT_COMMITTER_EMAIL: 'release@example.test',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
});

let repo: string;

function git(...args: string[]): string {
  return execFileSync('git', args, {
    cwd: repo,
    env: GIT_ENV,
    encoding: 'utf8',
  });
}

/** Source the library with printing stubs, then run `body` in `repo`. */
function runLib(body: string, input?: string) {
  const script = [
    'set -euo pipefail',
    'info() { echo "INFO $1"; }',
    'success() { echo "OK $1"; }',
    'warn() { echo "WARN $1"; }',
    'error() { echo "ERROR $1" >&2; }',
    `source ${JSON.stringify(LIB)}`,
    body,
  ].join('\n');
  return spawnSync('bash', ['-c', script], {
    cwd: repo,
    env: GIT_ENV,
    encoding: 'utf8',
    input,
  });
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'kerf-release-common-'));
  git('init', '-q', '-b', 'main');
  writeFileSync(join(repo, 'package.json'), '{"version":"1.2.3"}\n');
  git('add', 'package.json');
  git('commit', '-q', '-m', 'init');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe(
  'release-common.sh pre-flight (KF-RV39NE)',
  { timeout: loadScaledTimeout(30_000) },
  () => {
    it('passes a clean main checkout', () => {
      const result = runLib('release_preflight_repo; echo PASSED');
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('PASSED');
    });

    it('refuses a dirty tree and lists the changes', () => {
      writeFileSync(join(repo, 'stray.txt'), 'x\n');
      const result = runLib('release_preflight_repo; echo PASSED');
      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain('PASSED');
      expect(result.stderr).toContain('Working tree is dirty');
      expect(result.stderr).toContain('stray.txt');
    });

    it('refuses a branch other than main/master', () => {
      git('checkout', '-q', '-b', 'feature');
      const result = runLib('release_preflight_repo; echo PASSED');
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Current branch is 'feature'");
    });

    it('refuses a missing package.json', () => {
      const result = spawnSync(
        'bash',
        [
          '-c',
          `error() { echo "ERROR $1" >&2; }; source ${JSON.stringify(LIB)}; release_preflight_repo`,
        ],
        { cwd: tmpdir(), env: GIT_ENV, encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('No package.json');
    });

    it('refuses a tag that already exists, and allows a new one', () => {
      git('tag', 'v1.2.3');
      const taken = runLib('release_refuse_existing_tag v1.2.3; echo PASSED');
      expect(taken.status).toBe(1);
      expect(taken.stderr).toContain('Tag v1.2.3 already exists');
      const fresh = runLib('release_refuse_existing_tag v1.2.4; echo PASSED');
      expect(fresh.status).toBe(0);
      expect(fresh.stdout).toContain('PASSED');
    });
  },
);
