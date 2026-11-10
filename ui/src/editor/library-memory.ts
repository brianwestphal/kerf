// The component Library's per-browser memory (KF-YF1PDR: split out of
// editor.tsx): its list or grid view, chosen size and pinned placement, kept in
// localStorage.
import type { PinnablePopoverChange } from '../components/surfaces/surface-scaffold/surface-scaffold.js';

/** KF-JC7WTW: the Library shows a list or a grid of thumbnails. */
export const PALETTE_VIEW_ACTION = 'editor-palette-view';
export const LIBRARY_MODE_ACTION = 'editor-library-mode';
export const DOCUMENT_VIEW_ACTION = 'editor-document-view';
export const DOCUMENT_ROW_ACTION = 'editor-document-row';
export const DOCUMENT_TOGGLE_ACTION = 'editor-document-toggle';
export type LibraryMode = 'components' | 'documents';
export type DocumentView = 'columns' | 'tree';
const DOCUMENT_VIEW_KEY = 'kerf-ui-editor:document-view';
const PALETTE_VIEW_KEY = 'kerf-ui-editor:palette-view';
export type PaletteView = 'list' | 'grid';
/** The palette view the person last chose, kept per browser. */
export function rememberedPaletteView(): PaletteView {
  try {
    return globalThis.localStorage?.getItem(PALETTE_VIEW_KEY) === 'grid'
      ? 'grid'
      : 'list';
  } catch {
    return 'list';
  }
}

export function rememberPaletteView(view: PaletteView): void {
  try {
    globalThis.localStorage?.setItem(PALETTE_VIEW_KEY, view);
  } catch {
    // Without storage the choice lasts until the editor reloads.
  }
}

export function rememberedDocumentView(): DocumentView {
  try {
    return globalThis.localStorage?.getItem(DOCUMENT_VIEW_KEY) === 'columns'
      ? 'columns'
      : 'tree';
  } catch {
    return 'tree';
  }
}

export function rememberDocumentView(view: DocumentView): void {
  try {
    globalThis.localStorage?.setItem(DOCUMENT_VIEW_KEY, view);
  } catch {
    // Without storage the choice lasts until the editor reloads.
  }
}

/**
 * KF-Z54E4H: the component Library, an Xcode-style popover the Preview
 * toolbar's Library button (and Shift+Cmd+L) opens, and where it was
 * pinned, kept per browser.
 */
export const LIBRARY_ID = 'editor-library';
const LIBRARY_KEY = 'kerf-ui-editor:library';
type LibraryMemory = Pick<PinnablePopoverChange, 'pinned' | 'placement'>;

/** The Library's saved pin state, size, and placement in this browser. */
export function rememberedLibrary(): LibraryMemory | undefined {
  try {
    const stored = globalThis.localStorage?.getItem(LIBRARY_KEY);
    if (!stored) return undefined;
    const value = JSON.parse(stored) as Partial<LibraryMemory> | null;
    return {
      pinned: value?.pinned === true,
      placement:
        value?.placement &&
        Number.isFinite(value.placement.x) &&
        Number.isFinite(value.placement.y)
          ? value.placement
          : null,
    };
  } catch {
    return undefined;
  }
}

export function rememberLibrary({ pinned, placement }: LibraryMemory): void {
  try {
    globalThis.localStorage?.setItem(
      LIBRARY_KEY,
      JSON.stringify({ pinned, placement }),
    );
  } catch {
    // Without storage the Library opens transient after a reload.
  }
}
