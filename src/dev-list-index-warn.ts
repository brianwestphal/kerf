/**
 * Dev-mode warning for a stale `index` argument in an `each()` row render
 * (KERF_DEV_WARN_STALE_INDEX=1).
 *
 * `each(items, (item, index) => …)` passes the row's position as the second
 * argument. But `each()` memoizes a row's HTML by object identity (+ optional
 * `cacheKey` + content version) — the `index` is NOT part of that key. So when a
 * surviving row's position changes without its ref or cacheKey changing — a
 * reorder, or an insert/remove/move ahead of it — kerf serves the row's cached
 * HTML, which was computed at the OLD index. A numbered list (`{index}. …`),
 * zebra striping, or an "N of M" label silently shows the wrong number.
 *
 * When the opt-in env var is set, `each()` calls `maybeWarnStaleIndex()` at the
 * two points a shift can strand a memoized row's index:
 *  - the snapshot path, when a cache HIT reuses a row at a different index than
 *    it rendered at (a plain-array reorder);
 *  - the granular path, when the applied `arraySignal` patches shift an existing
 *    row's index (a non-tail insert/remove, or any move).
 * Both are gated on the render fn actually declaring an index parameter
 * (`render.length >= 2`), so a list that never reads the index never warns.
 *
 * Why opt-in: `render.length >= 2` is a heuristic — a render fn may declare the
 * index parameter and not use it in its output, in which case a reorder is
 * harmless and the warning would be a false positive. The fix (`cacheKey: (_, i)
 * => i`, which folds the index into the memo key so a shifted row re-renders) is
 * also not always wanted: a list whose index only labels rows that never reorder
 * pays nothing today. Opt-in keeps the diagnostic available without penalising
 * either shape.
 */

import { isDevMode } from './utils/devMode.js';

const warnedIds = new Set<string>();

/** True when the env var opt-in is set in a dev build. Checked first for zero prod cost. */
export function isOptedInStaleIndex(): boolean {
  if (!isDevMode()) return false;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.KERF_DEV_WARN_STALE_INDEX === '1';
}

/**
 * Fire the one-shot (per list id) stale-index warning. Callers gate on
 * `isOptedInStaleIndex()` AND on having detected a genuine index shift for a
 * list whose render fn declares an index parameter.
 */
export function maybeWarnStaleIndex(id: string): void {
  if (warnedIds.has(id)) return;
  warnedIds.add(id);
  console.warn(
    `kerf: each() list '${id}' reused a memoized row at a new index this render, but its render function `
    + 'takes an `index` argument. Rows are memoized by object identity, not by position, so a reorder or an '
    + 'insert/remove ahead of a surviving row serves that row\'s cached HTML — computed at its OLD index. A '
    + 'numbered list, zebra striping, or an "N of M" label will silently show the wrong value. If the row '
    + 'output depends on the index, fold it into the memo key: each(items, render, { cacheKey: (_, i) => i }) '
    + '(combine with your own key if you have one). If the index is not used in the output, ignore this. '
    + 'Set KERF_DEV_WARN_STALE_INDEX=0 (or unset it) to silence this warning.',
  );
}

/** Test helper — resets the one-shot dedup set for unit tests. */
export function _resetWarnedForTests(): void {
  warnedIds.clear();
}
