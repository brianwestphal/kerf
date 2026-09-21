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
  /**
   * Reveal the chosen sidebar row after selection. `true` uses desktop-safe
   * defaults; pass options to customize scroll alignment or the media guard.
   */
  revealSelection?: boolean | CatalogRevealOptions;
  selectAction?: string;
  toggleSidebarAction?: string;
  toggleThemeAction?: string;
  toggleSecondaryAction?: string;
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

const catalogDesktopMedia = '(min-width: 52.01rem)';

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

function pixels(value: string): number {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.trim().endsWith('rem') ? number * 16 : number;
}

function isTransparent(color: string): boolean {
  const normalized = color.replace(/\s+/g, '');
  return (
    normalized === 'transparent' || /(?:,|\/)0(?:\.0+)?\)$/.test(normalized)
  );
}

function isExampleLabel(element: Element): boolean {
  const parent = element.parentElement;
  if (
    !element.classList.contains('kui-list-header') ||
    !parent?.classList.contains('kui-catalog-example') ||
    element !== parent.firstElementChild
  )
    return false;
  for (
    let sibling = element.nextElementSibling;
    sibling;
    sibling = sibling.nextElementSibling
  )
    if (!sibling.classList.contains('kui-catalog-example__note')) return true;
  return false;
}

function geometrySpecimens(canvas: HTMLElement): Element[] {
  const result: Element[] = [];
  for (const example of canvas.querySelectorAll<HTMLElement>(
    '.kui-catalog-example',
  )) {
    if (example.closest('[data-catalog-geometry-overlay-skip]')) continue;
    for (const child of example.children) {
      if (
        child.matches('[data-catalog-geometry-overlay]') ||
        child.classList.contains('kui-catalog-example__note') ||
        isExampleLabel(child)
      )
        continue;
      result.push(child);
    }
  }
  for (const element of canvas.querySelectorAll<HTMLElement>(
    '[data-component]',
  )) {
    if (
      element.closest('[data-catalog-geometry-overlay]') ||
      element.closest('[data-catalog-geometry-overlay-skip]') ||
      element.closest('.kui-catalog-example')
    )
      continue;
    const parent =
      element.parentElement?.closest<HTMLElement>('[data-component]');
    if (parent && canvas.contains(parent)) continue;
    result.push(element);
  }
  return result;
}

function geometryBox(
  document: Document,
  className: string,
  left: number,
  top: number,
  width: number,
  height: number,
): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  element.style.transform = `translate(${left}px, ${top}px)`;
  element.style.width = `${Math.max(0, width)}px`;
  element.style.height = `${Math.max(0, height)}px`;
  return element;
}

/**
 * Keep a Catalog's opt-in geometry overlay synchronized with its preview.
 * Transparent specimens receive a dashed outer bound and positive margins use
 * devtools-style orange bands. Returns a disposer.
 */
export function wireCatalogGeometryOverlay(root: HTMLElement): () => void {
  const catalog = root.matches('[data-component="catalog"]')
    ? root
    : root.querySelector<HTMLElement>('[data-component="catalog"]');
  const canvas = catalog?.querySelector<HTMLElement>('.kui-catalog__canvas');
  const layer = catalog?.querySelector<HTMLElement>(
    '[data-catalog-geometry-overlay]',
  );
  const view = root.ownerDocument.defaultView;
  if (!catalog || !canvas || !layer || !view) return () => {};

  let frame = 0;
  const render = (): void => {
    frame = 0;
    layer.replaceChildren();
    if (catalog.dataset.geometryOverlay !== 'true') return;
    const base = canvas.getBoundingClientRect();
    for (const element of geometrySpecimens(canvas)) {
      const rect = element.getBoundingClientRect();
      const style = view.getComputedStyle(element);
      const align = pixels(
        style.getPropertyValue('--kui-catalog-example-align'),
      );
      const top = pixels(style.marginTop);
      const right = Math.max(
        0,
        pixels(style.marginRight) - (style.direction === 'rtl' ? align : 0),
      );
      const bottom = pixels(style.marginBottom);
      const left = Math.max(
        0,
        pixels(style.marginLeft) - (style.direction === 'rtl' ? 0 : align),
      );
      const x = rect.left - base.left + canvas.scrollLeft;
      const y = rect.top - base.top + canvas.scrollTop;
      if (isTransparent(style.backgroundColor))
        layer.append(
          geometryBox(
            root.ownerDocument,
            'kui-catalog__geometry-bound',
            x,
            y,
            rect.width,
            rect.height,
          ),
        );
      const margins = [
        [top, x - left, y - top, rect.width + left + right, top],
        [bottom, x - left, y + rect.height, rect.width + left + right, bottom],
        [left, x - left, y, left, rect.height],
        [right, x + rect.width, y, right, rect.height],
      ];
      for (const [size, marginX, marginY, width, height] of margins) {
        if (size <= 0) continue;
        layer.append(
          geometryBox(
            root.ownerDocument,
            'kui-catalog__geometry-margin',
            marginX,
            marginY,
            width,
            height,
          ),
        );
      }
    }
  };
  const schedule = (): void => {
    if (!frame) frame = view.requestAnimationFrame(render);
  };
  const resizeObserver = new view.ResizeObserver(schedule);
  resizeObserver.observe(canvas);
  const mutationObserver = new view.MutationObserver((records) => {
    if (
      records.some(
        ({ target }) => target !== layer && !layer.contains(target as Node),
      )
    )
      schedule();
  });
  mutationObserver.observe(catalog, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  view.addEventListener('resize', schedule);
  render();
  return () => {
    if (frame) view.cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    view.removeEventListener('resize', schedule);
    layer.replaceChildren();
  };
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
    revealSelection,
    selectAction = 'catalog-select',
    toggleSidebarAction = 'catalog-toggle-sidebar',
    toggleThemeAction = 'catalog-toggle-theme',
    toggleSecondaryAction = 'catalog-toggle-secondary',
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
  return () => {
    cancelReveal?.();
    for (const dispose of disposers.splice(0)) dispose();
  };
}
