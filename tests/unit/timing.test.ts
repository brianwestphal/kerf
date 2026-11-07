import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { effect, signal } from '../../src/reactive.js';
import { debounce, debouncedSignal, throttle } from '../../src/timing.js';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('debounce()', () => {
  it('runs fn once after ms of quiet, with the latest arguments', () => {
    const calls: number[] = [];
    const d = debounce((x: number) => calls.push(x), 100);
    d(1);
    d(2);
    d(3);
    expect(calls).toEqual([]); // nothing yet
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([3]); // once, with the last args
  });

  it('resets the timer on each call (a burst collapses to one trailing call)', () => {
    const calls: string[] = [];
    const d = debounce((x: string) => calls.push(x), 100);
    d('a');
    vi.advanceTimersByTime(50);
    d('b'); // resets the 100ms window
    vi.advanceTimersByTime(50);
    expect(calls).toEqual([]); // only 50ms since the last call
    vi.advanceTimersByTime(50);
    expect(calls).toEqual(['b']);
  });

  it('cancel() drops a pending call; cancel() with nothing pending is a no-op', () => {
    const calls: number[] = [];
    const d = debounce((x: number) => calls.push(x), 100);
    d(1);
    d.cancel();
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([]);
    d.cancel(); // no-op, does not throw
    expect(calls).toEqual([]);
  });

  it('flush() invokes the pending call immediately; flush() with nothing pending is a no-op', () => {
    const calls: number[] = [];
    const d = debounce((x: number) => calls.push(x), 100);
    d.flush(); // nothing pending — no-op
    expect(calls).toEqual([]);
    d(7);
    d.flush();
    expect(calls).toEqual([7]);
    vi.advanceTimersByTime(100); // the timer was cleared by flush — no double-invoke
    expect(calls).toEqual([7]);
  });

  it('transition: flush() → a new call re-arms a full window (KF-XW1RE9)', () => {
    const calls: number[] = [];
    const d = debounce((x: number) => calls.push(x), 100);
    d(1);
    vi.advanceTimersByTime(60);
    d.flush();
    expect(calls).toEqual([1]);
    d(2); // idle again → re-arms from now
    vi.advanceTimersByTime(99);
    expect(calls).toEqual([1]);
    vi.advanceTimersByTime(1);
    expect(calls).toEqual([1, 2]);
    d.flush(); // nothing pending after the timer fired
    expect(calls).toEqual([1, 2]);
  });
});

describe('throttle()', () => {
  it('invokes immediately on the leading edge, then collapses a burst to one trailing call', () => {
    const calls: number[] = [];
    const t = throttle((x: number) => calls.push(x), 100);
    t(1); // leading
    expect(calls).toEqual([1]);
    t(2);
    t(3); // collapse: only the last survives as trailing
    expect(calls).toEqual([1]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 3]); // trailing fired with the latest args
  });

  it('no trailing call when only the leading happened', () => {
    const calls: number[] = [];
    const t = throttle((x: number) => calls.push(x), 100);
    t(1);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1]);
    vi.advanceTimersByTime(1000);
    expect(calls).toEqual([1]); // still just the leading
  });

  it('holds the rate limit for a beat after a trailing call, then a fresh call leads again', () => {
    const calls: number[] = [];
    const t = throttle((x: number) => calls.push(x), 100);
    t(1); // leading
    t(2); // trailing
    vi.advanceTimersByTime(100); // trailing fires (2), a new cooldown starts
    expect(calls).toEqual([1, 2]);
    vi.advanceTimersByTime(100); // cooldown ends with nothing pending
    t(3); // window is clear → leads immediately
    expect(calls).toEqual([1, 2, 3]);
  });

  it('cancel() drops a pending trailing call and resets the window; cancel() when idle is a no-op', () => {
    const calls: number[] = [];
    const t = throttle((x: number) => calls.push(x), 100);
    t.cancel(); // idle — no timer yet, must not throw
    t(1); // leading
    t(2); // trailing pending
    t.cancel();
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1]); // trailing dropped
    t(3); // window reset → leads again
    expect(calls).toEqual([1, 3]);
  });

  it('cancel() inside the leading callback resets the window immediately', () => {
    const calls: number[] = [];
    let t: ReturnType<typeof throttle<[number]>>;
    t = throttle((x: number) => {
      calls.push(x);
      if (x === 1) {
        t.cancel();
        t(2);
      }
    }, 100);

    t(1);

    expect(calls).toEqual([1, 2]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2]);
  });

  it('cancel() inside the trailing callback resets its newly started window', () => {
    const calls: number[] = [];
    let t: ReturnType<typeof throttle<[number]>>;
    t = throttle((x: number) => {
      calls.push(x);
      if (x === 2) {
        t.cancel();
        t(3);
      }
    }, 100);

    t(1);
    t(2);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2, 3]);
  });

  it('keeps reentrant calls throttled when the callback does not cancel first', () => {
    const calls: number[] = [];
    let t: ReturnType<typeof throttle<[number]>>;
    t = throttle((x: number) => {
      calls.push(x);
      if (x < 3) t(x + 1);
    }, 100);

    t(1);
    expect(calls).toEqual([1]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2, 3]);
  });

  it('flush() invokes a pending trailing call now; flush() with nothing pending is a no-op', () => {
    const calls: number[] = [];
    const t = throttle((x: number) => calls.push(x), 100);
    t(1); // leading
    t.flush(); // nothing trailing yet — no-op
    expect(calls).toEqual([1]);
    t(2); // trailing pending
    t.flush();
    expect(calls).toEqual([1, 2]);
  });

  it('transition: flush() leaves the cooldown running — a call inside the remaining window trails, then starts a new cooldown (KF-XW1RE9)', () => {
    const calls: number[] = [];
    const t = throttle((x: number) => calls.push(x), 100);
    t(1); // leading at t=0, cooldown until t=100
    vi.advanceTimersByTime(10);
    t(2); // trailing pending
    vi.advanceTimersByTime(10);
    t.flush(); // runs 2 now (t=20) — the window is NOT reset
    expect(calls).toEqual([1, 2]);
    vi.advanceTimersByTime(10);
    t(3); // t=30, still inside the original window → becomes the trailing call
    expect(calls).toEqual([1, 2]);
    vi.advanceTimersByTime(69);
    expect(calls).toEqual([1, 2]); // t=99
    vi.advanceTimersByTime(1);
    expect(calls).toEqual([1, 2, 3]); // t=100: the timer fires the trailing call…
    t(4); // …and started a new cooldown, so this trails too
    expect(calls).toEqual([1, 2, 3]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2, 3, 4]); // t=200
    vi.advanceTimersByTime(100); // t=300: the last window closes with nothing pending
    t(5); // idle → leading again
    expect(calls).toEqual([1, 2, 3, 4, 5]);
  });

  it('transition: flush() at the window end with nothing trailing lets the timer close cleanly', () => {
    const calls: number[] = [];
    const t = throttle((x: number) => calls.push(x), 100);
    t(1);
    t(2);
    t.flush();
    vi.advanceTimersByTime(100); // timer fires with no trailing args → window closes
    expect(calls).toEqual([1, 2]);
    t(3); // leads immediately
    expect(calls).toEqual([1, 2, 3]);
  });
});

describe('debouncedSignal()', () => {
  it('starts equal to the source and trails it by ms', () => {
    const s = signal('a');
    const d = debouncedSignal(s, 100);
    expect(d.value).toBe('a'); // initial value is immediate

    s.value = 'b';
    expect(d.value).toBe('a'); // not yet
    vi.advanceTimersByTime(100);
    expect(d.value).toBe('b'); // settled
  });

  it('a burst of source writes settles once, to the last value', () => {
    const s = signal(0);
    const d = debouncedSignal(s, 100);
    s.value = 1;
    vi.advanceTimersByTime(50);
    s.value = 2;
    vi.advanceTimersByTime(50);
    expect(d.value).toBe(0); // window kept resetting
    vi.advanceTimersByTime(50);
    expect(d.value).toBe(2);
  });

  it('transition: A → B → A within the window settles to A with no downstream effect run (KF-XW1RE9)', () => {
    const s = signal('A');
    const d = debouncedSignal(s, 100);
    const seen: string[] = [];
    const stop = effect(() => {
      seen.push(d.value);
    });
    expect(seen).toEqual(['A']);
    s.value = 'B';
    vi.advanceTimersByTime(50);
    s.value = 'A';
    vi.advanceTimersByTime(100);
    expect(d.value).toBe('A');
    expect(seen).toEqual(['A']); // the settled value equals the old one → no run
    stop();
  });

  it('composes with effect() — a downstream effect fires only after the debounced value settles', () => {
    const s = signal('x');
    const d = debouncedSignal(s, 100);
    const seen: string[] = [];
    const stop = effect(() => {
      seen.push(d.value);
    });
    expect(seen).toEqual(['x']); // initial

    s.value = 'y';
    expect(seen).toEqual(['x']); // debounced signal hasn't changed yet
    vi.advanceTimersByTime(100);
    expect(seen).toEqual(['x', 'y']);
    stop();
  });

  it('dispose() unsubscribes from source and drops a pending trailing write', () => {
    const s = signal(1);
    const d = debouncedSignal(s, 100);
    s.value = 2; // pending write scheduled
    d.dispose();
    vi.advanceTimersByTime(100);
    expect(d.value).toBe(1); // the pending write was dropped
    s.value = 3; // no longer followed
    vi.advanceTimersByTime(100);
    expect(d.value).toBe(1);
    d.dispose(); // idempotent
    expect(vi.getTimerCount()).toBe(0);
  });

  it('dispose() after settling keeps the last value and stays readable in an effect', () => {
    const s = signal('a');
    const d = debouncedSignal(s, 50);
    s.value = 'b';
    vi.advanceTimersByTime(50);
    d.dispose();
    const seen: string[] = [];
    const stop = effect(() => {
      seen.push(d.value);
    });
    s.value = 'c';
    vi.advanceTimersByTime(50);
    expect(seen).toEqual(['b']);
    stop();
  });
});

describe('debounce() — reentrancy and errors', () => {
  it('a call from inside fn schedules a fresh trailing call', () => {
    const calls: number[] = [];
    const d = debounce((x: number) => {
      calls.push(x);
      if (x < 3) d(x + 1);
    }, 100);
    d(1);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2, 3]);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([1, 2, 3]); // settled
  });

  it('fn throwing leaves the debouncer usable for a later call', () => {
    const calls: number[] = [];
    const d = debounce((x: number) => {
      if (x === 1) throw new Error('boom');
      calls.push(x);
    }, 100);
    d(1);
    expect(() => vi.advanceTimersByTime(100)).toThrow('boom');
    d(2);
    vi.advanceTimersByTime(100);
    expect(calls).toEqual([2]);
    // flush() after a throwing flush also recovers.
    d(1);
    expect(() => d.flush()).toThrow('boom');
    d.flush(); // nothing pending
    d(4);
    d.flush();
    expect(calls).toEqual([2, 4]);
  });
});
