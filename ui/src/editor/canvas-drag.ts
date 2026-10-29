// Dragging nodes and slots on the editor canvas (KF-CWDE93). A pointer drag
// past a few pixels picks the node or slot under the pointer as the target,
// reads before, after, or inside from where the pointer sits along the
// target's flow, and draws a line or ring over the canvas. The editor says
// which drops are legal and applies them, as it does for outline drags.
// KF-Y4GHQV: while it drags, a chip naming what is dragged follows the
// pointer, the line or ring carries a caption saying where it lands, and a
// node moved on the canvas dims in place.
import type {
  TreeListDropPosition,
  TreeListMove,
} from '../components/collections/tree-list/wiring/wire-tree-list.js';
import { Badge } from '../components/feedback/badge/badge.js';

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
  /**
   * Draggable elements outside the canvas (KF-78MHM8: the component palette),
   * and the source id of each; they drop on the canvas like canvas nodes.
   */
  readonly external?: {
    readonly selector: string;
    readonly sourceOf: (element: HTMLElement) => string | undefined;
  };
  /**
   * The outline id of the document's root, which a drop on the canvas's
   * blank space lands inside (an empty root Pane has no height to hit).
   */
  readonly rootOf?: () => string;
  /** What a source id is called on the pointer's chip. */
  readonly labelOf?: (sourceId: string) => string;
  /** Where a legal move lands, in words, for the drop caption. */
  readonly captionOf?: (move: TreeListMove) => string;
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
  // Near an edge, beside comes first; a container that cannot take a node
  // beside it (the root) still takes it inside.
  return offset < 0.25 || offset > 0.75 ? [edge, 'inside'] : ['inside', edge];
}

/** How far the pointer's chip sits below and right of the pointer. */
const CHIP_OFFSET = 14;
/** Half a caption's height, so it never rides above the canvas's top. */
const CAPTION_HALF = 14;
/** How far a caption on a line or ring stops short of its far end. */
const CAPTION_END = 8;

/**
 * Wires pointer dragging on the canvas `[data-editor-canvas]` under `root`,
 * drawing into its `.kui-editor__drop` overlay, its `.kui-editor__drop-caption`,
 * `.kui-editor__drag-source`, and `.kui-editor__drag-chip` hosts. Returns a
 * disposer.
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
        /** The canvas element being moved, if the drag started on one. */
        element?: HTMLElement;
      }
    | undefined;
  let suppressClick = false;

  const canvas = () => root.querySelector<HTMLElement>('[data-editor-canvas]')!;
  const overlay = () =>
    canvas().querySelector<HTMLElement>('.kui-editor__drop')!;
  const part = (name: string) =>
    canvas().querySelector<HTMLElement>(`.kui-editor__${name}`);
  const caption = () => part('drop-caption');
  const hide = () => {
    overlay().hidden = true;
    const text = caption();
    if (text) text.hidden = true;
  };
  /** Clears everything a drag drew. */
  const clear = () => {
    hide();
    for (const name of ['drag-source', 'drag-chip']) {
      const host = part(name);
      if (host) host.hidden = true;
    }
  };
  /** A canvas element's box relative to the canvas's scrolled content. */
  const within = (box: DOMRect) => {
    const host = canvas();
    const outer = host.getBoundingClientRect();
    return {
      left: box.left - outer.left + host.scrollLeft,
      top: box.top - outer.top + host.scrollTop,
    };
  };
  const badge = (text: string) =>
    String(Badge({ children: text, tone: 'info', appearance: 'solid' }));
  /** Starts a drag's chip, and dims the canvas element it moves. */
  const begin = () => {
    const chip = part('drag-chip');
    if (chip && options.labelOf) {
      chip.innerHTML = badge(options.labelOf(press!.source));
      chip.hidden = false;
    }
    const source = part('drag-source');
    if (source && press!.element) {
      const box = press!.element.getBoundingClientRect();
      const { left, top } = within(box);
      source.style.inset = `${top}px auto auto ${left}px`;
      source.style.width = `${box.width}px`;
      source.style.height = `${box.height}px`;
      source.hidden = false;
    }
  };
  const follow = (x: number, y: number) => {
    const chip = part('drag-chip');
    if (chip)
      chip.style.inset = `${y + CHIP_OFFSET}px auto auto ${x + CHIP_OFFSET}px`;
  };

  /** The legal move at a point, with the target element, if any. */
  const moveAt = (x: number, y: number) => {
    const hit = pick(x, y);
    const element = hit?.closest<HTMLElement>(DRAGGABLE);
    if (press && !element && hit === canvas() && options.rootOf) {
      const move = {
        sourceId: press.source,
        target: { id: options.rootOf(), position: 'inside' as const },
      };
      if (move.target.id !== press.source && options.canDrop(move))
        return { move, element: canvas(), across: false };
      return undefined;
    }
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
  const show = (element: HTMLElement, move: TreeListMove, across: boolean) => {
    const { position } = move.target;
    const box = element.getBoundingClientRect();
    const host = canvas();
    const { left, top } = within(box);
    const mark = overlay();
    mark.hidden = false;
    mark.dataset.drop = position === 'inside' ? 'ring' : 'line';
    const line = 2;
    const [x, y, width, height] =
      position === 'inside'
        ? [left, top, box.width, box.height]
        : across
          ? [
              position === 'before'
                ? Math.max(left - line, host.scrollLeft)
                : left + box.width,
              top,
              line,
              box.height,
            ]
          : [
              left,
              // Before the first node, the line would sit on the canvas's
              // clipped top edge; keep it just inside (KF-Y4GHQV).
              position === 'before'
                ? Math.max(top - line, host.scrollTop)
                : top + box.height,
              box.width,
              line,
            ];
    // A ring around the whole canvas would sit on its clipped edges; draw it
    // a little inside instead.
    const inset = element === host ? 4 : 0;
    mark.style.inset = `${y + inset}px auto auto ${x + inset}px`;
    mark.style.width = `${width - inset * 2}px`;
    mark.style.height = `${height - inset * 2}px`;
    const text = caption();
    if (!text || !options.captionOf) return;
    text.innerHTML = badge(options.captionOf(move));
    text.hidden = false;
    // On the line, or on the ring's top edge, at its far end, where a row's
    // content rarely sits; under the foot of a line in a row. Never above the
    // canvas's top, where it would be clipped.
    const gap = 4;
    const placeCaption = (): [number, number, string] => {
      if (across) return [x, y + height + gap, 'below'];
      const edge = position === 'inside' ? y + inset : y + height / 2;
      return [
        x + width - inset - CAPTION_END,
        Math.max(edge, host.scrollTop + CAPTION_HALF),
        'on',
      ];
    };
    const [captionX, captionY, side] = placeCaption();
    text.dataset.side = side;
    text.style.inset = `${captionY}px auto auto ${captionX}px`;
  };

  const onDown = (event: Event) => {
    const pointer = event as PointerEvent;
    // A new press ends any click a finished drag was holding back.
    suppressClick = false;
    if (pointer.button !== 0) return;
    // The innermost node that can move: pressing a repeated row drags the
    // list it repeats in.
    const target = pointer.target as Element;
    const external =
      options.external &&
      target.closest<HTMLElement>(options.external.selector);
    let element = target.closest<HTMLElement>(DRAGGABLE);
    let source = external ? options.external!.sourceOf(external) : undefined;
    while (!external && element && canvas().contains(element)) {
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
      ...(!external && element ? { element } : {}),
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
    if (!press.dragging) {
      press.dragging = true;
      begin();
    }
    pointer.preventDefault();
    follow(pointer.clientX, pointer.clientY);
    const found = moveAt(pointer.clientX, pointer.clientY);
    if (found) show(found.element, found.move, found.across);
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
    clear();
    if (found) options.onMove(found.move);
  };
  const cancel = () => {
    if (press?.dragging) suppressClick = true;
    press = undefined;
    clear();
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
