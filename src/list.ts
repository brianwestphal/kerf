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
 *     `scrollHeight` honest.
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
 * OWNS `parent`'s children. It reads `itemsSignal.value`, so a plain
 * `signal<T[]>` or an `arraySignal<T>` both work.
 */
import { mount, type MountResult } from './mount.js';
import { effect } from './reactive.js';

/** A row's stable key. */
export type ListKey = string | number;

/** Anything with a tracking `.value` array read — a `signal<readonly T[]>` or an `arraySignal<T>`. */
export interface ListSource<T> {
  readonly value: readonly T[];
}

/** Options for {@link bindList}. */
export interface BindListOptions<T> {
  /** Stable per-row key. Rows are matched, moved, and reused by this. */
  key: (item: T) => ListKey;
  /** Renders a row's content into its (individually mounted) row element. Read signals here for per-row reactivity. */
  render: (item: T) => MountResult;
  /** Row element tag. Default `'div'` (use `'li'` inside a `<ul>`, `'tr'` inside a `<tbody>`, …). */
  tag?: string;
  /**
   * Turn on viewport virtualization. `rowHeight` is the fixed pixel height of
   * every row; `overscan` (default 3) is how many extra rows to render above and
   * below the viewport. `parent` must be a scroll container (your CSS: a fixed
   * height + `overflow: auto`).
   */
  virtualize?: { rowHeight: number; overscan?: number };
}

interface Row<T> {
  el: HTMLElement;
  item: T;
  dispose: () => void;
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
): () => void {
  const { key, render, tag = 'div', virtualize } = options;
  const overscan = virtualize?.overscan ?? 3;

  const rows = new Map<ListKey, Row<T>>();
  let items: readonly T[] = [];
  let disposed = false;
  let rafPending = false;

  // Virtualized lists put the windowing padding + rows on an INNER sizer, so the
  // padding never inflates the scroll container's clientHeight (padding counts
  // toward clientHeight). `parent` stays the clean scroll viewport; `container`
  // holds the rows. Non-virtualized lists render straight into `parent`.
  const container: HTMLElement = virtualize === undefined ? parent : document.createElement('div');
  if (virtualize !== undefined) parent.appendChild(container);

  const makeRow = (item: T): Row<T> => {
    const el = document.createElement(tag);
    // bindList knows the fixed row height, so it sizes rows itself — no
    // consumer CSS needed for the windowing math to line up.
    if (virtualize !== undefined) el.style.height = `${virtualize.rowHeight}px`;
    const dispose = mount(el, () => render(item));
    return { el, item, dispose };
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

    // Create missing rows (and rebuild a row whose item OBJECT changed identity).
    const ordered: HTMLElement[] = [];
    for (const item of visible) {
      const k = key(item);
      let row = rows.get(k);
      if (row !== undefined && row.item !== item) {
        row.dispose();
        row.el.remove();
        rows.delete(k);
        row = undefined;
      }
      if (row === undefined) {
        row = makeRow(item);
        rows.set(k, row);
      }
      ordered.push(row.el);
    }

    // Reverse pass: move only rows that are out of position.
    let ref: Node | null = null;
    for (let i = ordered.length - 1; i >= 0; i--) {
      const el = ordered[i];
      if (el.parentNode !== container || el.nextSibling !== ref) {
        container.insertBefore(el, ref);
      }
      ref = el;
    }
  };

  const renderWindow = (): void => {
    if (virtualize === undefined) {
      syncRows(items);
      return;
    }
    const { rowHeight } = virtualize;
    const total = items.length;
    const start = Math.max(0, Math.floor(parent.scrollTop / rowHeight) - overscan);
    const end = Math.min(total, Math.ceil((parent.scrollTop + parent.clientHeight) / rowHeight) + overscan);
    syncRows(items.slice(start, end));
    container.style.paddingTop = `${start * rowHeight}px`;
    container.style.paddingBottom = `${Math.max(0, total - end) * rowHeight}px`;
  };

  const stopEffect = effect(() => {
    items = source.value; // tracking read — re-runs on any structural change
    renderWindow();
  });

  const onScroll = (): void => {
    if (rafPending) return;
    rafPending = true;
    globalThis.requestAnimationFrame(() => {
      rafPending = false;
      if (!disposed) renderWindow();
    });
  };
  if (virtualize !== undefined) parent.addEventListener('scroll', onScroll);

  return () => {
    disposed = true;
    stopEffect();
    for (const row of rows.values()) {
      row.dispose();
      if (virtualize === undefined) row.el.remove();
    }
    rows.clear();
    if (virtualize !== undefined) {
      parent.removeEventListener('scroll', onScroll);
      container.remove(); // removes the inner sizer and its rows in one go
    }
  };
}
