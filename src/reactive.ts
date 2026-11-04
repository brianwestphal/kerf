/**
 * Re-exports of `@preact/signals-core`. Lets the rest of the codebase depend
 * on `'./reactive.js'` without naming the underlying lib, so swapping it out
 * later (or fronting it with a hand-rolled implementation) is a one-file
 * change.
 *
 * Three dev hook slots sit in front of the bare re-exports:
 *
 * - `signalFactory` replaces the constructor so writes to never-subscribed
 *   signals can warn (`KERF_DEV_WARN_UNTRACKED_SIGNALS=1`).
 *
 * - `wrapEffect` wraps the user body so `delegate()` can detect that it's
 *   running inside an effect (`KERF_DEV_WARN_DELEGATE_IN_EFFECT=1`).
 *
 * - `wrapComputed` wraps a `computed()` body so the dev entry can count
 *   re-evaluations that produced no new value (`KERF_DEV_WARN_SELECTOR_FANOUT=1`,
 *   KF-AJ4KG6). `signalFactory` is its write side.
 *
 * All three are `undefined` unless the consumer imported `kerfjs/dev`, so production
 * sees the bare `@preact/signals-core` exports behind one property read.
 *
 * ORDERING: all three slots are resolved at CREATION time. A signal created
 * before `kerfjs/dev` is installed (or before `untrackedSignals` /
 * `selectorFanout` is switched on) stays plain, an effect created before the
 * install (or before `delegateInEffect` is switched on) is never wrapped, and
 * neither is a computed created before `selectorFanout` is switched on. Static imports hoist
 * above a `await import()`, so module-scope signals and effects in imported
 * modules are created first. `mount()`'s `listenerRebuild` hook is the fourth
 * creation-time boundary. See docs/11-dev-warnings.md §11.3.6.
 */

import {
  computed as coreComputed,
  effect as coreEffect,
  type ReadonlySignal,
  Signal,
  signal as coreSignal,
  type SignalOptions,
} from '@preact/signals-core';

import { devHooks } from './dev-hooks.js';

export { batch, type ReadonlySignal, Signal } from '@preact/signals-core';

/**
 * Runtime type guard for a `@preact/signals-core` signal (both `signal()`
 * values and `computed()` values are `Signal` instances). Used by the JSX
 * runtime (KF-294) to detect a signal handed straight into an attribute or
 * text hole — the trigger for a fine-grained binding rather than a snapshot
 * stringify.
 */
export function isSignal(value: unknown): value is Signal<unknown> {
  return value instanceof Signal;
}

export function signal<T>(value?: T): Signal<T> {
  const factory = devHooks.signalFactory;
  if (factory) return factory<T>(value as T);
  return coreSignal(value as T);
}

/**
 * A plain signals-core signal that bypasses the dev `signalFactory`, with the
 * `watched` / `unwatched` options. For kerf-internal signals whose writes are
 * bookkeeping, not app state (`selector()`'s per-key flags), so the
 * untracked-signal warning never fires on them. Internal.
 */
export function rawSignal<T>(value: T, options?: SignalOptions<T>): Signal<T> {
  return coreSignal(value, options);
}

export function effect(fn: () => void | (() => void)): () => void {
  const wrap = devHooks.wrapEffect;
  return coreEffect(wrap ? wrap(fn) : fn);
}

/**
 * `@preact/signals-core`'s `computed()`, with the dev `wrapComputed` slot in
 * front of the body (selector fan-out counting). `options` (`watched` /
 * `unwatched`) are forwarded unchanged.
 */
export function computed<T>(
  fn: () => T,
  options?: SignalOptions<T>,
): ReadonlySignal<T> {
  const wrap = devHooks.wrapComputed;
  return coreComputed(wrap ? wrap(fn) : fn, options);
}
