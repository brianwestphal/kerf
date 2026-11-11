// KF-1EH00H: the physical installed graph after a Bun `--no-save` variation,
// walked from disk rather than read from the lock.
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  installedInventory,
  meets,
  parseExpectation,
  recordInventory,
  runtimePackage,
} from '../../scripts/bun-installed-inventory.mjs';

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

function pkg(dir: string, name: string, version: string) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }));
}

/**
 * A tree whose lock still names eslint 9.39.4 while a `--no-save` add put
 * 10.8.0 on disk, with a scoped package, a nested install, Bun's hidden
 * store, a symlinked package, and a symlink cycle.
 */
function fixture() {
  root = mkdtempSync(join(tmpdir(), 'kerf-inventory-'));
  pkg(root, 'candidate', '0.0.0');
  writeFileSync(join(root, 'bun.lock'), '"eslint": ["eslint@9.39.4"]\n');
  const modules = join(root, 'node_modules');
  pkg(join(modules, 'eslint'), 'eslint', '10.8.0');
  pkg(join(modules, '@scope', 'tool'), '@scope/tool', '1.2.3');
  pkg(join(modules, 'host'), 'host', '2.0.0');
  pkg(join(modules, 'host', 'node_modules', 'eslint'), 'eslint', '9.39.4');
  const stored = join(modules, '.bun', 'linked@3.0.0', 'node_modules');
  pkg(join(stored, 'linked'), 'linked', '3.0.0');
  symlinkSync(join(stored, 'linked'), join(modules, 'linked'));
  // A package whose nested node_modules links back to the top level.
  pkg(join(modules, 'loop'), 'loop', '1.0.0');
  symlinkSync(modules, join(modules, 'loop', 'node_modules'));
  mkdirSync(join(modules, '.bin'));
  return root;
}

describe('the physical installed inventory (KF-1EH00H)', () => {
  it('walks scoped, nested, stored, and linked packages and ends cycles', () => {
    const { packages, cycles } = installedInventory(fixture());
    const found = packages.map((item) => `${item.path} ${item.version}`);
    expect(found).toEqual(
      expect.arrayContaining([
        'node_modules/eslint 10.8.0',
        'node_modules/@scope/tool 1.2.3',
        'node_modules/host/node_modules/eslint 9.39.4',
        'node_modules/.bun/linked@3.0.0/node_modules/linked 3.0.0',
        'node_modules/linked 3.0.0',
        'node_modules/loop 1.0.0',
      ]),
    );
    const linked = packages.find((item) => item.path === 'node_modules/linked');
    expect(linked).toMatchObject({
      linked: true,
      realPath: 'node_modules/.bun/linked@3.0.0/node_modules/linked',
    });
    // The loop's link back to node_modules is recorded, not followed again.
    expect(cycles).toContain('node_modules/loop/node_modules');
  });

  it('reports the version Node resolves, not the one the lock names', () => {
    const tree = fixture();
    expect(runtimePackage(tree, 'eslint')).toMatchObject({
      version: '10.8.0',
      path: 'node_modules/eslint',
    });
    expect(runtimePackage(tree, 'missing')).toBeUndefined();
    const inventory = recordInventory(tree, ['eslint@10.8.0']);
    expect(inventory.kind).toBe('physical-installed-graph');
    expect(inventory.runtime).toEqual([
      expect.objectContaining({ name: 'eslint', version: '10.8.0' }),
    ]);
    // The lock's 9.39.4 is not what runs, so expecting it fails loudly.
    expect(() => recordInventory(tree, ['eslint@9.39.4'])).toThrow(
      'eslint resolves to 10.8.0 at node_modules/eslint, not 9.39.4',
    );
    expect(() => recordInventory(tree, ['missing@1.0.0'])).toThrow(
      'missing does not resolve',
    );
    expect(recordInventory(tree, ['@scope/tool@^1']).runtime[0]).toMatchObject({
      name: '@scope/tool',
      version: '1.2.3',
    });
  });

  it('reads exact and caret-major expectations, scoped names included', () => {
    expect(parseExpectation('@awesome.me/webawesome@^3')).toEqual({
      name: '@awesome.me/webawesome',
      wanted: '^3',
    });
    expect(parseExpectation('eslint@9.39.5')).toEqual({
      name: 'eslint',
      wanted: '9.39.5',
    });
    expect(() => parseExpectation('eslint')).toThrow('Expected name@version');
    expect(meets('3.4.0', '^3')).toBe(true);
    expect(meets('4.0.0', '^3')).toBe(false);
    expect(meets('9.39.5', '9.39.5')).toBe(true);
    expect(meets('9.39.4', '9.39.5')).toBe(false);
    expect(() => meets('1.0.0', '>=1')).toThrow('Unsupported expectation');
  });
});
