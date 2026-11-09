// The component Library's per-browser memory (KF-YF1PDR: split out of
// editor.tsx): its list or grid view and where it was left pinned, kept in
// localStorage, plus the palette tiles' fallback icons.
import {
  Activity,
  BadgeCheck,
  FaceSlightlySmiling,
  type IconNode,
  LoaderCircle,
} from 'lucide';

import type { PinnablePopoverChange } from '../components/surfaces/surface-scaffold/surface-scaffold.js';

/** KF-JC7WTW: the Library shows a list or a grid of thumbnails. */
export const PALETTE_VIEW_ACTION = 'editor-palette-view';
export const LIBRARY_MODE_ACTION = 'editor-library-mode';
export type LibraryMode = 'components' | 'documents';
const PALETTE_VIEW_KEY = 'kerf-ui-editor:palette-view';
export type PaletteView = 'list' | 'grid';
/**
 * A palette tile's icon where its component draws nothing recognizable
 * when added (an icon with no name, a status mark) and has no sketch
 * (KF-JC7WTW); any other tile whose thumbnail is empty shows the generic
 * one.
 */
export const PALETTE_ICONS: Readonly<Record<string, IconNode>> = {
  '@kerfjs/ui:lucide-icon': FaceSlightlySmiling,
  '@kerfjs/ui:loading-spinner': LoaderCircle,
  '@kerfjs/ui:corner-status': BadgeCheck,
  '@kerfjs/ui:edge-activity-indicator': Activity,
};

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

/**
 * KF-Z54E4H: the component Library, an Xcode-style popover the Preview
 * toolbar's Library button (and Shift+Cmd+L) opens, and where it was
 * pinned, kept per browser.
 */
export const LIBRARY_ID = 'editor-library';
const LIBRARY_KEY = 'kerf-ui-editor:library';
type LibraryMemory = Pick<PinnablePopoverChange, 'pinned' | 'placement'>;

/** Whether the Library was left pinned, and where, in this browser. */
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
