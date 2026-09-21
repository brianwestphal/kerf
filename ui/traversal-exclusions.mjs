import { relative, sep } from 'node:path';

const ignoredDirectoryNames = new Set([
  '.git',
  '.kerf-cache',
  'coverage',
  'dist',
  'kerf-ui-evidence',
  'node_modules',
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
