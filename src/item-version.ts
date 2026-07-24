/**
 * Per-item content version — makes a same-ref `arraySignal.update()` visible to
 * the row memo (KF-418).
 *
 * kerf memoizes `each()` rows by object IDENTITY (`WeakMap<item, CacheEntry>`),
 * so a same-ref mutation — `update(i, r => { r.x = 1; return r })` — changes the
 * row's content without changing its identity and is invisible to the memo. The
 * KF-414 fix repaired only the single list that drained the patch; every other
 * consumer (a second list over the same signal, a second `mount()`, a
 * plain-array `filter()` view of the same items) still trusted its own memo
 * entry, keyed on an identity that didn't change, and rendered stale forever.
 *
 * `arraySignal.update()` bumps the returned item's version here; each row's
 * `CacheEntry` records the version it rendered at, and a cache hit now requires
 * the version to still match. A same-ref update therefore re-renders the row in
 * EVERY consumer, because they all read the same version off the same item ref.
 *
 * Why a shared module rather than a field on `ArraySignal`:
 *  - the main-bundle `each()` must read the version, and importing the
 *    `kerfjs/array-signal` subpath into the main bundle would defeat KF-95
 *    (arraySignal only ships when the consumer imports it). This module lives in
 *    the main bundle; the subpath imports it, not the other way round.
 *  - keying on the item object (not the signal) is what lets a plain-array
 *    `filter()` view — which has no reference to the arraySignal — still see the
 *    bump: it holds the same item refs.
 *
 * `anyVersioned` keeps the common case free: until some `update()` actually
 * bumps a version, every lookup returns 0 without touching the WeakMap, so a app
 * that never mutates in place pays nothing per row.
 */
const versions = new WeakMap<object, number>();
let anyVersioned = false;

/** Bump `item`'s content version. Called by `arraySignal.update()` on the item it returns. */
export function bumpItemVersion(item: object): void {
  anyVersioned = true;
  versions.set(item, (versions.get(item) ?? 0) + 1);
}

/** `item`'s current content version — 0 if it has never been same-ref-updated. */
export function itemVersion(item: object): number {
  return anyVersioned ? versions.get(item) ?? 0 : 0;
}
