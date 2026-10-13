import { delegate } from 'kerfjs';

/** On an overlay-bar TabNavigator: the wiring has measured its live bar. */
const BAR_OVERLAY = 'data-bar-overlay';
/** The measured bar's border-box block size, published on the root. */
const BAR_BLOCK_SIZE = '--_kui-tab-scaffold-bar-block-size';

/**
 * `barPresentation="overlay"`: measure the live tab bar's border box (bottom
 * safe area and its 1px top edge included) and publish it on the root with
 * the gate that lays the bar over the scenes. The size follows the bar as
 * labels wrap, text zooms, or the safe area changes, and a re-render that
 * replaces the bar or strips the published state gets it back before paint.
 */
function wireBarOverlay(section: HTMLElement): () => void {
  const view = section.ownerDocument.defaultView ?? window;
  let bar: HTMLElement | undefined;
  let size: number | undefined;
  const publish = (): void => {
    const measured = bar !== undefined && size !== undefined;
    const value = measured ? `${size}px` : '';
    if (section.style.getPropertyValue(BAR_BLOCK_SIZE) !== value) {
      if (value) section.style.setProperty(BAR_BLOCK_SIZE, value);
      else section.style.removeProperty(BAR_BLOCK_SIZE);
    }
    if (section.getAttribute('style') === '') section.removeAttribute('style');
    // The gate changes only when it must, so the observer below settles.
    if (measured && section.getAttribute(BAR_OVERLAY) !== 'measured')
      section.setAttribute(BAR_OVERLAY, 'measured');
    else if (!measured && section.hasAttribute(BAR_OVERLAY))
      section.removeAttribute(BAR_OVERLAY);
  };
  const resizeObserver = view.ResizeObserver
    ? new view.ResizeObserver((entries) => {
        for (const entry of entries)
          if (entry.target === bar)
            size =
              entry.borderBoxSize?.[0]?.blockSize ??
              entry.target.getBoundingClientRect().height;
        publish();
      })
    : undefined;
  const sync = (): void => {
    const next =
      section.getAttribute('data-bar-presentation') === 'overlay'
        ? (section.querySelector<HTMLElement>(
            ':scope > .kui-tab-scaffold__bar',
          ) ?? undefined)
        : undefined;
    if (next !== bar) {
      if (bar) resizeObserver?.unobserve(bar);
      bar = next;
      if (!bar) size = undefined;
      else {
        // A replacement keeps the last size until the observer reports it
        // after layout; a first bar (or one with no observer) is measured now.
        if (size === undefined || !resizeObserver)
          size = bar.getBoundingClientRect().height;
        // The border box: a forced-colors edge changes no content box.
        resizeObserver?.observe(bar, { box: 'border-box' });
      }
    }
    publish();
  };
  const mutationObserver = new MutationObserver(sync);
  mutationObserver.observe(section, {
    childList: true,
    attributes: true,
    attributeFilter: ['data-bar-presentation', BAR_OVERLAY, 'style'],
  });
  sync();
  return () => {
    mutationObserver.disconnect();
    resizeObserver?.disconnect();
    bar = undefined;
    size = undefined;
    publish();
  };
}

export interface WireTabNavigatorOptions {
  /** Invoked with the selected tab id when a bottom-bar tab is activated. */
  onSelect: (tabId: string) => void;
}

/**
 * Wire a `TabNavigator`'s bottom tab bar: clicking a tab calls `onSelect` with its
 * id (the app then updates its controlled `active`). With
 * `barPresentation="overlay"` it also measures the live bar and lays it over
 * the scenes (see `TabNavigatorProps.barPresentation`). Returns a disposer.
 */
export function wireTabNavigator(
  root: Element,
  options: WireTabNavigatorOptions,
): () => void {
  const section = root.matches('[data-component="tab-scaffold"]')
    ? root
    : root.querySelector('[data-component="tab-scaffold"]');
  if (!(section instanceof HTMLElement)) return () => {};
  const stopClicks = delegate(
    section,
    'click',
    '[data-tab-scaffold-tab]',
    (_event, target) => {
      const tabId = target.getAttribute('data-tab-scaffold-tab');
      if (tabId) options.onSelect(tabId);
    },
  );
  const stopOverlay = wireBarOverlay(section);
  return () => {
    stopClicks();
    stopOverlay();
  };
}
