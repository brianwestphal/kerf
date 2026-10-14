import { execFile } from 'node:child_process';
import { dirname, relative, resolve, sep } from 'node:path';

export const UI_TRAVERSAL_IGNORED_DIRECTORY_NAMES = Object.freeze([
  '.git',
  '.kerf-cache',
  'blob-report',
  'coverage',
  'dist',
  'kerf-ui-evidence',
  'node_modules',
  'playwright-report',
  'test-results',
]);
const ignoredDirectoryNames = new Set(UI_TRAVERSAL_IGNORED_DIRECTORY_NAMES);

export const UI_TRAVERSAL_ESLINT_IGNORES = Object.freeze([
  ...UI_TRAVERSAL_IGNORED_DIRECTORY_NAMES.map((name) => `**/${name}/**`),
  '**/.claude/worktrees/**',
]);

export function isUiTraversalExcluded(root, candidate) {
  const segments = relative(root, candidate).split(sep);
  return (
    segments.some((segment) => ignoredDirectoryNames.has(segment)) ||
    segments.some(
      (segment, index) =>
        segment === '.claude' && segments[index + 1] === 'worktrees',
    )
  );
}

/**
 * Lists the Git-ignored files and directories below `root`, relative to it
 * and `/`-separated, with directories ending in `/`. Generated output that a
 * project gitignores (test reports, build caches) is not application source,
 * so a local tool run must not change what full traversal analyzes. Outside a
 * Git work tree, or without a `git` binary, nothing is reported.
 */
export function listGitIgnoredPaths(root) {
  return new Promise((done) => {
    execFile(
      'git',
      [
        'ls-files',
        '-z',
        '--others',
        '--ignored',
        '--exclude-standard',
        '--directory',
      ],
      { cwd: root, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) =>
        done(error ? [] : String(stdout).split('\0').filter(Boolean)),
    );
  });
}

/**
 * Builds the complete traversal predicate for `root`: the named
 * generated/tool-owned directories plus every Git-ignored path.
 */
export async function createUiTraversalFilter(root) {
  const listed = await listGitIgnoredPaths(root);
  const ignored = new Set(
    listed.map((path) => resolve(root, path.replace(/\/$/, ''))),
  );
  const excluded = (candidate) => {
    if (isUiTraversalExcluded(root, candidate)) return true;
    for (let path = resolve(candidate); ;) {
      if (ignored.has(path)) return true;
      const parent = dirname(path);
      if (parent === path || relative(root, parent).startsWith('..'))
        return false;
      path = parent;
    }
  };
  excluded.eslintIgnores = [
    ...UI_TRAVERSAL_ESLINT_IGNORES,
    ...listed.map((path) => {
      const escaped = path.replace(/[\\*?[\]{}()!+@]/g, '\\$&');
      return escaped.endsWith('/') ? `${escaped}**` : escaped;
    }),
  ];
  return excluded;
}
