/**
 * `each(items, render, key?)` — keyed list iteration with per-item memoisation.
 *
 * Drops in as the body of a list-rendering JSX expression inside a `mount()`
 * render function. Skips re-running `render` for items whose object identity
 * (and optional `key`) are unchanged since the previous call: those items
 * reuse their cached HTML string. Items whose identity or key did change
 * re-render normally.
 *
 * The point is partial-update perf. With a thousand-row list where one row
 * changes, `render` runs once instead of a thousand times; the other 999
 * cached strings concatenate straight into the output. morphdom then sees
 * the unchanged HTML on the new tree and short-circuits via `isEqualNode`,
 * so the patch phase stays cheap too.
 *
 * Identity rule: cache entries live in a module-level `WeakMap` keyed by
 * item reference. Replace a row's data with a fresh object (the immutable
 * update style this codebase uses) and the new object misses the cache —
 * the row re-renders. Keep the same reference and the cache hits.
 *
 * `key` covers the case where external state, not the item itself, drives
 * what the row should render (e.g. a "currently selected" id flips a CSS
 * class on one row). Same item identity but a different `key` value means
 * "re-render this item." If you don't pass `key`, only identity changes
 * invalidate.
 *
 * Items must be objects (WeakMap keys). Wrap primitives if you need to
 * iterate them.
 */

import type { SafeHtml } from './jsx-runtime.js';
import { isSafeHtml, raw } from './jsx-runtime.js';

interface CacheEntry {
  key: unknown;
  html: string;
}

const ROW_CACHE = new WeakMap<object, CacheEntry>();

export function each<T extends object>(
  items: readonly T[],
  render: (item: T, index: number) => SafeHtml | string,
  key?: (item: T, index: number) => unknown,
): SafeHtml {
  const parts = new Array<string>(items.length);
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
    parts[i] = html;
  }
  return raw(parts.join(''));
}
