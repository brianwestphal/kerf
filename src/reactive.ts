/**
 * Re-exports of `@preact/signals-core`. Lets the rest of the codebase depend
 * on `'./reactive.js'` without naming the underlying lib, so swapping it out
 * later (or fronting it with a hand-rolled implementation) is a one-file
 * change.
 *
 * Two dev hook slots sit in front of the bare re-exports:
 *
 * - `signalFactory` replaces the constructor so writes to never-subscribed
 *   signals can warn (`KERF_DEV_WARN_UNTRACKED_SIGNALS=1`).
 *
 * - `wrapEffect` wraps the user body so `delegate()` can detect that it's
 *   running inside an effect (`KERF_DEV_WARN_DELEGATE_IN_EFFECT=1`).
 *
 * Both are `undefined` unless the consumer imported `kerfjs/dev`, so production
 * sees the bare `@preact/signals-core` exports behind one property read.
 *
 * ORDERING: `signalFactory` is resolved at signal-CREATION time, so signals
 * created before `kerfjs/dev` is installed stay plain and the untracked-signal
 * warning never sees them. Static imports hoist above a `await import()`, so a
 * module-scope signal in an imported module is created first. See
 * docs/11-dev-warnings.md for the install-ordering rules.
 */

import { effect as coreEffect,Signal,signal as coreSignal } from '@preact/signals-core';

import { devHooks } from './dev-hooks.js';

export {
  batch,
  computed,
  type ReadonlySignal,
  Signal,
} from '@preact/signals-core';

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

export function effect(fn: () => void | (() => void)): () => void {
  const wrap = devHooks.wrapEffect;
  return coreEffect(wrap ? wrap(fn) : fn);
}
