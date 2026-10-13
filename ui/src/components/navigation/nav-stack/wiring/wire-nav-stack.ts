import { delegate } from 'kerfjs';

export interface WireNavStackOptions {
  /** Invoked when the back control is activated. The app pops its own stack. */
  onBack?: () => void;
  /** Transition duration in ms (default 200). Set 0 to disable animation. */
  duration?: number;
}

const DEFAULT_DURATION = 200;
/** On an overlay-chrome NavStack: the wiring has measured its live chrome. */
const CHROME_OVERLAY = 'data-chrome-overlay';
/** On an overlay-bottom-toolbar NavStack: the wiring has measured it. */
const BOTTOM_TOOLBAR_OVERLAY = 'data-bottom-toolbar-overlay';
/**
 * One overlay-capable chrome edge of a NavStack: the top chrome
 * (`chromePresentation`) or the bottom toolbar (`bottomToolbarPresentation`).
 * Each names the root attribute that opts it in, its live element (never a
 * cross-fading copy), the border-box block size the wiring publishes on the
 * root once it has measured that element (beside its gate), the root
 * property for the classic scrollbar inline size it leaves uncovered, and
 * the sole-Pane slot that, when present, keeps the Pane's scroller clear of
 * it.
 */
interface OverlayEdge {
  readonly presentation: string;
  readonly element: string;
  readonly blockSize: string;
  readonly scrollbarInlineSize: string;
  readonly paneChrome: string;
}

const OVERLAY_EDGES: readonly OverlayEdge[] = [
  {
    presentation: 'data-chrome-presentation',
    element: ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy])',
    blockSize: '--_kui-nav-stack-chrome-block-size',
    scrollbarInlineSize: '--_kui-nav-stack-scrollbar-inline-size',
    // A Pane header lies beneath the chrome and starts its content below it.
    paneChrome: ':scope > :is(.kui-pane__header, .kui-pane__toolbar)',
  },
  {
    presentation: 'data-bottom-toolbar-presentation',
    element: ':scope > [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
    blockSize: '--_kui-nav-stack-bottom-block-size',
    scrollbarInlineSize: '--_kui-nav-stack-bottom-scrollbar-inline-size',
    // A Pane footer lies beneath the toolbar and ends its content above it.
    paneChrome: ':scope > .kui-pane__footer',
  },
];
/** A layout that, as a view's only child, owns its own chrome and scroller. */
const NESTED_LAYOUT = ['nav-stack', 'split-view', 'workbench', 'tab-scaffold']
  .map((name) => `[data-component="${name}"]`)
  .join(', ');
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function viewsOf(viewport: Element): HTMLElement[] {
  return Array.from(
    viewport.querySelectorAll<HTMLElement>(':scope > .kui-nav-stack__view'),
  );
}

function topView(viewport: Element): HTMLElement | undefined {
  const live = viewsOf(viewport).filter(
    (view) => view.dataset.navExiting !== 'true',
  );
  return live[live.length - 1];
}

function reducedMotion(view: Window): boolean {
  return (
    typeof view.matchMedia === 'function' &&
    view.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function chromeOf(section: HTMLElement): HTMLElement[] {
  return Array.from(
    section.querySelectorAll<HTMLElement>(
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]), :scope > [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
    ),
  );
}

function availableFocusTarget(
  element: Element | null | undefined,
): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element.isConnected &&
    !element.matches('[disabled], [aria-disabled="true"]') &&
    !element.closest('[inert], [hidden], [aria-hidden="true"]')
  );
}

/**
 * Animate a `NavStack`'s push/pop transitions and wire its back control. The app
 * owns the stack (a signal of `NavStackView[]`) and re-renders `NavStack` when it
 * changes; this helper slides the content and settles the chrome across each
 * change, moves focus into every new top view, restores that view's last focused
 * descendant on pop, and calls `onBack` when the back control is used. Mark a
 * preferred initial target with `data-nav-focus`; otherwise the first focusable
 * descendant (or the view itself) receives focus. Returns a disposer.
 */
export function wireNavStack(
  root: Element,
  options: WireNavStackOptions = {},
): () => void {
  const section = root.matches('[data-component="nav-stack"]')
    ? root
    : root.querySelector('[data-component="nav-stack"]');
  const viewport = section?.querySelector('[data-nav-stack-viewport]');
  if (!(section instanceof HTMLElement) || !viewport) return () => {};

  const view = section.ownerDocument.defaultView ?? window;
  const duration = options.duration ?? DEFAULT_DURATION;
  const previousDuration = section.style.getPropertyValue(
    '--kui-nav-stack-transition-duration',
  );
  section.style.setProperty(
    '--kui-nav-stack-transition-duration',
    `${Math.max(0, duration)}ms`,
  );
  const disposeBack = delegate(section, 'click', '[data-nav-back]', () =>
    options.onBack?.(),
  );

  let activeKey = topView(viewport)?.dataset.navKey;
  const timers = new Set<number>();
  const frames = new Set<number>();
  const frame = (fn: () => void): void => {
    const id = view.requestAnimationFrame(() => {
      frames.delete(id);
      fn();
    });
    frames.add(id);
  };
  const finishTransition = (): void => {
    for (const id of frames) view.cancelAnimationFrame(id);
    frames.clear();
    for (const id of timers) view.clearTimeout(id);
    timers.clear();
    section
      .querySelectorAll<HTMLElement>(':scope > [data-nav-chrome-copy]')
      .forEach((element) => element.remove());
    chromeOf(section).forEach((element) =>
      element.classList.remove('kui-nav-stack__chrome--entering'),
    );
    viewsOf(viewport).forEach((element) => {
      if (element.dataset.navExiting === 'true') element.remove();
      else {
        element.classList.remove('kui-nav-stack__view--entering');
        delete element.dataset.navRevealed;
      }
    });
    delete section.dataset.navChromeTransition;
  };
  const rememberedFocus = new Map<string, HTMLElement>();
  const generatedFallbacks = new Map<HTMLElement, string | null>();
  let chromeSnapshots = chromeOf(section).map((element) =>
    element.cloneNode(true),
  ) as HTMLElement[];

  const settle = (fn: () => void): void => {
    if (duration <= 0 || reducedMotion(view)) {
      fn();
      return;
    }
    const timer = view.setTimeout(() => {
      timers.delete(timer);
      fn();
    }, duration);
    timers.add(timer);
  };

  const play = (el: HTMLElement, kind: 'entering' | 'exiting'): void => {
    const animated = duration > 0 && !reducedMotion(view);
    if (kind === 'entering') {
      // Push: start the incoming view off the trailing edge, then release it so
      // it slides to rest (translateX(100%) → 0).
      el.classList.add('kui-nav-stack__view--entering');
      if (animated) {
        // Force a reflow so the starting transform applies before we clear it.
        void el.offsetWidth;
        frame(() => el.classList.remove('kui-nav-stack__view--entering'));
      } else {
        el.classList.remove('kui-nav-stack__view--entering');
      }
    } else if (animated) {
      // Pop: the outgoing view is at rest; add the off-edge class on the next
      // frame so it slides OUT (translateX(0) → 100%), not in.
      frame(() => el.classList.add('kui-nav-stack__view--exiting'));
    } else {
      el.classList.add('kui-nav-stack__view--exiting');
    }
  };

  const rememberFocusedView = (target: Element | null): void => {
    if (!(target instanceof HTMLElement)) return;
    const owner = target.closest<HTMLElement>('.kui-nav-stack__view');
    const key = owner?.dataset.navKey;
    if (key && owner !== target && viewport.contains(owner))
      rememberedFocus.set(key, target);
  };

  const focusInto = (targetView: HTMLElement): void => {
    const key = targetView.dataset.navKey;
    const remembered = key ? rememberedFocus.get(key) : undefined;
    const preferred = Array.from(
      targetView.querySelectorAll<HTMLElement>('[data-nav-focus]'),
    ).find(availableFocusTarget);
    const first = Array.from(
      targetView.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).find(availableFocusTarget);
    const target =
      (availableFocusTarget(remembered) && targetView.contains(remembered)
        ? remembered
        : undefined) ??
      preferred ??
      first;
    if (target) {
      target.focus({ preventScroll: true });
      return;
    }

    if (!generatedFallbacks.has(targetView)) {
      generatedFallbacks.set(
        targetView,
        targetView.hasAttribute('tabindex')
          ? targetView.getAttribute('tabindex')
          : null,
      );
      targetView.tabIndex = -1;
    }
    targetView.focus({ preventScroll: true });
  };

  // Overlay chrome (`chromePresentation="overlay"` for the top chrome,
  // `bottomToolbarPresentation="overlay"` for the bottom toolbar): measure
  // each live edge element, never a cross-fading copy, and publish its
  // border-box block size with the gate that lays it over the viewport. The
  // size follows the element as it wraps, zooms, or changes with the active
  // view, and a re-render that strips the published state gets it back
  // before paint. The active view's classic (space-taking) vertical
  // scrollbar is measured too, so each overlaid edge ends where its track
  // begins.
  interface EdgeState {
    element?: HTMLElement;
    size?: number;
    /** The active scroller's track lies beneath this edge. */
    covers: boolean;
  }
  const edges = OVERLAY_EDGES.map((edge): [OverlayEdge, EdgeState] => [
    edge,
    { covers: false },
  ]);
  const measuredEdge = (state: EdgeState): boolean =>
    state.element !== undefined && state.size !== undefined;
  let measuredScroller: HTMLElement | undefined;
  let scrollbarSize = 0;
  const writeProperty = (name: string, value: string): void => {
    if (section.style.getPropertyValue(name) === value) return;
    if (value) section.style.setProperty(name, value);
    else section.style.removeProperty(name);
  };
  const publishOverlay = (): void => {
    for (const [edge, state] of edges) {
      const measured = measuredEdge(state);
      writeProperty(edge.blockSize, measured ? `${state.size}px` : '');
      writeProperty(
        edge.scrollbarInlineSize,
        measured && state.covers && scrollbarSize > 0
          ? `${scrollbarSize}px`
          : '',
      );
    }
    if (section.getAttribute('style') === '') section.removeAttribute('style');
    // Each gate changes only when it must, so the root observer settles.
    const [top, bottom] = edges.map(([, state]) => measuredEdge(state));
    if (top && section.getAttribute(CHROME_OVERLAY) !== 'measured')
      section.setAttribute(CHROME_OVERLAY, 'measured');
    else if (!top && section.hasAttribute(CHROME_OVERLAY))
      section.removeAttribute(CHROME_OVERLAY);
    if (bottom && section.getAttribute(BOTTOM_TOOLBAR_OVERLAY) !== 'measured')
      section.setAttribute(BOTTOM_TOOLBAR_OVERLAY, 'measured');
    else if (!bottom && section.hasAttribute(BOTTOM_TOOLBAR_OVERLAY))
      section.removeAttribute(BOTTOM_TOOLBAR_OVERLAY);
  };
  /**
   * The element that scrolls beneath the overlaid edges in the active view
   * (the view itself, or a sole Pane's content), and that sole Pane, whose
   * own header or footer keeps its scroller clear of the matching edge.
   */
  const activeScroller = (): { scroller?: HTMLElement; pane?: Element } => {
    const top = topView(viewport);
    const only = top?.children.length === 1 ? top.children[0] : undefined;
    if (!only) return { scroller: top };
    if (only.matches('.kui-pane'))
      return {
        scroller:
          only.querySelector<HTMLElement>(':scope > .kui-pane__content') ??
          undefined,
        pane: only,
      };
    return { scroller: only.matches(NESTED_LAYOUT) ? undefined : top };
  };
  const measureScrollbar = (): void => {
    const scroller = measuredScroller;
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
  const chromeObserver = view.ResizeObserver
    ? new view.ResizeObserver((entries) => {
        for (const entry of entries) {
          const state = edges.find(
            ([, edgeState]) => edgeState.element === entry.target,
          )?.[1];
          if (state)
            state.size =
              entry.borderBoxSize?.[0]?.blockSize ??
              entry.target.getBoundingClientRect().height;
          else if (entry.target === measuredScroller) measureScrollbar();
        }
        publishOverlay();
      })
    : undefined;
  const syncOverlay = (): void => {
    for (const [edge, state] of edges) {
      const element =
        section.getAttribute(edge.presentation) === 'overlay'
          ? (section.querySelector<HTMLElement>(edge.element) ?? undefined)
          : undefined;
      if (element === state.element) continue;
      if (state.element) chromeObserver?.unobserve(state.element);
      state.element = element;
      if (!element) state.size = undefined;
      else {
        // A replacement keeps the last size until the observer reports it
        // after layout; a first one (or one with no observer to report it)
        // is measured at once.
        if (state.size === undefined || !chromeObserver)
          state.size = element.getBoundingClientRect().height;
        // The border box: a forced-colors edge changes no content box.
        chromeObserver?.observe(element, { box: 'border-box' });
      }
    }
    // A scrollbar appearing or leaving resizes the scroller's content box.
    const { scroller, pane } = activeScroller();
    for (const [edge, state] of edges)
      state.covers =
        state.element !== undefined &&
        scroller !== undefined &&
        !pane?.querySelector(edge.paneChrome);
    const covered = edges.some(([, state]) => state.covers)
      ? scroller
      : undefined;
    if (covered !== measuredScroller) {
      if (measuredScroller) chromeObserver?.unobserve(measuredScroller);
      measuredScroller = covered;
      measureScrollbar();
      if (measuredScroller) chromeObserver?.observe(measuredScroller);
    }
    publishOverlay();
  };
  const overlayObserver = new MutationObserver(syncOverlay);
  overlayObserver.observe(section, {
    childList: true,
    attributes: true,
    attributeFilter: [
      ...OVERLAY_EDGES.map((edge) => edge.presentation),
      CHROME_OVERLAY,
      BOTTOM_TOOLBAR_OVERLAY,
      'style',
    ],
  });
  syncOverlay();

  const onFocusIn = (event: Event): void =>
    rememberFocusedView(event.target as Element | null);
  section.addEventListener('focusin', onFocusIn);
  rememberFocusedView(section.ownerDocument.activeElement);

  const crossFadeChrome = (): void => {
    const current = chromeOf(section);
    const animated = duration > 0 && !reducedMotion(view);
    if (!animated) {
      chromeSnapshots = current.map((element) =>
        element.cloneNode(true),
      ) as HTMLElement[];
      return;
    }

    section.dataset.navChromeTransition = 'true';
    const copies = chromeSnapshots.map((snapshot) => {
      const copy = snapshot.cloneNode(true) as HTMLElement;
      copy.classList.add('kui-nav-stack__chrome-copy');
      copy.dataset.navChromeCopy = '';
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('inert', '');
      if (copy.hasAttribute('data-nav-stack-bottom'))
        copy.classList.add('kui-nav-stack__chrome-copy--bottom');
      section.append(copy);
      return copy;
    });

    current.forEach((element) =>
      element.classList.add('kui-nav-stack__chrome--entering'),
    );
    void section.offsetWidth;
    frame(() => {
      current.forEach((element) =>
        element.classList.remove('kui-nav-stack__chrome--entering'),
      );
      copies.forEach((copy) =>
        copy.classList.add('kui-nav-stack__chrome-copy--exiting'),
      );
    });
    settle(() => {
      copies.forEach((copy) => copy.remove());
      delete section.dataset.navChromeTransition;
    });
    chromeSnapshots = current.map((element) => {
      const snapshot = element.cloneNode(true) as HTMLElement;
      snapshot.classList.remove('kui-nav-stack__chrome--entering');
      return snapshot;
    });
  };

  const observer = new MutationObserver((records) => {
    const removed: HTMLElement[] = [];
    for (const record of records) {
      if (record.target !== viewport) continue;
      record.removedNodes.forEach((node) => {
        if (
          node instanceof HTMLElement &&
          node.classList.contains('kui-nav-stack__view') &&
          node.dataset.navExiting !== 'true'
        )
          removed.push(node);
      });
    }

    const top = topView(viewport);
    const currentKey = top?.dataset.navKey;
    const poppedTop = removed.find((node) => node.dataset.navKey === activeKey);

    if (poppedTop && currentKey !== activeKey) {
      finishTransition();
      // Pop: bring the removed node back briefly to slide it out over the revealed view.
      poppedTop.classList.remove(
        'kui-nav-stack__view--entering',
        'kui-nav-stack__view--exiting',
      );
      poppedTop.dataset.navExiting = 'true';
      poppedTop.setAttribute('aria-hidden', 'true');
      viewport.append(poppedTop);
      void poppedTop.offsetWidth;
      play(poppedTop, 'exiting');
      crossFadeChrome();
      if (top) focusInto(top);
      settle(() => poppedTop.remove());
    } else if (currentKey !== activeKey && top) {
      finishTransition();
      const previous = viewsOf(viewport).find(
        (element) => element.dataset.navKey === activeKey,
      );
      if (previous) {
        previous.dataset.navRevealed = 'true';
        settle(() => delete previous.dataset.navRevealed);
      }
      // Push: slide the new top in.
      rememberFocusedView(section.ownerDocument.activeElement);
      play(top, 'entering');
      crossFadeChrome();
      focusInto(top);
    }

    activeKey = currentKey;
    // The active view, and so the scroller beneath the chrome, may change.
    syncOverlay();
  });
  observer.observe(viewport, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-nav-key', 'data-nav-active'],
  });

  return () => {
    disposeBack();
    section.removeEventListener('focusin', onFocusIn);
    observer.disconnect();
    overlayObserver.disconnect();
    chromeObserver?.disconnect();
    for (const [, state] of edges) {
      state.element = undefined;
      state.size = undefined;
      state.covers = false;
    }
    measuredScroller = undefined;
    scrollbarSize = 0;
    publishOverlay();
    finishTransition();
    for (const [element, previousTabIndex] of generatedFallbacks) {
      if (!element.isConnected || element.tabIndex !== -1) continue;
      if (previousTabIndex === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', previousTabIndex);
    }
    generatedFallbacks.clear();
    rememberedFocus.clear();
    if (previousDuration)
      section.style.setProperty(
        '--kui-nav-stack-transition-duration',
        previousDuration,
      );
    else section.style.removeProperty('--kui-nav-stack-transition-duration');
  };
}
