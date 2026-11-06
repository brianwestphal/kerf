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
/**
 * What a drag drops on: what it drags, and an empty zone's placeholder
 * (KF-7BB55F), which takes a drop inside only.
 */
const TARGETS = `${DRAGGABLE}, [data-editor-empty]`;
/** How far the pointer moves before a press becomes a drag. */
const DRAG_THRESHOLD = 4;

/**
 * Somewhere other than the canvas a drag can drop (KF-67K2VP: the outline's
 * rows): the legal move over `hit`, drawing its own indicator, if any.
 */
export interface CanvasDropSurface {
  readonly over: (
    hit: Element | null,
    clientY: number,
    sourceId: string,
  ) => TreeListMove | undefined;
  /** Clears what `over` drew, when the drag leaves it or ends. */
  readonly clear: () => void;
}

/**
 * A zone of a container a drag can drop into (KF-WKABP2), with the box it
 * shows as while the drag rests over the container, in client coordinates.
 */
export interface CanvasZone {
  readonly move: TreeListMove;
  readonly box: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

/** One entry of the menu a drop asks with (KF-WKABP2). */
export interface CanvasDropChoice {
  readonly move: TreeListMove;
  readonly label: string;
}

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
   * blank space lands inside (an empty root Pane has no height to hit), or
   * the editor's stand-in id for a document with no root yet, which the
   * drop becomes (KF-PK3GVY).
   */
  readonly rootOf?: () => string;
  /** What a source id is called on the pointer's chip. */
  readonly labelOf?: (sourceId: string) => string;
  /** Where a legal move lands, in words, for the drop caption. */
  readonly captionOf?: (move: TreeListMove) => string;
  /**
   * Why source `sourceId` cannot drop on the canvas element target
   * `targetId` (KF-6RYJ64), shown while the drag rests over it.
   */
  readonly refusalOf?: (sourceId: string, targetId: string) => string;
  /**
   * Other surfaces the drag drops on where the canvas has no drop under the
   * pointer, asked in order; the first legal move wins.
   */
  readonly surfaces?: readonly CanvasDropSurface[];
  /**
   * KF-WKABP2: the legal zones of the container `element` laid out where
   * they render, when the editor knows its layout. Two or more show as
   * regions, and the one the pointer rests in is where the drop goes.
   */
  readonly zonesOf?: (
    element: HTMLElement,
    sourceId: string,
  ) => readonly CanvasZone[] | undefined;
  /**
   * KF-WKABP2: the legal move replacing the node `element` shows, when it is
   * alone in a zone that holds one child and nothing else takes the drop.
   */
  readonly replaceOf?: (
    element: HTMLElement,
    sourceId: string,
  ) => TreeListMove | undefined;
  /**
   * KF-WKABP2: every legal way a drop on `element` can land (each zone, and
   * replacing it), for a drop that asks: one made with Option (Alt) held,
   * or, when `ambiguous` (several zones and no main one to default to), any
   * drop inside it.
   */
  readonly choicesOf?: (
    element: HTMLElement,
    sourceId: string,
  ) => {
    readonly choices: readonly CanvasDropChoice[];
    readonly ambiguous: boolean;
  };
  /**
   * KF-WKABP2: whether a drag over canvas element `element` targets its
   * container instead (an untouched placeholder standing in for a zone).
   */
  readonly passesThrough?: (element: HTMLElement) => boolean;
  /** Asks which of `choices` a drop at `point` means, and applies it. */
  readonly choose?: (
    choices: readonly CanvasDropChoice[],
    point: { readonly x: number; readonly y: number },
  ) => void;
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

/** Whether client point (`x`, `y`) is inside `box`. */
function contains(box: CanvasZone['box'], x: number, y: number): boolean {
  return (
    x >= box.left &&
    x < box.left + box.width &&
    y >= box.top &&
    y < box.top + box.height
  );
}

/** How close to a laid-out container's edge a drag drops beside it. */
const ZONE_EDGE = 8;

/** Whether (`x`, `y`) is within `ZONE_EDGE` of `element`'s flow edges. */
function nearEdge(
  element: HTMLElement,
  x: number,
  y: number,
  across: boolean,
): boolean {
  const box = element.getBoundingClientRect();
  return across
    ? x - box.left < ZONE_EDGE || box.right - x < ZONE_EDGE
    : y - box.top < ZONE_EDGE || box.bottom - y < ZONE_EDGE;
}


/** How far the pointer's chip sits below and right of the pointer. */
const CHIP_OFFSET = 14;
/** Half a caption's height, so it never rides above the canvas's top. */
const CAPTION_HALF = 14;
/** How far a caption on a line or ring stops short of its far end. */
const CAPTION_END = 8;

/**
 * Wires pointer dragging on the canvas `[data-editor-canvas]` under `root`,
 * drawing into its `.kui-editor__drop` overlay, its `.kui-editor__drop-caption`
 * and `.kui-editor__drag-source` hosts, and the `.kui-editor__drag-chip` host
 * under `root` (outside the canvas, so it draws over the rails). Returns a
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
    // KF-23EBGS: the pointer chip sits outside the canvas, over the rails.
    (name === 'drag-chip' ? root : canvas()).querySelector<HTMLElement>(
      `.kui-editor__${name}`,
    );
  const caption = () => part('drop-caption');
  const ghosts = () => part('zone-ghosts');
  const hide = () => {
    overlay().hidden = true;
    const host = ghosts();
    if (host) {
      host.hidden = true;
      host.replaceChildren();
    }
    const text = caption();
    if (text) {
      text.hidden = true;
      delete text.dataset.refused;
    }
  };
  const surfaces = options.surfaces ?? [];
  /** The first legal move a surface offers at a point, if any. */
  const surfaceMoveAt = (x: number, y: number) => {
    const hit = pick(x, y);
    let found: TreeListMove | undefined;
    for (const surface of surfaces) {
      if (found) surface.clear();
      else found = surface.over(hit, y, press!.source);
    }
    return found;
  };
  /** Clears everything a drag drew. */
  const clear = () => {
    hide();
    for (const surface of surfaces) surface.clear();
    for (const name of ['drag-source', 'drag-chip']) {
      const host = part(name);
      if (host) host.hidden = true;
    }
  };
  /** A canvas element's box relative to the canvas's scrolled content. */
  const within = (box: { readonly left: number; readonly top: number }) => {
    const host = canvas();
    const outer = host.getBoundingClientRect();
    return {
      left: box.left - outer.left + host.scrollLeft,
      top: box.top - outer.top + host.scrollTop,
    };
  };
  /** Draws each of a container's zones, the chosen one marked. */
  const drawZones = (
    zones: readonly CanvasZone[] | undefined,
    chosen: CanvasZone | undefined,
  ) => {
    const host = ghosts();
    if (!host) return;
    if (!zones) {
      host.hidden = true;
      host.replaceChildren();
      return;
    }
    host.hidden = false;
    host.replaceChildren(
      ...zones.map((zone) => {
        const region = host.ownerDocument.createElement('div');
        region.className = 'kui-editor__zone-ghost';
        if (zone === chosen) region.dataset.chosen = '';
        const { left, top } = within(zone.box);
        region.style.inset = `${top}px auto auto ${left}px`;
        region.style.width = `${zone.box.width}px`;
        region.style.height = `${zone.box.height}px`;
        return region;
      }),
    );
  };
  const badge = (text: string, tone: 'info' | 'danger' = 'info') =>
    String(Badge({ children: text, tone, appearance: 'solid' }));
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
    let element = hit?.closest<HTMLElement>(TARGETS) ?? null;
    while (element && options.passesThrough?.(element))
      element = element.parentElement?.closest<HTMLElement>(TARGETS) ?? null;
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
    const positions: readonly TreeListDropPosition[] = element.matches(
      '[data-editor-empty]',
    )
      ? ['inside']
      : positionsAt(element.getBoundingClientRect(), x, y, across);
    // KF-WKABP2: a container's zones, where they render; the pointer picks
    // one. Only a thin band along its edges still drops beside it.
    const zones = element.matches('[data-editor-empty]')
      ? undefined
      : options.zonesOf?.(element, press.source);
    // A point over no legal zone drops as anywhere else would.
    const zone =
      zones && zones.length > 1 && !nearEdge(element, x, y, across)
        ? zones.find(({ box }) => contains(box, x, y))
        : undefined;
    if (zone) return { move: zone.move, element, across, zones, zone };
    for (const position of positions) {
      const move = { sourceId: press.source, target: { id, position } };
      if (options.canDrop(move)) return { move, element, across };
      if (position === 'inside') {
        const replace = options.replaceOf?.(element, press.source);
        if (replace) return { move: replace, element, across, replace: true };
      }
    }
    return undefined;
  };

  /**
   * Draws a line beside, or a ring around, the target element; over a
   * container's zones (KF-WKABP2), each zone's region and a ring around the
   * one the drop takes.
   */
  const show = ({
    element,
    move,
    across,
    zones,
    zone,
  }: NonNullable<ReturnType<typeof moveAt>>) => {
    const { position } = move.target;
    const box = zone?.box ?? element.getBoundingClientRect();
    const host = canvas();
    const { left, top } = within(box);
    drawZones(zones, zone);
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
    const [farX, captionY, side] = placeCaption();
    // KF-WKABP2: a caption wider than its target (a narrow rail's region)
    // never runs off the canvas's left edge.
    const captionX =
      side === 'on'
        ? Math.max(farX, host.scrollLeft + text.offsetWidth + gap)
        : farX;
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
    if (found) {
      show(found);
      for (const surface of surfaces) surface.clear();
      return;
    }
    hide();
    if (!surfaceMoveAt(pointer.clientX, pointer.clientY))
      refuse(pointer.clientX, pointer.clientY);
  };
  /** Says why the canvas target under a point takes no drop (KF-6RYJ64). */
  const refuse = (x: number, y: number) => {
    const element = pick(x, y)?.closest<HTMLElement>(TARGETS);
    const text = caption();
    if (!element || !text || !options.refusalOf || !canvas().contains(element))
      return;
    const id = options.targetOf(element);
    if (id === press!.source) return;
    text.innerHTML = badge(options.refusalOf(press!.source, id), 'danger');
    text.hidden = false;
    text.dataset.side = 'on';
    text.dataset.refused = '';
    const { left, top } = within(element.getBoundingClientRect());
    text.style.inset = `${Math.max(top, canvas().scrollTop + CAPTION_HALF)}px auto auto ${left + element.getBoundingClientRect().width - CAPTION_END}px`;
  };
  const onUp = (event: Event) => {
    const pointer = event as PointerEvent;
    if (!press || pointer.pointerId !== press.pointer) return;
    const at = press.dragging
      ? moveAt(pointer.clientX, pointer.clientY)
      : undefined;
    const found =
      at?.move ??
      (press.dragging
        ? surfaceMoveAt(pointer.clientX, pointer.clientY)
        : undefined);
    // KF-WKABP2: a drop made with Option (Alt) held asks where it goes, and
    // so does one inside a container with several zones, no layout to pick
    // one by, and no main zone to default to.
    const { choices, ambiguous } =
      at && options.choose && options.choicesOf
        ? options.choicesOf(at.element, press.source)
        : { choices: [], ambiguous: false };
    const asks =
      choices.length > 0 &&
      (pointer.altKey ||
        (ambiguous &&
          !at!.zones &&
          !at!.replace &&
          at!.move.target.position === 'inside'));
    suppressClick = press.dragging;
    // The click that ends a drag comes in this same task; a later click
    // (on the menu a drop asks with, KF-WKABP2) is the person's own.
    if (suppressClick)
      root.ownerDocument.defaultView!.setTimeout(() => {
        suppressClick = false;
      });
    press = undefined;
    clear();
    if (asks)
      options.choose!(choices, { x: pointer.clientX, y: pointer.clientY });
    else if (found) options.onMove(found);
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
