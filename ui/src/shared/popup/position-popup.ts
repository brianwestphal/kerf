import {
  autoUpdate,
  computePosition,
  flip,
  type Placement,
  shift,
  size,
  type VirtualElement,
} from '@floating-ui/dom';

/**
 * Placement for Kerf-owned popups (a PopupMenu's menu and submenus, a
 * Select's listbox): a top-layer element positioned `fixed` against an
 * anchor, flipped to the other side when its preferred side is short,
 * shifted to stay clear of the viewport edge, and capped to the block size
 * its side has room for. The geometry matches the Web Awesome popup these
 * surfaces replaced: no gap, best-fit flip, 10px shift and size padding.
 */

/** Where a popup opens: below or above its anchor, at the start, center, or end. */
export type PopupPlacement =
  'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end';

/**
 * The custom property a placed popup's CSS reads to cap its width at the room
 * its side has; the popup also keeps any width limit of its own.
 */
export const POPUP_AVAILABLE_WIDTH = '--_kui-popup-available-width';

/** A popup stays this far from the viewport edge when shifted or capped. */
export const POPUP_VIEWPORT_PADDING = 10;

/** An element, or a viewport rectangle such as a context menu's pointer point. */
export type PopupAnchor = Element | VirtualElement;

/** A zero-size anchor at a viewport point. */
export function pointAnchor(x: number, y: number): VirtualElement {
  return { getBoundingClientRect: () => new DOMRect(x, y, 0, 0) };
}

export interface PositionPopupOptions {
  placement: Placement;
  /** Main-axis distance from the anchor. */
  gap?: number;
  /** Cross-axis offset (a submenu lifts so its first row meets its item). */
  crossOffset?: number;
  /** Viewport padding the flip, shift, and height cap keep. */
  padding?: number;
}

/**
 * Position `popup` against `anchor` once. Records the placement used as
 * `data-placement`, so the popup's motion grows from its anchor side.
 */
export async function positionPopup(
  anchor: PopupAnchor,
  popup: HTMLElement,
  {
    placement,
    gap = 0,
    crossOffset = 0,
    padding = POPUP_VIEWPORT_PADDING,
  }: PositionPopupOptions,
): Promise<void> {
  // The popup is in the top layer, which no ancestor clips: only the
  // viewport bounds it, not the scroll containers it is rendered inside.
  const boundary = popup.ownerDocument.documentElement;
  // Measure the natural size: a cap from an earlier, shorter side would
  // otherwise steer the flip.
  popup.style.removeProperty('max-height');
  popup.style.removeProperty(POPUP_AVAILABLE_WIDTH);
  const {
    x,
    y,
    placement: used,
  } = await computePosition(anchor, popup, {
    strategy: 'fixed',
    placement,
    middleware: [
      {
        name: 'offset',
        fn: ({ x: ox, y: oy, placement: current }) => {
          const vertical =
            current.startsWith('top') || current.startsWith('bottom');
          const sign =
            current.startsWith('top') || current.startsWith('left') ? -1 : 1;
          // An end alignment (after a flip) shifts the other way, so the
          // popup's last row meets the anchor as its first row would.
          const cross = current.endsWith('-end') ? -crossOffset : crossOffset;
          return vertical
            ? { x: ox + cross, y: oy + sign * gap }
            : { x: ox + sign * gap, y: oy + cross };
        },
      },
      flip({ fallbackStrategy: 'bestFit', padding, boundary }),
      shift({ padding, crossAxis: true, boundary }),
      size({
        padding,
        boundary,
        apply({ availableHeight, availableWidth }) {
          popup.style.maxHeight = `${Math.max(0, availableHeight)}px`;
          // The popup's own CSS caps its width by this and its own limit.
          popup.style.setProperty(
            POPUP_AVAILABLE_WIDTH,
            `${Math.max(0, availableWidth)}px`,
          );
        },
      }),
    ],
  });
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  popup.setAttribute('data-placement', used);
}

/**
 * Keep a shown popup positioned while its anchor or any scroll ancestor
 * moves, the viewport resizes, or either element changes size. Returns the
 * function that stops following.
 */
export function followAnchor(
  anchor: PopupAnchor,
  popup: HTMLElement,
  place: () => void,
): () => void {
  return autoUpdate(anchor, popup, place);
}

/** Phone-width viewports place a submenu above or below its parent menu. */
export const PHONE_SUBMENU_QUERY = '(max-width: 480px)';

const PHONE_INSET = 8;
const PHONE_GAP = 4;

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Place a phone-width submenu beside its parent menu in the block axis, so
 * its rows never cover the parent's: below the parent menu when it fits (or
 * when below has more room), otherwise above.
 */
export function phoneSubmenuPosition(
  parent: Box,
  submenu: { width: number; height: number },
  viewport: { width: number; height: number },
  rtl: boolean,
) {
  const width = Math.min(submenu.width, viewport.width - 2 * PHONE_INSET);
  const height = submenu.height;
  const below = Math.max(
    0,
    viewport.height - parent.bottom - PHONE_GAP - PHONE_INSET,
  );
  const above = Math.max(0, parent.top - PHONE_GAP - PHONE_INSET);
  const useBelow = height <= below || (height > above && below >= above);
  const availableHeight = useBelow ? below : above;
  const left = rtl ? parent.right - width : parent.left;
  return {
    left: Math.max(
      PHONE_INSET,
      Math.min(left, viewport.width - PHONE_INSET - width),
    ),
    top: useBelow
      ? parent.bottom + PHONE_GAP
      : parent.top - PHONE_GAP - Math.min(height, availableHeight),
    maxHeight: availableHeight,
    maxWidth: viewport.width - 2 * PHONE_INSET,
    placement: useBelow ? ('bottom-start' as const) : ('top-start' as const),
  };
}
