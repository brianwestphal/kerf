import process from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import { verifiedPush } from '../../scripts/push.mjs';

const tree = 'a'.repeat(40);
const environment = {
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  install: 'installed',
};
const pass = { schema_version: 2, tree, ...environment };

function options(overrides: Record<string, unknown> = {}) {
  return {
    cwd: '/unused',
    args: ['origin', 'main'],
    getState: async () => ({ tree, clean: true }),
    getEnvironment: async () => environment,
    getPass: async () => pass,
    getTree: async () => tree,
    gitOutput: async () => '',
    check: vi.fn(async () => {}),
    push: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('verified push entry point', () => {
  it('rejects unrelated dirty guidance before a deliberately slow gate or SSH push', async () => {
    const check = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    });
    const push = vi.fn(async () => {});
    const run = options({
      getState: async () => ({ tree, clean: false }),
      check,
      push,
    });
    await expect(verifiedPush(run)).rejects.toThrow('clean detached worktree');
    expect(check).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('waits for the gate, confirms a reusable pass, then pushes the same tree', async () => {
    const order: string[] = [];
    const run = options({
      check: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push('check');
      },
      getPass: async () => {
        order.push('pass');
        return pass;
      },
      push: async () => {
        order.push('push');
      },
    });
    await verifiedPush(run);
    expect(order).toEqual(['check', 'pass', 'push']);
  });

  it('refuses to open the remote when the check cannot record a reusable pass', async () => {
    const push = vi.fn(async () => {});
    const run = options({ getPass: async () => null, push });
    await expect(verifiedPush(run)).rejects.toThrow('no_verified_tree');
    expect(push).not.toHaveBeenCalled();
  });

  it('rejects a different source tree before running the gate', async () => {
    const check = vi.fn(async () => {});
    const run = options({ getTree: async () => 'b'.repeat(40), check });
    await expect(verifiedPush(run)).rejects.toThrow('differs from HEAD');
    expect(check).not.toHaveBeenCalled();
  });
});
