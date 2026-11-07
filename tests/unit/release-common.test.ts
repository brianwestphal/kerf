// @vitest-environment node
/**
 * scripts/lib/release-common.sh — the helpers release.sh and
 * release-beta-auto.sh share. Each case sources the library inside a
 * throwaway git repository, so nothing here can tag or push the real one.
 *
 * KF-RV39NE: pre-flight refuses a dirty tree, a non-main branch, and an
 * existing tag instead of asking to continue.
 *
 * KF-F1CPCK: pre-flight also refuses a stale lockfile (a manifest dependency
 * the lockfile no longer satisfies), offline, in every lockstep package.
 *
 * KF-12QS9G: notes reach the tag verbatim (Markdown headings and literal
 * backslashes survive), the beta plan continues the highest series with
 * highest + 1, and gitgist resolution falls back to its --no-ai grouping.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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

    describe('stale lockfile (KF-F1CPCK)', () => {
      // A lockfile recording left-pad@1.3.0 as the package's only dependency.
      // `npm ls --package-lock-only` reads just these two files, so nothing
      // here installs or reaches the registry.
      function writePackage(
        dir: string,
        dependencies: Record<string, string>,
      ): void {
        const name = `fixture-${dir === '.' ? 'root' : dir}`;
        mkdirSync(join(repo, dir), { recursive: true });
        writeFileSync(
          join(repo, dir, 'package.json'),
          JSON.stringify({ name, version: '1.2.3', dependencies }),
        );
        writeFileSync(
          join(repo, dir, 'package-lock.json'),
          JSON.stringify({
            name,
            version: '1.2.3',
            lockfileVersion: 3,
            requires: true,
            packages: {
              '': {
                name,
                version: '1.2.3',
                dependencies: { 'left-pad': '^1.3.0' },
              },
              'node_modules/left-pad': {
                version: '1.3.0',
                resolved:
                  'https://registry.npmjs.org/left-pad/-/left-pad-1.3.0.tgz',
                license: 'WTFPL',
              },
            },
          }),
        );
      }

      function commitAll(): void {
        git('add', '-A');
        git('commit', '-q', '-m', 'fixture');
      }

      it('passes lockfiles that satisfy their manifests', () => {
        writePackage('.', { 'left-pad': '^1.3.0' });
        writePackage('ui', { 'left-pad': '^1.0.0' });
        commitAll();
        const result = runLib('release_refuse_stale_lockfiles; echo PASSED');
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toContain('PASSED');
      });

      it('refuses a re-ranged dependency and names the package to fix', () => {
        writePackage('.', { 'left-pad': '^1.3.0' });
        writePackage('eslint-plugin', { 'left-pad': '^2.0.0' });
        commitAll();
        const result = runLib('release_preflight_repo; echo PASSED');
        expect(result.status).toBe(1);
        expect(result.stdout).not.toContain('PASSED');
        expect(result.stderr).toContain('Stale lockfile in: eslint-plugin.');
        expect(result.stderr).toContain("Run 'npm install'");
        expect(result.stderr).toContain('invalid: left-pad@1.3.0');
      });

      it('refuses a manifest dependency the lockfile does not record', () => {
        writePackage('.', { 'left-pad': '^1.3.0', 'is-odd': '^3.0.0' });
        commitAll();
        const result = runLib('release_refuse_stale_lockfiles; echo PASSED');
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('Stale lockfile in: .');
        expect(result.stderr).toContain('missing: is-odd@^3.0.0');
      });
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

describe(
  'release-common.sh notes, tags, and beta planning (KF-12QS9G)',
  { timeout: loadScaledTimeout(30_000) },
  () => {
    it('keeps Markdown headings and literal backslashes in the tag message', () => {
      const notes = [
        '## Features',
        '',
        '- Adds `a\\nb` and `c\\td` escapes',
        '',
        '### Fixes',
        '# Top heading',
      ].join('\n');
      const result = runLib('release_tag_with_notes v9.9.9 "$(cat)"', notes);
      expect(result.status, result.stderr).toBe(0);
      const message = git('tag', '-l', '--format=%(contents)', 'v9.9.9');
      expect(message.trimEnd()).toBe(notes);
    });

    it('plans the highest beta + 1 without filling gaps', () => {
      git('tag', 'v1.2.3');
      for (const n of [1, 3, 7]) git('tag', `v1.3.0-beta.${n}`);
      const auto = runLib(
        'release_plan_beta ""; printf "%s|%s|%s|%s" "$RELEASE_BETA_VERSION" "$RELEASE_BETA_TAG" "$RELEASE_BETA_SOURCE" "$RELEASE_BETA_PREVIOUS"',
      );
      expect(auto.stdout).toBe(
        '1.3.0|v1.3.0-beta.8|active-beta-series|v1.3.0-beta.7',
      );
      const pinned = runLib(
        'release_plan_beta 1.3.0; printf "%s" "$RELEASE_BETA_TAG"',
      );
      expect(pinned.stdout).toBe('v1.3.0-beta.8');
    });

    it('falls back to gitgist --no-ai and keeps diagnostics out of the notes', () => {
      const bin = join(repo, 'node_modules', '.bin');
      mkdirSync(bin, { recursive: true });
      const fake = join(bin, 'gitgist');
      writeFileSync(
        fake,
        [
          '#!/usr/bin/env bash',
          'for arg in "$@"; do',
          '  if [[ "$arg" == "--no-ai" ]]; then printf "## Changes\\n\\n- grouped\\n"; exit 0; fi',
          'done',
          'echo "no provider" >&2; exit 1',
        ].join('\n'),
      );
      chmodSync(fake, 0o755);
      const result = runLib(
        'notes=$(release_gitgist_draft "v1..HEAD"); printf "%s" "$notes"',
      );
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe('## Changes\n\n- grouped');
      expect(result.stderr).toContain('--no-ai');
    });

    it('prints nothing when gitgist is unavailable', () => {
      const result = runLib(
        'PATH=/usr/bin:/bin; notes=$(release_gitgist_draft ""); printf "[%s]" "$notes"',
      );
      expect(result.stdout).toBe('[]');
      expect(result.stderr).toContain("'gitgist' not found");
    });
  },
);
