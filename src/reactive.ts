/**
 * Re-exports of `@preact/signals-core`. Lets the rest of the codebase depend
 * on `'./reactive.js'` without naming the underlying lib, so swapping it out
 * later (or fronting it with a hand-rolled implementation) is a one-file
 * change.
 *
 * The `signal()` factory is dev-gated: when `NODE_ENV !== 'production'` and
 * `KERF_DEV_WARN_UNTRACKED_SIGNALS === '1'`, it returns a `DevSignal` that
 * warns on writes to signals with no subscribers (KF-176). Off by default;
 * production always returns the bare `@preact/signals-core` signal.
 */

import { type Signal,signal as coreSignal } from '@preact/signals-core';

import { DevSignal, isDevWarnUntrackedEnabled } from './dev-signal.js';

export {
  batch,
  computed,
  effect,
  type ReadonlySignal,
  type Signal,
} from '@preact/signals-core';

export function signal<T>(value?: T): Signal<T> {
  if (isDevWarnUntrackedEnabled()) return new DevSignal<T>(value as T) as Signal<T>;
  return coreSignal(value as T);
}
