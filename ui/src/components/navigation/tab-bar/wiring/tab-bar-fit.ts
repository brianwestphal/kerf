/**
 * How a TabBar's tabs fit their strip, and how wide its fixed action zones
 * are, as `wireTabBars` reports it through `onFitChange`. Widths are CSS
 * pixels rounded to whole pixels.
 */
export interface TabBarFit {
  /** The bar's `TabBar` `id` (`data-tab-bar-id`). */
  barId: string;
  /**
   * The tabs need more room than the strip has, so the strip scrolls and some
   * tab is at least partly out of view.
   */
  overflowing: boolean;
  /** Inline room the strip gives its tabs (its content box). */
  stripWidth: number;
  /** Inline extent the tabs occupy, from the first tab's start edge to the last tab's end edge. */
  tabsWidth: number;
  /**
   * `stripWidth - tabsWidth`: room the tabs leave unused, negative by the
   * amount they overflow. Intrinsic tabs ellipsize their names before the
   * strip scrolls, so `free` reaches 0 before `overflowing` turns true; under
   * `allocation="fill"` the tabs absorb the strip and `free` stays near 0.
   */
  free: number;
  /** Width of the `trailing` zone, 0 without one. */
  trailingWidth: number;
  /** Width of the `end` zone, 0 without one. */
  endWidth: number;
  /** Inline room inside the bar's padding: what its zones share. */
  barWidth: number;
  /**
   * Room the bar leaves unused between its packed zones (leading, tabs,
   * trailing) and the `end` zone, or the bar's end edge without one. Under
   * `trailingPlacement="adjacent"` the strip is only as wide as its tabs, so
   * this is the room an `end` action can grow into; with the default
   * placement the strip absorbs the room and this stays near 0.
   */
  endFree: number;
}

const TAB_BAR = '[data-component="tab-bar"]';

type Measured = Omit<TabBarFit, 'barId'>;

// KF-XJPZJ3: the id is part of the identity compared, so a morph that renames
// `data-tab-bar-id` on the same element reports under the new id.
function sameFit(a: TabBarFit | undefined, b: TabBarFit): boolean {
  return (
    a !== undefined &&
    a.barId === b.barId &&
    a.overflowing === b.overflowing &&
    a.stripWidth === b.stripWidth &&
    a.tabsWidth === b.tabsWidth &&
    a.trailingWidth === b.trailingWidth &&
    a.endWidth === b.endWidth &&
    a.barWidth === b.barWidth &&
    a.endFree === b.endFree
  );
}

/** The bar's own direct zone of a class, ignoring nested bars. */
function zone(bar: HTMLElement, name: string): HTMLElement | undefined {
  return [...bar.children].find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains(name),
  );
}

const px = (value: string) => Number.parseFloat(value) || 0;

/** The bar's content width and the room its `end` zone's auto margin holds. */
function barRoom(view: Window, bar: HTMLElement, end: HTMLElement | undefined) {
  const style = view.getComputedStyle(bar);
  const box = bar.getBoundingClientRect();
  const contentLeft = box.left + px(style.paddingLeft);
  const contentRight = box.right - px(style.paddingRight);
  const rendered = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return rect.width + rect.height > 0 ? rect : undefined;
  };
  // The zones packed from the start edge; an empty strip still takes a slot.
  let start = Infinity;
  let finish = -Infinity;
  for (const child of bar.children) {
    if (child === end) continue;
    const rect = rendered(child);
    if (!rect) continue;
    start = Math.min(start, rect.left);
    finish = Math.max(finish, rect.right);
  }
  const packed = finish >= start;
  const endBox = end && rendered(end);
  const gap = px(style.columnGap);
  const free =
    style.direction === 'rtl'
      ? (packed ? start : contentRight) -
        (endBox ? endBox.right + gap : contentLeft)
      : (endBox ? endBox.left - gap : contentRight) -
        (packed ? finish : contentLeft);
  return {
    barWidth: Math.round(Math.max(0, contentRight - contentLeft)),
    endFree: Math.round(Math.max(0, free)),
  };
}

function measure(view: Window, bar: HTMLElement): Measured | undefined {
  const strip = zone(bar, 'kui-tab-bar__tabs');
  if (!strip) return undefined;
  const style = view.getComputedStyle(strip);
  const padding = px(style.paddingLeft) + px(style.paddingRight);
  const stripWidth = Math.max(0, strip.clientWidth - padding);
  let start = Infinity;
  let last = -Infinity;
  for (const tab of strip.children) {
    const box = tab.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    start = Math.min(start, box.left);
    last = Math.max(last, box.right);
  }
  const tabsWidth = last > start ? last - start : 0;
  const width = (element: HTMLElement | undefined) =>
    element ? Math.round(element.getBoundingClientRect().width) : 0;
  const roundedStrip = Math.round(stripWidth);
  const roundedTabs = Math.round(tabsWidth);
  const end = zone(bar, 'kui-tab-bar__end');
  return {
    // Half a pixel absorbs subpixel layout; the snap end room is not a tab,
    // so it can never make a fitting strip report overflow.
    overflowing: tabsWidth > stripWidth + 0.5,
    stripWidth: roundedStrip,
    tabsWidth: roundedTabs,
    free: roundedStrip - roundedTabs,
    trailingWidth: width(zone(bar, 'kui-tab-bar__trailing')),
    endWidth: width(end),
    ...barRoom(view, bar, end),
  };
}

export interface TabBarFitTracker {
  /** Observe these bars and report their fit on the next frame. */
  update(bars: Iterable<HTMLElement>): void;
  /** Stop observing elements that left the root. */
  release(): void;
  dispose(): void;
}

/**
 * Report each bar element's fit once when the wiring first sees it and again
 * whenever a rounded value changes. Reports wait for the next animation frame, so a callback that
 * re-renders the bar's end zone never re-enters a ResizeObserver delivery.
 */
export function trackTabBarFit(
  view: Window & typeof globalThis,
  root: ParentNode & Node,
  onFitChange: (fit: TabBarFit) => void,
): TabBarFitTracker {
  // Keyed by element: a bar a route or remount renders afresh reports again,
  // so app state reset with that view is re-derived. A bar that leaves the
  // root is forgotten (KF-XJPZJ3), so it reports again when it comes back.
  const reported = new Map<HTMLElement, TabBarFit>();
  const pending = new Set<HTMLElement>();
  const observed = new Set<Element>();
  let frame: number | undefined;
  let disposed = false;

  const flush = () => {
    frame = undefined;
    const bars = [...pending];
    pending.clear();
    for (const bar of bars) {
      const id = bar.dataset.tabBarId;
      if (disposed || !id || !root.contains(bar)) continue;
      const measured = measure(view, bar);
      if (!measured) continue;
      const fit: TabBarFit = { barId: id, ...measured };
      if (sameFit(reported.get(bar), fit)) continue;
      reported.set(bar, fit);
      onFitChange({ ...fit });
    }
  };
  const schedule = (bar: HTMLElement) => {
    if (disposed) return;
    pending.add(bar);
    frame ??= view.requestAnimationFrame(flush);
  };
  const resizeObserver = view.ResizeObserver
    ? new view.ResizeObserver((entries: ResizeObserverEntry[]) => {
        for (const { target } of entries) {
          const bar = target.closest<HTMLElement>(TAB_BAR);
          if (bar) schedule(bar);
        }
      })
    : undefined;
  const observe = (element: Element | undefined) => {
    if (!element || observed.has(element)) return;
    observed.add(element);
    resizeObserver?.observe(element);
  };

  return {
    update(bars) {
      for (const bar of bars) {
        // The bar itself: growing it widens only the room beside an adjacent
        // strip, which no zone's resize reports (KF-3A0DBM).
        observe(bar);
        const strip = zone(bar, 'kui-tab-bar__tabs');
        observe(strip);
        if (strip) for (const tab of strip.children) observe(tab);
        observe(zone(bar, 'kui-tab-bar__trailing'));
        observe(zone(bar, 'kui-tab-bar__end'));
        schedule(bar);
      }
    },
    release() {
      for (const bar of reported.keys())
        if (!root.contains(bar)) reported.delete(bar);
      for (const element of observed)
        if (!root.contains(element)) {
          resizeObserver?.unobserve(element);
          observed.delete(element);
        }
    },
    dispose() {
      disposed = true;
      if (frame !== undefined) view.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      observed.clear();
      pending.clear();
      reported.clear();
    },
  };
}
