import type { ToolbarConfig } from '../components/actions/toolbar/toolbar.js';
import type { WorkbenchPanel } from '../components/layout/workbench/workbench.js';
import type { KerfUiContent } from '../shared/content/semantic-content.js';

/** A reference link shown in the detail footer for the active entry. */
export interface CatalogResource {
  label: string;
  href: string;
  /** Optional machine-readable detail (e.g. a file path) carried by the action link. */
  detail?: string;
}

/** A related entry offered in the detail footer's "Related entries" popup menu. */
export interface CatalogRelated {
  id: string;
  name: string;
  /** Group heading in the menu, e.g. "Uses" / "Used by". */
  group: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  description?: string;
  /** Short metadata tags shown at the trailing edge of the sidebar row. */
  tags?: readonly string[];
  resources?: readonly CatalogResource[];
  related?: readonly CatalogRelated[];
}

export interface CatalogSection {
  category: string;
  entries: readonly CatalogEntry[];
}

/** A quieter, optionally collapsible group of catalog sections. */
export interface CatalogSecondaryGroup {
  label: string;
  sections: readonly CatalogSection[];
  collapsible?: boolean;
  expanded?: boolean;
}

export interface CatalogBrand {
  title: string;
  subtitle?: string;
  /** Logo image URL (rendered decorative). Omit for a text-only brand. */
  logoUrl?: string;
}

/**
 * The UX Review capture link a {@link Catalog} shows when it knows the local
 * project directory (see `uxReviewPlugin` and `wireCatalog`'s
 * `onUxReviewProject`).
 */
export interface CatalogUxReview {
  /** The absolute project directory UX Review files captures under. */
  projectDirectory: string;
  /** The catalog's name in the capture title and context (default `brand.title`). */
  name?: string;
}

export type CatalogStageRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-catalog-stage'?: never;
    'data-background-style'?: never;
  }
>;

/** Background used behind catalog specimens. */
export type CatalogBackgroundStyle =
  'checkerboard' | 'vertical-stripes' | 'layout-guide' | 'surface' | 'sunken';

/**
 * The Catalog sidebar's configuration, forwarded to its Workbench left rail.
 * Everything is optional; omitted fields keep the Catalog's defaults.
 */
export interface CatalogSidebarConfig extends Pick<
  WorkbenchPanel,
  | 'resizable'
  | 'separator'
  | 'collapseMotion'
  | 'presentation'
  | 'responsiveOverlayAt'
  | 'compactOverlay'
> {
  /**
   * Sidebar width in px (default 288). With `resizable`, it is the current
   * width: render the app's size signal here and hand the same signal to
   * `wireCatalog`'s `sidebarSize`, which writes each committed resize to it.
   */
  size?: number;
  /** The sidebar header toolbar's configuration (default: no divider; its pane draws one while scrolled). */
  toolbar?: ToolbarConfig;
}

/**
 * The Catalog settings pane's configuration, forwarded to its Workbench right
 * rail. Everything is optional; omitted fields keep the Catalog's defaults.
 */
export interface CatalogSettingsConfig extends Pick<
  WorkbenchPanel,
  | 'resizable'
  | 'separator'
  | 'collapseMotion'
  | 'presentation'
  | 'responsiveOverlayAt'
  | 'compactOverlay'
> {
  /**
   * Pane width in px (default 288). With `resizable`, it is the current
   * width: render the app's size signal here and hand the same signal to
   * `wireCatalog`'s `settingsSize`, which writes each committed resize to it.
   */
  size?: number;
  /** The pane's title (default `Settings`); it also names the toggle. */
  title?: string;
  /** The pane header toolbar's configuration. */
  toolbar?: ToolbarConfig;
}

export interface CatalogProps {
  /**
   * The catalog's `id` (default `kui-catalog`). Its Workbench derives the
   * sidebar's id from it (`<id>-left-rail`) and the settings pane's
   * (`<id>-right-rail`), which `wireCatalog` wires.
   */
  id?: string;
  brand: CatalogBrand;
  sections: readonly CatalogSection[];
  active: string;
  content: KerfUiContent;
  collapsed?: boolean;
  theme?: 'light' | 'dark';
  /** Show the controlled increased-contrast toggle when supplied. The app applies the preference. */
  increasedContrast?: boolean;
  /** Show the controlled reduced-motion toggle when supplied. The app applies the preference. */
  reducedMotion?: boolean;
  /** Show the preview background chooser; `backgroundStyle` remains app-owned. */
  backgroundControl?: boolean;
  headerActions?: KerfUiContent;
  /**
   * The active entry's settings (variant and state controls for its preview).
   * When supplied, the Catalog renders a settings pane beside the stage — a
   * Workbench right rail titled `settingsPanel.title` — with the standard
   * toggle: in the pane's header while it is open, at the end of the entry
   * toolbar while it is collapsed. Omit it (or pass `null`) for an entry with
   * no settings; neither the pane nor the toggle renders. Below the
   * Workbench's `narrow` breakpoint the pane overlays the stage.
   */
  settings?: KerfUiContent;
  /**
   * Whether the settings pane is collapsed (default `false`). The app owns
   * it; hand the same signal to `wireCatalog`'s `settingsCollapsed`, which
   * flips it from the toggle and makes the pane a transient overlay on a
   * small screen.
   */
  settingsCollapsed?: boolean;
  /**
   * The settings pane's title, size, resizing, and overlay configuration
   * (default: `Settings`, 288px, not resizable, an overlay below the
   * Workbench's `narrow` breakpoint, `inset` in a compact Workbench).
   */
  settingsPanel?: CatalogSettingsConfig;
  /**
   * Show a "Capture region" link to UX Review after `headerActions`, preset
   * with the project and the active entry. Supply it once the project is known
   * (`wireCatalog`'s `onUxReviewProject`); omit it on static hosting.
   */
  uxReview?: CatalogUxReview;
  secondarySections?: CatalogSecondaryGroup;
  sidebarFooter?: KerfUiContent;
  status?: KerfUiContent;
  /** Preview background (default `checkerboard`). */
  backgroundStyle?: CatalogBackgroundStyle;
  /** Consumer-owned data attributes applied to the preview stage. */
  stageRootAttributes?: CatalogStageRootAttributes;
  selectAction?: string;
  toggleSidebarAction?: string;
  toggleThemeAction?: string;
  toggleContrastAction?: string;
  toggleMotionAction?: string;
  selectBackgroundAction?: string;
  toggleSecondaryAction?: string;
  /** The settings pane toggle's `data-action` (default `catalog-toggle-settings`). */
  toggleSettingsAction?: string;
  /**
   * Whether the entry toolbar and description stay pinned above the preview
   * (`fixed`), scroll away with it (`scroll`), or stay pinned while the entry
   * pane is tall enough and scroll with the preview when it is short (`auto`,
   * default), so a short window or large text never squeezes the preview out.
   */
  headerPlacement?: 'fixed' | 'scroll' | 'auto';
  /**
   * The same for the status and resource footer (default `auto`).
   */
  footerPlacement?: 'fixed' | 'scroll' | 'auto';
  /**
   * The sidebar's size, resizing, and overlay configuration, forwarded to the
   * Workbench left rail (default: 288px, not resizable, an overlay below the
   * Workbench's `narrow` breakpoint, `inset` in a compact Workbench).
   */
  sidebar?: CatalogSidebarConfig;
  /**
   * The entry toolbar's configuration (default `responsive: 'wrap'`: the entry
   * title stays whole and the actions wrap below it when narrow).
   */
  mainToolbar?: ToolbarConfig;
  /**
   * The resource footer toolbar's configuration (default no divider,
   * `responsive: 'stack'` at `responsiveAt: 'narrow'`).
   */
  footerToolbar?: ToolbarConfig;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}
