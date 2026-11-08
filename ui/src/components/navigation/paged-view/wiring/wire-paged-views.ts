// KF-0QJ2K3: PagedView input and the controlled page. Swipes and trackpad
// scrolls settle on a snapped page, dots and arrow keys choose one, and every
// change goes through `onPageChange`; the application re-renders with the new
// `page`, and this wiring scrolls the viewport to whatever page it renders.
import { delegate } from 'kerfjs';

import { realmOf } from '../../../../shared/dom/realm.js';

const VIEW = '[data-component="paged-view"]';
const VIEWPORT = 'kui-paged-view__viewport';
const DOT = `${VIEW} > .kui-paged-view__dots > .kui-paged-view__dot`;
/** Quiet time after the last scroll event that counts as settled, for engines without `scrollend`. */
const SETTLE_MS = 120;

export interface WirePagedViewsOptions {
  /**
   * Called with the chosen page id and the PagedView's `id` when a person
   * swipes, scrolls, clicks a dot, or presses an arrow key to another page.
   * Re-render the PagedView with it as `page` (and persist it if you like);
   * the view does not snap back when the application keeps the old page.
   */
  onPageChange: (page: string, view: string) => void;
}

const pagesOf = (viewport: Element) =>
  [...viewport.children].filter((child): child is HTMLElement =>
    child.classList.contains('kui-paged-view__page'),
  );

const viewportOf = (view: Element) =>
  view.querySelector<HTMLElement>(`:scope > .${VIEWPORT}`);

/** The page nearest the viewport's start edge: the one a snap settled on. */
function settledPage(viewport: HTMLElement): HTMLElement | undefined {
  const left = viewport.getBoundingClientRect().left;
  let best: HTMLElement | undefined;
  let distance = Infinity;
  for (const page of pagesOf(viewport)) {
    const offset = Math.abs(page.getBoundingClientRect().left - left);
    if (offset < distance) {
      best = page;
      distance = offset;
    }
  }
  return best;
}

/**
 * Scroll a view's viewport to its rendered `data-page`. `auto` follows the
 * stylesheet (smooth, or instant under reduced motion); `instant` aligns a
 * newly rendered view without animating. Returns the viewport it scrolled.
 */
function showPage(
  view: HTMLElement,
  behavior: ScrollBehavior,
): HTMLElement | undefined {
  const viewport = viewportOf(view);
  const page = viewport
    ? pagesOf(viewport).find(
        (entry) => entry.dataset.pagedViewPage === view.dataset.page,
      )
    : undefined;
  if (!viewport || !page) return undefined;
  const left =
    viewport.scrollLeft +
    page.getBoundingClientRect().left -
    viewport.getBoundingClientRect().left;
  if (Math.abs(left - viewport.scrollLeft) < 1) return undefined;
  viewport.scrollTo({ left, behavior });
  return viewport;
}

/** Every PagedView at or under `node`. */
function viewsIn(node: Node): HTMLElement[] {
  if (!(node instanceof HTMLElement)) return [];
  const views = [...node.querySelectorAll<HTMLElement>(VIEW)];
  return node.matches(VIEW) ? [node, ...views] : views;
}

/**
 * Wire every PagedView under `root`:
 * - a swipe, trackpad scroll, or momentum scroll that settles on another page
 *   reports it;
 * - clicking a dot reports its page;
 * - on a focused dot, Left and Right move to the previous and next page
 *   (mirrored right to left), Home and End to the first and last, moving
 *   focus with them;
 * - when a render changes a view's `page`, its viewport scrolls there
 *   (smoothly unless reduced motion is preferred), and a newly rendered view
 *   starts on its page without animating;
 * - when a viewport resizes, it realigns to its page at once, so the offset a
 *   resize leaves is never reported as a person's choice.
 * Returns a disposer.
 */
export function wirePagedViews(
  root: HTMLElement,
  options: WirePagedViewsOptions,
): () => void {
  const win = root.ownerDocument.defaultView!;
  const timers = new Map<HTMLElement, number>();
  // Viewports scrolling to a rendered page on the wiring's own behalf. Until
  // they arrive (or a person takes over the scroll), a settle in between is
  // the animation, not a choice, so it is not reported.
  const following = new Set<HTMLElement>();
  const show = (view: HTMLElement, behavior: ScrollBehavior) => {
    const viewport = showPage(view, behavior);
    if (viewport) following.add(viewport);
  };

  const choose = (view: HTMLElement, page: string | undefined) => {
    if (page === undefined) return;
    if (page !== view.dataset.page)
      options.onPageChange(page, view.dataset.pagedViewId!);
    // The current page again (a re-click, or a swipe the app kept) realigns.
    else show(view, 'auto');
  };

  const settle = (viewport: HTMLElement) => {
    win.clearTimeout(timers.get(viewport));
    timers.delete(viewport);
    const view = viewport.parentElement!;
    const page = settledPage(viewport)?.dataset.pagedViewPage;
    if (following.has(viewport)) {
      // Arrived; or an engine cut the animation short, so resume it.
      if (page === view.dataset.page) following.delete(viewport);
      else show(view, 'auto');
      return;
    }
    if (page !== undefined && page !== view.dataset.page)
      options.onPageChange(page, view.dataset.pagedViewId!);
  };
  // A person's own swipe, wheel, or press hands the scroll back to them.
  const onInput = (event: Event) => {
    const target = event.target;
    if (target instanceof Element)
      for (const viewport of following)
        if (viewport.contains(target)) following.delete(viewport);
  };

  const viewportFor = (event: Event) => {
    const target = event.target;
    return target instanceof HTMLElement &&
      target.classList.contains(VIEWPORT) &&
      target.parentElement?.matches(VIEW)
      ? target
      : undefined;
  };
  const onScroll = (event: Event) => {
    const viewport = viewportFor(event);
    if (!viewport) return;
    win.clearTimeout(timers.get(viewport));
    timers.set(
      viewport,
      win.setTimeout(() => settle(viewport), SETTLE_MS),
    );
  };
  const onScrollEnd = (event: Event) => {
    const viewport = viewportFor(event);
    if (viewport) settle(viewport);
  };
  // Scroll events do not bubble; capture them for every viewport at once.
  root.addEventListener('scroll', onScroll, { capture: true, passive: true });
  root.addEventListener('scrollend', onScrollEnd, { capture: true });
  const INPUTS = ['wheel', 'touchstart', 'pointerdown'] as const;
  for (const type of INPUTS)
    root.addEventListener(type, onInput, { capture: true, passive: true });

  const stopClicks = delegate<HTMLElement>(root, 'click', DOT, (_e, dot) =>
    choose(dot.closest<HTMLElement>(VIEW)!, dot.dataset.pagedViewDot),
  );

  const stopKeys = delegate<HTMLElement>(root, 'keydown', DOT, (e, dot) => {
    const event = e as KeyboardEvent;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const view = dot.closest<HTMLElement>(VIEW)!;
    const dots = [...dot.parentElement!.children] as HTMLElement[];
    const index = dots.indexOf(dot);
    const step = win.getComputedStyle(view).direction === 'rtl' ? -1 : 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = index + step;
        break;
      case 'ArrowLeft':
        next = index - step;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = dots.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = dots[Math.min(Math.max(next, 0), dots.length - 1)]!;
    target.focus();
    choose(view, target.dataset.pagedViewDot);
  });

  // KF-W093WV: a resize (a window, or a resizable sidebar) moves the snap
  // points under a held scroll offset, and an engine can settle between
  // pages, or on the wrong one, before it re-snaps. Realign each resized
  // viewport to its rendered page at once, so that offset is never reported
  // as a choice.
  const resizes = win.ResizeObserver
    ? new win.ResizeObserver((entries) => {
        for (const { target } of entries) {
          const viewport = target as HTMLElement;
          if (!viewport.isConnected) continue;
          win.clearTimeout(timers.get(viewport));
          timers.delete(viewport);
          show(viewport.parentElement!, 'instant');
        }
      })
    : undefined;
  /** Start a view on its page and follow its viewport's size. */
  const track = (view: HTMLElement) => {
    show(view, 'instant');
    const viewport = viewportOf(view);
    if (viewport) resizes?.observe(viewport);
  };

  const observer = new (realmOf(root).MutationObserver)((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        const view = record.target as HTMLElement;
        if (view.matches(VIEW)) show(view, 'auto');
        continue;
      }
      for (const node of record.addedNodes)
        for (const view of viewsIn(node)) track(view);
      for (const node of record.removedNodes)
        for (const view of viewsIn(node)) {
          const viewport = viewportOf(view);
          if (viewport) resizes?.unobserve(viewport);
        }
    }
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-page'],
  });
  for (const view of viewsIn(root)) track(view);

  return () => {
    observer.disconnect();
    resizes?.disconnect();
    stopClicks();
    stopKeys();
    root.removeEventListener('scroll', onScroll, { capture: true });
    root.removeEventListener('scrollend', onScrollEnd, { capture: true });
    for (const type of INPUTS)
      root.removeEventListener(type, onInput, { capture: true });
    following.clear();
    for (const timer of timers.values()) win.clearTimeout(timer);
    timers.clear();
  };
}
