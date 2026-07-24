/**
 * Dev-mode warning for `each()` lists whose identity shifted (KF-392).
 *
 * Without an explicit key, a list is identified by its call order — "the n-th
 * `each()` this render". Any render that changes how many `each()` calls run
 * before a list reassigns its identity, and the list is then rebuilt from
 * scratch: row nodes, focus, scroll position and in-progress IME composition
 * are discarded, and the work is O(rows) rather than O(changes).
 *
 * That was entirely silent. `KERF_DEV_WARN_LIST_REBIND` cannot see it either —
 * this rebuild routes through the ordinary classify pass, not the self-heal it
 * watches — so an author had no signal at all that state was being thrown away.
 *
 * **Always on in development, like the missing-row-key warning** rather than
 * env-gated like the `KERF_DEV_WARN_*` family. The reasoning is the same as for
 * that one: it fires only when kerf is about to silently discard row state, it
 * names a concrete one-line fix, and it is one-shot per list — so it is a
 * diagnostic an author always wants, not one they opt into. Production emits
 * nothing (the shared `isDevMode()` gate).
 *
 * Detection is inherently partial: a shift is only observable when the two
 * lists have different data sources, so two `each()` calls over the SAME
 * `arraySignal` swapping ids stay invisible here. Keys close that case by
 * construction, which is what the message asks for.
 */

import { isDevMode } from './utils/devMode.js';

const warnedIds = new Set<string>();

/**
 * Fire the one-shot (per list id) identity-shift warning. `id` is the
 * call-order id whose occupant changed.
 */
export function maybeWarnListIdShift(id: string): void {
  if (!isDevMode()) return;
  if (warnedIds.has(id)) return;
  warnedIds.add(id);
  console.warn(
    `kerf each(): list '${id}' is now a different list than it was last render. `
    + 'Lists without a key are identified by call order, so adding or removing an each() call '
    + 'before this one reassigns its identity — kerf rebuilds the list from scratch and its rows '
    + 'lose DOM identity, focus, scroll position and in-progress IME composition. '
    + 'Give the affected lists a stable key: each(items, render, { key: \'my-list\' }). '
    + 'Keying the conditional list is usually enough — a keyed list does not take a call-order '
    + 'slot, so its siblings stop shifting too.',
  );
}

/** Test helper — resets the one-shot dedup set for unit tests. */
export function _resetWarnedForTests(): void {
  warnedIds.clear();
}
