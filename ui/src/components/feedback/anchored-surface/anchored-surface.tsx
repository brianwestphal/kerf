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
  | 'container'
> {
  /** Accessible name for the non-modal dialog. */
  label: string;
  /**
   * Where to append the surface. Default: inside the anchor's open modal
   * dialog — a native `<dialog>`'s host slot, or a slot kerf creates in a
   * `wa-dialog` / `wa-drawer` — so the surface stays interactive there;
   * otherwise `document.body`. Pass an element only for a modal context kerf
   * cannot resolve; an element inside an open modal closes the surface with it.
   */
  container?: Element;
}

/** A viewport pointer location; `context` is the element under the pointer. */
export interface AnchoredSurfacePoint {
  x: number;
  y: number;
  /**
   * Pass the event target when opening from inside a modal dialog, native or
   * Web Awesome (`wa-dialog`, `wa-drawer`).
   */
  context?: Element;
}

// The element a temporary pointer anchor joins so the overlay core resolves
// the same modal context as `context`: the nearest `<dialog>`, or a shadow host
// (`wa-dialog`, `wa-drawer`) whose slot renders `context` inside a `<dialog>`
// in its shadow root. Light-DOM children of that host are slotted inside it.
function modalScope(context: Element | undefined): Element {
  let child: Element | undefined;
  for (let node = context ?? null; node !== null;) {
    if (node.localName === 'dialog') return node;
    if (child?.assignedSlot?.closest('dialog')) return node;
    child = node;
    const root = node.getRootNode();
    node =
      node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
  }
  return document.body;
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
  modalScope(context).append(anchor);
  try {
    const handle = openAnchoredSurface(anchor, content, options);
    void handle.result.then(() => anchor.remove());
    return handle;
  } catch (error) {
    anchor.remove();
    throw error;
  }
}
