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

import type { SafeHtml } from './jsx-runtime.js';
import { isSafeHtml, listSafeHtml } from './jsx-runtime.js';

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
  items: readonly T[],
  render: (item: T, index: number) => SafeHtml | string,
  key?: (item: T, index: number) => unknown,
): SafeHtml {
  let id: string;
  let cache: WeakMap<object, CacheEntry> | null;
  if (context !== null) {
    id = String(context.counter++);
    let c = context.caches.get(id);
    if (c === undefined) {
      c = new WeakMap<object, CacheEntry>();
      context.caches.set(id, c);
    }
    cache = c;
  } else {
    id = 'orphan';
    cache = null;
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
    if (cache !== null) {
      const cached = cache.get(item);
      if (cached !== undefined && cached.key === k) {
        html = cached.html;
      } else {
        const out = render(item, i);
        html = isSafeHtml(out) ? out.toString() : out;
        cache.set(item, { key: k, html });
      }
    } else {
      const out = render(item, i);
      html = isSafeHtml(out) ? out.toString() : out;
    }
    segItems[i] = { ref: item, cacheKey: k, html };
  }
  return listSafeHtml(id, segItems);
}
