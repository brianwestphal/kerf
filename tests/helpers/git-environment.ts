import process from 'node:process';

/**
 * KF-9XZ6XQ: the Git variables that pin a git command to one repository.
 * A Git hook exports `GIT_DIR` (and, in a linked worktree, more of these),
 * so a test that runs `git init` in a scratch directory from inside the
 * pre-push `npm run check` reinitialized the hook's repository instead,
 * and flipped the shared config to `core.bare = true`. Fixtures run git
 * with these removed, so git finds the repository from the command's cwd.
 */
export const REPOSITORY_GIT_ENVIRONMENT = [
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

/** `inherited` without the variables that pin git to one repository. */
export function isolatedGitEnvironment(
  inherited: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string | undefined> {
  const env = { ...inherited };
  for (const name of REPOSITORY_GIT_ENVIRONMENT) delete env[name];
  return env;
}
