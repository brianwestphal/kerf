import type { KerfUiContent } from '../semantic-content.js';

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

export interface CatalogProps {
  brand: CatalogBrand;
  sections: readonly CatalogSection[];
  active: string;
  content: KerfUiContent;
  collapsed?: boolean;
  theme?: 'light' | 'dark';
  headerActions?: KerfUiContent;
  secondarySections?: CatalogSecondaryGroup;
  sidebarFooter?: KerfUiContent;
  status?: KerfUiContent;
  geometryOverlay?: boolean;
  selectAction?: string;
  toggleSidebarAction?: string;
  toggleThemeAction?: string;
  toggleSecondaryAction?: string;
  className?: string;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}
