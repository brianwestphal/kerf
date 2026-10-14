/**
 * The bottom-sheet resize grabber shared by `DialogSurface` and the core
 * `kerfjs/overlay` sheets `wireOverlaySheets` wires: a `role="separator"`
 * that resizes a sheet's visible height by drag or keyboard, between the
 * sheet's computed `min-height` and `max-height`, and reports that height in
 * its ARIA values. The sheet's height rule reads the published property and
 * adds back its block-end clearance.
 */

/** Arrow-key step, and the Page Up/Down step, in px. */
const STEP = 16;
const PAGE_STEP = 64;

/** Where a grabber reads its bounds and publishes the resized height. */
export interface SheetHandleTarget {
  /** The sheet whose border box is measured and bounded, read at each event. */
  panel: HTMLElement;
  /** The element the visible height is published on (the panel or an ancestor). */
  host: HTMLElement;
  /** The custom property holding the visible height. */
  property: string;
  /** False while the sheet is not resizable: input is ignored. */
  enabled: () => boolean;
}

/** Create an unattached grabber element with its separator semantics. */
export function createSheetHandle(
  attributes: Record<string, string>,
): HTMLElement {
  const handle = document.createElement('div');
  for (const [name, value] of Object.entries(attributes))
    handle.setAttribute(name, value);
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'horizontal');
  handle.setAttribute('aria-label', 'Resize sheet');
  handle.tabIndex = 0;
  return handle;
}

/** Wire a grabber's focus, keyboard, and pointer resizing. Returns a disposer. */
export function wireSheetHandle(
  handle: HTMLElement,
  target: SheetHandleTarget,
): () => void {
  const onFocus = (): void => syncSheetHandleValues(handle, target.panel);
  const onKeydown = (event: KeyboardEvent): void => {
    if (!target.enabled()) return;
    const { min, max } = bounds(target.panel);
    const current = target.panel.getBoundingClientRect().height;
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
    resizeTo(handle, target, next);
  };
  const onPointerdown = (event: PointerEvent): void => {
    if (!target.enabled() || event.button !== 0) return;
    event.preventDefault();
    const startY = event.clientY;
    const start = target.panel.getBoundingClientRect().height;
    handle.setPointerCapture?.(event.pointerId);
    const move = (moveEvent: PointerEvent): void =>
      resizeTo(handle, target, start - (moveEvent.clientY - startY));
    const end = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };
  handle.addEventListener('focus', onFocus);
  handle.addEventListener('keydown', onKeydown);
  handle.addEventListener('pointerdown', onPointerdown);
  return () => {
    handle.removeEventListener('focus', onFocus);
    handle.removeEventListener('keydown', onKeydown);
    handle.removeEventListener('pointerdown', onPointerdown);
  };
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
function resizeTo(
  handle: Element,
  target: SheetHandleTarget,
  height: number,
): void {
  const { panel, host, property } = target;
  const { min, max, clearance } = bounds(panel);
  const clamped = Math.min(max, Math.max(min, Math.round(height)));
  host.style.setProperty(property, `${Math.max(0, clamped - clearance)}px`);
  syncSheetHandleValues(handle, panel, clamped);
}

/** Separator values in visible (content) px, as a ResizableRegion reports them. */
export function syncSheetHandleValues(
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
