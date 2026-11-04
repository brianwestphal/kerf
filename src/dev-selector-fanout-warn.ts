/**
 * KF-AJ4KG6: opt-in dev warning for a SELECTOR FAN-OUT — one signal write that
 * re-evaluates many `computed()`s of which almost none produce a different
 * value (`enableWarnings({ selectorFanout: true })` /
 * `KERF_DEV_WARN_SELECTOR_FANOUT=1`).
 *
 * The canonical shape is a per-row equality test against one shared signal:
 *
 * ```tsx
 * <tr class={computed(() => (row.id === selectedId.value ? 'danger' : ''))}>
 * ```
 *
 * Every write to `selectedId` re-evaluates all N row computeds, yet only the
 * previously selected and the newly selected row change. `selector()` /
 * `setSelector()` replace that O(N) fan-out with O(1) per change.
 *
 * ## The signal
 *
 * The KF-HKXHNV prototype measured the ratio that separates the two shapes:
 * N=1000 equality computeds → one write, 1000 evaluations, 2 changed; a broad
 * legitimate update (a theme signal read by 1000 computeds) → 1000
 * evaluations, 1000 changed. So this module counts, across every wrapped
 * computed, how many re-evaluations ran and how many returned a value that is
 * not `Object.is` to the previous one.
 *
 * ## Attribution
 *
 * A write to a tracked `DevSignal` opens a WINDOW: it snapshots both counters
 * and captures the write's stack, then closes on a microtask. That covers
 * signals-core's synchronous flush and an enclosing `batch()` (which flushes
 * at its end, still synchronously). A window in which more than one tracked
 * signal was written cannot be attributed to either, so it is skipped — it
 * neither advances nor resets any signal's streak.
 *
 * A window qualifies when it ran at least `MIN_EVALUATIONS` re-evaluations and
 * at most `max(2, 2%)` of them changed. Three qualifying windows in a row for
 * the same signal fire one warning for that signal; a non-qualifying window
 * resets the streak, so one large but legitimate write never accumulates.
 *
 * ## Coverage boundary
 *
 * Both halves are decided at CREATION time: `computed()` asks the
 * `wrapComputed` hook whether to wrap its body, and `signal()` asks the
 * `signalFactory` hook whether to build a `DevSignal`. A computed or signal
 * created before `kerfjs/dev` is installed, or before this switch is on, is
 * invisible to the warning (docs/11 §11.3.6).
 *
 * The counters and the open window are module-level dev-only bookkeeping —
 * exempt from Design rule 5 like every `dev-*` module.
 */

import { devFlag, silenceHint } from './dev-warn-config.js';

/** Fewer re-evaluations than this in a window is not a fan-out worth naming. */
const MIN_EVALUATIONS = 200;
/** The changed fraction at or under which a window looks like an equality test. */
const MAX_CHANGED_RATIO = 0.02;
/** Absolute floor for the changed count: deselect + select is two rows. */
const MIN_CHANGED_ALLOWANCE = 2;
/** Consecutive qualifying windows before the warning fires. */
const STREAK_TO_WARN = 3;

let evaluations = 0;
let changes = 0;

interface Window {
  signal: object;
  baseEvaluations: number;
  baseChanges: number;
  stack: string;
  multiple: boolean;
}

let open: Window | null = null;

interface SignalState {
  streak: number;
  warned: boolean;
}

let states = new WeakMap<object, SignalState>();

export function isSelectorFanoutEnabled(): boolean {
  return devFlag('KERF_DEV_WARN_SELECTOR_FANOUT') === '1';
}

/**
 * The `wrapComputed` hook. Resolved once per `computed()` call: a computed
 * created while the switch is off runs its body unwrapped forever.
 */
export function wrapComputedForFanout<T>(fn: () => T): () => T {
  if (!isSelectorFanoutEnabled()) return fn;
  let hasPrevious = false;
  let previous: T | undefined;
  return function (this: unknown): T {
    const value = fn.call(this);
    // The first evaluation is the computed's initial render, not a response
    // to a write, so only re-evaluations are counted.
    if (hasPrevious) {
      evaluations++;
      if (!Object.is(previous, value)) changes++;
    }
    hasPrevious = true;
    previous = value;
    return value;
  };
}

/**
 * Called by a fan-out-tracking `DevSignal` after a write that changed its
 * value. Opens (or joins) the current window.
 */
export function noteTrackedSignalWrite(signal: object): void {
  if (open !== null) {
    if (open.signal !== signal) open.multiple = true;
    return;
  }
  const window: Window = {
    signal,
    baseEvaluations: evaluations,
    baseChanges: changes,
    stack: String(new Error().stack),
    multiple: false,
  };
  open = window;
  void Promise.resolve().then(() => closeWindow(window));
}

function closeWindow(window: Window): void {
  // A test reset between the write and this microtask dropped the window.
  if (open !== window) return;
  open = null;
  if (window.multiple) return;
  const ran = evaluations - window.baseEvaluations;
  const changed = changes - window.baseChanges;
  let state = states.get(window.signal);
  if (state === undefined) {
    state = { streak: 0, warned: false };
    states.set(window.signal, state);
  }
  const qualifies =
    ran >= MIN_EVALUATIONS &&
    changed <= Math.max(MIN_CHANGED_ALLOWANCE, ran * MAX_CHANGED_RATIO);
  if (!qualifies) {
    state.streak = 0;
    return;
  }
  state.streak++;
  if (state.streak < STREAK_TO_WARN || state.warned) return;
  state.warned = true;
  console.warn(
    `kerf: one write to this signal re-evaluated ${ran} computed()s but only ${changed} ` +
      `produced a different value, ${STREAK_TO_WARN} writes in a row. ` +
      'If each comparison is an equality or membership test against this signal ' +
      '(e.g. computed(() => row.id === selected.value ? ...)), use selector() for ' +
      'equality or setSelector() for set membership from kerfjs instead — they update ' +
      'only the keys whose answer changed, O(1) per write instead of O(rows). ' +
      `The write happened at:\n${window.stack}\n` +
      silenceHint('selectorFanout'),
  );
}

/** Test helper — drops the counters, the open window, and every streak. */
export function _resetSelectorFanoutForTests(): void {
  evaluations = 0;
  changes = 0;
  open = null;
  states = new WeakMap();
}
