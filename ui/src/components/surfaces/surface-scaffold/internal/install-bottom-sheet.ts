interface SheetDialog extends HTMLElement {
  dialog?: HTMLDialogElement;
  open?: boolean;
  update(changed: unknown): void;
  show(): Promise<void>;
  requestClose(source: Element): Promise<void>;
}

/** The shadow part of a resizable bottom sheet's grabber. */
export const SHEET_HANDLE_PART = 'sheet-handle';

/** The panel variable holding a resized sheet's visible height. */
export const SHEET_HEIGHT_PROPERTY = '--_kui-dialog-surface-sheet-height';

/** The panel variable holding the virtual keyboard's overlap. */
export const KEYBOARD_INSET_PROPERTY = '--_kui-dialog-surface-keyboard-inset';

/**
 * The host attribute marking the show (`enter`) or hide (`exit`) animation
 * while it runs, so the CSS can swap only those keyframes (never the pulse).
 */
export const SHEET_MOTION_ATTRIBUTE = 'data-kui-sheet-motion';

/** Arrow-key step, and the Page Up/Down step, in px. */
const STEP = 16;
const PAGE_STEP = 64;

const installed = new WeakSet<object>();
const viewportCleanups = new WeakMap<SheetDialog, () => void>();

const surfaceOf = (host: SheetDialog): HTMLElement | null =>
  host.parentElement?.classList.contains('kui-dialog-surface')
    ? host.parentElement
    : null;

const isBottomSheet = (host: SheetDialog): boolean =>
  surfaceOf(host)?.getAttribute('data-presentation') === 'bottom-sheet';

const isResizable = (host: SheetDialog): boolean =>
  isBottomSheet(host) && surfaceOf(host)!.hasAttribute('data-resizable');

/**
 * Wire DialogSurface's `presentation="bottom-sheet"`: inject the resize
 * grabber into the shadow panel (a `role="separator"` the CSS shows only for
 * a resizable sheet), follow the virtual keyboard through `visualViewport`
 * while the dialog is open, and mark the show and hide animations so the
 * sheet can slide instead of scaling. Every state lives on the shadow panel
 * or the host, where Kerf rerenders never reach.
 */
export function installBottomSheet(prototype: object): void {
  if (installed.has(prototype)) return;
  installed.add(prototype);
  const target = prototype as SheetDialog;
  const { update, show, requestClose } = target;
  target.update = function (this: SheetDialog, changed: unknown): void {
    update.call(this, changed);
    if (!surfaceOf(this)) return;
    const panel = this.dialog;
    if (!panel) return;
    syncHandle(this, panel);
    if (this.open) followViewport(this, panel);
    else unfollowViewport(this);
  };
  target.show = function (this: SheetDialog): Promise<void> {
    // Each opening starts at the configured (or content) height.
    const panel = this.dialog;
    if (panel && surfaceOf(this)) {
      panel.style.removeProperty(SHEET_HEIGHT_PROPERTY);
      syncHandle(this, panel);
    }
    const result = show.call(this);
    markMotion(this, 'show', 'enter', result);
    // The host only displays once Lit reflects `open`: report the values
    // when the opening settles.
    void result.then(() => {
      const handle = panel?.querySelector(
        `:scope > [part~="${SHEET_HANDLE_PART}"]`,
      );
      if (panel && handle && isResizable(this)) syncValues(handle, panel);
    });
    return result;
  };
  target.requestClose = function (
    this: SheetDialog,
    source: Element,
  ): Promise<void> {
    const result = requestClose.call(this, source);
    markMotion(this, 'hide', 'exit', result);
    return result;
  };
}

/**
 * Web Awesome adds its animation class synchronously before its first await,
 * so the class tells a real show or hide from a prevented (pulsing) close.
 */
function markMotion(
  host: SheetDialog,
  className: string,
  value: string,
  result: Promise<void>,
): void {
  if (!surfaceOf(host) || !host.dialog?.classList.contains(className)) return;
  host.setAttribute(SHEET_MOTION_ATTRIBUTE, value);
  const clear = (): void => {
    if (host.getAttribute(SHEET_MOTION_ATTRIBUTE) === value)
      host.removeAttribute(SHEET_MOTION_ATTRIBUTE);
  };
  void result.then(clear, clear);
}

/** Show the grabber on a resizable bottom sheet only, creating it on first need. */
function syncHandle(host: SheetDialog, panel: HTMLElement): void {
  const existing = panel.querySelector<HTMLElement>(
    `:scope > [part~="${SHEET_HANDLE_PART}"]`,
  );
  const resizable = isResizable(host);
  if (existing) existing.hidden = !resizable;
  else if (resizable) createHandle(host, panel);
}

function createHandle(host: SheetDialog, panel: HTMLElement): void {
  const handle = document.createElement('div');
  handle.setAttribute('part', SHEET_HANDLE_PART);
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'horizontal');
  handle.setAttribute('aria-label', 'Resize sheet');
  handle.tabIndex = 0;
  // Before Lit's first marker, outside every part Lit owns.
  panel.prepend(handle);
  handle.addEventListener('focus', () => syncValues(handle, panel));
  handle.addEventListener('keydown', (event) => {
    if (!isResizable(host)) return;
    const { min, max } = bounds(panel);
    const current = panel.getBoundingClientRect().height;
    const next = {
      ArrowUp: current + STEP,
      ArrowDown: current - STEP,
      PageUp: current + PAGE_STEP,
      PageDown: current - PAGE_STEP,
      Home: min,
      End: max,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    resizeTo(handle, panel, next);
  });
  handle.addEventListener('pointerdown', (event) => {
    if (!isResizable(host) || event.button !== 0) return;
    event.preventDefault();
    const startY = event.clientY;
    const start = panel.getBoundingClientRect().height;
    handle.setPointerCapture?.(event.pointerId);
    const move = (moveEvent: PointerEvent): void =>
      resizeTo(handle, panel, start - (moveEvent.clientY - startY));
    const end = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
}

/** The panel's resolved border-box bounds and block-end clearance, in px. */
function bounds(panel: HTMLElement): {
  min: number;
  max: number;
  clearance: number;
} {
  const style = globalThis.getComputedStyle(panel);
  const clearance = parseFloat(style.paddingBlockEnd) || 0;
  const min = parseFloat(style.minHeight) || 0;
  const max = parseFloat(style.maxHeight);
  return {
    min,
    max: Number.isFinite(max) ? max : globalThis.innerHeight,
    clearance,
  };
}

/** Resize to a border-box height, published as the visible height above the clearance. */
function resizeTo(handle: Element, panel: HTMLElement, height: number): void {
  const { min, max, clearance } = bounds(panel);
  const clamped = Math.min(max, Math.max(min, Math.round(height)));
  panel.style.setProperty(
    SHEET_HEIGHT_PROPERTY,
    `${Math.max(0, clamped - clearance)}px`,
  );
  syncValues(handle, panel, clamped);
}

/** Separator values in visible (content) px, as a ResizableRegion reports them. */
function syncValues(
  handle: Element,
  panel: HTMLElement,
  height = panel.getBoundingClientRect().height,
): void {
  const { min, max, clearance } = bounds(panel);
  const visible = (value: number) =>
    String(Math.max(0, Math.round(value - clearance)));
  handle.setAttribute('aria-valuemin', visible(min));
  handle.setAttribute('aria-valuemax', visible(max));
  handle.setAttribute('aria-valuenow', visible(height));
}

/**
 * The layout viewport's bottom band a virtual keyboard covers: what the
 * visual viewport no longer shows below itself. Zero while pinch-zoomed (the
 * visual viewport then shrinks for another reason) and wherever the keyboard
 * resizes the layout viewport instead (`interactive-widget=resizes-content`).
 */
export function keyboardInset(
  viewport: Pick<VisualViewport, 'height' | 'offsetTop' | 'scale'>,
  layoutHeight: number,
): number {
  if (viewport.scale > 1.01) return 0;
  const inset = Math.round(layoutHeight - viewport.height - viewport.offsetTop);
  return inset > 0 ? inset : 0;
}

function followViewport(host: SheetDialog, panel: HTMLElement): void {
  const viewport = globalThis.visualViewport;
  if (!viewport || viewportCleanups.has(host)) return;
  const publish = (): void => {
    const inset =
      host.isConnected && host.open && isBottomSheet(host)
        ? keyboardInset(viewport, globalThis.innerHeight)
        : 0;
    if (inset > 0)
      panel.style.setProperty(KEYBOARD_INSET_PROPERTY, `${inset}px`);
    else panel.style.removeProperty(KEYBOARD_INSET_PROPERTY);
    if (!host.isConnected) unfollowViewport(host);
  };
  viewport.addEventListener('resize', publish);
  viewport.addEventListener('scroll', publish);
  viewportCleanups.set(host, () => {
    viewport.removeEventListener('resize', publish);
    viewport.removeEventListener('scroll', publish);
    panel.style.removeProperty(KEYBOARD_INSET_PROPERTY);
  });
  publish();
}

function unfollowViewport(host: SheetDialog): void {
  viewportCleanups.get(host)?.();
  viewportCleanups.delete(host);
}
