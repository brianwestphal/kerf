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
 * The gate is `KERF_DEV_WARN_UNTRACKED_SIGNALS === '1'`, on top of the
 * diagnostics being installed at all — importing `kerfjs/dev` is what makes
 * this module reachable. Off by default because the heuristic produces false
 * positives for purely imperative signals (used as mutable cells with no UI
 * consumer); opt-in is the right shape until a sharper heuristic is found.
 * Production behavior is unchanged for zero runtime cost.
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
  return proc?.env?.KERF_DEV_WARN_UNTRACKED_SIGNALS === '1';
}

/**
 * This warning is the ONE member of the family whose coverage depends on WHEN
 * `kerfjs/dev` was installed, because `signal()` picks its constructor at
 * creation time. Signals created before the install are plain `Signal`s
 * forever and this warning can never see them.
 *
 * That matters in the common layout, because static imports are hoisted above
 * a top-level `await import()`:
 *
 * ```js
 * import { counter } from './store.js';                 // created HERE
 * if (import.meta.env.DEV) await import('kerfjs/dev');  // ...installs after
 * ```
 *
 * kerf's state model is module-scope signals, so that ordering can leave the
 * warning covering almost nothing — and failing SILENTLY, which is the worst
 * outcome for a diagnostic: the author sets the env var, sees nothing, and
 * concludes their code is clean.
 *
 * Retro-fitting already-created signals is not possible. `Signal.prototype`'s
 * `value` accessor is **non-configurable**, so it cannot be patched, and
 * reaching existing instances would need kerf to keep a registry of every
 * signal — a per-signal production cost paid to serve an opt-in dev warning,
 * which is exactly the coupling the hook registry removed. So the miss is
 * converted from silent to loud instead: opting in prints the coverage
 * boundary once, with the fix.
 */
let coverageNoticeShown = false;

export function noteUntrackedCoverage(): void {
  if (coverageNoticeShown) return;
  coverageNoticeShown = true;
  console.warn(
    'kerf: KERF_DEV_WARN_UNTRACKED_SIGNALS only covers signals created AFTER kerfjs/dev is installed. '
    + 'Static imports are hoisted above `await import(\'kerfjs/dev\')`, so module-scope signals in the modules '
    + 'you import are created first and this warning cannot see them — you may get no warnings even where the '
    + 'bug exists. To cover them, make `import \'kerfjs/dev\'` the FIRST STATIC import of a dev-only entry file '
    + '(static imports evaluate in order), then load the rest of your app. '
    + 'Set KERF_DEV_WARN_UNTRACKED_SIGNALS=0 (or unset it) to silence this warning.',
  );
}

/** Test helper — re-arms the one-shot coverage notice. */
export function _resetCoverageNoticeForTests(): void {
  coverageNoticeShown = false;
}
