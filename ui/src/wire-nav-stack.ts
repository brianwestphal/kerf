import { delegate } from 'kerfjs';

export interface WireNavStackOptions {
  /** Invoked when the back control is activated. The app pops its own stack. */
  onBack?: () => void;
  /** Transition duration in ms (default 200). Set 0 to disable animation. */
  duration?: number;
}

const DEFAULT_DURATION = 200;

function viewsOf(viewport: Element): HTMLElement[] {
  return Array.from(viewport.querySelectorAll<HTMLElement>(':scope > .kui-nav-stack__view'));
}

function topView(viewport: Element): HTMLElement | undefined {
  const live = viewsOf(viewport).filter((view) => view.dataset.navExiting !== 'true');
  return live[live.length - 1];
}

function reducedMotion(view: Window): boolean {
  return typeof view.matchMedia === 'function' && view.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate a `NavStack`'s push/pop transitions and wire its back control. The app
 * owns the stack (a signal of `NavStackView[]`) and re-renders `NavStack` when it
 * changes; this helper slides the content and settles the chrome across each
 * change, and calls `onBack` when the back control is used. Returns a disposer.
 */
export function wireNavStack(root: Element, options: WireNavStackOptions = {}): () => void {
  const section = root.matches('[data-component="nav-stack"]') ? root : root.querySelector('[data-component="nav-stack"]');
  const viewport = section?.querySelector('[data-nav-stack-viewport]');
  if (!(section instanceof HTMLElement) || !viewport) return () => {};

  const view = section.ownerDocument.defaultView ?? window;
  const duration = options.duration ?? DEFAULT_DURATION;
  const disposeBack = delegate(section, 'click', '[data-nav-back]', () => options.onBack?.());

  let activeKey = topView(viewport)?.dataset.navKey;
  const timers = new Set<number>();

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
    el.classList.add(`kui-nav-stack__view--${kind}`);
    if (animated) {
      // Force a reflow so the starting transform applies before we clear it.
      void el.offsetWidth;
      view.requestAnimationFrame(() => el.classList.remove(`kui-nav-stack__view--${kind}`));
    } else {
      el.classList.remove(`kui-nav-stack__view--${kind}`);
    }
  };

  const observer = new MutationObserver((records) => {
    const removed: HTMLElement[] = [];
    let added = false;
    for (const record of records) {
      record.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.classList.contains('kui-nav-stack__view') && node.dataset.navExiting !== 'true') removed.push(node);
      });
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.classList.contains('kui-nav-stack__view')) added = true;
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
      settle(() => poppedTop.remove());
    } else if (added && currentKey !== activeKey && top) {
      // Push: slide the new top in.
      play(top, 'entering');
    }

    activeKey = currentKey;
  });
  observer.observe(viewport, { childList: true });

  return () => {
    disposeBack();
    observer.disconnect();
    for (const timer of timers) view.clearTimeout(timer);
    timers.clear();
  };
}
