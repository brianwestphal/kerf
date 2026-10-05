import { delegate } from 'kerfjs';

export interface WireNavStackOptions {
  /** Invoked when the back control is activated. The app pops its own stack. */
  onBack?: () => void;
  /** Transition duration in ms (default 200). Set 0 to disable animation. */
  duration?: number;
}

const DEFAULT_DURATION = 200;
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
      ':scope > [data-nav-stack-chrome], :scope > [data-nav-stack-bottom]',
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
        view.requestAnimationFrame(() =>
          el.classList.remove('kui-nav-stack__view--entering'),
        );
      } else {
        el.classList.remove('kui-nav-stack__view--entering');
      }
    } else if (animated) {
      // Pop: the outgoing view is at rest; add the off-edge class on the next
      // frame so it slides OUT (translateX(0) → 100%), not in.
      view.requestAnimationFrame(() =>
        el.classList.add('kui-nav-stack__view--exiting'),
      );
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
    view.requestAnimationFrame(() => {
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
    chromeSnapshots = current.map((element) =>
      element.cloneNode(true),
    ) as HTMLElement[];
  };

  const observer = new MutationObserver((records) => {
    const removed: HTMLElement[] = [];
    let added = false;
    for (const record of records) {
      record.removedNodes.forEach((node) => {
        if (
          node instanceof HTMLElement &&
          node.classList.contains('kui-nav-stack__view') &&
          node.dataset.navExiting !== 'true'
        )
          removed.push(node);
      });
      record.addedNodes.forEach((node) => {
        if (
          node instanceof HTMLElement &&
          node.classList.contains('kui-nav-stack__view')
        )
          added = true;
      });
    }

    const top = topView(viewport);
    const currentKey = top?.dataset.navKey;
    const poppedTop = removed.find((node) => node.dataset.navKey === activeKey);

    if (poppedTop && currentKey !== activeKey) {
      // Pop: bring the removed node back briefly to slide it out over the revealed view.
      poppedTop.dataset.navExiting = 'true';
      poppedTop.setAttribute('aria-hidden', 'true');
      viewport.append(poppedTop);
      play(poppedTop, 'exiting');
      crossFadeChrome();
      if (top) focusInto(top);
      settle(() => poppedTop.remove());
    } else if (added && currentKey !== activeKey && top) {
      // Push: slide the new top in.
      rememberFocusedView(section.ownerDocument.activeElement);
      play(top, 'entering');
      crossFadeChrome();
      focusInto(top);
    }

    activeKey = currentKey;
  });
  observer.observe(viewport, { childList: true });

  return () => {
    disposeBack();
    section.removeEventListener('focusin', onFocusIn);
    observer.disconnect();
    for (const timer of timers) view.clearTimeout(timer);
    timers.clear();
    section
      .querySelectorAll<HTMLElement>('[data-nav-chrome-copy]')
      .forEach((copy) => copy.remove());
    delete section.dataset.navChromeTransition;
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
