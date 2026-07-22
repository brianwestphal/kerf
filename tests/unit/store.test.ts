/**
 * Unit tests for `defineStore()` + `resetAllStores()`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { batch, effect } from '../../src/reactive.js';
import { defineStore, resetAllStores } from '../../src/store.js';
import { clearStoreRegistry } from '../../src/testing.js';

beforeEach(() => {
  clearStoreRegistry();
});

afterEach(() => {
  clearStoreRegistry();
});

describe('defineStore()', () => {
  it('creates a store with state, actions, and reset()', () => {
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (set, get) => ({
        inc: () => set({ count: get().count + 1 }),
        dec: () => set({ count: get().count - 1 }),
      }),
    });

    expect(counter.state.value).toEqual({ count: 0 });
    counter.actions.inc();
    counter.actions.inc();
    expect(counter.state.value).toEqual({ count: 2 });
    counter.actions.dec();
    expect(counter.state.value).toEqual({ count: 1 });
  });

  it('reset() returns state to initial()', () => {
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (set, get) => ({ inc: () => set({ count: get().count + 1 }) }),
    });
    counter.actions.inc();
    counter.actions.inc();
    expect(counter.state.value.count).toBe(2);
    counter.reset();
    expect(counter.state.value.count).toBe(0);
  });

  it('initial() is invoked on each reset (so mutating initial state is safe)', () => {
    let creationCalls = 0;
    const store = defineStore({
      initial: () => {
        creationCalls += 1;
        return { items: [] as number[] };
      },
      actions: (set, get) => ({
        push: (n: number) => set({ items: [...get().items, n] }),
      }),
    });
    expect(creationCalls).toBe(1);
    store.actions.push(1);
    store.reset();
    expect(creationCalls).toBe(2);
    expect(store.state.value.items).toEqual([]);
  });

  it('triggers effect re-runs when actions mutate state', () => {
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (set, get) => ({ inc: () => set({ count: get().count + 1 }) }),
    });

    const log: number[] = [];
    effect(() => { log.push(counter.state.value.count); });
    expect(log).toEqual([0]);
    counter.actions.inc();
    expect(log).toEqual([0, 1]);
    counter.actions.inc();
    expect(log).toEqual([0, 1, 2]);
  });

  it('multiple consumers see the same state and update in lockstep', () => {
    const cart = defineStore({
      initial: () => ({ items: [] as string[] }),
      actions: (set, get) => ({
        add: (item: string) => set({ items: [...get().items, item] }),
      }),
    });

    const consumerA: number[] = [];
    const consumerB: string[] = [];
    effect(() => { consumerA.push(cart.state.value.items.length); });
    effect(() => { consumerB.push(cart.state.value.items.join(',')); });

    cart.actions.add('apple');
    cart.actions.add('banana');

    expect(consumerA).toEqual([0, 1, 2]);
    expect(consumerB).toEqual(['', 'apple', 'apple,banana']);
  });
});

describe('resetAllStores()', () => {
  it('resets every store registered via defineStore()', () => {
    const a = defineStore({
      initial: () => ({ x: 0 }),
      actions: (set, get) => ({ inc: () => set({ x: get().x + 1 }) }),
    });
    const b = defineStore({
      initial: () => ({ y: 'hello' }),
      actions: (set) => ({ shout: () => set({ y: 'HELLO' }) }),
    });

    a.actions.inc();
    a.actions.inc();
    b.actions.shout();
    expect(a.state.value.x).toBe(2);
    expect(b.state.value.y).toBe('HELLO');

    resetAllStores();
    expect(a.state.value.x).toBe(0);
    expect(b.state.value.y).toBe('hello');
  });

  it('is a no-op when the registry is empty', () => {
    expect(() => { resetAllStores(); }).not.toThrow();
  });
});

describe('dev-mode read-only guard on get() snapshot', () => {
  // Vitest sets `NODE_ENV=test`, so the dev-only read-only guard is active
  // here. `get()` returns a deep read-only Proxy; mutating it from inside an
  // action throws a `TypeError` — the worst silent-misbehavior in the
  // diagnostic audit (Rule 8: mutation lands on the underlying object but never
  // re-fires effects) is now a loud throw. Production returns the bare
  // reference for zero overhead.
  const READ_ONLY = /read-only/;
  const glob = globalThis as { KERF_DEV?: unknown };

  afterEach(() => {
    delete glob.KERF_DEV;
  });

  it('mutating a top-level property of get() throws a read-only TypeError', () => {
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (_set, get) => ({
        wronglyMutate: () => { (get() as { count: number }).count = 42; },
      }),
    });
    expect(() => counter.actions.wronglyMutate()).toThrow(READ_ONLY);
    expect(counter.state.value.count).toBe(0);
  });

  it('mutating a NESTED property of get() throws (deep coverage, new capability)', () => {
    const store = defineStore({
      initial: () => ({ user: { name: 'ada', tags: ['a'] } }),
      actions: (_set, get) => ({
        mutateNested: () => { (get() as { user: { name: string } }).user.name = 'grace'; },
        mutateNestedArray: () => { (get() as { user: { tags: string[] } }).user.tags[0] = 'z'; },
      }),
    });
    expect(() => store.actions.mutateNested()).toThrow(READ_ONLY);
    expect(() => store.actions.mutateNestedArray()).toThrow(READ_ONLY);
    expect(store.state.value.user.name).toBe('ada');
    expect(store.state.value.user.tags[0]).toBe('a');
  });

  it('delete and defineProperty on get() both throw', () => {
    const store = defineStore({
      initial: () => ({ a: 1, b: 2 }),
      actions: (_set, get) => ({
        del: () => { delete (get() as { a?: number }).a; },
        define: () => { Object.defineProperty(get(), 'c', { value: 3 }); },
      }),
    });
    expect(() => store.actions.del()).toThrow(READ_ONLY);
    expect(() => store.actions.define()).toThrow(READ_ONLY);
    expect(store.state.value).toEqual({ a: 1, b: 2 });
  });

  it('spread / JSON.stringify / Object.keys / array iteration all work through the proxy', () => {
    const store = defineStore({
      initial: () => ({ count: 2, items: [{ id: 1 }, { id: 2 }], meta: { ok: true } }),
      actions: (_set, get) => ({
        probe: () => {
          const snap = get();
          // spread — copies own enumerable props into a plain object
          const copy = { ...snap };
          // JSON round-trips the whole (nested) structure
          const json = JSON.parse(JSON.stringify(snap)) as typeof snap;
          // Object.keys reflects the target's own keys
          const keys = Object.keys(snap);
          // array iteration through the nested proxy
          const ids = snap.items.map((i) => i.id);
          return { copy, json, keys, ids, isObj: snap instanceof Object };
        },
      }),
    });
    const r = store.actions.probe();
    expect(r.copy).toEqual({ count: 2, items: [{ id: 1 }, { id: 2 }], meta: { ok: true } });
    expect(r.json).toEqual({ count: 2, items: [{ id: 1 }, { id: 2 }], meta: { ok: true } });
    expect(r.keys).toEqual(['count', 'items', 'meta']);
    expect(r.ids).toEqual([1, 2]);
    expect(r.isObj).toBe(true);
  });

  it('the canonical set(next) action path is unaffected by the guard', () => {
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (set, get) => ({
        inc: () => set({ count: get().count + 1 }),
      }),
    });
    counter.actions.inc();
    counter.actions.inc();
    counter.actions.inc();
    expect(counter.state.value.count).toBe(3);
  });

  it('set({ ...get(), ... }) stores a plain object — never a Proxy — and shares unchanged nested refs', () => {
    const store = defineStore({
      initial: () => ({ count: 0, nested: { x: 1 } }),
      actions: (set, get) => ({
        bump: () => set({ ...get(), count: get().count + 1 }),
      }),
    });
    const nestedBefore = store.state.value.nested;
    store.actions.bump();
    const stored = store.state.value;
    expect(stored.count).toBe(1);
    // The stored top-level object and its nested value are the raw objects,
    // not proxies — mutating them outside an action succeeds (no traps).
    expect(() => { (stored as { count: number }).count = 99; }).not.toThrow();
    // Unchanged nested branch is carried forward by identity (structural sharing).
    expect(stored.nested).toBe(nestedBefore);
    // Restore for the effect-count invariant of other tests (harmless here).
    stored.count = 1;
  });

  it('primitive-valued state is not wrapped (no-op on non-objects)', () => {
    const flag = defineStore({
      initial: () => false,
      actions: (set, get) => ({ toggle: () => set(!get()) }),
    });
    expect(() => flag.actions.toggle()).not.toThrow();
    expect(flag.state.value).toBe(true);
  });

  it('does NOT collaterally freeze the live state object (external refs stay writable)', () => {
    const store = defineStore({
      initial: () => ({ count: 0, nested: { x: 1 } }),
      actions: (_set, get) => ({ read: () => { void get(); } }),
    });
    const raw = store.state.value; // the actual stored reference
    store.actions.read(); // triggers get() → proxies, but must NOT freeze raw
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(raw.nested)).toBe(false);
    // A legitimate external mutation of the live object still works in dev.
    expect(() => { (raw as { count: number }).count = 5; }).not.toThrow();
  });

  it('prod mode (globalThis.KERF_DEV = false) returns the raw object with no traps', () => {
    glob.KERF_DEV = false;
    const store = defineStore({
      initial: () => ({ count: 0, nested: { x: 1 } }),
      actions: (_set, get) => ({
        mutate: () => { (get() as { count: number }).count = 42; },
        mutateNested: () => { (get() as { nested: { x: number } }).nested.x = 9; },
      }),
    });
    // No proxy, no traps — mutations land silently (prod semantics).
    expect(() => store.actions.mutate()).not.toThrow();
    expect(() => store.actions.mutateNested()).not.toThrow();
  });
});

describe('dev-mode freeze respects the globalThis.KERF_DEV override (KF-334)', () => {
  const glob = globalThis as {
    KERF_DEV?: unknown;
    process?: { env?: Record<string, string | undefined> };
  };
  const env = glob.process?.env as Record<string, string | undefined>;

  afterEach(() => {
    delete glob.KERF_DEV;
  });

  it('KERF_DEV=false disables the freeze even under a dev NODE_ENV', () => {
    // NODE_ENV=test here → dev-ON by default, but the explicit override wins,
    // so the mutation lands silently instead of throwing.
    glob.KERF_DEV = false;
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (_set, get) => ({
        mutate: () => { (get() as { count: number }).count = 42; },
      }),
    });
    expect(() => counter.actions.mutate()).not.toThrow();
  });

  it('KERF_DEV=true enables the freeze even under NODE_ENV=production', () => {
    const prevNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    glob.KERF_DEV = true;
    try {
      const counter = defineStore({
        initial: () => ({ count: 0 }),
        actions: (_set, get) => ({
          mutate: () => { (get() as { count: number }).count = 42; },
        }),
      });
      // KF-341: the dev guard is now the deep read-only proxy (not
      // Object.freeze), so the override enables its rule-specific TypeError.
      expect(() => counter.actions.mutate()).toThrow(/store state is read-only/);
    } finally {
      env.NODE_ENV = prevNodeEnv;
    }
  });
});

describe('batch() inside an action', () => {
  // docs/3-stores.md §3.5 — wrapping multiple set() calls in batch() inside
  // a multi-step action coalesces consumer notifications. Without this,
  // mid-action UI flashes can sneak back in (subscribers re-run between
  // the writes, briefly seeing the half-applied state). This test pins the
  // performance contract that stores were designed to provide.
  it('coalesces multiple set() calls into one effect re-run', () => {
    const store = defineStore({
      initial: () => ({ a: 0, b: 0 }),
      actions: (set, get) => ({
        bump: () => batch(() => {
          set({ ...get(), a: get().a + 1 });
          set({ ...get(), b: get().b + 1 });
        }),
      }),
    });
    let runs = 0;
    effect(() => { void store.state.value; runs += 1; });
    expect(runs).toBe(1);
    store.actions.bump();
    expect(runs).toBe(2); // not 3 — both writes coalesced
    expect(store.state.value).toEqual({ a: 1, b: 1 });
  });
});
