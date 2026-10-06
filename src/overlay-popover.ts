/** Anchored popover lifecycle built on the shared overlay transaction. */
import { attach } from './attach.js';
import {
  type DismissTrigger,
  overlay,
  type OverlayContent,
  type OverlayHandle,
  overlayHost,
} from './overlay-core.js';
import { autoReposition, type PopoverPlacement } from './overlay-position.js';

/** Options for {@link popover}. */
export interface PopoverOptions {
  /**
   * Where to append the popover wrapper. Default: when `anchor` sits inside an
   * open modal `<dialog>`, that dialog's `[data-kerf-overlay-host]` element (a
   * dialog kerf opened gets one automatically), so the popover is part of the
   * modal subtree and stays interactive; otherwise `document.body`.
   */
  container?: Element;
  /** Class on the wrapper. Default `'kerf-popover'`. */
  className?: string;
  /** Preferred side of the anchor. Flips to the other side if it would overflow the viewport. Default `'bottom'`. */
  placement?: PopoverPlacement;
  /** Horizontal edge to line up with the anchor: `'start'` (left edges) or `'end'` (right edges). Default `'start'`. */
  align?: 'start' | 'end';
  /** Gap in px between the anchor and the popover. Default `4`. */
  gap?: number;
  /**
   * Which user actions dismiss the popover. Default `['outside']` (a click
   * outside the popover, the anchor exempt). Pass `false` to close only via `close()`.
   */
  dismiss?: DismissTrigger | DismissTrigger[] | false;
  /** Focus behavior on open. Default `false` (non-modal — leave focus alone). */
  initialFocus?: string | boolean;
  /** Extra elements (besides the anchor) whose clicks do NOT count as outside. */
  outsideIgnore?: Element | readonly Element[];
  /** Called on any user-initiated dismissal. */
  onDismiss?: () => void;
  /**
   * Host the popover in the browser top layer (the Popover API — `[popover]` +
   * `showPopover()`) where supported, so it stacks above any `z-index` without a
   * z-index war. Falls back to today's plain `<div>` where unsupported. kerf keeps
   * owning positioning + its own dismiss wiring; the popover is `popover="manual"`.
   * See {@link OverlayOptions.native}. Default `false`.
   */
  native?: boolean;
}

/**
 * Anchored, non-modal overlay: positions `content` relative to `anchor` (below by
 * default, flipping above if it would overflow, and clamped horizontally to the
 * viewport) and repositions on scroll / resize while open. A thin wrapper over
 * {@link overlay} with non-modal defaults — `trap: false`, `dismiss: ['outside']`,
 * and the anchor added to `outsideIgnore` so the trigger click doesn't self-close.
 * Returns the same {@link OverlayHandle}; `close()` also drops the reposition
 * listeners. `position: fixed` is set inline (you style everything else).
 */
export function popover(
  anchor: Element,
  content: OverlayContent,
  options: PopoverOptions = {},
): OverlayHandle {
  const {
    container,
    className = 'kerf-popover',
    placement = 'bottom',
    align = 'start',
    gap = 4,
    dismiss = ['outside'],
    initialFocus = false,
    outsideIgnore,
    onDismiss,
    native = false,
  } = options;

  const extraIgnore =
    outsideIgnore === undefined
      ? []
      : Array.isArray(outsideIgnore)
        ? [...outsideIgnore]
        : [outsideIgnore];

  const handle = overlay(content, {
    container: container ?? overlayHost(anchor),
    className,
    dismiss,
    trap: false,
    initialFocus,
    onDismiss,
    outsideIgnore: [anchor, ...extraIgnore],
    native,
  });

  // Position + keep it glued while open; drop the listeners on close. A throw
  // while positioning (e.g. an anchor whose geometry read fails) is still part
  // of construction: close the just-opened overlay before rethrowing.
  let stopReposition: () => void;
  try {
    stopReposition = autoReposition(handle.el, anchor, {
      placement,
      align,
      gap,
    });
  } catch (error) {
    handle.close();
    throw error;
  }
  void handle.result.then(stopReposition);

  // KF-BAVCEV: never outlive the anchor. When it leaves the document (e.g. the
  // modal holding it closes) close the popover as cleanup — not a user
  // dismissal, so no `onDismiss`. A move within the document keeps it open.
  void handle.result.then(attach(anchor, () => handle.close));

  return handle;
}
