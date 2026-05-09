/**
 * `each(items, render, key?)` — keyed list iteration with per-item memoisation.
 *
 * Drops in as the body of a list-rendering JSX expression inside a `mount()`
 * render function. Returns a `SafeHtml` carrying a structured list segment,
 * so `mount()` can run a native keyed reconciler instead of the general-
 * purpose morph for these children.
 *
 * Two layers of optimisation:
 *
 * 1. Per-item memoisation. `render(item)` is skipped for items whose object
 *    identity (and optional `key`) are unchanged since the previous call.
 *    Their HTML strings come from a `WeakMap` keyed by item reference. The
 *    immutable-update style ("replace the row object" instead of "mutate it")
 *    makes the cache work automatically.
 *
 * 2. Structural handoff. `mount()` recognises the list segment and bypasses
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

import { type ArrayPatch, ArraySignal } from './array-signal.js';
import type { SafeHtml } from './jsx-runtime.js';
import { granularListSafeHtml, isSafeHtml, listSafeHtml } from './jsx-runtime.js';
import type { ArrayPatchInternal } from './segment.js';

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
  // instead of O(N).
  if (items instanceof ArraySignal && context !== null) {
    return eachGranular(items, render, key);
  }
  const snapshotItems: readonly T[] = items instanceof ArraySignal
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
  const patches = sig._consumePatches();
  const snapshot = sig.value as readonly T[];

  // No patches → fall through to the snapshot path (typical first render
  // OR a re-render triggered by a non-arraySignal signal change). Reuse
  // eachSnapshot's caching via the same id we already allocated.
  if (patches.length === 0) {
    return eachSnapshotById(snapshot, render, key, id);
  }

  // If any patch is 'replace', the array was wholesale reset — granular
  // reconciliation can't help (the snapshot already reflects the post-replace
  // state, including any subsequent granular ops). Fall back to snapshot.
  for (const p of patches) {
    if (p.type === 'replace') {
      return eachSnapshotById(snapshot, render, key, id);
    }
  }

  // Granular path: emit just the patches + the renderFn. Do NOT iterate
  // the snapshot; the reconciler will compute the new state by applying
  // patches to the existing binding.
  const renderFnInternal = (item: object, index: number): string => {
    const out = render(item as T, index);
    return isSafeHtml(out) ? out.toString() : out;
  };
  // The `items` field is left empty for the granular case — the reconciler
  // doesn't need it. We still include the snapshot length so toString-style
  // fallbacks have something coherent (rare, but defensive).
  return granularListSafeHtml(
    id,
    [],
    patches as readonly ArrayPatch<T>[] as readonly ArrayPatchInternal[] as ArrayPatchInternal[],
    renderFnInternal,
  );
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
