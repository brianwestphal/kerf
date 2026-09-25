import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

import {
  decideCheckSkip,
  gateWeakeningSwitches,
  INSTALL_FINGERPRINT_DIRS,
  installFingerprint,
  isForced,
  readCheckEnvironment,
  sameCheckEnvironment,
} from '../../scripts/lib/check-pass-cache.mjs';
import { PACKAGE_GATES } from '../../scripts/lib/package-gates.mjs';

const TREE = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const NODE = 'v22.12.0';
const INSTALL = 'c'.repeat(64);
const ENVIRONMENT = {
  node: NODE,
  platform: 'darwin',
  arch: 'arm64',
  install: INSTALL,
};

function current(overrides: Record<string, unknown> = {}) {
  return {
    tree: TREE,
    clean: true,
    ...ENVIRONMENT,
    pushedTrees: [TREE],
    ...overrides,
  };
}

const cached = { schema_version: 2, tree: TREE, ...ENVIRONMENT };

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
        cached: { ...cached, schema_version: 3 },
        current: current(),
      },
    ],
    [
      'no_verified_tree',
      {
        force: false,
        cached: { schema_version: 1, tree: TREE, node: NODE },
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
      'runtime_changed',
      { force: false, cached, current: current({ platform: 'linux' }) },
    ],
    [
      'runtime_changed',
      { force: false, cached, current: current({ arch: 'x64' }) },
    ],
    [
      'install_changed',
      { force: false, cached, current: current({ install: 'd'.repeat(64) }) },
    ],
    [
      'install_changed',
      {
        force: false,
        cached: { ...cached, install: undefined },
        current: current({ install: undefined }),
      },
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

describe('gate-weakening switches', () => {
  it('blocks recording a pass only while a weakening switch is on', () => {
    expect(gateWeakeningSwitches({})).toEqual([]);
    expect(gateWeakeningSwitches({ KERF_SKIP_PACKAGE_GATES: '' })).toEqual([]);
    expect(gateWeakeningSwitches({ KERF_SKIP_PACKAGE_GATES: '0' })).toEqual([]);
    expect(gateWeakeningSwitches({ KERF_SKIP_PACKAGE_GATES: '1' })).toEqual([
      'KERF_SKIP_PACKAGE_GATES',
    ]);
    // The CI-status switch only silences an advisory warning.
    expect(gateWeakeningSwitches({ KERF_SKIP_CI_STATUS: '1' })).toEqual([]);
  });
});

describe('check-pass install fingerprint', () => {
  it('covers the root, every gated sibling package, and the site', () => {
    expect(INSTALL_FINGERPRINT_DIRS).toEqual([
      '.',
      ...PACKAGE_GATES.map((gate) => gate.dir),
      'site',
    ]);
    expect(INSTALL_FINGERPRINT_DIRS).toEqual(
      expect.arrayContaining(['ui', 'eslint-plugin', 'create-kerf-component']),
    );
  });

  it('changes with any lockfile or installed-tree record, including absence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-install-fingerprint-'));
    try {
      const dirs = ['.', 'pkg'];
      const seen = new Set<string>();
      const fingerprint = async () => {
        const value = await installFingerprint(root, dirs);
        expect(value).toMatch(/^[0-9a-f]{64}$/);
        return value;
      };
      const absent = await fingerprint();
      expect(await fingerprint()).toBe(absent);
      seen.add(absent);

      const steps: Array<[string, string]> = [
        ['package-lock.json', '{"lockfileVersion":3}'],
        ['node_modules/.package-lock.json', '{"packages":{}}'],
        ['pkg/package-lock.json', '{"lockfileVersion":3}'],
        ['pkg/node_modules/.package-lock.json', '{"packages":{}}'],
        // npm rewrites the hidden lockfile on reinstall.
        ['node_modules/.package-lock.json', '{"packages":{"a":{}}}'],
      ];
      for (const [file, content] of steps) {
        await mkdir(join(root, file, '..'), { recursive: true });
        await writeFile(join(root, file), content);
        const next = await fingerprint();
        expect(seen.has(next)).toBe(false);
        seen.add(next);
      }

      // Removing an install is a change too.
      const installed = await fingerprint();
      await rm(join(root, 'pkg', 'node_modules'), {
        recursive: true,
        force: true,
      });
      expect(await fingerprint()).not.toBe(installed);
      // A directory outside the list never contributes.
      const before = await fingerprint();
      await mkdir(join(root, 'other'));
      await writeFile(join(root, 'other', 'package-lock.json'), '{}');
      expect(await fingerprint()).toBe(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('reads the runtime and compares every environment field', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-check-environment-'));
    try {
      const environment = await readCheckEnvironment(root, ['.']);
      expect(environment).toEqual({
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        install: await installFingerprint(root, ['.']),
      });
      expect(sameCheckEnvironment(environment, { ...environment })).toBe(true);
      for (const field of ['node', 'platform', 'arch', 'install'] as const)
        expect(
          sameCheckEnvironment(environment, {
            ...environment,
            [field]: 'changed',
          }),
        ).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
