/**
 * `kerfjs/list` — `bindList`, a keyed list with a live per-row mount and
 * optional viewport virtualization.
 *
 * This is a DELIBERATE second list API, distinct from `each()`. It does two
 * things `each()` structurally cannot:
 *  1. **Per-row reactivity.** Every row is individually `mount()`ed, so a signal
 *     the row's `render` reads updates just that row (fine-grained binding or a
 *     one-row morph) without touching its siblings — no full-list pass.
 *  2. **Virtualization.** With `{ virtualize: { rowHeight } }` only the rows in
 *     the scroll viewport are rendered; padding on the scroll container keeps
 *     `scrollHeight` honest. `rowHeight` is a fixed `number` (O(1) windowing), a
 *     `(item, index) => number` for **app-declared variable** heights (a prefix
 *     sum + binary-search window), or `{ estimate }` for **measured** heights —
 *     the app reports real heights via the returned handle's `setHeight` (or the
 *     `observeRowHeights` helper) and kerf anchor-corrects `scrollTop`. See
 *     `docs/17-list-virtualization.md`.
 *
 * `each()` stays the choice for item-owned-state lists rendered to HTML strings;
 * reach for `bindList` when you need surgical per-row updates or windowing.
 *
 *   import { bindList } from 'kerfjs/list';
 *
 *   const dispose = bindList(listEl, itemsSignal, {
 *     key: (row) => row.id,
 *     render: (row) => <span class={selected} data-id={row.id}>{row.label}</span>,
 *     tag: 'li',
 *     virtualize: { rowHeight: 32 },
 *   });
 *
 * `render` reads signals for reactivity (external state like a `selectedId`, or
 * signals the item carries) — keep the item OBJECTS stable across renders and
 * drive structure (add/remove/move) through `itemsSignal`. A row whose item
 * object identity changes is rebuilt (same rule as `each()`'s memo). `bindList`
 * OWNS `parent`'s children by default (append/move to the end) — to share
 * `parent` with fixed trailing siblings (an "add" button, an indicator), pass
 * `before` so the rows end just before that node. It reads `itemsSignal.value`,
 * so a plain `signal<T[]>` or an `arraySignal<T>` both work.
 */
import { ARRAY_SIGNAL_BRAND, type ArrayPatch } from './array-signal.js';
import { mount, type MountResult } from './mount.js';
import { effect } from './reactive.js';

/** A row's stable key. */
export type ListKey = string | number;

/** Anything with a tracking `.value` array read — a `signal<readonly T[]>` or an `arraySignal<T>`. */
export interface ListSource<T> {
  readonly value: readonly T[];
}

/**
 * A row built imperatively by `render`: return the row **element** itself (kerf
 * keys/moves/reuses it and owns nothing inside it), or `{ el, update?, dispose? }`
 * to also hand back an `update(item)` — called on the SAME element when the row's
 * key persists but its item changes — and a `dispose` that runs only when the row
 * is removed.
 */
export type RowElement<T> =
  | HTMLElement
  | { el: HTMLElement; update?: (item: T) => void; dispose?: () => void };

/**
 * The virtualization height model:
 *  - **`number`** — every row is this fixed pixel height (O(1) windowing).
 *  - **`(item, index) => number`** — app-declared **variable** heights, derived
 *    purely from the item and its index.
 *  - **`{ estimate }`** — **measured** heights: kerf uses `estimate` for a row
 *    until the app reports its real height through {@link BindListHandle.setHeight}
 *    (or the `observeRowHeights` helper). See `docs/17-list-virtualization.md`.
 */
export type RowHeight<T> =
  | number
  | ((item: T, index: number) => number)
  | { estimate: number | ((item: T, index: number) => number) };

/**
 * The value {@link bindList} returns: a disposer you call to tear the list down,
 * augmented with `setHeight` for the **measured** virtualization mode.
 */
export type BindListHandle = (() => void) & {
  /**
   * Report a row's real pixel height (measured after layout) for
   * `virtualize: { rowHeight: { estimate } }` lists. Keyed by the list `key`, so
   * a report survives reorders. kerf recomputes the window and, if the row sits
   * ABOVE the viewport, anchor-corrects `scrollTop` so content doesn't jump.
   * A no-op for fixed / declared-height lists and for unknown keys.
   */
  setHeight: (key: ListKey, height: number) => void;
};

/** Options for {@link bindList}. */
export interface BindListOptions<T> {
  /** Stable per-row key. Rows are matched, moved, and reused by this. */
  key: (item: T) => ListKey;
  /**
   * Build a row. Two modes, chosen per call by what you return:
   *  - **Content mode** (a `MountResult` — JSX / `SafeHtml`): kerf creates the
   *    row element (`tag`) and `mount()`s your content inside it, so signals your
   *    content reads drive per-row reactivity.
   *  - **Element mode** (an `HTMLElement`, or `{ el, update?, dispose? }`): the
   *    element you return IS the row, so you own its tag, class, `data-*`, and
   *    listeners. kerf **keys/moves/reuses** it — the SAME element survives an
   *    append/remove/reorder or a fresh item object at the same key. Refresh its
   *    content by reading signals inside it, or by returning an `update(item)`
   *    that kerf calls on the existing element when the item changes. `dispose`
   *    runs only when the row is genuinely removed.
   */
  render: (item: T) => MountResult | RowElement<T>;
  /** Row element tag for **content mode**. Default `'div'` (use `'li'` inside a `<ul>`, `'tr'` inside a `<tbody>`, …). Ignored in element mode. */
  tag?: string;
  /**
   * Keep the rows as a contiguous block that ENDS just before this node, instead
   * of at the very end of `parent`. Use it when `parent` also holds non-row
   * siblings that must stay put — a trailing "add" button, a sliding indicator:
   * `before: () => addButton`. The node (a function is re-read each reconcile, or
   * pass the node directly) must be a child of `parent`. Without it, bindList
   * assumes exclusive ownership and appends rows to the end. Ignored when
   * virtualized (the rows own bindList's inner sizer exclusively).
   */
  before?: Node | (() => Node | null);
  /**
   * Turn on viewport virtualization. `parent` must be a scroll container (your
   * CSS: a fixed height + `overflow: auto`). `overscan` (default 3) is how many
   * extra rows to render above and below the viewport.
   *
   * `rowHeight` (a {@link RowHeight}) is the height model:
   *  - **`number`** — every row is this fixed pixel height. O(1) windowing, no
   *    cumulative model built.
   *  - **`(item, index) => number`** — app-declared **variable** heights, derived
   *    purely from the item and its index. kerf builds a prefix sum of the
   *    heights (rebuilt when the source array changes, not per scroll frame) and
   *    binary-searches it to find the visible window. Return a non-negative
   *    number of pixels.
   *  - **`{ estimate }`** — **measured** heights for rows whose height is only
   *    known after layout. kerf sizes an unmeasured row by `estimate` (a number
   *    or an `(item, index) => number`), and the app reports each row's real
   *    height via {@link BindListHandle.setHeight} (or the `observeRowHeights`
   *    helper). kerf anchor-corrects `scrollTop` when an above-viewport row is
   *    remeasured, so content doesn't jump.
   */
  virtualize?: { rowHeight: RowHeight<T>; overscan?: number };
}

interface Row<T> {
  el: HTMLElement;
  item: T;
  dispose: () => void;
  /** True for element-mode rows (the caller owns the element — reuse it, don't rebuild on item change). */
  elementMode: boolean;
  /** Element mode only: refresh the existing element when the item changes at the same key. */
  update?: (item: T) => void;
}

/**
 * Bind a keyed, per-row-reactive list to `parent`, driven by `source` (a
 * `signal<readonly T[]>` or an `arraySignal<T>`). Returns a disposer that tears
 * down every row mount, the scroll listener (if virtualized), and the source
 * subscription.
 */
export function bindList<T>(
  parent: HTMLElement,
  source: ListSource<T>,
  options: BindListOptions<T>,
): BindListHandle {
  const { key, render, tag = 'div', virtualize, before } = options;
  const overscan = virtualize?.overscan ?? 3;

  // The node the row block ends before — `before` (KF-496) when the list shares
  // `parent` with trailing siblings, else the end of the container. Never applies
  // when virtualized: the rows own bindList's inner sizer exclusively.
  const endAnchor = (): Node | null => {
    if (virtualize !== undefined || before === undefined) return null;
    return (typeof before === 'function' ? before() : before) ?? null;
  };

  const rows = new Map<ListKey, Row<T>>();
  // The current DOM order of rows, kept in step by both the keyed-diff and the
  // granular patch paths so index-based patches can address rows directly.
  const order: Array<Row<T>> = [];
  let items: readonly T[] = [];
  let disposed = false;
  let rafPending = false;
  let firstRender = true;

  // Granular fast path (KF-478): when the source is an `arraySignal` and the
  // list is NOT virtualized, apply its insert/remove/move/update patches
  // directly in O(patches) instead of diffing the whole snapshot. Virtualized
  // lists keep the keyed diff — their visible set is just the window (cheap),
  // and absolute-index patches don't compose with a shifting window. A plain
  // `signal<T[]>` has no patches, so it always uses the keyed diff.
  const patchSource = source as {
    [ARRAY_SIGNAL_BRAND]?: boolean;
    _consumePatches?: () => ArrayPatch<T>[];
  };
  const granularEligible = virtualize === undefined && patchSource[ARRAY_SIGNAL_BRAND] === true;

  // Virtualized lists put the windowing padding + rows on an INNER sizer, so the
  // padding never inflates the scroll container's clientHeight (padding counts
  // toward clientHeight). `parent` stays the clean scroll viewport; `container`
  // holds the rows. Non-virtualized lists render straight into `parent`.
  const container: HTMLElement = virtualize === undefined ? parent : document.createElement('div');
  if (virtualize !== undefined) parent.appendChild(container);

  const NOOP = (): void => { /* element-mode rows with no caller teardown */ };

  // Detect element mode from a render result: a raw `HTMLElement`, or a
  // `{ el, dispose? }` object. Everything else (SafeHtml / string / nullish) is
  // content mode. SafeHtml is an object but has no `el`, so it never matches.
  const asElementRow = (
    rendered: MountResult | RowElement<T>,
  ): { el: HTMLElement; dispose: () => void; update?: (item: T) => void } | null => {
    if (rendered instanceof HTMLElement) return { el: rendered, dispose: NOOP };
    if (
      rendered !== null
      && typeof rendered === 'object'
      && 'el' in rendered
      && (rendered as { el: unknown }).el instanceof HTMLElement
    ) {
      const r = rendered as { el: HTMLElement; update?: (item: T) => void; dispose?: () => void };
      return { el: r.el, dispose: r.dispose ?? NOOP, update: r.update };
    }
    return null;
  };

  const makeRow = (item: T): Row<T> => {
    // One call decides the mode per row (so a list may mix element + content rows).
    const elementRow = asElementRow(render(item));
    if (elementRow !== null) {
      // Element mode: the returned element IS the row; the caller owns its
      // content + cleanup. bindList sizes it for the windowing math per render
      // (see `sizeVisibleRows`), not here, since a variable height depends on the
      // row's current index in the full list.
      return { el: elementRow.el, item, dispose: elementRow.dispose, elementMode: true, update: elementRow.update };
    }
    // Content mode: kerf creates the row element and mounts `render` inside it,
    // so the content is per-row reactive. (In content mode `render` runs once
    // more here for the mode probe than the mount itself needs — keep it a pure
    // projection, which bindList already requires.)
    const el = document.createElement(tag);
    // Content mode: `render` returns a MountResult here (element results were
    // handled above), so narrowing it for `mount` is sound.
    const dispose = mount(el, () => render(item) as MountResult);
    return { el, item, dispose, elementMode: false };
  };

  // A row whose KEY persists but whose item object changed. Content-mode rows are
  // rebuilt (their mount re-renders the fresh item); element-mode rows are REUSED
  // — the caller owns the element, so we keep it (preserving focus / scroll /
  // listeners) and refresh via the optional `update(item)`. Returns the row to
  // use at that key (a fresh one for content, the same one for element).
  const reconcileItem = (row: Row<T>, k: ListKey, item: T): Row<T> => {
    if (row.item === item) return row;
    if (row.elementMode) {
      row.item = item;
      row.update?.(item);
      return row;
    }
    row.dispose();
    row.el.remove();
    rows.delete(k);
    const fresh = makeRow(item);
    rows.set(k, fresh);
    return fresh;
  };

  // Reconcile the live rows to exactly `visible`, in order, keyed.
  const syncRows = (visible: readonly T[]): void => {
    const wanted = new Set<ListKey>();
    for (const item of visible) wanted.add(key(item));

    // Remove rows that are gone from the window.
    for (const [k, row] of rows) {
      if (!wanted.has(k)) {
        row.dispose();
        row.el.remove();
        rows.delete(k);
      }
    }

    // Create missing rows; reuse existing ones by key (element rows keep their
    // element across item changes; content rows rebuild on identity change).
    order.length = 0;
    for (const item of visible) {
      const k = key(item);
      const existing = rows.get(k);
      let row: Row<T>;
      if (existing !== undefined) {
        row = reconcileItem(existing, k, item);
      } else {
        row = makeRow(item);
        rows.set(k, row);
      }
      order.push(row);
    }

    // Reverse pass: move only rows that are out of position.
    let ref: Node | null = endAnchor();
    for (let i = order.length - 1; i >= 0; i--) {
      const el = order[i].el;
      if (el.parentNode !== container || el.nextSibling !== ref) {
        container.insertBefore(el, ref);
      }
      ref = el;
    }
  };

  // Apply arraySignal structural patches directly to `order` + the DOM, in
  // O(patches). Indices are always valid by construction: `order` reflects the
  // last-rendered state and the patches are exactly the delta from it (bindList
  // drains the queue every render, and `replace` is filtered out by the caller,
  // which snapshots instead). The `splice()`s mirror `arraySignal`'s own
  // `_items` mutations exactly.
  const applyPatches = (patches: readonly ArrayPatch<T>[]): void => {
    for (const patch of patches) {
      if (patch.type === 'insert') {
        const row = makeRow(patch.item);
        rows.set(key(patch.item), row);
        order.splice(patch.index, 0, row);
        container.insertBefore(row.el, order[patch.index + 1]?.el ?? endAnchor());
      } else if (patch.type === 'remove') {
        const [row] = order.splice(patch.index, 1);
        row.dispose();
        row.el.remove();
        rows.delete(key(row.item));
      } else if (patch.type === 'move') {
        const [row] = order.splice(patch.from, 1);
        order.splice(patch.to, 0, row);
        container.insertBefore(row.el, order[patch.to + 1]?.el ?? endAnchor());
      } else if (patch.type === 'update') {
        // An item whose OBJECT identity changed: content rows rebuild (their mount
        // re-renders the fresh item); element rows are REUSED — keep the caller's
        // element and refresh via update(), re-keying if the key changed. A
        // same-ref update needs nothing (the row's mount reacts to its signals).
        const current = order[patch.index];
        if (current.item !== patch.item) {
          if (current.elementMode) {
            const oldKey = key(current.item);
            const newKey = key(patch.item);
            current.item = patch.item;
            if (newKey !== oldKey) {
              rows.delete(oldKey);
              rows.set(newKey, current);
            }
            current.update?.(patch.item);
          } else {
            current.dispose();
            current.el.remove();
            rows.delete(key(current.item));
            const row = makeRow(patch.item);
            rows.set(key(patch.item), row);
            order[patch.index] = row;
            container.insertBefore(row.el, order[patch.index + 1]?.el ?? endAnchor());
          }
        }
      }
      // 'replace' never reaches here — the caller snapshots on it.
    }
  };

  // Virtualization height model, three modes:
  //  - `fixedHeight` (a `number`): the O(1) fast path — no cumulative model.
  //  - `variableHeightAt` (a function): app-declared per-row heights.
  //  - measuring (`{ estimate }`): `variableHeightAt` returns the measured height
  //    when the app has reported one (via `setHeight`), else the estimate.
  // In the two variable cases, `offsets[i]` is the total height of rows 0..i-1
  // (a prefix sum, length total+1), so `offsets[i+1] - offsets[i]` is row i's
  // height and `offsets[total]` is the full scroll height. It is rebuilt only
  // when `items` changes or a height is reported (heightsDirty), never per scroll
  // frame — a scroll reuses the prefix sum and pays only the O(log n) searches.
  const rowHeight = virtualize?.rowHeight;
  const fixedHeight = typeof rowHeight === 'number' ? rowHeight : null;
  const measuring = typeof rowHeight === 'object' && rowHeight !== null;
  const measured = new Map<ListKey, number>(); // key → real reported height
  const estimateAt = (index: number): number => {
    const est = (rowHeight as { estimate: number | ((item: T, index: number) => number) }).estimate;
    return typeof est === 'function' ? est(items[index], index) : est;
  };
  const variableHeightAt: ((index: number) => number) | null =
    fixedHeight !== null
      ? null
      : measuring
        ? (index): number => {
          const k = key(items[index]);
          return measured.has(k) ? (measured.get(k) as number) : estimateAt(index);
        }
        : (index): number => (rowHeight as (item: T, index: number) => number)(items[index], index);

  let offsets: number[] = [0];
  let heightsDirty = true;
  // Measuring only: key → current absolute index, so `setHeight(key, …)` locates
  // the row in O(1). Rebuilt with the prefix sum when `items` changes.
  const indexByKey = new Map<ListKey, number>();
  // Accumulated scroll-anchor correction: the summed height delta of remeasured
  // rows that sit entirely ABOVE the viewport top, applied to `scrollTop` before
  // the next window render so on-screen content does not jump.
  let pendingAnchorDelta = 0;

  const rebuildOffsets = (): void => {
    const fn = variableHeightAt as (index: number) => number;
    const total = items.length;
    offsets = new Array<number>(total + 1);
    offsets[0] = 0;
    if (measuring) indexByKey.clear();
    for (let i = 0; i < total; i++) {
      offsets[i + 1] = offsets[i] + fn(i);
      if (measuring) indexByKey.set(key(items[i]), i);
    }
  };

  // Greatest index i in [0, total] with `offsets[i] <= target` — the first row
  // whose top is at or above `target` (the viewport top).
  const findStart = (target: number, total: number): number => {
    let lo = 0;
    let hi = total;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  // Smallest index i in [0, total] with `offsets[i] >= target` — one past the
  // last row that starts before `target` (the viewport bottom). `total` if none.
  const findEnd = (target: number, total: number): number => {
    let lo = 0;
    let hi = total;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid] >= target) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };

  // Size each visible row for the windowing math. `order` holds the visible rows
  // in order, so `order[j]` is the item at absolute index `start + j`.
  // MEASURED mode is the exception: the row must take its NATURAL height so the
  // app (or `observeRowHeights`) can read the real `offsetHeight` — forcing a
  // height here would make the measurement echo the estimate. Its offsets come
  // from `setHeight` reports instead.
  const sizeVisibleRows = (start: number): void => {
    if (measuring) return;
    for (let j = 0; j < order.length; j++) {
      const abs = start + j;
      const h = fixedHeight !== null ? fixedHeight : offsets[abs + 1] - offsets[abs];
      order[j].el.style.height = `${h}px`;
    }
  };

  // Called after each virtualized window render (used by `observeRowHeights` to
  // re-observe the current visible rows).
  const renderSubscribers = new Set<() => void>();

  const renderWindow = (): void => {
    if (virtualize === undefined) {
      if (granularEligible) {
        // Always drain to keep the single patch queue clean (so patches never
        // double-apply). Take the granular path past the first render, when
        // there are patches, and none is a `replace` (which reshapes the whole
        // array — snapshot instead). Otherwise fall through to a keyed diff.
        const patches = patchSource._consumePatches!();
        if (
          !firstRender
          && patches.length > 0
          && !patches.some((p) => p.type === 'replace')
        ) {
          applyPatches(patches);
          return;
        }
      }
      syncRows(items);
      firstRender = false;
      return;
    }
    const total = items.length;
    const scrollTop = parent.scrollTop;
    const viewportBottom = scrollTop + parent.clientHeight;
    let start: number;
    let end: number;
    let padTop: number;
    let padBottom: number;
    if (fixedHeight !== null) {
      start = Math.max(0, Math.floor(scrollTop / fixedHeight) - overscan);
      end = Math.min(total, Math.ceil(viewportBottom / fixedHeight) + overscan);
      padTop = start * fixedHeight;
      padBottom = Math.max(0, total - end) * fixedHeight;
    } else {
      if (heightsDirty) {
        rebuildOffsets();
        heightsDirty = false;
      }
      start = Math.max(0, findStart(scrollTop, total) - overscan);
      end = Math.min(total, findEnd(viewportBottom, total) + overscan);
      padTop = offsets[start];
      padBottom = offsets[total] - offsets[end];
    }
    syncRows(items.slice(start, end));
    sizeVisibleRows(start);
    container.style.paddingTop = `${padTop}px`;
    container.style.paddingBottom = `${padBottom}px`;
    for (const cb of renderSubscribers) cb();
  };

  const stopEffect = effect(() => {
    items = source.value; // tracking read — re-runs on any structural change
    heightsDirty = true; // items changed → the prefix sum (if any) is stale
    renderWindow();
  });

  // One rAF-coalesced render, shared by scroll and by measurement reports. A
  // pending anchor correction is applied to `scrollTop` first (which itself may
  // fire a scroll, but with the delta already cleared the follow-up is a no-op).
  const scheduleRender = (): void => {
    if (rafPending) return;
    rafPending = true;
    globalThis.requestAnimationFrame(() => {
      rafPending = false;
      if (disposed) return;
      if (pendingAnchorDelta !== 0) {
        parent.scrollTop += pendingAnchorDelta;
        pendingAnchorDelta = 0;
      }
      renderWindow();
    });
  };
  if (virtualize !== undefined) parent.addEventListener('scroll', scheduleRender);

  // Measured mode: report a row's real height. No-op for fixed / declared lists
  // and for keys not currently in the list.
  const setHeight = (k: ListKey, height: number): void => {
    if (!measuring) return;
    const idx = indexByKey.get(k);
    if (idx === undefined) return;
    const oldHeight = measured.has(k) ? (measured.get(k) as number) : estimateAt(idx);
    if (height === oldHeight) return;
    measured.set(k, height);
    // A row whose bottom is at/above the viewport top shifts everything below it
    // (the on-screen content) by the height delta — correct `scrollTop` to match.
    // Uses the CURRENT (pre-rebuild) offsets, which reflect the on-screen layout.
    if (offsets[idx + 1] <= parent.scrollTop) pendingAnchorDelta += height - oldHeight;
    heightsDirty = true;
    scheduleRender();
  };

  const dispose = ((): void => {
    disposed = true;
    stopEffect();
    for (const row of rows.values()) {
      row.dispose();
      if (virtualize === undefined) row.el.remove();
    }
    rows.clear();
    renderSubscribers.clear();
    if (virtualize !== undefined) {
      parent.removeEventListener('scroll', scheduleRender);
      container.remove(); // removes the inner sizer and its rows in one go
      VIRTUAL_INTERNALS.delete(handle);
    }
  }) as BindListHandle;
  const handle = dispose;
  handle.setHeight = setHeight;

  // Register the coordination surface the `observeRowHeights` helper needs, kept
  // off the public type (a GC-tied WeakMap, so it doesn't count against Design
  // rule 5). Only virtualized lists have a window to observe.
  if (virtualize !== undefined) {
    VIRTUAL_INTERNALS.set(handle, {
      visibleRows: () => order.map((row) => ({ key: key(row.item), el: row.el })),
      onRender: (cb) => {
        renderSubscribers.add(cb);
        return () => renderSubscribers.delete(cb);
      },
    });
  }

  return handle;
}

/** Internal coordination surface between {@link bindList} and {@link observeRowHeights}. */
interface VirtualInternals {
  /** The current visible rows, in order, with their keys. */
  visibleRows: () => Array<{ key: ListKey; el: HTMLElement }>;
  /** Subscribe to each window render; returns an unsubscribe. */
  onRender: (cb: () => void) => () => void;
}

// GC-tied (WeakMap) coordination store — a pure cache, not counted against
// Design rule 5 (same class as `bindings.ts:insertedTextNodes`).
const VIRTUAL_INTERNALS = new WeakMap<object, VirtualInternals>();

/**
 * Drive a **measured** virtualized `bindList` (`virtualize: { rowHeight: {
 * estimate } }`) from real layout: install ONE `ResizeObserver` over the visible
 * rows and forward each row's `offsetHeight` to `handle.setHeight`, re-observing
 * as the window shifts. Returns a disposer.
 *
 * This is the batteries-included measurement path; it is deliberately separate
 * from `bindList` (which never depends on `ResizeObserver`) — you can measure
 * however you like and call `handle.setHeight` yourself instead. A no-op for a
 * non-virtualized handle or where `ResizeObserver` is unavailable (SSR).
 *
 *   const list = bindList(scrollEl, source, { key, render, virtualize: { rowHeight: { estimate: 64 } } });
 *   const stopMeasuring = observeRowHeights(list);
 */
export function observeRowHeights(handle: BindListHandle): () => void {
  const internals = VIRTUAL_INTERNALS.get(handle);
  const RO = globalThis.ResizeObserver;
  if (internals === undefined || RO === undefined) return () => { /* nothing to observe */ };

  const keyByEl = new WeakMap<Element, ListKey>();
  const observer = new RO((entries) => {
    for (const entry of entries) {
      const k = keyByEl.get(entry.target);
      if (k !== undefined) handle.setHeight(k, (entry.target as HTMLElement).offsetHeight);
    }
  });

  const resync = (): void => {
    observer.disconnect();
    for (const { key: k, el } of internals.visibleRows()) {
      keyByEl.set(el, k);
      observer.observe(el);
    }
  };

  const unsubscribe = internals.onRender(resync);
  resync(); // observe the initial window

  return () => {
    observer.disconnect();
    unsubscribe();
  };
}
