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

describe('dev-mode freeze of get() snapshot (KF-177)', () => {
  // Vitest sets `NODE_ENV=test`, so the dev-only freeze gate is active here.
  // Mutating the snapshot returned by `get()` from inside an action throws a
  // native `TypeError` — the worst silent-misbehavior in the diagnostic audit
  // (Rule 8: mutation lands on the underlying object but never re-fires
  // effects) is now a loud throw. Production keeps the bare reference for
  // zero overhead.
  it('mutating get() from inside an action throws Cannot-assign-to-read-only', () => {
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (_set, get) => ({
        wronglyMutate: () => { (get() as { count: number }).count = 42; },
      }),
    });
    expect(() => counter.actions.wronglyMutate()).toThrow(/Cannot assign to read only property/);
    expect(counter.state.value.count).toBe(0);
  });

  it('the canonical set(next) action path is unaffected by the freeze', () => {
    // Each set() produces a fresh object that gets re-frozen on the next
    // get() call; the action factory's get() returning a frozen snapshot
    // doesn't block the action from constructing a new state object and
    // calling set() with it.
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

  it('primitive-valued state is not frozen (no-op on non-objects)', () => {
    const flag = defineStore({
      initial: () => false,
      actions: (set, get) => ({ toggle: () => set(!get()) }),
    });
    expect(() => flag.actions.toggle()).not.toThrow();
    expect(flag.state.value).toBe(true);
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
