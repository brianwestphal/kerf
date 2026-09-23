import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { env as processEnvironment } from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..');
const temporaryRoots: string[] = [];

const repositoryLocalGitEnvironment = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_DIR',
  'GIT_GRAFT_FILE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_INTERNAL_SUPER_PREFIX',
  'GIT_NAMESPACE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_OBJECT_DIRECTORY',
  'GIT_PREFIX',
  'GIT_REPLACE_REF_BASE',
  'GIT_SHALLOW_FILE',
  'GIT_WORK_TREE',
] as const;

type GitEnvironment = Record<string, string | undefined>;

function nestedRepositoryEnvironment(
  inherited: GitEnvironment = processEnvironment,
): GitEnvironment {
  const env = { ...inherited };
  for (const name of repositoryLocalGitEnvironment) delete env[name];
  return env;
}

function git(root: string, args: string[], inherited?: GitEnvironment): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: nestedRepositoryEnvironment(inherited),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('automatic beta release dry run', () => {
  it('continues beta.23 as beta.24 instead of starting a stable-derived line', () => {
    const root = mkdtempSync(join(tmpdir(), 'kerf-beta-auto-'));
    temporaryRoots.push(root);
    mkdirSync(join(root, 'scripts/lib'), { recursive: true });
    cpSync(
      join(repoRoot, 'scripts/release-beta-auto.sh'),
      join(root, 'scripts/release-beta-auto.sh'),
    );
    cpSync(
      join(repoRoot, 'scripts/lib/release-beta-plan.mjs'),
      join(root, 'scripts/lib/release-beta-plan.mjs'),
    );
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'release-fixture', version: '4.4.1' }),
    );

    git(root, ['init', '-b', 'main']);
    git(root, ['config', 'user.name', 'Release Test']);
    git(root, ['config', 'user.email', 'release-test@example.invalid']);
    git(root, ['add', '.']);
    git(root, ['commit', '-m', 'fixture']);
    git(root, ['tag', 'v4.4.1']);
    git(root, ['tag', 'v5.0.0-beta.1']);
    git(root, ['tag', 'v5.0.0-beta.23']);

    const output = execFileSync(
      'bash',
      [
        'scripts/release-beta-auto.sh',
        '--dry-run',
        '--skip-checks',
        '--notes-stdin',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: nestedRepositoryEnvironment(),
        input: '- Test release\n',
      },
    );

    expect(output).toContain(
      'Active prerelease series v5.0.0-beta.23 is current',
    );
    expect(output).toContain('would create + push v5.0.0-beta.24');
  });

  it('ignores hook-local Git variables when creating and running the fixture', () => {
    const outer = mkdtempSync(join(tmpdir(), 'kerf-beta-outer-'));
    const linkedParent = mkdtempSync(join(tmpdir(), 'kerf-beta-linked-'));
    const linked = join(linkedParent, 'worktree');
    const root = mkdtempSync(join(tmpdir(), 'kerf-beta-nested-'));
    temporaryRoots.push(linkedParent, outer, root);

    git(outer, ['init', '-b', 'main']);
    git(outer, ['config', 'user.name', 'Outer Test']);
    git(outer, ['config', 'user.email', 'outer-test@example.invalid']);
    writeFileSync(join(outer, 'outer.txt'), 'outer repository\n');
    git(outer, ['add', '.']);
    git(outer, ['commit', '-m', 'outer fixture']);
    git(outer, ['worktree', 'add', '-b', 'hook-worktree', linked]);
    const linkedHead = git(linked, ['rev-parse', 'HEAD']);

    const hookEnvironment: GitEnvironment = {
      ...processEnvironment,
      GIT_COMMON_DIR: git(linked, ['rev-parse', '--git-common-dir']),
      GIT_DIR: git(linked, ['rev-parse', '--absolute-git-dir']),
      GIT_INDEX_FILE: join(
        git(linked, ['rev-parse', '--absolute-git-dir']),
        'index',
      ),
      GIT_PREFIX: '',
      GIT_WORK_TREE: linked,
    };

    writeFileSync(join(root, 'nested.txt'), 'nested repository\n');
    git(root, ['init', '-b', 'main'], hookEnvironment);
    git(root, ['config', 'user.name', 'Nested Test'], hookEnvironment);
    git(
      root,
      ['config', 'user.email', 'nested-test@example.invalid'],
      hookEnvironment,
    );
    git(root, ['add', '.'], hookEnvironment);
    git(root, ['commit', '-m', 'nested fixture'], hookEnvironment);

    expect(
      git(root, ['rev-parse', '--absolute-git-dir'], hookEnvironment),
    ).toBe(join(realpathSync(root), '.git'));
    expect(git(root, ['rev-parse', '--show-toplevel'], hookEnvironment)).toBe(
      realpathSync(root),
    );

    mkdirSync(join(root, 'scripts/lib'), { recursive: true });
    cpSync(
      join(repoRoot, 'scripts/release-beta-auto.sh'),
      join(root, 'scripts/release-beta-auto.sh'),
    );
    cpSync(
      join(repoRoot, 'scripts/lib/release-beta-plan.mjs'),
      join(root, 'scripts/lib/release-beta-plan.mjs'),
    );
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'release-fixture', version: '4.4.1' }),
    );
    git(root, ['add', '.'], hookEnvironment);
    git(root, ['commit', '-m', 'release files'], hookEnvironment);
    git(root, ['tag', 'v4.4.1'], hookEnvironment);
    git(root, ['tag', 'v5.0.0-beta.23'], hookEnvironment);

    const output = execFileSync(
      'bash',
      [
        'scripts/release-beta-auto.sh',
        '--dry-run',
        '--skip-checks',
        '--notes-stdin',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: nestedRepositoryEnvironment(hookEnvironment),
        input: '- Hook-safe release test\n',
      },
    );

    expect(output).toContain('would create + push v5.0.0-beta.24');
    expect(git(linked, ['rev-parse', 'HEAD'])).toBe(linkedHead);
    expect(git(linked, ['status', '--short'])).toBe('');
  });
});
