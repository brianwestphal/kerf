import { relative, sep } from 'node:path';

export const UI_TRAVERSAL_IGNORED_DIRECTORY_NAMES = Object.freeze([
  '.git',
  '.kerf-cache',
  'coverage',
  'dist',
  'kerf-ui-evidence',
  'node_modules',
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
