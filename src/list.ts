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
import { createListRowController } from './list-row-controller.js';
import { createListVirtualizationController } from './list-virtualization-controller.js';
import type { MountResult } from './mount.js';
import { effect } from './reactive.js';

const NOOP = (): void => { /* intentional no-op */ };

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
  /**
   * The inner container element kerf creates to hold the rows in a **virtualized**
   * list (the "sizer"). `undefined` for a non-virtualized list (there the rows
   * live directly in `parent`). Use it to style, id, or otherwise reach the row
   * block without guessing at `parent.lastElementChild` — though `containerClass`
   * / `containerId` on `virtualize` set those declaratively.
   */
  container?: HTMLElement;
};

/** Options for {@link bindList}. */
export interface BindListOptions<T> {
  /** Stable, unique per-row key. Duplicate keys are rejected before DOM mutation. */
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
   *
   * `minRows` renders **every** row (no windowing, zero padding) while the list
   * is shorter than it, and windows only at or above it — the DOM structure (the
   * inner container) is the same either way, so the call site never branches. A
   * fully-rendered short list is friendlier to find-in-page, screen readers, and
   * DOM-count assertions, which only see rows actually in the DOM.
   *
   * `containerClass` / `containerId` are set on the inner container kerf creates
   * to hold the rows, so it's reachable from CSS and tests without guessing at
   * `parent.lastElementChild` (it's also on the handle as `handle.container`).
   *
   * kerf re-windows on `parent`'s `scroll` and, where `ResizeObserver` exists, on
   * `parent` resizing — so a list that mounts before layout (a hidden tab,
   * `clientHeight` 0) fills in once it's sized, and a resized container re-windows.
   *
   * `mode` (default `'window'`) picks the virtualization STRATEGY:
   *  - **`'window'`** — the JS windowing above: only the visible rows are in the
   *    DOM, bounded node count, works on every engine. Off-window rows are removed
   *    (see the findability tradeoff below).
   *  - **`'content-visibility'`** — **every** row stays in the DOM and kerf sets
   *    `content-visibility: auto` + `contain-intrinsic-size: 0 <rowHeight>px` on
   *    each one, so a supporting engine (Chromium, Safari 18) skips the *layout /
   *    paint* of off-screen rows while keeping them findable. `rowHeight` here is
   *    used **only** as the `contain-intrinsic-size` placeholder (scrollbar
   *    accuracy before a row is first rendered) — there is no windowing math, no
   *    padding, no scroll listener, no anchor correction, and `setHeight` /
   *    `observeRowHeights` are **no-ops** (the browser owns real measurement).
   *    `minRows` is ignored (all rows already render). On an engine without
   *    `content-visibility` the CSS is simply inert — all rows render, correct and
   *    fully findable, only without the skip optimization. Choose this mode for
   *    medium lists where find-in-page / a11y / anchor links matter more than the
   *    node ceiling; keep `'window'` for very large (100k-row) lists.
   *
   * **Findability tradeoff (`'window'` mode).** Off-window rows are removed from
   * the DOM (not merely hidden), so with `mode: 'window'`: **find-in-page
   * (Cmd/Ctrl+F)**, **screen readers / the a11y tree**, and **anchor links /
   * `scrollIntoView`** only reach the visible window — a match, an announced row,
   * or a linked element that has been windowed out isn't in the DOM to find.
   * Convey the true total via ARIA (`aria-rowcount` / `aria-setsize`) if it
   * matters, and use a non-virtualized list — `minRows` above the list length, or
   * `mode: 'content-visibility'` — when full findability matters more than the DOM
   * node ceiling. See `docs/17-list-virtualization.md` §17.10 / §17.11.
   */
  virtualize?: {
    rowHeight: RowHeight<T>;
    overscan?: number;
    minRows?: number;
    containerClass?: string;
    containerId?: string;
    /**
     * Virtualization strategy. `'window'` (default) removes off-window rows from
     * the DOM; `'content-visibility'` keeps every row in the DOM and lets the
     * browser skip off-screen layout/paint (full find-in-page / a11y, at the cost
     * of an unbounded node count). See the option JSDoc above.
     */
    mode?: 'window' | 'content-visibility';
  };
}

/** Reject a keyed snapshot before reconciliation can alias two rows in the DOM. */
function assertUniqueListKeys<T>(items: readonly T[], key: (item: T) => ListKey): void {
  const firstIndex = new Map<ListKey,number>();
  for (let index = 0; index < items.length; index++) {
    const rowKey = key(items[index]);
    const first = firstIndex.get(rowKey);
    if (first !== undefined) {
      const displayed = typeof rowKey === 'string' ? JSON.stringify(rowKey) : String(rowKey);
      throw new Error(
        `bindList: duplicate key ${displayed} at indices ${first} and ${index} — every row key must be unique.`,
      );
    }
    firstIndex.set(rowKey,index);
  }
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
  const { key,render,tag = 'div',virtualize,before } = options;
  let firstRender = true;
  let forceSnapshot = false;

  const patchSource = source as {
    [ARRAY_SIGNAL_BRAND]?: boolean;
    _consumePatches?: () => ArrayPatch<T>[];
  };
  const granularEligible = virtualize === undefined && patchSource[ARRAY_SIGNAL_BRAND] === true;

  const container = virtualize === undefined ? parent : document.createElement('div');
  if (virtualize !== undefined) {
    if (virtualize.containerClass !== undefined) container.className = virtualize.containerClass;
    if (virtualize.containerId !== undefined) container.id = virtualize.containerId;
  }
  const endAnchor = (): Node | null => {
    if (virtualize !== undefined || before === undefined) return null;
    return (typeof before === 'function' ? before() : before) ?? null;
  };

  const rows = createListRowController({ container,key,render,tag,endAnchor });
  const virtualization = virtualize === undefined
    ? undefined
    : createListVirtualizationController({ parent,container,virtualize,key,rows });

  const renderItems = (items: readonly T[]): void => {
    if (virtualization !== undefined) {
      virtualization.render(items);
      return;
    }
    if (granularEligible) {
      const patches = patchSource._consumePatches!();
      if (
        !firstRender
        && !forceSnapshot
        && patches.length > 0
        && !patches.some((patch) => patch.type === 'replace')
      ) {
        try {
          rows.applyPatches(patches);
        } catch (error) {
          forceSnapshot = true;
          throw error;
        }
        return;
      }
    }
    rows.sync(items);
    firstRender = false;
    forceSnapshot = false;
  };

  const stopEffect = effect(() => {
    const items = source.value;
    try {
      assertUniqueListKeys(items,key);
    } catch (error) {
      if (granularEligible) {
        patchSource._consumePatches!();
        forceSnapshot = true;
      }
      throw error;
    }
    renderItems(items);
  });

  if (virtualization !== undefined) {
    parent.appendChild(container);
    virtualization.start();
  }

  const dispose = ((): void => {
    stopEffect();
    rows.dispose(virtualization === undefined);
    if (virtualization !== undefined) {
      virtualization.dispose();
      container.remove();
      VIRTUAL_INTERNALS.delete(handle);
    }
  }) as BindListHandle;
  const handle = dispose;
  handle.setHeight = virtualization?.setHeight ?? NOOP;

  if (virtualization !== undefined) {
    handle.container = container;
    if (!virtualization.contentVisibility) {
      VIRTUAL_INTERNALS.set(handle,{
        visibleRows: () => rows.order.map((row) => ({ key: key(row.item),el: row.el })),
        onRender: virtualization.onRender,
      });
    }
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
  if (internals === undefined || RO === undefined) return NOOP;

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
