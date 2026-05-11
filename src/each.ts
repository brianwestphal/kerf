/**
 * `each(items, render, key?)` — keyed list iteration with per-item memoization.
 *
 * Drops in as the body of a list-rendering JSX expression inside a `mount()`
 * render function. Returns a `SafeHtml` carrying a structured list segment,
 * so `mount()` can run a native keyed reconciler instead of the general-
 * purpose morph for these children.
 *
 * Two layers of optimization:
 *
 * 1. Per-item memoization. `render(item)` is skipped for items whose object
 *    identity (and optional `key`) are unchanged since the previous call.
 *    Their HTML strings come from a `WeakMap` keyed by item reference. The
 *    immutable-update style ("replace the row object" instead of "mutate it")
 *    makes the cache work automatically.
 *
 * 2. Structural handoff. `mount()` recognizes the list segment and bypasses
 *    the parse-the-whole-table round trip: only fresh items get parsed (one
 *    at a time, into the smallest detached element), and only changed rows
 *    get patched in the live DOM. Unchanged rows are physically the same
 *    nodes they were before — never visited.
 *
 * `key` covers the case where external state, not the item itself, drives
 * what the row should render (e.g. a "currently selected" id flips a CSS
 * class on one row). Same item identity but a different `key` value means
 * "re-render this item." If you don't pass `key`, only identity changes
 * invalidate.
 *
 * Items must be objects (cache is a `WeakMap`); wrap primitives if you need
 * to iterate them. Each item's render output must produce exactly one
 * top-level element — the list reconciler binds one live DOM node per item.
 */

import type { ArraySignal } from './array-signal.js';
import type { SafeHtml } from './jsx-runtime.js';
import { granularListSafeHtml, isSafeHtml, listSafeHtml } from './jsx-runtime.js';
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
  key: unknown;
  html: string;
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
   * successful reconcile. Maintained by `mount()` via `_setBindingCount`. The
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
  key?: (item: T, index: number) => unknown,
): SafeHtml {
  // KF-92 fast path: when items is an ArraySignal AND we're inside a mount
  // render context AND patches have queued since the last drain, emit a
  // granular list segment that the list reconciler applies in O(patches)
  // instead of O(N). Detection via the brand symbol (KF-95) — the
  // `arraySignal` class lives in the `kerfjs/array-signal` subpath and is
  // not imported here at runtime.
  if (isArraySignal<T>(items) && context !== null) {
    return eachGranular(items, render, key);
  }
  const snapshotItems: readonly T[] = isArraySignal<T>(items)
    ? items.value as readonly T[]
    : items;
  return eachSnapshot(snapshotItems, render, key);
}

function eachSnapshot<T extends object>(
  items: readonly T[],
  render: (item: T, index: number) => SafeHtml | string,
  key: ((item: T, index: number) => unknown) | undefined,
): SafeHtml {
  let id: string;
  if (context !== null) {
    id = String(context.counter++);
  } else {
    id = 'orphan';
  }
  return eachSnapshotById(items, render, key, id);
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
  key: ((item: T, index: number) => unknown) | undefined,
): SafeHtml {
  // We're inside a mount context (caller-checked).
  const ctx = context as RenderContext;
  const id = String(ctx.counter++);
  // KF-98: a tracked binding count means a prior render of this mount has
  // successfully reconciled this list. On the very first render (no count
  // recorded yet) the granular reconciler has no binding to apply patches
  // to, so any pre-mount mutations would silently produce an empty list.
  // Drain the queue (the snapshot already reflects those mutations) and
  // take the snapshot path; the count will be recorded for the next render.
  const previousBindingCount = ctx.bindingCounts.get(id);
  const patches = sig._consumePatches();
  const snapshot = sig.value as readonly T[];

  // First render of this list, no patches, or any 'replace' patch → snapshot.
  // No patches: typical re-render triggered by a non-arraySignal signal change.
  // 'replace': wholesale reset — granular can't help; the snapshot already
  // reflects the post-replace state (and any subsequent granular ops).
  if (previousBindingCount === undefined || patches.length === 0) {
    return eachSnapshotById(snapshot, render, key, id);
  }
  // KF-99: detect drift between the live binding and the arraySignal. After
  // a clean prior reconcile, `previousBindingCount + (#inserts - #removes)`
  // must equal `snapshot.length`. If it doesn't, a previous render threw
  // mid-reconcile and left the binding inconsistent with the signal — fall
  // back to the snapshot path, which classifies fresh against `snapshot`
  // and rebuilds the binding to match.
  let netDelta = 0;
  for (const p of patches) {
    if (p.type === 'insert') netDelta += 1;
    else if (p.type === 'remove') netDelta -= 1;
    else if (p.type === 'replace') {
      return eachSnapshotById(snapshot, render, key, id);
    }
  }
  // Defensive: triggered only when an external party drains `_consumePatches()`
  // or mutates `_items` behind arraySignal's back, OR when a previous reconcile
  // threw mid-DOM-op (rare; not naturally reachable in tests since apply* ops
  // don't throw on well-formed row HTML).
  /* c8 ignore next 3 */
  if (previousBindingCount + netDelta !== snapshot.length) {
    return eachSnapshotById(snapshot, render, key, id);
  }

  // Granular path: pre-render every insert/update HTML at JSX-eval time so
  // a throwing render is caught here and we can fall back to the snapshot
  // path (KF-99). Without this, a throw mid-batch would leave patches drained
  // (already done above), the signal mutated, and the live DOM unchanged —
  // permanent divergence with no recovery.
  const renderFnInternal = (item: object, index: number): string => {
    const out = render(item as T, index);
    return isSafeHtml(out) ? out.toString() : out;
  };
  const internalPatches = new Array<ArrayPatchInternal>(patches.length);
  try {
    for (let i = 0; i < patches.length; i++) {
      const p = patches[i];
      if (p.type === 'insert' || p.type === 'update') {
        internalPatches[i] = {
          type: p.type, index: p.index, item: p.item as object,
          html: renderFnInternal(p.item as object, p.index),
        };
      } else {
        internalPatches[i] = p as ArrayPatchInternal;
      }
    }
  } catch {
    // Pre-render threw. The snapshot already reflects every mutation
    // (arraySignal mutates _items eagerly at the call site), but the snapshot
    // path is going to throw on the same bad item too — leaving the binding
    // out of sync with the signal. Clear the binding count so the NEXT
    // render (after the user fixes the bad item) doesn't see the previous
    // render's count and falsely conclude there's no drift; instead it'll
    // take the snapshot path and rebuild from scratch.
    ctx.bindingCounts.delete(id);
    return eachSnapshotById(snapshot, render, key, id);
  }
  // The `items` field is left empty for the granular case — the reconciler
  // doesn't need it; every insert/update patch carries pre-rendered HTML.
  return granularListSafeHtml(id, [], internalPatches);
}

/** Like eachSnapshot but uses a pre-allocated id (caller already advanced the counter). */
function eachSnapshotById<T extends object>(
  items: readonly T[],
  render: (item: T, index: number) => SafeHtml | string,
  key: ((item: T, index: number) => unknown) | undefined,
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
  const segItems = new Array<{ ref: object; cacheKey: unknown; html: string }>(items.length);
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
    const k = key ? key(item, i) : undefined;
    let html: string;
    const cached = cache !== null ? cache.get(item) : undefined;
    if (cached !== undefined && cached.key === k) {
      html = cached.html;
    } else {
      const out = render(item, i);
      html = isSafeHtml(out) ? out.toString() : out;
      if (cache !== null) cache.set(item, { key: k, html });
    }
    segItems[i] = { ref: item, cacheKey: k, html };
  }
  return listSafeHtml(id, segItems);
}
