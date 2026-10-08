import { delegate, type Signal } from 'kerfjs';

import { readTokenSearchField } from '../../components/forms/token-search-field/token-search-field.js';
import { wireWorkbench } from '../../components/layout/workbench/wiring/wire-workbench.js';
import { wireScrollDividers } from '../../wiring/wire-scroll-dividers.js';

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
  /**
   * Reveal the chosen sidebar row after selection. `true` uses desktop-safe
   * defaults; pass options to customize scroll alignment or the media guard.
   */
  revealSelection?: boolean | CatalogRevealOptions;
  selectAction?: string;
  toggleSidebarAction?: string;
  toggleThemeAction?: string;
  toggleSecondaryAction?: string;
  /**
   * The sidebar's app-owned collapsed flag. With it, the catalog's Workbench
   * sidebar is wired like any Workbench rail: it becomes a transient overlay
   * on a small screen (collapsed as the breakpoint applies, closed on Escape
   * or a press outside, focus handed back), and choosing an entry from the
   * open overlay closes it.
   */
  collapsed?: Signal<boolean>;
  /**
   * The app-owned sidebar width signal for a Catalog rendered with
   * `sidebar={{ resizable: true, size: sidebarSize.value }}`. Each committed
   * drag or keyboard resize is written to it.
   */
  sidebarSize?: Signal<number>;
  /**
   * With `sidebarSize`, load and save the width under this storage key so the
   * catalog remembers the user's sidebar width.
   */
  sidebarStorageKey?: string;
  /** The Catalog's `id`, when it is not the default `kui-catalog`. */
  id?: string;
}

export interface CatalogRevealOptions {
  /** Scroll alignment within the sidebar. Default `'nearest'`. */
  block?: ScrollLogicalPosition;
  /** Cross-axis alignment. Default `'nearest'`. */
  inline?: ScrollLogicalPosition;
  /** Scroll behavior. Default `'auto'`. */
  behavior?: ScrollBehavior;
  /**
   * Only reveal when this media query matches. Defaults to the Catalog's
   * desktop layout; pass `false` to reveal at every viewport size.
   */
  media?: string | false;
}

// The Workbench keeps the sidebar inline above its `narrow` breakpoint (704px).
const catalogDesktopMedia = '(min-width: 44.01rem)';

/** Keep the sidebar filter local to the shared Catalog, including across controlled rerenders. */
function wireCatalogFilter(root: HTMLElement): () => void {
  const view = root.ownerDocument.defaultView!;
  let filterValue = '';
  let query = '';
  let currentEditor: HTMLElement | null = null;
  const matches = (name: string) => name.toLocaleLowerCase().includes(query);
  const apply = () => {
    const editor = root.querySelector<HTMLElement>('[data-catalog-filter]');
    const nav = root.querySelector<HTMLElement>('[data-catalog-sidebar]');
    if (!editor || !nav) return;
    if (editor !== currentEditor) {
      currentEditor = editor;
      if (readTokenSearchField(editor).query !== filterValue)
        editor.textContent = filterValue;
    }
    const field = editor.closest<HTMLElement>(
      '[data-component="token-search-field"]',
    )!;
    field.dataset.catalogFilterActive = String(Boolean(query));
    const placeholderVisible = String(!filterValue);
    if (field.dataset.placeholderVisible !== placeholderVisible)
      field.dataset.placeholderVisible = placeholderVisible;
    const clear = field.querySelector<HTMLElement>(
      '[data-action="catalog-clear-filter"]',
    )!;
    clear.style.display = query ? '' : 'none';
    nav.dataset.catalogFilterActive = String(Boolean(query));
    let visibleEntries = 0;
    for (const section of nav.querySelectorAll<HTMLElement>(
      '[data-catalog-section]',
    )) {
      const group = section.closest<HTMLElement>(
        '[data-catalog-secondary-group]',
      );
      const headingMatches =
        matches(section.dataset.catalogSection!) ||
        (group !== null && matches(group.dataset.catalogSecondaryGroup!));
      let sectionEntries = 0;
      for (const entry of section.querySelectorAll<HTMLElement>(
        '[data-catalog-entry-name]',
      )) {
        const visible =
          !query || headingMatches || matches(entry.dataset.catalogEntryName!);
        entry.hidden = !visible;
        if (visible) sectionEntries++;
      }
      section.hidden = Boolean(query) && sectionEntries === 0;
      visibleEntries += sectionEntries;
    }
    for (const group of nav.querySelectorAll<HTMLElement>(
      '[data-catalog-secondary-group]',
    )) {
      group.hidden =
        Boolean(query) &&
        !Array.from(
          group.querySelectorAll<HTMLElement>('[data-catalog-section]'),
        ).some((section) => !section.hidden);
      const toggle = group.querySelector<HTMLElement>('[aria-expanded]');
      const content = group.querySelector<HTMLElement>(
        '[data-catalog-secondary-collapsed]',
      );
      if (toggle && content) {
        const expanded = query
          ? !group.hidden
          : content.dataset.catalogSecondaryCollapsed !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        const arrow = toggle.querySelector<HTMLElement>(
          '[data-component="disclosure-arrow"]',
        );
        if (arrow) {
          arrow.dataset.open = String(expanded);
          arrow.dataset.direction = expanded ? 'down' : 'right';
          arrow.style.setProperty(
            '--_kui-disclosure-arrow-rotation',
            expanded ? '90deg' : '0deg',
          );
        }
      }
    }
    const empty = nav.querySelector<HTMLElement>(
      '[data-catalog-filter-empty]',
    )!;
    empty.dataset.visible = String(Boolean(query) && visibleEntries === 0);
  };
  const onInput = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const editor = target?.closest<HTMLElement>('[data-catalog-filter]');
    if (!editor || !root.contains(editor)) return;
    filterValue = readTokenSearchField(editor).query;
    query = filterValue.trim().toLocaleLowerCase();
    apply();
  };
  const onClick = (event: Event) => {
    const target = event.target as Element;
    if (!target.closest('[data-action="catalog-clear-filter"]')) return;
    const editor = root.querySelector<HTMLElement>('[data-catalog-filter]')!;
    filterValue = '';
    query = '';
    editor.textContent = '';
    apply();
    editor.focus();
  };
  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  const observer = new view.MutationObserver(() => {
    if (filterValue) apply();
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['data-placeholder-visible'],
    childList: true,
    subtree: true,
  });
  apply();
  return () => {
    root.removeEventListener('input', onInput);
    root.removeEventListener('click', onClick);
    observer.disconnect();
  };
}

/**
 * Reveal one Catalog sidebar entry after the controlled render settles without
 * moving focus. Returns a cancellation function for rapid selection changes.
 */
export function revealCatalogEntry(
  root: HTMLElement,
  id: string,
  {
    block = 'nearest',
    inline = 'nearest',
    behavior = 'auto',
    media = catalogDesktopMedia,
  }: CatalogRevealOptions = {},
): () => void {
  const view = root.ownerDocument.defaultView;
  if (!view || (media && !view.matchMedia(media).matches)) return () => {};
  const frame = view.requestAnimationFrame(() => {
    for (const item of root.querySelectorAll<HTMLElement>('[data-item-id]')) {
      if (item.dataset.itemId !== id) continue;
      item.scrollIntoView({ block, inline, behavior });
      break;
    }
  });
  return () => view.cancelAnimationFrame(frame);
}

/**
 * Wire a {@link Catalog}'s interactions with one delegated listener set: sidebar
 * item selection (and the related-entry popup menu), the sidebar collapse toggle, and
 * the theme toggle. The app owns the `active`/`collapsed`/`theme` signals and updates
 * them in the callbacks; optionally mirror the active id into the URL via `urlParam`.
 * It also wires the scroll dividers below root (`wireScrollDividers`), so the
 * catalog's panes and every example in it show their chrome dividers only
 * while scrolled. Returns a disposer.
 */
export function wireCatalog(
  root: HTMLElement,
  {
    onSelect,
    onToggleSidebar,
    onToggleTheme,
    onToggleSecondary,
    urlParam,
    revealSelection,
    selectAction = 'catalog-select',
    toggleSidebarAction = 'catalog-toggle-sidebar',
    toggleThemeAction = 'catalog-toggle-theme',
    toggleSecondaryAction = 'catalog-toggle-secondary',
    collapsed,
    sidebarSize,
    sidebarStorageKey,
    id: catalogId = 'kui-catalog',
  }: WireCatalogOptions,
): () => void {
  let cancelReveal: (() => void) | undefined;
  const select = (id: string) => {
    onSelect(id);
    const view = root.ownerDocument.defaultView;
    if (urlParam && view) {
      const url = new URL(view.location.href);
      url.searchParams.set(urlParam, id);
      view.history.replaceState(null, '', url);
    }
    // An open overlay sidebar gives way to the entry just chosen from it.
    const rail = root.ownerDocument.getElementById(`${catalogId}-left-rail`);
    if (
      collapsed &&
      !collapsed.peek() &&
      rail &&
      root.ownerDocument.defaultView?.getComputedStyle(rail).position ===
        'absolute'
    )
      collapsed.value = true;
    if (revealSelection) {
      cancelReveal?.();
      cancelReveal = revealCatalogEntry(
        root,
        id,
        revealSelection === true ? undefined : revealSelection,
      );
    }
  };

  const disposers: Array<() => void> = [
    wireScrollDividers(root),
    wireCatalogFilter(root),
    // Sidebar items AND the footer's related-entry popup-menu items both carry
    // `data-action={selectAction}` + `data-item-id`, so one delegated click covers both.
    delegate(
      root,
      'click',
      `[data-action="${selectAction}"]`,
      (_event, element) => {
        const id = (element as HTMLElement).dataset.itemId;
        if (id) select(id);
      },
    ),
  ];
  if (onToggleSidebar) {
    disposers.push(
      delegate(root, 'click', `[data-action="${toggleSidebarAction}"]`, () =>
        onToggleSidebar(),
      ),
    );
  }
  if (onToggleTheme) {
    disposers.push(
      delegate(root, 'click', `[data-action="${toggleThemeAction}"]`, () =>
        onToggleTheme(),
      ),
    );
  }
  if (onToggleSecondary) {
    disposers.push(
      delegate(root, 'click', `[data-action="${toggleSecondaryAction}"]`, () =>
        onToggleSecondary(),
      ),
    );
  }
  if (collapsed || sidebarSize)
    disposers.push(
      wireWorkbench(root, {
        id: catalogId,
        panels: {
          leftRail: {
            collapsed,
            size: sidebarSize,
            storageKey: sidebarStorageKey,
          },
        },
      }),
    );
  return () => {
    cancelReveal?.();
    for (const dispose of disposers.splice(0)) dispose();
  };
}
