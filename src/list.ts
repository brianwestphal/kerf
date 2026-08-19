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
): () => void {
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
      // content + cleanup. bindList still sizes it for the windowing math.
      if (virtualize !== undefined) elementRow.el.style.height = `${virtualize.rowHeight}px`;
      return { el: elementRow.el, item, dispose: elementRow.dispose, elementMode: true, update: elementRow.update };
    }
    // Content mode: kerf creates the row element and mounts `render` inside it,
    // so the content is per-row reactive. (In content mode `render` runs once
    // more here for the mode probe than the mount itself needs — keep it a pure
    // projection, which bindList already requires.)
    const el = document.createElement(tag);
    if (virtualize !== undefined) el.style.height = `${virtualize.rowHeight}px`;
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
