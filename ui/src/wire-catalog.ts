import { delegate } from 'kerfjs';

export interface WireCatalogOptions {
  /** Invoked with the entry id when a sidebar item or a related-entry option is chosen. */
  onSelect: (id: string) => void;
  /** Invoked when the sidebar collapse/expand control is activated. */
  onToggleSidebar?: () => void;
  /** Invoked when the theme toggle is activated. */
  onToggleTheme?: () => void;
  /** Invoked when the secondary (ecosystem) group's disclosure toggle is activated. */
  onToggleSecondary?: () => void;
  /** When set, `?<urlParam>=<id>` is written on select via `history.replaceState`. */
  urlParam?: string;
  selectAction?: string;
  toggleSidebarAction?: string;
  toggleThemeAction?: string;
  toggleSecondaryAction?: string;
}

/**
 * Wire a {@link Catalog}'s interactions with one delegated listener set: sidebar
 * item selection (and the related-entry popup menu), the sidebar collapse toggle, and
 * the theme toggle. The app owns the `active`/`collapsed`/`theme` signals and updates
 * them in the callbacks; optionally mirror the active id into the URL via `urlParam`.
 * Returns a disposer.
 */
export function wireCatalog(
  root: HTMLElement,
  {
    onSelect,
    onToggleSidebar,
    onToggleTheme,
    onToggleSecondary,
    urlParam,
    selectAction = 'catalog-select',
    toggleSidebarAction = 'catalog-toggle-sidebar',
    toggleThemeAction = 'catalog-toggle-theme',
    toggleSecondaryAction = 'catalog-toggle-secondary',
  }: WireCatalogOptions,
): () => void {
  const select = (id: string) => {
    onSelect(id);
    const view = root.ownerDocument.defaultView;
    if (urlParam && view) {
      const url = new URL(view.location.href);
      url.searchParams.set(urlParam, id);
      view.history.replaceState(null, '', url);
    }
  };

  const disposers: Array<() => void> = [
    // Sidebar items AND the footer's related-entry popup-menu items both carry
    // `data-action={selectAction}` + `data-item-id`, so one delegated click covers both.
    delegate(root, 'click', `[data-action="${selectAction}"]`, (_event, element) => {
      const id = (element as HTMLElement).dataset.itemId;
      if (id) select(id);
    }),
  ];
  if (onToggleSidebar) {
    disposers.push(delegate(root, 'click', `[data-action="${toggleSidebarAction}"]`, () => onToggleSidebar()));
  }
  if (onToggleTheme) {
    disposers.push(delegate(root, 'click', `[data-action="${toggleThemeAction}"]`, () => onToggleTheme()));
  }
  if (onToggleSecondary) {
    disposers.push(delegate(root, 'click', `[data-action="${toggleSecondaryAction}"]`, () => onToggleSecondary()));
  }
  return () => {
    for (const dispose of disposers.splice(0)) dispose();
  };
}
