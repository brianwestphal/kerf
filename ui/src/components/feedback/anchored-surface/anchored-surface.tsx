import type { OverlayContent, OverlayHandle } from 'kerfjs/overlay';
import { popover, type PopoverOptions } from 'kerfjs/overlay';

/** App-facing options for a non-modal, arbitrary-content help surface. */
export interface AnchoredSurfaceOptions extends Pick<
  PopoverOptions,
  | 'placement'
  | 'align'
  | 'gap'
  | 'dismiss'
  | 'initialFocus'
  | 'onDismiss'
  | 'outsideIgnore'
> {
  /** Accessible name for the non-modal dialog. */
  label: string;
}

/** A viewport pointer location; `context` is the element under the pointer. */
export interface AnchoredSurfacePoint {
  x: number;
  y: number;
  /** Pass the event target when opening from inside a modal dialog. */
  context?: Element;
}

/**
 * Open app-owned content beside an element. The surface owns its Kerf UI chrome;
 * kerfjs/overlay owns positioning, top-layer/modal hosting, focus, and dismissal.
 * The caller owns content, action policy, and calling `close()` when an action
 * completes. `initialFocus` defaults to the first focusable descendant; set it
 * to `false` for read-only help that should leave focus on its trigger.
 */
export function openAnchoredSurface(
  anchor: Element,
  content: OverlayContent,
  options: AnchoredSurfaceOptions,
): OverlayHandle {
  const {
    label,
    initialFocus = true,
    dismiss = ['escape', 'outside'],
    ...rest
  } = options;
  if (!label.trim())
    throw new TypeError('openAnchoredSurface() requires a nonempty label');
  // Safari does not focus buttons on pointer press. Make a focusable trigger
  // the overlay's restore target consistently, including that engine.
  if (anchor instanceof HTMLElement && anchor.tabIndex >= 0) anchor.focus();
  const handle = popover(anchor, content, {
    ...rest,
    className: 'kui-anchored-surface',
    native: true,
    initialFocus,
    dismiss,
  });
  handle.el.setAttribute('role', 'dialog');
  handle.el.setAttribute('aria-label', label);
  handle.el.dataset.component = 'anchored-surface';
  const dialog = anchor.closest('dialog');
  if (dialog?.open) {
    const onClose = () => handle.close();
    dialog.addEventListener('close', onClose);
    void handle.result.then(() => dialog.removeEventListener('close', onClose));
  }
  return handle;
}

/**
 * Open the same surface at pointer coordinates. The temporary anchor has no
 * layout or hit target. `context` keeps a surface opened inside a modal dialog
 * in that dialog's interactive host slot; it is removed on close or failure.
 */
export function openAnchoredSurfaceAt(
  point: AnchoredSurfacePoint,
  content: OverlayContent,
  options: AnchoredSurfaceOptions,
): OverlayHandle {
  const { x, y, context } = point;
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new TypeError('openAnchoredSurfaceAt() requires finite coordinates');
  const anchor = document.createElement('span');
  anchor.setAttribute('aria-hidden', 'true');
  anchor.style.cssText =
    'position:fixed;width:0;height:0;pointer-events:none;visibility:hidden';
  // The positioning core reads the anchor's viewport rect. A virtual rect
  // avoids coordinate conversion when `context` sits in a transformed dialog.
  anchor.getBoundingClientRect = () => new DOMRect(x, y, 0, 0);
  // Only modal membership matters for host selection. Keep the temporary node
  // out of the event target itself (which may be an input or a custom element).
  (context?.closest('dialog') ?? document.body).append(anchor);
  try {
    const handle = openAnchoredSurface(anchor, content, options);
    void handle.result.then(() => anchor.remove());
    return handle;
  } catch (error) {
    anchor.remove();
    throw error;
  }
}
