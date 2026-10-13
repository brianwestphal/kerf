import { delegate } from 'kerfjs';

/** On an overlay-bar TabNavigator: the wiring has measured its live bar. */
const BAR_OVERLAY = 'data-bar-overlay';
/** The measured bar's border-box block size, published on the root. */
const BAR_BLOCK_SIZE = '--_kui-tab-scaffold-bar-block-size';
/**
 * The inline size of the active scene's classic (space-taking) vertical
 * scrollbar running beneath the bar, which the bar leaves uncovered. Unset for
 * an overlay scrollbar, which takes no space.
 */
const BAR_SCROLLBAR_INLINE_SIZE =
  '--_kui-tab-scaffold-bar-scrollbar-inline-size';
/** A layout that, as a scene's (or view's) only child, owns its scroller. */
const NESTED_LAYOUT = ['nav-stack', 'split-view', 'workbench', 'tab-scaffold']
  .map((name) => `[data-component="${name}"]`)
  .join(', ');

/**
 * A sole Pane's scroller when it reaches the bottom edge: its content, unless
 * a footer sits between the content and the bar.
 */
function paneScroller(pane: Element): HTMLElement | undefined {
  if (pane.querySelector(':scope > .kui-pane__footer')) return undefined;
  return (
    pane.querySelector<HTMLElement>(':scope > .kui-pane__content') ?? undefined
  );
}

/**
 * The element whose vertical scrollbar runs beneath the bar in the active
 * scene: the scene itself; a sole Pane's content; or, in a sole NavStack
 * without a docked bottom toolbar, its active view (or that view's sole Pane's
 * content). Undefined when chrome (a Pane footer, a docked stack toolbar) or a
 * nested layout's own scroller ends above the bar.
 */
function activeScroller(section: Element): HTMLElement | undefined {
  const scene = section.querySelector<HTMLElement>(
    ':scope > .kui-tab-scaffold__scenes > .kui-tab-scaffold__scene[data-active="true"]',
  );
  if (!scene) return undefined;
  const only = scene.children.length === 1 ? scene.children[0]! : undefined;
  if (!only?.matches(`[data-component="pane"], ${NESTED_LAYOUT}`)) return scene;
  if (only.matches('[data-component="pane"]')) return paneScroller(only);
  if (!only.matches('[data-component="nav-stack"]')) return undefined;
  if (
    only.querySelector(':scope > [data-nav-stack-bottom]') &&
    only.getAttribute('data-bottom-toolbar-presentation') !== 'overlay'
  )
    return undefined;
  const views = [
    ...only.querySelectorAll<HTMLElement>(
      ':scope > [data-nav-stack-viewport] > [data-nav-active="true"]:not([data-nav-exiting="true"])',
    ),
  ];
  const view = views.at(-1);
  if (!view) return undefined;
  const child = view.children.length === 1 ? view.children[0]! : undefined;
  if (child?.matches('[data-component="pane"]')) return paneScroller(child);
  return child?.matches(NESTED_LAYOUT) ? undefined : view;
}

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
  let scroller: HTMLElement | undefined;
  let scrollbarSize = 0;
  const writeProperty = (name: string, value: string): void => {
    if (section.style.getPropertyValue(name) === value) return;
    if (value) section.style.setProperty(name, value);
    else section.style.removeProperty(name);
  };
  const publish = (): void => {
    const measured = bar !== undefined && size !== undefined;
    writeProperty(BAR_BLOCK_SIZE, measured ? `${size}px` : '');
    writeProperty(
      BAR_SCROLLBAR_INLINE_SIZE,
      measured && scrollbarSize > 0 ? `${scrollbarSize}px` : '',
    );
    if (section.getAttribute('style') === '') section.removeAttribute('style');
    // The gate changes only when it must, so the observer below settles.
    if (measured && section.getAttribute(BAR_OVERLAY) !== 'measured')
      section.setAttribute(BAR_OVERLAY, 'measured');
    else if (!measured && section.hasAttribute(BAR_OVERLAY))
      section.removeAttribute(BAR_OVERLAY);
  };
  const measureScrollbar = (): void => {
    if (!scroller) {
      scrollbarSize = 0;
      return;
    }
    const style = view.getComputedStyle(scroller);
    scrollbarSize = Math.max(
      0,
      scroller.offsetWidth -
        scroller.clientWidth -
        (Number.parseFloat(style.borderLeftWidth) || 0) -
        (Number.parseFloat(style.borderRightWidth) || 0),
    );
  };
  const resizeObserver = view.ResizeObserver
    ? new view.ResizeObserver((entries) => {
        for (const entry of entries)
          if (entry.target === bar)
            size =
              entry.borderBoxSize?.[0]?.blockSize ??
              entry.target.getBoundingClientRect().height;
          // A scrollbar appearing or leaving resizes the content box.
          else if (entry.target === scroller) measureScrollbar();
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
    // The active scroller changes with the active tab, a stack's push or pop,
    // or a re-render of the scene.
    const covered = bar ? activeScroller(section) : undefined;
    if (covered !== scroller) {
      if (scroller) resizeObserver?.unobserve(scroller);
      scroller = covered;
      measureScrollbar();
      if (scroller) resizeObserver?.observe(scroller);
    }
    publish();
  };
  const mutationObserver = new MutationObserver(sync);
  mutationObserver.observe(section, {
    childList: true,
    attributes: true,
    attributeFilter: ['data-bar-presentation', BAR_OVERLAY, 'style'],
  });
  // Scene switches and nested stack transitions below the root.
  const sceneObserver = new MutationObserver(sync);
  const scenes = section.querySelector(':scope > .kui-tab-scaffold__scenes');
  if (scenes)
    sceneObserver.observe(scenes, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-active',
        'data-nav-active',
        'data-nav-exiting',
        'data-bottom-toolbar-presentation',
      ],
    });
  sync();
  return () => {
    mutationObserver.disconnect();
    sceneObserver.disconnect();
    resizeObserver?.disconnect();
    bar = undefined;
    size = undefined;
    scroller = undefined;
    scrollbarSize = 0;
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
