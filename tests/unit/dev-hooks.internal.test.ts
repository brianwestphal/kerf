/**
 * The dev-hook registry — kerf's seam between production code and the opt-in
 * diagnostics (`kerfjs/dev`).
 *
 * kerf no longer infers development mode. These tests pin the two shapes that
 * replaced the inference: with the hooks installed everything behaves as it did
 * under the old ambient `NODE_ENV` gate, and with nothing installed kerf runs in
 * production shape in ANY environment — no proxy on the store snapshot, no
 * throw from the URL screen, no warnings, regardless of `NODE_ENV` or
 * `globalThis.KERF_DEV`.
 *
 * The production-shape cases are the ones that matter most: before this change
 * the gate read `globalThis.process?.env?.NODE_ENV`, which is `undefined` in a
 * browser, so a production browser bundle silently ran in DEV mode.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEV_HOOKS } from '../../src/dev.js';
import { clearDevHooks, devHooks, installDevHooks } from '../../src/dev-hooks.js';
import { jsx } from '../../src/jsx-runtime.js';
import { defineStore } from '../../src/store.js';
import { enterProductionShape, restoreDevelopmentShape } from '../helpers/dev-shape.js';

afterEach(() => {
  restoreDevelopmentShape();
});

describe('dev-hook registry', () => {
  it('installs the full bundle when kerfjs/dev is imported', () => {
    // The global test setup imports `src/dev.ts`, so the dev shape is default.
    expect(Object.keys(devHooks).length).toBe(Object.keys(DEV_HOOKS).length);
    expect(devHooks.storeReadonly).toBeDefined();
    expect(devHooks.urlScreenThrow).toBeDefined();
    expect(devHooks.signalFactory).toBeDefined();
  });

  it('clearDevHooks() empties every slot', () => {
    clearDevHooks();
    expect(Object.keys(devHooks)).toEqual([]);
  });

  it('installDevHooks() merges rather than replaces, so a single slot can be overridden', () => {
    const spy = vi.fn();
    installDevHooks({ listRebind: spy });
    expect(devHooks.listRebind).toBe(spy);
    // Untouched slots survive the merge.
    expect(devHooks.storeReadonly).toBe(DEV_HOOKS.storeReadonly);
  });
});

describe('production shape — no hooks installed', () => {
  it('leaves every slot undefined so core call sites short-circuit', () => {
    enterProductionShape();
    expect(devHooks.missingRowKey).toBeUndefined();
    expect(devHooks.listInvariantsEnabled).toBeUndefined();
    expect(devHooks.staleBindingEnabled).toBeUndefined();
    expect(devHooks.narrowSet).toBeUndefined();
  });

  it('hands back the RAW store snapshot — no read-only proxy, no wrapping', () => {
    enterProductionShape();
    const store = defineStore({
      initial: () => ({ count: 0, nested: { x: 1 } }),
      actions: (_set, get) => ({
        mutate: () => { (get() as { count: number }).count = 42; },
        mutateNested: () => { (get() as { nested: { x: number } }).nested.x = 9; },
      }),
    });
    // Production semantics: the write lands silently instead of throwing.
    expect(() => store.actions.mutate()).not.toThrow();
    expect(() => store.actions.mutateNested()).not.toThrow();
  });

  it('warns-and-drops a dangerous URL instead of throwing', () => {
    enterProductionShape();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const out = jsx('a', { href: 'javascript:alert(1)', children: 'x' }).toString();
      expect(out).toBe('<a>x</a>');
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('stays in production shape even with NODE_ENV=development and KERF_DEV=true', () => {
    // The old gate would have reported DEVELOPMENT for both of these. Neither
    // is consulted any more: installation is the only signal.
    const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;
    const glob = globalThis as { KERF_DEV?: unknown };
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'development';
    glob.KERF_DEV = true;
    try {
      enterProductionShape();
      const store = defineStore({
        initial: () => ({ count: 0 }),
        actions: (_set, get) => ({ mutate: () => { (get() as { count: number }).count = 42; } }),
      });
      expect(() => store.actions.mutate()).not.toThrow();
    } finally {
      env.NODE_ENV = prev;
      delete glob.KERF_DEV;
    }
  });
});
