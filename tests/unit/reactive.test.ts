/**
 * Unit tests for the reactive primitive re-export. These mostly verify that
 * we exposed the right names from `@preact/signals-core` without breaking
 * their semantics.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('dev-mode untracked-write warning (KF-176, opt-in)', () => {
  // Gated behind `KERF_DEV_WARN_UNTRACKED_SIGNALS=1`. The check is per-call,
  // so flipping the env var before each `signal()` call is enough; no module
  // reload required. Routes via `globalThis.process` to keep the test file
  // working under the same lint config as `src/` (no bare `process` ref).
  const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    env.KERF_DEV_WARN_UNTRACKED_SIGNALS = '1';
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete env.KERF_DEV_WARN_UNTRACKED_SIGNALS;
    warnSpy.mockRestore();
  });

  it('warns on the first write to a signal that has never had a subscriber', () => {
    const s = signal(0);
    expect(warnSpy).not.toHaveBeenCalled(); // constructor's initial assignment is not flagged
    s.value = 1;
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/written but has no subscribers/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/KERF_DEV_WARN_UNTRACKED_SIGNALS=0/);
  });

  it('warns only once per signal even after many writes', () => {
    const s = signal(0);
    s.value = 1;
    s.value = 2;
    s.value = 3;
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT warn when the signal has been subscribed via effect()', () => {
    const s = signal(0);
    effect(() => { void s.value; });
    s.value = 1;
    s.value = 2;
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when the signal has been subscribed via computed() (read inside one)', () => {
    const s = signal(0);
    const doubled = computed(() => s.value * 2);
    // Force the computed to evaluate so its source subscribes — computeds are lazy.
    expect(doubled.value).toBe(0);
    // Bind a live consumer so signals-core treats the computed's source as watched.
    const dispose = effect(() => { void doubled.value; });
    s.value = 5;
    expect(warnSpy).not.toHaveBeenCalled();
    dispose();
  });

  it('does NOT warn when the opt-in env var is unset (default off)', () => {
    delete env.KERF_DEV_WARN_UNTRACKED_SIGNALS;
    const s = signal(0);
    s.value = 1;
    s.value = 2;
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when NODE_ENV === \'production\' even with the opt-in env var set', () => {
    const prevEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const s = signal(0);
      s.value = 1;
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = prevEnv;
    }
  });

  it('the Rule 7 canonical case (read outside an effect) trips the warning', () => {
    // The exact failing pattern from docs/ai/usage-guide.md Hard Rule 7:
    // `const x = count.value; mount(el, () => <span>{x}</span>)`. Here we
    // model it without mount/JSX: read .value to capture it locally, then
    // write — no effect has subscribed, so the warning fires.
    const count = signal(0);
    const captured = count.value;
    expect(captured).toBe(0);
    count.value = 5;
    expect(warnSpy).toHaveBeenCalledTimes(1);
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
