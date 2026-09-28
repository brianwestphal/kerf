import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { devNull, tmpdir } from 'node:os';
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

// Every git invocation below is a full process spawn, and so is the script
// under test (which spawns several more). Under a loaded gate (the pre-push
// `npm run check` runs every suite in parallel) each spawn costs far more
// than its idle few milliseconds, so the fixtures keep the spawn count
// minimal: the commit identity comes from the environment instead of
// per-repository `git config` calls, tags are written in one
// `update-ref --stdin` batch, and `rev-parse` queries are combined. The
// developer's global/system git config is shut out too, so their hooks,
// signing, or filters can neither slow nor break the fixture.
const fixtureGitEnvironment = {
  GIT_AUTHOR_NAME: 'Release Test',
  GIT_AUTHOR_EMAIL: 'release-test@example.invalid',
  GIT_COMMITTER_NAME: 'Release Test',
  GIT_COMMITTER_EMAIL: 'release-test@example.invalid',
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_NOSYSTEM: '1',
} as const;

function nestedRepositoryEnvironment(
  inherited: GitEnvironment = processEnvironment,
): GitEnvironment {
  const env: GitEnvironment = { ...inherited, ...fixtureGitEnvironment };
  for (const name of repositoryLocalGitEnvironment) delete env[name];
  return env;
}

function git(
  root: string,
  args: string[],
  inherited?: GitEnvironment,
  input?: string,
): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: nestedRepositoryEnvironment(inherited),
    input,
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
  }).trim();
}

/** Create lightweight tags at HEAD in one process (one `git tag` each would spawn per tag). */
function tagHead(
  root: string,
  tags: string[],
  inherited?: GitEnvironment,
): void {
  git(
    root,
    ['update-ref', '--stdin'],
    inherited,
    tags.map((tag) => `create refs/tags/${tag} HEAD\n`).join(''),
  );
}

function writeReleaseFixture(root: string): void {
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
}

function runBetaDryRun(
  root: string,
  notes: string,
  inherited?: GitEnvironment,
): string {
  return execFileSync(
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
      env: nestedRepositoryEnvironment(inherited),
      input: notes,
    },
  );
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

// These tests drive real git and bash processes. Idle, each finishes in well
// under a second, but on a saturated machine (the parallel pre-push gate)
// process startup dominates and the 5 s vitest default is too tight, so they
// carry the same 30 s budget as the other CLI-driving integration suites.
describe('automatic beta release dry run', { timeout: 30_000 }, () => {
  it('continues beta.23 as beta.24 instead of starting a stable-derived line', () => {
    const root = mkdtempSync(join(tmpdir(), 'kerf-beta-auto-'));
    temporaryRoots.push(root);
    writeReleaseFixture(root);

    git(root, ['init', '-b', 'main']);
    git(root, ['add', '.']);
    git(root, ['commit', '-m', 'fixture']);
    tagHead(root, ['v4.4.1', 'v5.0.0-beta.1', 'v5.0.0-beta.23']);

    const output = runBetaDryRun(root, '- Test release\n');

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
    writeFileSync(join(outer, 'outer.txt'), 'outer repository\n');
    git(outer, ['add', '.']);
    git(outer, ['commit', '-m', 'outer fixture']);
    git(outer, ['worktree', 'add', '-b', 'hook-worktree', linked]);
    const [linkedHead, linkedCommonDir, linkedGitDir] = git(linked, [
      'rev-parse',
      'HEAD',
      '--git-common-dir',
      '--absolute-git-dir',
    ]).split('\n');

    const hookEnvironment: GitEnvironment = {
      ...processEnvironment,
      GIT_COMMON_DIR: linkedCommonDir,
      GIT_DIR: linkedGitDir,
      GIT_INDEX_FILE: join(linkedGitDir, 'index'),
      GIT_PREFIX: '',
      GIT_WORK_TREE: linked,
    };

    writeFileSync(join(root, 'nested.txt'), 'nested repository\n');
    git(root, ['init', '-b', 'main'], hookEnvironment);
    git(root, ['add', '.'], hookEnvironment);
    git(root, ['commit', '-m', 'nested fixture'], hookEnvironment);

    expect(
      git(
        root,
        ['rev-parse', '--absolute-git-dir', '--show-toplevel'],
        hookEnvironment,
      ).split('\n'),
    ).toEqual([join(realpathSync(root), '.git'), realpathSync(root)]);

    writeReleaseFixture(root);
    git(root, ['add', '.'], hookEnvironment);
    git(root, ['commit', '-m', 'release files'], hookEnvironment);
    tagHead(root, ['v4.4.1', 'v5.0.0-beta.23'], hookEnvironment);

    const output = runBetaDryRun(
      root,
      '- Hook-safe release test\n',
      hookEnvironment,
    );

    expect(output).toContain('would create + push v5.0.0-beta.24');
    expect(git(linked, ['rev-parse', 'HEAD'])).toBe(linkedHead);
    expect(git(linked, ['status', '--short'])).toBe('');
  });
});
