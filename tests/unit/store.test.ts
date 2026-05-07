/**
 * Unit tests for `defineStore()` + `resetAllStores()`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { effect } from '../../src/reactive.js';
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
