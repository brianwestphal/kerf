import {
  createSheetHandle,
  wireSheetHandle,
} from '../internal/sheet-handle.js';

/**
 * The class that opts a core `kerfjs/overlay` bottom sheet into resizing:
 * pass it with the default wrapper class, as
 * `className: 'kerf-overlay kui-overlay-sheet-resizable'`.
 */
export const OVERLAY_SHEET_RESIZABLE_CLASS = 'kui-overlay-sheet-resizable';

/** The grabber's class, styled by `@kerfjs/ui/overlay-sheet.css`. */
export const OVERLAY_SHEET_HANDLE_CLASS = 'kui-overlay-sheet-handle';

/** The wrapper variable holding a resized sheet's visible height. */
export const OVERLAY_SHEET_HEIGHT_PROPERTY = '--_kui-overlay-sheet-height';

const SHEET_SELECTOR = `.kerf-overlay.${OVERLAY_SHEET_RESIZABLE_CLASS}[data-presentation="bottom-sheet"]`;

/**
 * Give every resizable core `kerfjs/overlay` bottom sheet opened in
 * `container` the resize grabber a `resizable` `DialogSurface` sheet has: a
 * `role="separator"` at the sheet's top edge that resizes its visible height
 * by drag or keyboard (arrows, Page Up/Down, Home, End), between
 * `--kui-overlay-sheet-min-height` (160px) and the sheet's cap below the top
 * safe area. A sheet opts in with the `kui-overlay-sheet-resizable` class
 * (`overlay()` and the promise dialogs alike) and opens at its content
 * height each time.
 *
 * kerf appends each overlay to its `container` (`document.body` by
 * default), so call this once per container you open sheets in. The grabber
 * is `data-morph-preserve` and returns to the top of the sheet after each
 * re-render of the overlay's content. Requires
 * `@kerfjs/ui/overlay-sheet.css`. Returns a disposer that removes every
 * grabber and stops watching.
 */
export function wireOverlaySheets(
  container: ParentNode = document.body,
): () => void {
  const wired = new Map<HTMLElement, () => void>();
  const sync = (): void => {
    for (const child of container.children) {
      if (
        child instanceof HTMLElement &&
        child.matches(SHEET_SELECTOR) &&
        !wired.has(child)
      )
        wired.set(child, wireSheet(child));
    }
    for (const [wrapper, dispose] of wired) {
      if (wrapper.parentNode === container) continue;
      dispose();
      wired.delete(wrapper);
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(container, { childList: true });
  sync();
  return () => {
    observer.disconnect();
    for (const dispose of wired.values()) dispose();
    wired.clear();
  };
}

/**
 * The sheet is the native `<dialog>` itself, or the plain wrapper's content
 * root (the wrapper is the backdrop).
 */
function sheetOf(wrapper: HTMLElement): HTMLElement | null {
  if (wrapper.localName === 'dialog') return wrapper;
  const sheet = wrapper.firstElementChild;
  return sheet instanceof HTMLElement ? sheet : null;
}

function wireSheet(wrapper: HTMLElement): () => void {
  const handle = createSheetHandle({
    class: OVERLAY_SHEET_HANDLE_CLASS,
    'data-morph-preserve': '',
  });
  // A re-render may move the preserved grabber behind the new content, or
  // replace the content root that held it: keep it first in the sheet, so it
  // is the sheet's first tab stop and sticks to its top edge.
  const place = (): void => {
    const sheet = sheetOf(wrapper);
    if (sheet !== null && sheet.firstChild !== handle)
      sheet.insertBefore(handle, sheet.firstChild);
  };
  place();
  const observer = new MutationObserver(place);
  observer.observe(wrapper, { childList: true, subtree: true });
  const unwire = wireSheetHandle(handle, {
    // Input only reaches a connected grabber, which sits in the sheet.
    get panel() {
      return sheetOf(wrapper)!;
    },
    host: wrapper,
    property: OVERLAY_SHEET_HEIGHT_PROPERTY,
    enabled: () => !wrapper.inert,
  });
  return () => {
    observer.disconnect();
    unwire();
    handle.remove();
    wrapper.style.removeProperty(OVERLAY_SHEET_HEIGHT_PROPERTY);
  };
}
