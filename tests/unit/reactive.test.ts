/**
 * Unit tests for the reactive primitive re-export. These mostly verify that
 * we exposed the right names from `@preact/signals-core` without breaking
 * their semantics.
 */

import { describe, expect, it } from 'vitest';

import { batch, computed, effect, signal } from '../../src/reactive.js';

describe('signal()', () => {
  it('exposes initial value via .value', () => {
    const s = signal(7);
    expect(s.value).toBe(7);
  });

  it('updates value', () => {
    const s = signal(0);
    s.value = 42;
    expect(s.value).toBe(42);
  });
});

describe('computed()', () => {
  it('derives from a signal and updates when the source changes', () => {
    const a = signal(2);
    const doubled = computed(() => a.value * 2);
    expect(doubled.value).toBe(4);
    a.value = 5;
    expect(doubled.value).toBe(10);
  });

  it('derives from multiple signals', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a.value + b.value);
    expect(sum.value).toBe(3);
    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 20;
    expect(sum.value).toBe(30);
  });
});

describe('effect()', () => {
  it('runs synchronously on creation, then again on dependency change', () => {
    const a = signal(1);
    const log: number[] = [];
    const dispose = effect(() => { log.push(a.value); });
    expect(log).toEqual([1]);
    a.value = 2;
    expect(log).toEqual([1, 2]);
    dispose();
    a.value = 3;
    expect(log).toEqual([1, 2]); // disposed effect doesn't re-run
  });

  it('does NOT re-run when an unread signal changes', () => {
    const a = signal(1);
    const b = signal(100);
    const log: number[] = [];
    effect(() => { log.push(a.value); });
    expect(log).toEqual([1]);
    b.value = 200;
    expect(log).toEqual([1]); // only `a` was read; `b` change is irrelevant
  });
});

describe('batch()', () => {
  it('coalesces multiple writes into a single effect run', () => {
    const a = signal(1);
    const b = signal(2);
    const log: string[] = [];
    effect(() => { log.push(`${a.value},${b.value}`); });
    expect(log).toEqual(['1,2']);

    batch(() => {
      a.value = 10;
      b.value = 20;
    });
    // One run after the batch, not two.
    expect(log).toEqual(['1,2', '10,20']);
  });
});

describe('signals are NOT deep-reactive', () => {
  // docs/2-reactivity.md §2.6 — "Wrong — silently doesn't notify:
  // count.value.push(1). Always assign a new value." This is a soundness
  // contract: deep reactivity is intentionally NOT provided. If the
  // underlying signals impl ever changes to a Proxy-based deep observer,
  // this test fails — and consumer code that relied on reassignment as the
  // only "notify" event would break silently without it.
  it('does NOT notify subscribers when an array inside .value is mutated in place', () => {
    const list = signal<number[]>([]);
    let runs = 0;
    effect(() => { void list.value; runs += 1; });
    expect(runs).toBe(1);
    list.value.push(1); // in-place mutation — must not trigger
    expect(runs).toBe(1);
    list.value = [...list.value, 2]; // reassign — must trigger
    expect(runs).toBe(2);
  });
});
