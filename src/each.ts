/**
 * `each(items, render, cacheKey?)` — keyed list iteration with per-item memoization.
 *
 * Drops in as the body of a list-rendering JSX expression inside a `mount()`
 * render function. Returns a `SafeHtml` carrying a structured list segment,
 * so `mount()` can run a native keyed reconciler instead of the general-
 * purpose morph for these children.
 *
 * Two layers of optimization:
 *
 * 1. Per-item memoization. `render(item)` is skipped for items whose object
 *    identity (and optional `cacheKey`) are unchanged since the previous
 *    call. Their HTML strings come from a `WeakMap` keyed by item reference.
 *    The immutable-update style ("replace the row object" instead of "mutate
 *    it") makes the cache work automatically.
 *
 * 2. Structural handoff. `mount()` recognizes the list segment and bypasses
 *    the parse-the-whole-table round trip: only fresh items get parsed (one
 *    at a time, into the smallest detached element), and only changed rows
 *    get patched in the live DOM. Unchanged rows are physically the same
 *    nodes they were before — never visited.
 *
 * `cacheKey` is a passive comparator — it covers the case where external
 * state, not the item itself, drives what the row should render (e.g. a
 * "currently selected" id flips a CSS class on one row). Same item identity
 * but a different `cacheKey` return value means "the cached HTML is stale —
 * re-render this row." Not a reactive subscription: it's evaluated once per
 * mount-effect run and compared against the previous run's return value. If
 * you don't pass `cacheKey`, only object-identity changes invalidate the
 * cache. (Renamed from `key` for clarity — it shared a name with React's
 * `key` prop but has different semantics; the new name says what the
 * parameter actually does. Positional callers — the canonical form — are
 * unaffected.)
 *
 * Items must be objects (cache is a `WeakMap`); wrap primitives if you need
 * to iterate them. Each item's render output must produce exactly one
 * top-level element — the list reconciler binds one live DOM node per item.
 */

import type { ArraySignal } from './array-signal.js';
import { type Binding, captureRowBindings } from './bindings.js';
import { maybeWarnDuplicateCacheKeys } from './dev-each-warn.js';
import type { SafeHtml } from './jsx-runtime.js';
import { granularListSafeHtml, isSafeHtml, listSafeHtml } from './jsx-runtime.js';
import { decideListPath, deriveListRenderState } from './list-render-state.js';
import type { ArrayPatchInternal } from './segment.js';

/**
 * Cross-bundle brand check for `ArraySignal` instances (KF-95). The
 * `arraySignal` factory + class live in their own subpath
 * (`kerfjs/array-signal`); this module knows nothing about that
 * subpath at runtime — it identifies instances by the brand symbol
 * stamped on them. Apps that never import `arraySignal` shed the
 * ~1 KB of class code without breaking the structural contract here.
 */
const ARRAY_SIGNAL_BRAND = Symbol.for('kerfjs.ArraySignal');

function isArraySignal<T extends object>(value: unknown): value is ArraySignal<T> {
  return typeof value === 'object'
    && value !== null
    && (value as Record<symbol, unknown>)[ARRAY_SIGNAL_BRAND] === true;
}

interface CacheEntry {
  cacheKey: unknown;
  html: string;
  bindings: Binding[];
}

/**
 * Per-render context passed in by `mount()` for the duration of one render
 * pass. Carries (a) a counter that assigns a stable list id to the n-th
 * `each()` call across renders within a mount, and (b) a per-mount cache map
 * keyed on those list ids.
 *
 * Why per-(mount, listId) keying for the cache:
 * - Same `each()` callsite across renders within a mount → same id → same
 *   cache → cache hits work, even when the JSX render fn is an inline arrow
 *   that's a fresh function reference on every closure run (the typical
 *   pattern; KF-87 fixed the regression where this broke).
 * - Different `each()` callsites within the same mount → different ids →
 *   separate caches → no cross-callsite collision (the case KF-73 fixed,
 *   preserved here).
 * - Different mounts → different `RenderContext` instances (the cache map
 *   lives on `mount()`'s closure) → separate caches.
 *
 * Outside a `mount()` render (e.g. `each(...).toString()` for SSR string
 * production) `context` is null and items are rendered every call —
 * caching is a `mount()` feature, not a global one.
 */
export interface RenderContext {
  counter: number;
  caches: Map<string, WeakMap<object, CacheEntry>>;
  /**
   * Per-list-id record of the binding's `items.length` after the most recent
   * successful reconcile. Maintained by `mount()`, which writes
   * `renderCtx.bindingCounts.set(...)` directly after each `reconcileList`. The
   * granular path consults this to detect drift between the live binding and
   * the arraySignal — drift means a previous render threw mid-reconcile (or
   * a granular path was bypassed externally), so the next render forces a
   * snapshot rebuild rather than applying patches against a stale binding.
   */
  bindingCounts: Map<string, number>;
}

let context: RenderContext | null = null;

export function _setRenderContext(c: RenderContext | null): void {
  context = c;
}

export function each<T extends object>(
  items: readonly T[] | ArraySignal<T>,
  render: (item: T, index: number) => SafeHtml | string,
  cacheKey?: (item: T, index: number) => unknown,
): SafeHtml {
  // KF-92 fast path: when items is an ArraySignal AND we're inside a mount
  // render context AND patches have queued since the last drain, emit a
  // granular list segment that the list reconciler applies in O(patches)
  // instead of O(N). Detection via the brand symbol (KF-95) — the
  // `arraySignal` class lives in the `kerfjs/array-signal` subpath and is
  // not imported here at runtime.
  if (isArraySignal<T>(items) && context !== null) {
    return eachGranular(items, render, cacheKey);
  }
  const snapshotItems: readonly T[] = isArraySignal<T>(items)
    ? items.value as readonly T[]
    : items;
  return eachSnapshot(snapshotItems, render, cacheKey);
}

function eachSnapshot<T extends object>(
  items: readonly T[],
  render: (item: T, index: number) => SafeHtml | string,
  cacheKey: ((item: T, index: number) => unknown) | undefined,
): SafeHtml {
  let id: string;
  if (context !== null) {
    id = String(context.counter++);
  } else {
    id = 'orphan';
  }
  return eachSnapshotById(items, render, cacheKey, id);
}

/**
 * Granular path for `arraySignal`-backed lists. Drains queued patches and
 * emits a list segment that the reconciler applies to the existing binding
 * directly — no full iteration of the snapshot, no O(N) classify pass.
 *
 * On the very first render of a list, the binding doesn't exist yet, so
 * the reconciler falls through to the snapshot path. Subsequent renders
 * of the same list (where the binding now exists) take the granular path
 * whenever there are patches to apply.
 */
function eachGranular<T extends object>(
  sig: ArraySignal<T>,
  render: (item: T, index: number) => SafeHtml | string,
  cacheKey: ((item: T, index: number) => unknown) | undefined,
): SafeHtml {
  // We're inside a mount context (caller-checked).
  const ctx = context as RenderContext;
  const id = String(ctx.counter++);
  // KF-336: dispatch through the reified state machine (`list-render-state.ts`
  // holds the transition table). The state derives from the count `mount()`
  // recorded after this list's last successful reconcile; the patch queue is
  // drained BEFORE deciding so a snapshot route still consumes it (the
  // snapshot already reflects every queued mutation, including pre-mount
  // mutations on a first render — the KF-98 case).
  const previousBindingCount = ctx.bindingCounts.get(id);
  const patches = sig._consumePatches();
  const snapshot = sig.value as readonly T[];

  // Structural decision: first-render / empty-binding / no-patches / replace /
  // count-drift all route to the snapshot path (see the transition table for
  // why each one can't be patched granularly). The two side-effectful reasons
  // — cachekey-drift and render-threw — are layered on below. The count-drift
  // arm is defensive-only from inside `mount()` (it needs an external party
  // draining `_consumePatches()` or mutating `_items` behind the signal's
  // back), but as a pure function it's now covered directly by
  // `tests/unit/list-render-state.internal.test.ts`.
  const decision = decideListPath(
    deriveListRenderState(previousBindingCount), patches, snapshot.length, previousBindingCount,
  );
  if (decision.path === 'snapshot') {
    return eachSnapshotById(snapshot, render, cacheKey, id);
  }

  // The granular path applies arraySignal patches but never evaluates
  // `cacheKey` (or `render`) for the rows the patches don't touch. That has
  // two consequences this loop fixes:
  //
  // 1. Dependency tracking. A signal read ONLY inside `cacheKey` — the
  //    documented "external state drives the row" pattern, e.g. a `selectedId`
  //    flipping a row class — would drop out of the mount effect's dependency
  //    set after a granular-only render, because nothing read it. A later
  //    change to that signal would then silently fail to re-render. Concretely:
  //    select a row, delete a *different* row (a granular remove), then row
  //    selection stops working entirely. Re-reading every item's `cacheKey`
  //    here keeps those signals tracked.
  //
  // 2. Drift the patches don't cover. If an already-bound row's `cacheKey`
  //    changed, external state moved a row that this batch's structural
  //    patches won't fix (e.g. a selection flip batched together with a
  //    remove). Hand the whole render to the snapshot path, which reconciles
  //    structure + content together. The patches are already drained and the
  //    snapshot reflects every mutation, so the snapshot classify rebuilds the
  //    binding correctly from the pre-render DOM.
  //
  // Only lists that pass `cacheKey` pay this O(N) scan, and they already pay
  // the same O(N) `cacheKey` evaluation on every snapshot render.
  if (cacheKey !== undefined) {
    // The cache is always populated here: the first render of any list takes
    // the snapshot path (previousBindingCount === undefined, handled above),
    // which creates the cache for `id`. So a granular render always has it. The
    // `as` cast asserts that instead of an `if (cache === undefined)` guard,
    // whose else-branch would be unreachable — and would drop us below the 99%
    // branch-coverage threshold.
    const cache = ctx.caches.get(id) as WeakMap<object, CacheEntry>;
    // Plain indexed loop (not `for..of`): `cacheKey` needs the row index, and
    // this runs over every row on every granular render (up to 10k rows), so we
    // keep it allocation-free. `item` is read once to avoid a double `snapshot[i]`.
    for (let i = 0; i < snapshot.length; i++) {
      const item = snapshot[i];
      // Evaluate `cacheKey` for EVERY row unconditionally: that read is what
      // keeps an external signal (e.g. `selectedId`) in the mount effect's
      // dependency set. It must NOT move inside the `cached` check below — rows
      // with no cache entry (fresh refs after a granular update) would then
      // never read it and the dependency could silently drop.
      const k = cacheKey(item, i);
      const cached = cache.get(item);
      // Fall back to snapshot ONLY on real drift — a bound row whose `cacheKey`
      // changed. We can't just `return eachSnapshotById(...)` unconditionally
      // whenever a `cacheKey` exists: that would forfeit the granular fast path
      // for every structural op (append/remove/update/move) on a selectable
      // list — the whole reason the arraySignal path exists. The common case, a
      // structural change with no selection change, stays granular.
      if (cached !== undefined && cached.cacheKey !== k) {
        // Transition-table reason: `cachekey-drift` (list-render-state.ts).
        return eachSnapshotById(snapshot, render, cacheKey, id);
      }
    }
  }

  // Granular path: pre-render every insert/update HTML at JSX-eval time so
  // a throwing render is caught here and we can fall back to the snapshot
  // path (KF-99). Without this, a throw mid-batch would leave patches drained
  // (already done above), the signal mutated, and the live DOM unchanged —
  // permanent divergence with no recovery.
  // KF-294: capture each insert/update row's fine-grained bindings (signals
  // in row attrs/text) so the granular reconciler can wire them to the fresh
  // row node and dispose them on removal — same lifecycle as the snapshot path.
  const renderRow = (item: object, index: number): { html: string; bindings: Binding[] } =>
    captureRowBindings(() => {
      const out = render(item as T, index);
      return isSafeHtml(out) ? out.toString() : out;
    });
  const internalPatches = new Array<ArrayPatchInternal>(patches.length);
  try {
    for (let i = 0; i < patches.length; i++) {
      const p = patches[i];
      if (p.type === 'insert' || p.type === 'update') {
        const { html, bindings } = renderRow(p.item as object, p.index);
        internalPatches[i] = {
          type: p.type, index: p.index, item: p.item as object, html, bindings,
        };
      } else {
        internalPatches[i] = p as ArrayPatchInternal;
      }
    }
  } catch {
    // Transition-table reason: `render-threw` (list-render-state.ts). The
    // snapshot already reflects every mutation (arraySignal mutates _items
    // eagerly at the call site), but the snapshot path is going to throw on
    // the same bad item too — leaving the binding out of sync with the
    // signal. Deleting the count resets this list to the `unbound` state so
    // the NEXT render (after the user fixes the bad item) snapshot-rebuilds
    // from scratch instead of trusting the stale count.
    ctx.bindingCounts.delete(id);
    return eachSnapshotById(snapshot, render, cacheKey, id);
  }
  // The `items` field is left empty for the granular case — the reconciler
  // doesn't need it; every insert/update patch carries pre-rendered HTML.
  return granularListSafeHtml(id, [], internalPatches);
}

/** Like eachSnapshot but uses a pre-allocated id (caller already advanced the counter). */
function eachSnapshotById<T extends object>(
  items: readonly T[],
  render: (item: T, index: number) => SafeHtml | string,
  cacheKey: ((item: T, index: number) => unknown) | undefined,
  id: string,
): SafeHtml {
  let cache: WeakMap<object, CacheEntry> | null = null;
  if (context !== null) {
    let c = context.caches.get(id);
    if (c === undefined) {
      c = new WeakMap<object, CacheEntry>();
      context.caches.set(id, c);
    }
    cache = c;
  }
  const segItems = new Array<{ ref: object; cacheKey: unknown; html: string; bindings: Binding[] }>(items.length);
  const seen = new Set<object>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (typeof item !== 'object' || item === null) {
      throw new Error(
        `each(): items must be objects (the per-item HTML cache is a WeakMap), got ${item === null ? 'null' : typeof item} at index ${i}. `
        + 'Wrap primitives if you need to iterate them, e.g. items.map(v => ({ v })).',
      );
    }
    if (seen.has(item)) {
      throw new Error(
        `each(): the same object reference appears at multiple indices in items (first seen earlier, again at index ${i}). `
        + 'The per-item HTML cache is keyed on object identity, so duplicate references break the keyed reconciler and can leak DOM nodes on re-render. '
        + 'Use a fresh object per row (e.g. items.map(o => ({ ...o })) before passing to each()).',
      );
    }
    seen.add(item);
    const k = cacheKey ? cacheKey(item, i) : undefined;
    let html: string;
    let bindings: Binding[];
    const cached = cache !== null ? cache.get(item) : undefined;
    if (cached !== undefined && cached.cacheKey === k) {
      html = cached.html;
      bindings = cached.bindings;
    } else {
      // KF-294: capture the row's fine-grained bindings (signals in row attrs
      // / text). The snapshot reconciler wires them to the row node on create
      // and disposes on remove, so a bound signal updates the row without a
      // render re-run. Cached by row identity alongside the html.
      const captured = captureRowBindings(() => {
        const out = render(item, i);
        return isSafeHtml(out) ? out.toString() : out;
      });
      html = captured.html;
      bindings = captured.bindings;
      if (cache !== null) cache.set(item, { cacheKey: k, html, bindings });
    }
    segItems[i] = { ref: item, cacheKey: k, html, bindings };
  }
  if (cacheKey !== undefined) {
    maybeWarnDuplicateCacheKeys(id, segItems);
  }
  return listSafeHtml(id, segItems);
}
