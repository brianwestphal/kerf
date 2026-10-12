/** Which edge of the target row the moved rows land beside. */
export type ListDropPosition = 'before' | 'after';

/** How the person asked for the move. */
export type ListReorderSource = 'pointer' | 'keyboard';

/** The row the moved rows land beside, and on which side of it. */
export interface ListReorderTarget {
  id: string;
  position: ListDropPosition;
}

/** One requested reorder. The application applies it to its own ordered state. */
export interface ListReorder {
  /** The containing list's `data-list-id`, when it has one. */
  listId?: string;
  /** The moved rows' `itemId`s, in their current order. */
  sourceIds: string[];
  target: ListReorderTarget;
  source: ListReorderSource;
}

export interface WireListReorderOptions {
  /** Apply the change synchronously (for example with `reorderListItems`) and re-render. */
  onReorder: (change: ListReorder) => void;
}

const ROW =
  '[data-component="list-item"], [data-component="list-item-link"], [data-component="list-action-row"]';
const LIST = '[data-component="list"]';
const DRAG_TYPE = 'application/x-kerf-list-items';

/**
 * Move `sourceIds` (kept in their current relative order) to `target`'s side
 * of the target row. Returns a new array; an unknown target, a target that is
 * itself being moved, or no known sources leave the order unchanged.
 */
export function reorderListItems<T>(
  items: readonly T[],
  getId: (item: T) => string,
  sourceIds: readonly string[],
  target: ListReorderTarget,
): T[] {
  const moving = new Set(sourceIds);
  if (moving.has(target.id)) return [...items];
  const moved = items.filter((item) => moving.has(getId(item)));
  const remaining = items.filter((item) => !moving.has(getId(item)));
  const index = remaining.findIndex((item) => getId(item) === target.id);
  if (!moved.length || index < 0) return [...items];
  remaining.splice(index + (target.position === 'after' ? 1 : 0), 0, ...moved);
  return remaining;
}

function rowOf(target: EventTarget | null): HTMLElement | undefined {
  return target instanceof Element
    ? (target.closest<HTMLElement>(ROW) ?? undefined)
    : undefined;
}

function reorderable(row: HTMLElement): boolean {
  return (
    row.getAttribute('draggable') === 'true' && Boolean(row.dataset.itemId)
  );
}

/** The list a row reorders within: its List, or its parent element. */
function scopeOf(row: HTMLElement): HTMLElement | undefined {
  return row.closest<HTMLElement>(LIST) ?? row.parentElement ?? undefined;
}

function rowsIn(scope: HTMLElement): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(ROW)].filter(
    (row) => reorderable(row) && scopeOf(row) === scope,
  );
}

function selected(row: HTMLElement): boolean {
  if (row.dataset.component === 'list-action-row')
    return row.dataset.selected === 'true' || row.dataset.pressed === 'true';
  return (
    row.getAttribute('aria-current') === 'page' ||
    row.getAttribute('aria-pressed') === 'true'
  );
}

/** A selected row carries every selected row of its list; any other row moves alone. */
function sourcesFor(row: HTMLElement, rows: readonly HTMLElement[]) {
  return selected(row) ? rows.filter(selected) : [row];
}

function positionFor(event: DragEvent, row: HTMLElement): ListDropPosition {
  const bounds = row.getBoundingClientRect();
  return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
}

function focusTarget(row: HTMLElement): HTMLElement {
  return (
    row.querySelector<HTMLElement>(':scope > .kui-list-action-row__primary') ??
    row
  );
}

/**
 * Wire native drag-and-drop and Alt+Shift+ArrowUp/ArrowDown reordering for
 * draggable `ListItem`, `ListItemLink`, and `ListActionRow` rows below `root`.
 * Rows reorder within their `List` (or parent element) and are identified by
 * `itemId`. Dragging a selected or pressed row moves every selected row of
 * its list. While a pointer drag is in progress the wiring paints the same
 * `data-dragging` / `data-drop-position` attributes the rows' `dragging` and
 * `dropPosition` props render. Order stays application state: `onReorder`
 * reports the change and the application re-renders. Returns a disposer.
 */
export function wireListReorder(
  root: HTMLElement | Document,
  { onReorder }: WireListReorderOptions,
): () => void {
  let disposed = false;
  let dragged: { scope: HTMLElement; sourceIds: string[] } | undefined;

  const clearDropPositions = () =>
    root
      .querySelectorAll<HTMLElement>(`:is(${ROW})[data-drop-position]`)
      .forEach((row) => delete row.dataset.dropPosition);
  const clear = () => {
    dragged = undefined;
    root
      .querySelectorAll<HTMLElement>(
        `:is(${ROW}):is([data-dragging], [data-drop-position])`,
      )
      .forEach((row) => {
        delete row.dataset.dragging;
        delete row.dataset.dropPosition;
      });
  };
  const report = (scope: HTMLElement, change: Omit<ListReorder, 'listId'>) => {
    const listId = scope.dataset.listId;
    onReorder(listId ? { listId, ...change } : change);
  };
  const view = (root.nodeType === 9 ? (root as Document) : root.ownerDocument)!
    .defaultView!;
  /**
   * Return focus to the moved row by identity. An unkeyed re-render morphs
   * rows in place, so the focused element can come to hold a different row;
   * a render may also land after a microtask (a scheduled effect). Check once
   * after the synchronous render and again before the next frame.
   */
  const refocus = (listId: string | undefined, itemId: string) => {
    const restore = () => {
      if (disposed) return;
      const row = [...root.querySelectorAll<HTMLElement>(ROW)].find(
        (candidate) =>
          candidate.dataset.itemId === itemId &&
          scopeOf(candidate)?.dataset.listId === listId,
      );
      if (!row) return;
      const target = focusTarget(row);
      if (target.ownerDocument.activeElement === target) return;
      target.focus();
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    globalThis.queueMicrotask(restore);
    view.requestAnimationFrame(restore);
  };

  const onDragStart = (event: Event) => {
    const dragEvent = event as DragEvent;
    const row = rowOf(event.target);
    const scope = row && scopeOf(row);
    if (!row || !scope || !reorderable(row)) return;
    const sources = sourcesFor(row, rowsIn(scope));
    const sourceIds = sources.map((source) => source.dataset.itemId!);
    dragged = { scope, sourceIds };
    for (const source of sources) source.dataset.dragging = 'true';
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = 'move';
      dragEvent.dataTransfer.setData(DRAG_TYPE, sourceIds.join('\n'));
    }
  };
  /** The row under a drag event that the dragged rows may land beside. */
  const dropRow = (event: Event) => {
    const row = rowOf(event.target);
    if (
      !dragged ||
      !row ||
      !reorderable(row) ||
      scopeOf(row) !== dragged.scope ||
      dragged.sourceIds.includes(row.dataset.itemId!)
    )
      return undefined;
    return row;
  };
  const onDragOver = (event: Event) => {
    if (!dragged) return;
    const dragEvent = event as DragEvent;
    const row = dropRow(event);
    clearDropPositions();
    if (!row) return;
    dragEvent.preventDefault();
    row.dataset.dropPosition = positionFor(dragEvent, row);
    if (dragEvent.dataTransfer) dragEvent.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (event: Event) => {
    const current = dragged;
    const row = dropRow(event);
    if (!current || !row) {
      clear();
      return;
    }
    event.preventDefault();
    const target: ListReorderTarget = {
      id: row.dataset.itemId!,
      position: positionFor(event as DragEvent, row),
    };
    clear();
    report(current.scope, {
      sourceIds: current.sourceIds,
      target,
      source: 'pointer',
    });
  };
  const onKeyDown = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (
      !keyboardEvent.altKey ||
      !keyboardEvent.shiftKey ||
      keyboardEvent.ctrlKey ||
      keyboardEvent.metaKey ||
      (keyboardEvent.key !== 'ArrowUp' && keyboardEvent.key !== 'ArrowDown')
    )
      return;
    const row = rowOf(event.target);
    const scope = row && scopeOf(row);
    if (!row || !scope || !reorderable(row)) return;
    const rows = rowsIn(scope);
    const sources = sourcesFor(row, rows);
    const up = keyboardEvent.key === 'ArrowUp';
    const edge = rows.indexOf(up ? sources[0]! : sources.at(-1)!);
    const neighbors = up ? rows.slice(0, edge).reverse() : rows.slice(edge + 1);
    const neighbor = neighbors.find(
      (candidate) => !sources.includes(candidate),
    );
    if (!neighbor) return;
    keyboardEvent.preventDefault();
    // Read identity before reporting: a synchronous controlled render can
    // morph these very elements into other rows.
    const listId = scope.dataset.listId;
    const focusedId = row.dataset.itemId!;
    report(scope, {
      sourceIds: sources.map((source) => source.dataset.itemId!),
      target: {
        id: neighbor.dataset.itemId!,
        position: up ? 'before' : 'after',
      },
      source: 'keyboard',
    });
    refocus(listId, focusedId);
  };

  root.addEventListener('dragstart', onDragStart);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('drop', onDrop);
  root.addEventListener('dragend', clear);
  root.addEventListener('keydown', onKeyDown);
  return () => {
    disposed = true;
    clear();
    root.removeEventListener('dragstart', onDragStart);
    root.removeEventListener('dragover', onDragOver);
    root.removeEventListener('drop', onDrop);
    root.removeEventListener('dragend', clear);
    root.removeEventListener('keydown', onKeyDown);
  };
}
