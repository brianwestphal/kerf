/**
 * Dev-mode warning for `each()` inside `data-morph-skip` subtrees
 * (KERF_DEV_WARN_EACH_IN_MORPH_SKIP=1).
 *
 * When the opt-in env var is set, `mount()` calls `maybeWarnEachInMorphSkip()`
 * after establishing a list binding. The function walks from `liveParent` up to
 * `rootEl`; if any ancestor has `data-morph-skip`, it fires a one-shot warning.
 *
 * Why the pattern matters: `data-morph-skip` makes the morph short-circuit
 * before visiting the element's children, so any static JSX reading signals
 * inside the skipped subtree is silently frozen. `each()` rows are NOT frozen —
 * the keyed reconciler runs independently and still updates them. This asymmetry
 * (rows update, signal-reactive siblings don't) is surprising enough to warrant a
 * dev-time callout.
 *
 * Why opt-in: wrapping a library-owned subtree in `data-morph-skip` and
 * legitimately placing an `each()` inside is uncommon but possible (e.g., the
 * library expects to own the host while kerf manages the list). The opt-in keeps
 * the diagnostic available for projects that want it without penalising projects
 * that intentionally use this pattern.
 */

import { isDevMode } from './utils/devMode.js';

const warnedIds = new Set<string>();

function isOptedIn(): boolean {
  if (!isDevMode()) return false;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.KERF_DEV_WARN_EACH_IN_MORPH_SKIP === '1';
}

function hasMorphSkipAncestor(el: Element, root: Element): boolean {
  let ancestor: Element | null = el.parentElement;
  while (ancestor !== null && ancestor !== root) {
    if ((ancestor as HTMLElement).dataset.morphSkip !== undefined) return true;
    ancestor = ancestor.parentElement;
  }
  return false;
}

export function maybeWarnEachInMorphSkip(
  id: string,
  liveParent: Element,
  rootEl: Element,
): void {
  if (!isOptedIn()) return;
  /* c8 ignore next — mount() gates on bindings.has(id) before calling this; doubly-guards direct callers */
  if (warnedIds.has(id)) return;
  if (!hasMorphSkipAncestor(liveParent, rootEl)) return;
  warnedIds.add(id);
  console.warn(
    `kerf: each() list '${id}' is inside a data-morph-skip subtree. `
    + 'The keyed reconciler still updates the list rows, but any static signal-reactive JSX '
    + 'inside the same skipped ancestor (e.g. <p>{count.value}</p>) is frozen — '
    + 'the morph never visits it. Remove data-morph-skip from any element that contains '
    + 'reactive JSX content and reserve it for truly library-owned hosts. '
    + 'Set KERF_DEV_WARN_EACH_IN_MORPH_SKIP=0 (or unset it) to silence this warning.',
  );
}

/** Test helper — resets the one-shot dedup set for unit tests. */
export function _resetWarnedForTests(): void {
  warnedIds.clear();
}

// ---------------------------------------------------------------------------
// KERF_DEV_WARN_DUPLICATE_EACH_KEYS — duplicate cacheKey values warning
// ---------------------------------------------------------------------------

const warnedDupIds = new Set<string>();

function isOptedInDupKeys(): boolean {
  if (!isDevMode()) return false;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.KERF_DEV_WARN_DUPLICATE_EACH_KEYS === '1';
}

/**
 * Warn when two or more items in the same `each()` list produce the same
 * `cacheKey` value. Duplicate cacheKey values don't cause incorrect DOM
 * behavior (the per-item HTML cache is keyed by object identity, not cacheKey),
 * but they're a reliable signal that the cacheKey function doesn't uniquely
 * identify rows — which means kerf can't tell apart the affected rows for
 * memoization purposes, and external-state-driven re-renders may return stale
 * cached HTML for some items.
 *
 * Called from `eachSnapshotById` only when a `cacheKey` function was provided.
 * `segItems` carries the already-computed cacheKey value per item, so this
 * function never calls `cacheKey(item, i)` a second time.
 */
export function maybeWarnDuplicateCacheKeys(
  id: string,
  segItems: readonly { cacheKey: unknown }[],
): void {
  if (!isOptedInDupKeys()) return;
  if (warnedDupIds.has(id)) return;
  const seen = new Set<unknown>();
  for (const si of segItems) {
    if (seen.has(si.cacheKey)) {
      warnedDupIds.add(id);
      console.warn(
        `kerf: each() list '${id}' has duplicate cacheKey values (duplicate: ${String(si.cacheKey)}). `
        + 'The cacheKey function should return a unique value per row so kerf can tell apart items '
        + 'for memoization — duplicate values cause some rows to return stale cached HTML when '
        + 'external state that affects their render changes. '
        + 'Set KERF_DEV_WARN_DUPLICATE_EACH_KEYS=0 (or unset it) to silence this warning.',
      );
      return;
    }
    seen.add(si.cacheKey);
  }
}

/** Test helper — resets the duplicate-key dedup set for unit tests. */
export function _resetDupWarnedForTests(): void {
  warnedDupIds.clear();
}
