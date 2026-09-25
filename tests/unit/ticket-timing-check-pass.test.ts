import { describe, expect, it } from 'vitest';

import {
  decideCheckSkip,
  isForced,
} from '../../scripts/lib/check-pass-cache.mjs';

const TREE = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const NODE = 'v22.12.0';

function current(overrides: Record<string, unknown> = {}) {
  return {
    tree: TREE,
    clean: true,
    node: NODE,
    pushedTrees: [TREE],
    ...overrides,
  };
}

const cached = { schema_version: 1, tree: TREE, node: NODE };

describe('pre-push check skip decision', () => {
  it('skips only when a clean worktree pushes exactly the tree that passed', () => {
    expect(
      decideCheckSkip({ force: false, cached, current: current() }),
    ).toEqual({ skip: true, reason: 'tree_already_verified' });
  });

  it.each([
    ['forced', { force: true, cached, current: current() }],
    ['no_verified_tree', { force: false, cached: null, current: current() }],
    [
      'no_verified_tree',
      {
        force: false,
        cached: { ...cached, schema_version: 2 },
        current: current(),
      },
    ],
    [
      'no_verified_tree',
      { force: false, cached: { ...cached, tree: 'nope' }, current: current() },
    ],
    [
      'dirty_worktree',
      { force: false, cached, current: current({ clean: false }) },
    ],
    [
      'unknown_tree',
      { force: false, cached, current: current({ tree: null }) },
    ],
    [
      'tree_changed',
      {
        force: false,
        cached,
        current: current({ tree: OTHER, pushedTrees: [OTHER] }),
      },
    ],
    [
      'runtime_changed',
      { force: false, cached, current: current({ node: 'v24.0.0' }) },
    ],
    [
      'pushed_tree_differs',
      { force: false, cached, current: current({ pushedTrees: [] }) },
    ],
    [
      'pushed_tree_differs',
      {
        force: false,
        cached,
        current: current({ pushedTrees: [TREE, OTHER] }),
      },
    ],
  ])('runs the gate when the reason is %s', (reason, input) => {
    expect(decideCheckSkip(input)).toEqual({ skip: false, reason });
  });

  it('treats only a non-empty, non-zero override as forcing a run', () => {
    expect(isForced({})).toBe(false);
    expect(isForced({ KERF_FORCE_CHECK: '' })).toBe(false);
    expect(isForced({ KERF_FORCE_CHECK: '0' })).toBe(false);
    expect(isForced({ KERF_FORCE_CHECK: '1' })).toBe(true);
    expect(isForced({ KERF_FORCE_CHECK: 'yes' })).toBe(true);
  });
});
