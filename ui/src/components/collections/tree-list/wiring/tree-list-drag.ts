// KF-WXP6AB: pointer drag-and-drop for TreeList rows. A dragged row lands
// before or after another row, or inside it; the application says which
// drops are legal (`canDrop`) and applies the move (`onMove`).

/** Where a dragged row lands: beside the target row, or inside it. */
export type TreeListDropPosition = 'before' | 'after' | 'inside';

/** One requested move. The application applies it to its own tree. */
export interface TreeListMove {
  /** The dragged row's node id. */
  readonly sourceId: string;
  readonly target: {
    readonly id: string;
    readonly position: TreeListDropPosition;
  };
}

export interface TreeListDragOptions {
  /** Whether `move` is legal; only legal drops show an indicator. */
  readonly canDrop?: (move: TreeListMove) => boolean;
  /** Applies a legal move (and re-renders). */
  readonly onMove: (move: TreeListMove) => void;
}

const ROW = '.kui-tree-list > [role="treeitem"]';
const DRAG_TYPE = 'application/x-kerf-tree-item';

const rowOf = (target: EventTarget | null) =>
  target instanceof Element
    ? (target.closest<HTMLElement>(ROW) ?? undefined)
    : undefined;

/**
 * The positions a pointer at `clientY` asks for over `row`, best first: the
 * middle half of a row means inside, its top and bottom quarters before and
 * after; when inside is not legal the halves fall back to before and after.
 */
function positionsAt(
  row: HTMLElement,
  clientY: number,
): TreeListDropPosition[] {
  const bounds = row.getBoundingClientRect();
  const offset = (clientY - bounds.top) / bounds.height;
  const edge: TreeListDropPosition = offset < 0.5 ? 'before' : 'after';
  return offset < 0.25 || offset > 0.75 ? [edge] : ['inside', edge];
}

/** Wires pointer drag-and-drop for draggable TreeList rows under `root`. */
export function wireTreeListDrag(
  root: HTMLElement,
  { canDrop = () => true, onMove }: TreeListDragOptions,
): () => void {
  let dragged: { tree: HTMLElement; id: string } | undefined;

  const clearIndicators = () =>
    root
      .querySelectorAll<HTMLElement>(`${ROW}[data-drop-position]`)
      .forEach((row) => delete row.dataset.dropPosition);
  const clear = () => {
    dragged = undefined;
    root
      .querySelectorAll<HTMLElement>(
        `${ROW}:is([data-dragging], [data-drop-position])`,
      )
      .forEach((row) => {
        delete row.dataset.dragging;
        delete row.dataset.dropPosition;
      });
  };
  /** The legal move a drag event over a row asks for, if any. */
  const moveAt = (event: DragEvent): TreeListMove | undefined => {
    const row = rowOf(event.target);
    if (
      !dragged ||
      !row ||
      row.parentElement !== dragged.tree ||
      row.dataset.itemId === dragged.id
    )
      return undefined;
    const sourceId = dragged.id;
    for (const position of positionsAt(row, event.clientY)) {
      const move = { sourceId, target: { id: row.dataset.itemId!, position } };
      if (canDrop(move)) return move;
    }
    return undefined;
  };

  const onDragStart = (event: Event) => {
    const row = rowOf(event.target);
    if (!row || row.getAttribute('draggable') !== 'true') return;
    dragged = { tree: row.parentElement!, id: row.dataset.itemId! };
    row.dataset.dragging = 'true';
    const transfer = (event as DragEvent).dataTransfer;
    if (transfer) {
      transfer.effectAllowed = 'move';
      transfer.setData(DRAG_TYPE, dragged.id);
    }
  };
  const onDragOver = (event: Event) => {
    if (!dragged) return;
    const move = moveAt(event as DragEvent);
    clearIndicators();
    if (!move) return;
    event.preventDefault();
    rowOf(event.target)!.dataset.dropPosition = move.target.position;
    const transfer = (event as DragEvent).dataTransfer;
    if (transfer) transfer.dropEffect = 'move';
  };
  const onDrop = (event: Event) => {
    const move = moveAt(event as DragEvent);
    clear();
    if (!move) return;
    event.preventDefault();
    onMove(move);
  };

  root.addEventListener('dragstart', onDragStart);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('drop', onDrop);
  root.addEventListener('dragend', clear);
  return () => {
    clear();
    root.removeEventListener('dragstart', onDragStart);
    root.removeEventListener('dragover', onDragOver);
    root.removeEventListener('drop', onDrop);
    root.removeEventListener('dragend', clear);
  };
}
