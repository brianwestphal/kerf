import { watchOwnedStyles } from '../../../../shared/dom/owned-styles.js';

/**
 * Where a pinned PinnablePopoverSurface sits: its top-left corner in viewport
 * px, and the size the person resized it to (omitted until they do).
 */
export interface PinnablePopoverPlacement {
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
}

/** What changed a PinnablePopoverSurface's pinned state or placement. */
export type PinnablePopoverChangeReason = 'pin' | 'unpin' | 'move' | 'resize';

/** What `wirePinnablePopover`'s `onChange` reports. */
export interface PinnablePopoverChange {
  readonly pinned: boolean;
  /** Placement and saved size; transient surfaces use only the size. */
  readonly placement: PinnablePopoverPlacement | null;
  readonly reason: PinnablePopoverChangeReason;
}

export interface PinnablePopoverOptions {
  /**
   * The element a transient surface opens below (or above, without room
   * below). Default: the first control whose `popovertarget` names the
   * surface. Without one, a transient surface opens centered.
   */
  anchor?: Element | (() => Element | null);
  /** Start pinned, as the application last stored it. */
  pinned?: boolean;
  /** Placement and size to restore; transient surfaces ignore x and y. */
  placement?: PinnablePopoverPlacement;
  /** An arrow key's move, in px (default 8). */
  step?: number;
  /** A Shift+arrow move, in px (default 40). */
  largeStep?: number;
  /**
   * Called when the person (or `pinPopover`) pins, unpins, moves, or resizes
   * the surface. A clamp after a window resize is not reported: the surface
   * returns to the reported placement when the window has room again.
   */
  onChange?: (change: PinnablePopoverChange) => void;
}

interface Controller {
  readonly pinned: boolean;
  setPinned(pinned: boolean): void;
}

const controllers = new WeakMap<HTMLElement, Controller>();

/** The surface variables that place it, and the registered resolved gutter. */
const X_PROPERTY = '--_kui-pinnable-popover-surface-x';
const Y_PROPERTY = '--_kui-pinnable-popover-surface-y';
const GUTTER_PROPERTY = '--_kui-pinnable-popover-surface-gutter-px';
const DEFAULT_GUTTER = 16;
/** Space between the anchor and a transient surface. */
const ANCHOR_GAP = 4;
/** Pointer travel, in px, before a press on the header becomes a drag. */
const DRAG_THRESHOLD = 3;
const MIN_RESIZE_HEIGHT = 160;

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Whether `surface` is pinned (its rendered state when it is not wired). */
export function isPopoverPinned(surface: HTMLElement): boolean {
  return (
    controllers.get(surface)?.pinned ?? surface.hasAttribute('data-pinned')
  );
}

/**
 * Pin (or, with `false`, unpin) a wired PinnablePopoverSurface, as its
 * header Pin toggle does. Pinned, it no longer closes on a press outside
 * and keeps where it is; unpinned, it returns below its anchor. Reported
 * through `onChange`. Does nothing to a surface that is not wired.
 */
export function pinPopover(surface: HTMLElement, pinned = true): void {
  controllers.get(surface)?.setPinned(pinned);
}

/**
 * Give an overlay PinnablePopoverSurface its behavior: placement below its
 * anchor while transient, a press outside or Escape closing it; the Pin
 * toggle; a drag by the header and the arrow keys on the focused title
 * (Shift for `largeStep`) moving it, which pins it; resizing without changing
 * pin state; and a clamp inside the viewport gutter, kept after a window
 * resize. Pinned, it closes only by Escape (with focus inside it), its Close
 * button, or `hidePopover()`. The state survives application re-renders and
 * closing; `onChange` reports it for the application to store. An
 * `embedded` surface is left alone. Returns a disposer.
 */
export function wirePinnablePopover(
  surface: HTMLElement,
  options: PinnablePopoverOptions = {},
): () => void {
  if (surface.dataset.presentation === 'embedded') return () => {};
  const doc = surface.ownerDocument;
  const view = doc.defaultView ?? globalThis;
  const step = options.step ?? 8;
  const largeStep = options.largeStep ?? 40;
  let pinned = options.pinned ?? false;
  let requested: PinnablePopoverPlacement | null = options.placement ?? null;
  /** Inline styles the controller owns, restored after a re-render. */
  const owned = new Map<string, string>();
  let frame = 0;

  const isOpen = () => surface.matches(':popover-open');
  const report = (reason: PinnablePopoverChangeReason) =>
    options.onChange?.({ pinned, placement: requested, reason });

  const own = (property: string, value: string | null) => {
    if (value === null) {
      owned.delete(property);
      surface.style.removeProperty(property);
    } else {
      owned.set(property, value);
      if (surface.style.getPropertyValue(property) !== value)
        surface.style.setProperty(property, value);
    }
  };
  const syncAttributes = () => {
    surface.toggleAttribute('data-pinned', pinned);
    surface.toggleAttribute('data-placed', owned.has(X_PROPERTY));
    const pin = surface.querySelector('[data-pinnable-popover-pin]');
    if (pin && pin.getAttribute('aria-pressed') !== String(pinned))
      pin.setAttribute('aria-pressed', String(pinned));
  };

  const gutter = () => {
    const value = parseFloat(
      view.getComputedStyle(surface).getPropertyValue(GUTTER_PROPERTY),
    );
    return Number.isFinite(value) ? value : DEFAULT_GUTTER;
  };
  const viewport = () => ({
    width: doc.documentElement.clientWidth || view.innerWidth,
    height: view.innerHeight,
  });
  /** Keep the box inside the viewport gutter; its leading edge wins. */
  const clamp = (x: number, y: number) => {
    const box = surface.getBoundingClientRect();
    const g = gutter();
    const { width, height } = viewport();
    return {
      x: Math.max(g, Math.min(x, width - g - box.width)),
      y: Math.max(g, Math.min(y, height - g - box.height)),
    };
  };
  const place = (x: number, y: number) => {
    const at = clamp(x, y);
    own(X_PROPERTY, `${at.x}px`);
    own(Y_PROPERTY, `${at.y}px`);
    syncAttributes();
    return at;
  };
  const applySize = () => {
    own(
      'width',
      requested?.width === undefined ? null : `${requested.width}px`,
    );
    own(
      'height',
      requested?.height === undefined ? null : `${requested.height}px`,
    );
  };

  const resolveAnchor = (): Element | null => {
    const anchor =
      typeof options.anchor === 'function' ? options.anchor() : options.anchor;
    if (anchor) return anchor;
    if (!surface.id) return null;
    // The opener outside the surface, not its own Close button.
    for (const invoker of doc.querySelectorAll(
      `[popovertarget="${CSS.escape(surface.id)}"]`,
    ))
      if (!surface.contains(invoker)) return invoker;
    return null;
  };
  /** Below the anchor, start-aligned, or above it without room below. */
  const placeAtAnchor = () => {
    const anchor = resolveAnchor();
    if (!anchor) {
      own(X_PROPERTY, null);
      own(Y_PROPERTY, null);
      syncAttributes();
      return;
    }
    const target = anchor.getBoundingClientRect();
    const box = surface.getBoundingClientRect();
    const rtl = view.getComputedStyle(surface).direction === 'rtl';
    let y = target.bottom + ANCHOR_GAP;
    if (
      y + box.height > viewport().height - gutter() &&
      target.top - ANCHOR_GAP - box.height >= gutter()
    )
      y = target.top - ANCHOR_GAP - box.height;
    place(rtl ? target.right - box.width : target.left, y);
  };
  /** Where an open surface belongs now. */
  const layout = () => {
    if (!isOpen()) return;
    if (!pinned) placeAtAnchor();
    else if (requested) place(requested.x, requested.y);
    else if (owned.has(X_PROPERTY)) {
      const box = surface.getBoundingClientRect();
      place(box.left, box.top);
    }
  };
  /** The pinned placement after a move, keeping any resized size. */
  const settle = (at: { x: number; y: number }) => {
    requested = {
      ...(requested ?? {}),
      x: at.x,
      y: at.y,
    };
  };

  const setPinned = (next: boolean) => {
    if (next === pinned) return;
    pinned = next;
    if (pinned) {
      if (isOpen()) {
        const box = surface.getBoundingClientRect();
        settle(place(box.left, box.top));
      }
    } else {
      if (requested?.width === undefined && requested?.height === undefined)
        requested = null;
      applySize();
      layout();
    }
    syncAttributes();
    report(pinned ? 'pin' : 'unpin');
  };
  const controller: Controller = {
    get pinned() {
      return pinned;
    },
    setPinned,
  };
  controllers.set(surface, controller);

  const onBeforeToggle = (event: Event) => {
    if ((event as ToggleEvent).newState !== 'open') return;
    applySize();
    view.cancelAnimationFrame(frame);
    // Laid out by the next frame, placed before it paints.
    frame = view.requestAnimationFrame(layout);
  };
  const scrollOwner = () =>
    surface.querySelector<HTMLElement>(
      ':scope > .kui-pinnable-popover-surface__body > :last-child',
    );
  const syncScrollDivider = () => {
    surface.toggleAttribute(
      'data-scrolled',
      surface.dataset.bodyLayout === 'fill-last' &&
        (scrollOwner()?.scrollTop ?? 0) > 1,
    );
  };
  const onToggle = (event: Event) => {
    if ((event as ToggleEvent).newState === 'open') {
      layout();
      syncScrollDivider();
    }
  };
  const onSurfaceScroll = (event: Event) => {
    if (event.target === scrollOwner()) syncScrollDivider();
  };

  const onClick = (event: MouseEvent) => {
    const pin = (event.target as Element).closest(
      '[data-pinnable-popover-pin]',
    );
    if (pin && surface.contains(pin)) setPinned(!pinned);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const resizeHandle = (event.target as Element).closest(
      '.kui-pinnable-popover-surface__bottom-resize',
    );
    if (
      resizeHandle?.parentElement === surface &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      const box = surface.getBoundingClientRect();
      const distance = event.shiftKey ? largeStep : step;
      const maxHeight = Math.max(0, viewport().height - gutter() - box.top);
      const height = Math.min(
        Math.max(
          MIN_RESIZE_HEIGHT,
          box.height + (event.key === 'ArrowDown' ? distance : -distance),
        ),
        maxHeight,
      );
      own('height', `${Math.round(height)}px`);
      const resized = surface.getBoundingClientRect();
      requested = {
        ...(requested ?? { x: box.left, y: box.top }),
        height: Math.round(resized.height),
      };
      report('resize');
      return;
    }
    const handle = (event.target as Element).closest(
      '.kui-pinnable-popover-surface__handle',
    );
    const delta = ARROWS[event.key];
    if (!handle || !delta || event.altKey || event.ctrlKey || event.metaKey)
      return;
    event.preventDefault();
    setPinned(true);
    const distance = event.shiftKey ? largeStep : step;
    const box = surface.getBoundingClientRect();
    settle(
      place(box.left + delta[0] * distance, box.top + delta[1] * distance),
    );
    report('move');
  };

  let drag:
    | {
        id: number;
        header: HTMLElement;
        startX: number;
        startY: number;
        left: number;
        top: number;
        moving: boolean;
        bounds?: { min: number; maxX: number; maxY: number };
      }
    | undefined;
  let resizeDrag:
    | { id: number; handle: HTMLElement; startY: number; height: number }
    | undefined;
  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Element;
    const resizeHandle = target.closest<HTMLElement>(
      '.kui-pinnable-popover-surface__bottom-resize',
    );
    if (resizeHandle?.parentElement === surface && event.button === 0) {
      const box = surface.getBoundingClientRect();
      resizeDrag = {
        id: event.pointerId,
        handle: resizeHandle,
        startY: event.clientY,
        height: box.height,
      };
      resizeHandle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    const header = target.closest<HTMLElement>(
      '.kui-pinnable-popover-surface__header',
    );
    if (
      !header ||
      header.parentElement !== surface ||
      event.button !== 0 ||
      target.closest('.kui-pinnable-popover-surface__header-actions')
    )
      return;
    const box = surface.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      header,
      startX: event.clientX,
      startY: event.clientY,
      left: box.left,
      top: box.top,
      moving: false,
    };
    header.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (resizeDrag && event.pointerId === resizeDrag.id) {
      const box = surface.getBoundingClientRect();
      const maxHeight = Math.max(0, viewport().height - gutter() - box.top);
      const height = Math.min(
        Math.max(
          MIN_RESIZE_HEIGHT,
          resizeDrag.height + event.clientY - resizeDrag.startY,
        ),
        maxHeight,
      );
      own('height', `${Math.round(height)}px`);
      return;
    }
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moving && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    const firstMove = !drag.bounds;
    if (!drag.bounds) {
      drag.moving = true;
      setPinned(true);
      const box = surface.getBoundingClientRect();
      const min = gutter();
      const viewSize = viewport();
      drag.bounds = {
        min,
        maxX: viewSize.width - min - box.width,
        maxY: viewSize.height - min - box.height,
      };
    }
    const { min, maxX, maxY } = drag.bounds;
    own(X_PROPERTY, `${Math.max(min, Math.min(drag.left + dx, maxX))}px`);
    own(Y_PROPERTY, `${Math.max(min, Math.min(drag.top + dy, maxY))}px`);
    if (firstMove) syncAttributes();
  };
  const onPointerEnd = (event: PointerEvent) => {
    if (resizeDrag && event.pointerId === resizeDrag.id) {
      const { handle } = resizeDrag;
      resizeDrag = undefined;
      if (handle.hasPointerCapture?.(event.pointerId))
        handle.releasePointerCapture(event.pointerId);
      const box = surface.getBoundingClientRect();
      requested = {
        ...(requested ?? { x: box.left, y: box.top }),
        height: Math.round(box.height),
      };
      report('resize');
      return;
    }
    if (!drag || event.pointerId !== drag.id) return;
    const { header, moving } = drag;
    drag = undefined;
    if (header.hasPointerCapture?.(event.pointerId))
      header.releasePointerCapture(event.pointerId);
    if (!moving) return;
    const box = surface.getBoundingClientRect();
    settle(place(box.left, box.top));
    report('move');
  };

  // A transient surface closes on a press outside it and its openers.
  const onDocumentPointerDown = (event: PointerEvent) => {
    if (pinned || !isOpen()) return;
    const path = event.composedPath();
    if (path.includes(surface)) return;
    const anchor = resolveAnchor();
    if (anchor && path.includes(anchor)) return;
    if (
      path.some(
        (node) =>
          node instanceof Element &&
          node.getAttribute('popovertarget') === surface.id,
      )
    )
      return;
    surface.hidePopover();
  };
  // Escape closes it: always while transient, from inside it while pinned.
  // An open light-dismiss popover or modal dialog takes Escape first.
  const onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !isOpen()) return;
    if (pinned && !surface.contains(doc.activeElement)) return;
    if (
      doc.querySelector(
        ':is([popover=""], [popover="auto"]):popover-open, dialog:modal',
      )
    )
      return;
    event.preventDefault();
    surface.hidePopover();
  };

  const onResize = () => {
    if (drag?.moving) {
      drag.bounds = undefined;
      return;
    }
    layout();
  };
  const onScroll = () => {
    if (!pinned) layout();
  };

  // An application re-render morphs the surface back to its template: restore
  // what the controller owns. A person resizing a pinned surface writes its
  // inline width and height: take those as the pinned size.
  const adoptResize = () => {
    if (pinned) {
      const width = surface.style.width;
      const height = surface.style.height;
      const resized =
        (width !== '' && width !== owned.get('width')) ||
        (height !== '' && height !== owned.get('height'));
      if (resized) {
        const box = surface.getBoundingClientRect();
        requested = {
          ...(requested ?? { x: box.left, y: box.top }),
          width: Math.round(box.width),
          height: Math.round(box.height),
        };
        if (width !== '') owned.set('width', width);
        if (height !== '') owned.set('height', height);
        report('resize');
      }
    }
  };

  if (pinned) syncAttributes();
  syncScrollDivider();
  if (isOpen()) {
    applySize();
    layout();
  }
  const restore = watchOwnedStyles(surface, owned, {
    attributes: ['data-pinned', 'data-placed', 'data-scrolled', 'aria-pressed'],
    childList: true,
    subtree: true,
    beforeRestore: adoptResize,
    afterRestore: () => {
      syncAttributes();
      syncScrollDivider();
    },
  });
  surface.addEventListener('beforetoggle', onBeforeToggle);
  surface.addEventListener('toggle', onToggle);
  surface.addEventListener('scroll', onSurfaceScroll, {
    capture: true,
    passive: true,
  });
  surface.addEventListener('click', onClick);
  surface.addEventListener('keydown', onKeyDown);
  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointermove', onPointerMove);
  surface.addEventListener('pointerup', onPointerEnd);
  surface.addEventListener('pointercancel', onPointerEnd);
  doc.addEventListener('pointerdown', onDocumentPointerDown, true);
  doc.addEventListener('keydown', onDocumentKeyDown);
  view.addEventListener('resize', onResize);
  doc.addEventListener('scroll', onScroll, { capture: true, passive: true });

  return () => {
    view.cancelAnimationFrame(frame);
    restore.disconnect();
    surface.removeEventListener('beforetoggle', onBeforeToggle);
    surface.removeEventListener('toggle', onToggle);
    surface.removeEventListener('scroll', onSurfaceScroll, { capture: true });
    surface.removeEventListener('click', onClick);
    surface.removeEventListener('keydown', onKeyDown);
    surface.removeEventListener('pointerdown', onPointerDown);
    surface.removeEventListener('pointermove', onPointerMove);
    surface.removeEventListener('pointerup', onPointerEnd);
    surface.removeEventListener('pointercancel', onPointerEnd);
    doc.removeEventListener('pointerdown', onDocumentPointerDown, true);
    doc.removeEventListener('keydown', onDocumentKeyDown);
    view.removeEventListener('resize', onResize);
    doc.removeEventListener('scroll', onScroll, { capture: true });
    for (const property of owned.keys()) surface.style.removeProperty(property);
    owned.clear();
    surface.removeAttribute('data-placed');
    surface.removeAttribute('data-scrolled');
    if (controllers.get(surface) === controller) controllers.delete(surface);
  };
}
