/**
 * Dev-mode signal subclass with subscriber tracking (KF-176). When the
 * dev-warn opt-in is enabled, `signal()` returns a `DevSignal` that emits a
 * one-shot `console.warn` the first time `.value` is written to an instance
 * that has never had a subscriber attached. This surfaces the canonical
 * Rule 7 violation (read `.value` outside a render fn / effect — the read
 * doesn't subscribe, so subsequent writes silently fail to re-render) at
 * the moment the user makes the wrong write, instead of leaving them to
 * notice that their UI never updates.
 *
 * The gate is `process.env.NODE_ENV !== 'production'` AND
 * `KERF_DEV_WARN_UNTRACKED_SIGNALS === '1'`. Off by default because the
 * heuristic produces false positives for purely imperative signals (used as
 * mutable cells with no UI consumer); opt-in is the right shape until a
 * sharper heuristic is found. Production behavior is unchanged for zero
 * runtime cost.
 *
 * The subclass uses signals-core's `SignalOptions.watched` callback to set a
 * per-instance `__hasSubscriber` flag — fired by signals-core when the first
 * subscriber attaches. We never clear the flag on `unwatched`, so a signal
 * that *was* subscribed at some point won't warn even if its subscribers
 * later detach.
 */

import { Signal } from '@preact/signals-core';

const WARNING_MESSAGE
  = 'kerf: signal was written but has no subscribers. '
  + 'Did you read `.value` outside of a render fn / effect()? '
  + 'Hoisted reads do not subscribe, so subsequent writes will not re-render. '
  + 'Move the read inside mount()\'s render fn or effect() callback. '
  + 'Set KERF_DEV_WARN_UNTRACKED_SIGNALS=0 (or unset it) to silence this warning.';

export class DevSignal<T> extends Signal<T> {
  private __hasSubscriber = false;
  private __warned = false;
  private __constructed = false;

  constructor(initial?: T) {
    super(initial as T, {
      watched(this: Signal<T>) {
        (this as unknown as { __hasSubscriber: boolean }).__hasSubscriber = true;
      },
    });
    this.__constructed = true;
  }

  override get value(): T { return super.value; }
  override set value(v: T) {
    super.value = v;
    if (this.__constructed && !this.__hasSubscriber && !this.__warned) {
      this.__warned = true;
      console.warn(WARNING_MESSAGE);
    }
  }
}

export function isDevWarnUntrackedEnabled(): boolean {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (proc?.env?.NODE_ENV === 'production') return false;
  return proc?.env?.KERF_DEV_WARN_UNTRACKED_SIGNALS === '1';
}
