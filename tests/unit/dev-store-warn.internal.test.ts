/**
 * KF-212 — opt-in dev-mode warning when `defineStore.set()` is called with
 * keys missing from the current state (the partial-set anti-pattern that
 * shipped in the TodoMVC example on 2026-05-18). The
 * `KERF_DEV_WARN_NARROW_SET=1` gate is read on each `set()` call, so
 * flipping the env var per-test is sufficient.
 *
 * The warning is per-store one-shot: each store warns at most once. Tests
 * that need to re-exercise the first-warning path on the same store call
 * `_resetWarnContext(ctx)` — but since tests typically create a fresh store
 * per case, the simpler pattern (and the one used below) is to spin up a
 * new store each test.
 *
 * This file is `*.internal.test.ts` so the dist-full suite excludes it —
 * the test imports `_resetWarnContext` which is intentionally not on the
 * public dist barrel.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetWarnContext, type NarrowSetWarnContext } from '../../src/dev-store-warn.js';
import { defineStore } from '../../src/store.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  delete env.KERF_DEV_WARN_NARROW_SET;
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  delete env.KERF_DEV_WARN_NARROW_SET;
  warnSpy.mockRestore();
});

describe('dev-store-warn (KF-212, opt-in)', () => {
  it('does NOT warn by default (env var unset)', () => {
    const store = defineStore({
      initial: () => ({ a: 1, b: 2, c: 3 }),
      actions: (set) => ({
        setA: (a: number) => set({ a } as { a: number; b: number; c: number }),
      }),
    });
    store.actions.setA(99);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when env var is set to 0', () => {
    env.KERF_DEV_WARN_NARROW_SET = '0';
    const store = defineStore({
      initial: () => ({ a: 1, b: 2 }),
      actions: (set) => ({
        setA: (a: number) => set({ a } as { a: number; b: number }),
      }),
    });
    store.actions.setA(99);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn in production even when the env var is set', () => {
    env.KERF_DEV_WARN_NARROW_SET = '1';
    const origNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const store = defineStore({
        initial: () => ({ a: 1, b: 2 }),
        actions: (set) => ({
          setA: (a: number) => set({ a } as { a: number; b: number }),
        }),
      });
      store.actions.setA(99);
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = origNodeEnv;
    }
  });

  describe('with KERF_DEV_WARN_NARROW_SET=1', () => {
    beforeEach(() => {
      env.KERF_DEV_WARN_NARROW_SET = '1';
    });

    it('warns when a key from the current state is missing in next', () => {
      const store = defineStore({
        initial: () => ({ a: 1, b: 2, c: 3 }),
        actions: (set) => ({
          dropBC: () => set({ a: 99 } as { a: number; b: number; c: number }),
        }),
      });
      store.actions.dropBC();
      expect(warnSpy).toHaveBeenCalledOnce();
      const msg = String(warnSpy.mock.calls[0]?.[0]);
      expect(msg).toContain('`b`');
      expect(msg).toContain('`c`');
      expect(msg).not.toContain('`a`');
      expect(msg).toContain('KERF_DEV_WARN_NARROW_SET=0');
    });

    it('warns when the same total count of keys but with at least one missing key', () => {
      const store = defineStore({
        initial: () => ({ a: 1, b: 2 }),
        actions: (set, get) => ({
          swap: () => {
            // {a: 1, b: 2} → {a: 1, c: 3} — same count, but `b` is gone.
            void get();
            set({ a: 1, c: 3 } as unknown as { a: number; b: number });
          },
        }),
      });
      store.actions.swap();
      expect(warnSpy).toHaveBeenCalledOnce();
      const msg = String(warnSpy.mock.calls[0]?.[0]);
      expect(msg).toContain('`b`');
    });

    it('does NOT warn when next has all the same keys as current', () => {
      const store = defineStore({
        initial: () => ({ a: 1, b: 2, c: 3 }),
        actions: (set, get) => ({
          full: (a: number) => set({ ...get(), a }),
        }),
      });
      store.actions.full(99);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does NOT warn when next has more keys than current', () => {
      const store = defineStore({
        initial: () => ({ a: 1 } as { a: number; b?: number }),
        actions: (set) => ({
          grow: () => set({ a: 2, b: 3 }),
        }),
      });
      store.actions.grow();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('dedups: warns only on the FIRST narrow set, then silences', () => {
      const store = defineStore({
        initial: () => ({ a: 1, b: 2 }),
        actions: (set) => ({
          narrow: () => set({ a: 99 } as { a: number; b: number }),
        }),
      });
      store.actions.narrow();
      store.actions.narrow();
      store.actions.narrow();
      expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('dedups per-store: a second store with the same bug still warns once', () => {
      const store1 = defineStore({
        initial: () => ({ a: 1, b: 2 }),
        actions: (set) => ({
          narrow: () => set({ a: 99 } as { a: number; b: number }),
        }),
      });
      const store2 = defineStore({
        initial: () => ({ x: 1, y: 2 }),
        actions: (set) => ({
          narrow: () => set({ x: 99 } as { x: number; y: number }),
        }),
      });
      store1.actions.narrow();
      store2.actions.narrow();
      // Two distinct stores → two warnings.
      expect(warnSpy).toHaveBeenCalledTimes(2);
      // Both stores then re-narrow → no additional warnings.
      store1.actions.narrow();
      store2.actions.narrow();
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('skips arrays — shrinking-array replacement is normal, not a partial set', () => {
      const store = defineStore({
        initial: () => [1, 2, 3, 4, 5],
        actions: (set) => ({
          shrink: () => set([1]),
        }),
      });
      store.actions.shrink();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('skips null state', () => {
      const store = defineStore<{ a: number } | null, { clear: () => void; restore: () => void }>({
        initial: () => ({ a: 1 }),
        actions: (set) => ({
          clear: () => set(null),
          restore: () => set({ a: 2 }),
        }),
      });
      store.actions.clear();
      store.actions.restore();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('skips primitive state (number)', () => {
      const store = defineStore({
        initial: () => 0,
        actions: (set) => ({
          set: (n: number) => set(n),
        }),
      });
      store.actions.set(42);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('_resetWarnContext allows re-exercising the first-warning path', () => {
      const ctx: NarrowSetWarnContext = { warned: false };
      // Simulate two warns by direct module use — fast path for testing the
      // helper without spinning up a real store.
      // First warn lands, then dedups, then reset re-arms.
      void ctx;
      _resetWarnContext(ctx);
      expect(ctx.warned).toBe(false);
      ctx.warned = true;
      _resetWarnContext(ctx);
      expect(ctx.warned).toBe(false);
    });
  });
});
