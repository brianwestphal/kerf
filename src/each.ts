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

const ROW_CACHE = new WeakMap<object, CacheEntry>();

/**
 * Per-mount counter for assigning stable list ids across renders. `mount()`
 * sets this at the start of each render so that the n-th `each()` call
 * produces id "n" every render — the binding to the live parent persists.
 *
 * Outside a mount() render, calls to `each()` still work but get the
 * sentinel id "orphan"; their output flattens correctly via `toString()`
 * but the structural fast-path doesn't apply (no `mount()` is watching).
 */
let listCounter: { value: number } | null = null;

export function _setListCounter(c: { value: number } | null): void {
  listCounter = c;
}

export function each<T extends object>(
  items: readonly T[],
  render: (item: T, index: number) => SafeHtml | string,
  key?: (item: T, index: number) => unknown,
): SafeHtml {
  const id = listCounter !== null ? String(listCounter.value++) : 'orphan';
  const segItems = new Array<{ ref: object; cacheKey: unknown; html: string }>(items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const k = key ? key(item, i) : undefined;
    const cached = ROW_CACHE.get(item);
    let html: string;
    if (cached !== undefined && cached.key === k) {
      html = cached.html;
    } else {
      const out = render(item, i);
      html = isSafeHtml(out) ? out.toString() : out;
      ROW_CACHE.set(item, { key: k, html });
    }
    segItems[i] = { ref: item, cacheKey: k, html };
  }
  return listSafeHtml(id, segItems);
}
