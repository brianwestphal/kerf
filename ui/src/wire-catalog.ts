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

function geometrySpecimens(canvas: HTMLElement): Element[] {
  const result: Element[] = [];
  for (const example of canvas.querySelectorAll<HTMLElement>(
    '[data-catalog-example]',
  )) {
    if (example.closest('[data-catalog-geometry-overlay-skip]')) continue;
    for (const child of example.children) {
      if (
        child.matches('[data-catalog-geometry-overlay]') ||
        child.matches('[data-catalog-example-label]') ||
        child.matches('[data-catalog-example-note]')
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

function effectiveBorderWidth(width: string, style: string): number {
  return style === 'none' || style === 'hidden' ? 0 : pixels(width);
}

/**
 * Keep a Catalog's opt-in geometry overlay synchronized with its preview.
 * Specimens receive computed border highlights (or a dashed bound when they
 * have no border and are transparent), while positive computed margins use
 * devtools-style orange bands. CSS/stylesheet-only changes are observed too.
 * Returns a disposer.
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
    if (catalog.dataset.geometryOverlay !== 'true') {
      syncObservedSpecimens([]);
      return;
    }
    const base = canvas.getBoundingClientRect();
    const specimens = geometrySpecimens(canvas);
    syncObservedSpecimens(specimens);
    for (const [specimenIndex, element] of specimens.entries()) {
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
      const borderWidths = [
        effectiveBorderWidth(style.borderTopWidth, style.borderTopStyle),
        effectiveBorderWidth(style.borderRightWidth, style.borderRightStyle),
        effectiveBorderWidth(style.borderBottomWidth, style.borderBottomStyle),
        effectiveBorderWidth(style.borderLeftWidth, style.borderLeftStyle),
      ];
      if (borderWidths.some((width) => width > 0)) {
        const border = geometryBox(
          root.ownerDocument,
          'kui-catalog__geometry-border',
          x,
          y,
          rect.width,
          rect.height,
        );
        border.dataset.catalogGeometrySpecimen = String(specimenIndex);
        border.style.borderTopWidth = `${borderWidths[0]}px`;
        border.style.borderRightWidth = `${borderWidths[1]}px`;
        border.style.borderBottomWidth = `${borderWidths[2]}px`;
        border.style.borderLeftWidth = `${borderWidths[3]}px`;
        border.style.borderRadius = style.borderRadius;
        layer.append(border);
      } else if (isTransparent(style.backgroundColor)) {
        const bound = geometryBox(
          root.ownerDocument,
          'kui-catalog__geometry-bound',
          x,
          y,
          rect.width,
          rect.height,
        );
        bound.dataset.catalogGeometrySpecimen = String(specimenIndex);
        layer.append(bound);
      }
      const margins: Array<
        readonly [string, number, number, number, number, number]
      > = [
        ['top', top, x - left, y - top, rect.width + left + right, top],
        [
          'bottom',
          bottom,
          x - left,
          y + rect.height,
          rect.width + left + right,
          bottom,
        ],
        ['left', left, x - left, y, left, rect.height],
        ['right', right, x + rect.width, y, right, rect.height],
      ];
      for (const [side, size, marginX, marginY, width, height] of margins) {
        if (size <= 0) continue;
        const margin = geometryBox(
          root.ownerDocument,
          'kui-catalog__geometry-margin',
          marginX,
          marginY,
          width,
          height,
        );
        margin.dataset.catalogGeometrySpecimen = String(specimenIndex);
        margin.dataset.catalogGeometrySide = side;
        layer.append(margin);
      }
    }
  };
  const schedule = (): void => {
    if (!frame) frame = view.requestAnimationFrame(render);
  };
  const resizeObserver = new view.ResizeObserver(schedule);
  resizeObserver.observe(canvas);
  const observedSpecimens = new Set<Element>();
  const syncObservedSpecimens = (specimens: Element[]): void => {
    const next = new Set(specimens);
    for (const specimen of observedSpecimens) {
      if (next.has(specimen)) continue;
      resizeObserver.unobserve(specimen);
      observedSpecimens.delete(specimen);
    }
    for (const specimen of next) {
      if (observedSpecimens.has(specimen)) continue;
      resizeObserver.observe(specimen);
      observedSpecimens.add(specimen);
    }
  };
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
  mutationObserver.observe(root.ownerDocument.documentElement, {
    attributes: true,
  });
  const documentHead = root.ownerDocument.head;
  if (documentHead)
    mutationObserver.observe(documentHead, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
  const stylesheetLoaded = (): void => schedule();
  documentHead?.addEventListener('load', stylesheetLoaded, true);
  view.addEventListener('resize', schedule);
  render();
  return () => {
    if (frame) view.cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    documentHead?.removeEventListener('load', stylesheetLoaded, true);
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
