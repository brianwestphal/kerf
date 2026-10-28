// Dragging nodes and slots on the editor canvas (KF-CWDE93). A pointer drag
// past a few pixels picks the node or slot under the pointer as the target,
// reads before, after, or inside from where the pointer sits along the
// target's flow, and draws a line or ring over the canvas. The editor says
// which drops are legal and applies them, as it does for outline drags.
import type {
  TreeListDropPosition,
  TreeListMove,
} from '../components/collections/tree-list/wiring/wire-tree-list.js';

/** Elements the canvas drags and drops on: nodes and slot placeholders. */
const DRAGGABLE = '[data-kerf-node], [data-editor-slot-address]';
/** How far the pointer moves before a press becomes a drag. */
const DRAG_THRESHOLD = 4;

export interface CanvasDragOptions {
  /** The outline id of a canvas element that can be dragged, if any. */
  readonly sourceOf: (element: HTMLElement) => string | undefined;
  /** The outline id of a canvas element as a drop target. */
  readonly targetOf: (element: HTMLElement) => string;
  readonly canDrop: (move: TreeListMove) => boolean;
  readonly onMove: (move: TreeListMove) => void;
  /** The element under a point; `document.elementFromPoint` by default. */
  readonly pick?: (x: number, y: number) => Element | null;
}

/** Whether `element` sits in a row: its parent lays children out left to right. */
function horizontal(element: HTMLElement): boolean {
  const parent = element.parentElement;
  if (!parent) return false;
  const style = parent.ownerDocument.defaultView!.getComputedStyle(parent);
  return (
    style.display.includes('flex') && style.flexDirection.startsWith('row')
  );
}

/** The positions a pointer asks for over `box`, best first (as TreeList's). */
function positionsAt(
  box: DOMRect,
  x: number,
  y: number,
  across: boolean,
): TreeListDropPosition[] {
  const offset = across
    ? (x - box.left) / box.width
    : (y - box.top) / box.height;
  const edge: TreeListDropPosition = offset < 0.5 ? 'before' : 'after';
  return offset < 0.25 || offset > 0.75 ? [edge] : ['inside', edge];
}

/**
 * Wires pointer dragging on the canvas `[data-editor-canvas]` under `root`,
 * drawing into its `.kui-editor__drop` overlay. Returns a disposer.
 */
export function wireCanvasDrag(
  root: HTMLElement,
  options: CanvasDragOptions,
): () => void {
  const pick =
    options.pick ??
    ((x: number, y: number) => root.ownerDocument.elementFromPoint(x, y));
  let press:
    | {
        source: string;
        x: number;
        y: number;
        pointer: number;
        dragging: boolean;
      }
    | undefined;
  let suppressClick = false;

  const canvas = () => root.querySelector<HTMLElement>('[data-editor-canvas]')!;
  const overlay = () =>
    canvas().querySelector<HTMLElement>('.kui-editor__drop')!;
  const hide = () => {
    overlay().hidden = true;
  };

  /** The legal move at a point, with the target element, if any. */
  const moveAt = (x: number, y: number) => {
    const element = pick(x, y)?.closest<HTMLElement>(DRAGGABLE);
    if (!press || !element || !canvas().contains(element)) return undefined;
    const id = options.targetOf(element);
    if (id === press.source) return undefined;
    const across = horizontal(element);
    for (const position of positionsAt(
      element.getBoundingClientRect(),
      x,
      y,
      across,
    )) {
      const move = { sourceId: press.source, target: { id, position } };
      if (options.canDrop(move)) return { move, element, across };
    }
    return undefined;
  };

  /** Draws a line beside, or a ring around, the target element. */
  const show = (
    element: HTMLElement,
    position: TreeListDropPosition,
    across: boolean,
  ) => {
    const box = element.getBoundingClientRect();
    const host = canvas();
    const outer = host.getBoundingClientRect();
    const left = box.left - outer.left + host.scrollLeft;
    const top = box.top - outer.top + host.scrollTop;
    const mark = overlay();
    mark.hidden = false;
    mark.dataset.drop = position === 'inside' ? 'ring' : 'line';
    const line = 2;
    const [x, y, width, height] =
      position === 'inside'
        ? [left, top, box.width, box.height]
        : across
          ? [
              position === 'before' ? left - line : left + box.width,
              top,
              line,
              box.height,
            ]
          : [
              left,
              position === 'before' ? top - line : top + box.height,
              box.width,
              line,
            ];
    mark.style.inset = `${y}px auto auto ${x}px`;
    mark.style.width = `${width}px`;
    mark.style.height = `${height}px`;
  };

  const onDown = (event: Event) => {
    const pointer = event as PointerEvent;
    // A new press ends any click a finished drag was holding back.
    suppressClick = false;
    if (pointer.button !== 0) return;
    // The innermost node that can move: pressing a repeated row drags the
    // list it repeats in.
    let element = (pointer.target as Element).closest<HTMLElement>(DRAGGABLE);
    let source: string | undefined;
    while (element && canvas().contains(element)) {
      source = options.sourceOf(element);
      if (source) break;
      element = element.parentElement?.closest<HTMLElement>(DRAGGABLE) ?? null;
    }
    if (!source) return;
    press = {
      source,
      x: pointer.clientX,
      y: pointer.clientY,
      pointer: pointer.pointerId,
      dragging: false,
    };
  };
  const onMovePointer = (event: Event) => {
    const pointer = event as PointerEvent;
    if (!press || pointer.pointerId !== press.pointer) return;
    if (
      !press.dragging &&
      Math.hypot(pointer.clientX - press.x, pointer.clientY - press.y) <
        DRAG_THRESHOLD
    )
      return;
    press.dragging = true;
    pointer.preventDefault();
    const found = moveAt(pointer.clientX, pointer.clientY);
    if (found) show(found.element, found.move.target.position, found.across);
    else hide();
  };
  const onUp = (event: Event) => {
    const pointer = event as PointerEvent;
    if (!press || pointer.pointerId !== press.pointer) return;
    const found = press.dragging
      ? moveAt(pointer.clientX, pointer.clientY)
      : undefined;
    suppressClick = press.dragging;
    press = undefined;
    hide();
    if (found) options.onMove(found.move);
  };
  const cancel = () => {
    if (press?.dragging) suppressClick = true;
    press = undefined;
    hide();
  };
  const onKey = (event: Event) => {
    if ((event as KeyboardEvent).key === 'Escape' && press) cancel();
  };
  // A drag ends in a click on whatever was under the pointer; that click
  // must not select it.
  const onClick = (event: Event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.stopPropagation();
    event.preventDefault();
  };

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMovePointer);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('keydown', onKey);
  root.addEventListener('click', onClick, true);
  return () => {
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointermove', onMovePointer);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', cancel);
    root.removeEventListener('keydown', onKey);
    root.removeEventListener('click', onClick, true);
  };
}
