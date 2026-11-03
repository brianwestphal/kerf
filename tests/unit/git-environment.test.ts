// @vitest-environment node
// KF-9XZ6XQ: a test that runs git inside the pre-push hook inherited the
// hook's GIT_DIR, so its scratch `git init` flipped the real repository's
// shared config to `core.bare = true`.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

import {
  isolatedGitEnvironment,
  REPOSITORY_GIT_ENVIRONMENT,
} from '../helpers/git-environment.js';
import { loadScaledTimeout } from '../helpers/load-scaled-timeout.js';

const repoRoot = resolve(import.meta.dirname, '../..');
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const plain = {
  ...isolatedGitEnvironment(),
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_NOSYSTEM: '1',
};
const git = (
  cwd: string,
  args: string[],
  env: Record<string, string | undefined> = plain,
) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();

// It spawns git several times, so it carries a load-scaled budget.
describe(
  'Git hook variables in tests (KF-9XZ6XQ)',
  { timeout: loadScaledTimeout(20_000) },
  () => {
    it('are removed from every test process', () => {
      for (const name of REPOSITORY_GIT_ENVIRONMENT)
        expect(process.env[name]).toBeUndefined();
    });

    it('cannot turn a fixture git init into a reinit of a worktree repository', () => {
      const root = mkdtempSync(join(tmpdir(), 'kerf-git-env-'));
      roots.push(root);
      const main = join(root, 'main');
      const fixture = join(root, 'fixture');
      mkdirSync(main);
      mkdirSync(fixture);
      git(main, ['init', '--quiet']);
      git(main, [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.invalid',
        'commit',
        '--quiet',
        '--allow-empty',
        '-m',
        'init',
      ]);
      git(main, ['worktree', 'add', '--quiet', join(root, 'linked')]);
      const linkedGitDir = git(join(root, 'linked'), [
        'rev-parse',
        '--absolute-git-dir',
      ]);
      // What a hook running in the linked worktree passes down.
      const hook = { ...plain, GIT_DIR: linkedGitDir };
      git(fixture, ['init', '--quiet'], isolatedGitEnvironment(hook));
      expect(existsSync(join(fixture, '.git'))).toBe(true);
      expect(git(main, ['config', '--get', 'core.bare'])).toBe('false');
    });

    it('are stripped by every vitest config whose suites spawn git', () => {
      for (const config of [
        'vitest.config.ts',
        'vitest.config.dist-full.ts',
        'ui/vitest.config.ts',
      ])
        expect(readFileSync(join(repoRoot, config), 'utf8')).toContain(
          './tests/setup-git-environment.ts',
        );
    });
  },
);
