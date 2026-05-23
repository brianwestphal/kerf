/**
 * Re-exports of `@preact/signals-core`. Lets the rest of the codebase depend
 * on `'./reactive.js'` without naming the underlying lib, so swapping it out
 * later (or fronting it with a hand-rolled implementation) is a one-file
 * change.
 *
 * Two dev-gated wrappers sit in front of the bare re-exports:
 *
 * - `signal()` returns a `DevSignal` when `KERF_DEV_WARN_UNTRACKED_SIGNALS=1`
 *   (KF-176) — warns on writes to signals with no subscribers.
 *
 * - `effect()` wraps the user body in `enterEffect()` / `exitEffect()` calls
 *   when `KERF_DEV_WARN_DELEGATE_IN_EFFECT=1` so `delegate()` can detect when
 *   it's running inside an effect body and fire the appropriate warning.
 *
 * Both gates short-circuit on `NODE_ENV === 'production'` — production
 * always sees the bare `@preact/signals-core` exports with zero overhead.
 */

import { effect as coreEffect,type Signal,signal as coreSignal } from '@preact/signals-core';

import { enterEffect, exitEffect, isDevWarnDelegateInEffectEnabled } from './dev-delegate-warn.js';
import { DevSignal, isDevWarnUntrackedEnabled } from './dev-signal.js';

export {
  batch,
  computed,
  type ReadonlySignal,
  type Signal,
} from '@preact/signals-core';

export function signal<T>(value?: T): Signal<T> {
  if (isDevWarnUntrackedEnabled()) return new DevSignal<T>(value as T) as Signal<T>;
  return coreSignal(value as T);
}

export function effect(fn: () => void | (() => void)): () => void {
  if (!isDevWarnDelegateInEffectEnabled()) return coreEffect(fn);
  return coreEffect(() => {
    enterEffect();
    try {
      return fn();
    } finally {
      exitEffect();
    }
  });
}
