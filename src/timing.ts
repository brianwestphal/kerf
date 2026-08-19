/**
 * `kerfjs/timing` — the small timing primitives every app hand-rolls.
 *
 * kerf already replaced most imperative bookkeeping — `delegate` for listeners,
 * `mount`/`effect` for render, `defineStore` for state — but debouncing and
 * throttling still get written by hand as `let timer; clearTimeout(timer);
 * timer = setTimeout(fn, ms)`. This subpath blesses that with disposer-shaped
 * ergonomics (`.cancel()` / `.flush()`), plus `debouncedSignal` so a trailing
 * value composes inside the reactive graph instead of beside it.
 *
 *   import { debounce, throttle, debouncedSignal } from 'kerfjs/timing';
 *
 *   const save = debounce(() => persist(state), 300);
 *   input.addEventListener('input', save);   // save.cancel() on teardown
 *
 *   const query = signal('');
 *   const debouncedQuery = debouncedSignal(query, 250); // trails query by 250ms
 *
 * Tree-shakeable and tiny — `debounce`/`throttle` are dependency-free; only
 * `debouncedSignal` pulls in signals (no render core).
 */
import { effect, type ReadonlySignal, signal } from './reactive.js';

/** A debounced function: call it like the original, plus `cancel()` / `flush()`. */
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  /** Drop any pending trailing call without invoking it. */
  cancel(): void;
  /** Invoke the pending trailing call now (if any) and clear the timer. */
  flush(): void;
}

/** A throttled function: call it like the original, plus `cancel()` / `flush()`. */
export interface Throttled<A extends unknown[]> {
  (...args: A): void;
  /** Drop any pending trailing call and reset the rate window. */
  cancel(): void;
  /** Invoke the pending trailing call now (if any). */
  flush(): void;
}

/**
 * Trailing-edge debounce: `fn` runs `ms` after calls STOP, with the most recent
 * arguments. Every call within the quiet window resets the timer. `cancel()`
 * drops a pending call; `flush()` runs it immediately.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | undefined;

  const invoke = (): void => {
    timer = undefined;
    const args = lastArgs as A;
    lastArgs = undefined;
    fn(...args);
  };

  const debounced = ((...args: A): void => {
    lastArgs = args;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(invoke, ms);
  }) as Debounced<A>;

  debounced.cancel = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
  };

  debounced.flush = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      invoke();
    }
  };

  return debounced;
}

/**
 * Leading-plus-trailing throttle: `fn` runs immediately on the first call, then
 * at most once per `ms`. Calls during a cooldown collapse to a single trailing
 * call at the window's end (with the latest arguments). `cancel()` drops a
 * pending trailing call and resets the window; `flush()` runs it now.
 */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number): Throttled<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let trailingArgs: A | undefined;

  const runTrailing = (): void => {
    const args = trailingArgs as A;
    trailingArgs = undefined;
    fn(...args);
  };

  const startCooldown = (): void => {
    timer = setTimeout(() => {
      timer = undefined;
      if (trailingArgs !== undefined) {
        runTrailing();
        startCooldown(); // hold the rate limit for a beat after a trailing call
      }
    }, ms);
  };

  const throttled = ((...args: A): void => {
    if (timer === undefined) {
      fn(...args); // leading edge
      startCooldown();
    } else {
      trailingArgs = args; // collapse into one trailing call
    }
  }) as Throttled<A>;

  throttled.cancel = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    trailingArgs = undefined;
  };

  throttled.flush = (): void => {
    if (trailingArgs !== undefined) runTrailing();
  };

  return throttled;
}

/**
 * A read-only signal that trails `source` by `ms` (trailing-edge). Writes to
 * `source` reschedule; the derived value updates once writes go quiet, so it
 * composes with `computed()`/`effect()`/`mount()` like any signal.
 *
 * Holds a live subscription to `source` for its lifetime (like a module-scope
 * `effect`) — intended for app-lifetime signals, not throwaway ones. For a
 * disposable variant, drive your own `effect` with {@link debounce}.
 */
export function debouncedSignal<T>(source: ReadonlySignal<T>, ms: number): ReadonlySignal<T> {
  const out = signal(source.value);
  const write = debounce((value: T) => {
    out.value = value;
  }, ms);
  effect(() => {
    write(source.value); // tracks source; reschedules on every change
  });
  return out;
}
