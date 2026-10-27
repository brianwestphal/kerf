import type { TabActivation } from '../tab-bar.js';

export type TabReorderSource = 'pointer' | 'keyboard';
export type TabDropPosition = 'before' | 'after';

export interface TabReorder {
  barId: string;
  sourceId: string;
  targetId: string;
  position: TabDropPosition;
  source: TabReorderSource;
}

export type { TabActivation } from '../tab-bar.js';

export interface WireTabBarsOptions {
  onReorder: (change: TabReorder) => void;
  /**
   * How arrow / Home / End keys activate tabs (default `'automatic'`):
   * - `'automatic'` moves roving focus **and** selects the focused tab (clicks it).
   * - `'manual'` moves roving focus only; the user selects with Enter / Space / click
   *   (the ARIA Tabs manual-activation pattern). Use this when activation is a heavy or
   *   side-effecting action (e.g. a tab that loads a project) so arrowing through the
   *   strip doesn't trigger it on every tab.
   *
   * A per-bar `data-tab-activation="manual" | "automatic"` attribute (see the `TabBar`
   * `activation` prop) overrides this option for that strip.
   */
  activation?: TabActivation;
}

type TabRoot = HTMLElement;
type TabBarRoot = HTMLElement;

const AUTO_SCROLL_EDGE_PX = 56;
const AUTO_SCROLL_MIN_PX_PER_SECOND = 180;
const AUTO_SCROLL_MAX_PX_PER_SECOND = 900;

export function reorderTabs<T>(
  items: readonly T[],
  getId: (item: T) => string,
  sourceId: string,
  targetId: string,
  position: TabDropPosition,
): T[] {
  if (sourceId === targetId) return [...items];
  const source = items.find((item) => getId(item) === sourceId);
  if (!source || !items.some((item) => getId(item) === targetId))
    return [...items];
  const remaining = items.filter((item) => getId(item) !== sourceId);
  const targetIndex = remaining.findIndex((item) => getId(item) === targetId);
  remaining.splice(targetIndex + (position === 'after' ? 1 : 0), 0, source);
  return remaining;
}

function tabRoot(target: EventTarget | null): TabRoot | undefined {
  return target instanceof Element
    ? (target.closest<TabRoot>('[data-component="tab-bar-item"]') ?? undefined)
    : undefined;
}

function tabBar(tab: TabRoot): TabBarRoot | undefined {
  return tab.closest<TabBarRoot>('[data-component="tab-bar"]') ?? undefined;
}

function tabId(tab: TabRoot): string | undefined {
  return tab.dataset.tabId || undefined;
}

function tabEnabled(tab: TabRoot): boolean {
  return (
    tab.querySelector<HTMLButtonElement>('[role="tab"]')?.disabled === false
  );
}

function barId(bar: TabBarRoot): string | undefined {
  return bar.dataset.tabBarId || undefined;
}

function positionFor(event: DragEvent, tab: TabRoot): TabDropPosition {
  const bounds = tab.getBoundingClientRect();
  return event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after';
}

function tabsIn(bar: TabBarRoot): HTMLButtonElement[] {
  return [
    ...bar.querySelectorAll<HTMLButtonElement>(
      '[data-kui-tab-list] [role="tab"]:not(:disabled)',
    ),
  ];
}

function reveal(tab: HTMLElement | null | undefined): void {
  tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/**
 * Scroll a tab's own strip, and nothing else, so the tab is fully visible.
 * Used for selection changes the application makes without focus (adding and
 * selecting a tab): unlike `scrollIntoView`, it never scrolls the page to a
 * bar that is out of view.
 */
function revealInStrip(tab: HTMLElement): void {
  const strip = tab.closest<HTMLElement>('[data-kui-tab-list]');
  if (!strip || strip.scrollWidth <= strip.clientWidth) return;
  const bounds = strip.getBoundingClientRect();
  const snap = strip.dataset.snapTabs === 'true';
  const box = snap
    ? (tab.closest<HTMLElement>('.kui-tab-bar-item')?.getBoundingClientRect() ??
      tab.getBoundingClientRect())
    : tab.getBoundingClientRect();
  if (
    strip.ownerDocument.defaultView?.getComputedStyle(strip).direction === 'rtl'
  ) {
    const right = bounds.right;
    if (snap) strip.scrollLeft += box.right - right;
    else if (box.right > right) strip.scrollLeft += box.right - right;
    else if (box.left < bounds.left)
      strip.scrollLeft -= Math.min(bounds.left - box.left, right - box.right);
    return;
  }
  const left = bounds.left;
  if (snap) strip.scrollLeft += box.left - left;
  else if (box.left < left) strip.scrollLeft -= left - box.left;
  else if (box.right > bounds.right)
    strip.scrollLeft += Math.min(box.right - bounds.right, box.left - left);
}

const TAB_BAR = '[data-component="tab-bar"]';
const TAB_LIST = '[data-kui-tab-list]';

/** The selected tab button of every bar below each scope, keyed by bar. */
function selectedTabs(scopes: Iterable<ParentNode>) {
  const selected = new Map<TabBarRoot, HTMLElement>();
  for (const scope of scopes)
    scope
      .querySelectorAll<HTMLElement>(
        `${TAB_LIST} [role="tab"][aria-selected="true"]`,
      )
      .forEach((button) => {
        const tab = tabRoot(button);
        const bar = tab && tabBar(tab);
        if (bar && !selected.has(bar)) selected.set(bar, button);
      });
  return selected;
}

/** `node` itself when it matches `selector`, plus its matching descendants. */
function selfAndBelow<T extends Element>(node: Node, selector: string): T[] {
  if (!(node instanceof Element)) return [];
  const found = [...node.querySelectorAll<T>(selector)];
  if (node.matches(selector)) found.unshift(node as T);
  return found;
}

/**
 * The tab bars a batch of mutation records can have changed. A mutation
 * inside a bar touches that bar; an inserted subtree touches the bars it
 * brings; a `dir` change touches every bar below its element. Mutations
 * elsewhere in the root — terminal output, list morphs, streamed content —
 * touch nothing and cost one `closest` per record.
 */
function touchedBars(records: readonly MutationRecord[]) {
  const bars = new Set<TabBarRoot>();
  for (const record of records) {
    const target =
      record.target instanceof Element
        ? record.target
        : record.target.parentElement;
    const owner = target?.closest<TabBarRoot>(TAB_BAR);
    if (owner) bars.add(owner);
    else if (record.attributeName === 'dir' && target)
      for (const bar of selfAndBelow<TabBarRoot>(target, TAB_BAR))
        bars.add(bar);
    record.addedNodes.forEach((node) => {
      for (const bar of selfAndBelow<TabBarRoot>(node, TAB_BAR)) bars.add(bar);
    });
  }
  return bars;
}

/** Wire reordering and keyboard navigation while leaving controlled state in the application. */
export function wireTabBars(
  root: HTMLElement | Document,
  { onReorder, activation = 'automatic' }: WireTabBarsOptions,
): () => void {
  const ownerDocument = (
    root.nodeType === 9 ? (root as Document) : root.ownerDocument
  )!;
  const view = ownerDocument.defaultView!;
  const snapExtras = new WeakMap<HTMLElement, number>();
  const snapStrips = new Set<HTMLElement>();
  const snapObserved = new Set<HTMLElement>();
  let snapFrame: number | undefined;
  const scheduleSnapSync = () => {
    if (disposed || snapFrame !== undefined) return;
    snapFrame = view.requestAnimationFrame(() => {
      snapFrame = undefined;
      if (!disposed) syncSnapInRoot();
    });
  };
  const resizeObserver = view.ResizeObserver
    ? new view.ResizeObserver((entries: ResizeObserverEntry[]) => {
        if (disposed) return;
        let snap = false;
        for (const { target } of entries) {
          if (snapObserved.has(target as HTMLElement)) snap = true;
        }
        if (snap) scheduleSnapSync();
      })
    : undefined;
  const observeSnap = (element: HTMLElement) => {
    if (snapObserved.has(element)) return;
    resizeObserver?.observe(element);
    snapObserved.add(element);
  };
  const syncSnap = (strip: HTMLElement) => {
    const previousExtra = snapExtras.get(strip) ?? 0;
    if (strip.dataset.snapTabs !== 'true') {
      strip.style.removeProperty('--kui-tab-bar-snap-end-extra');
      snapExtras.delete(strip);
      snapStrips.delete(strip);
      return;
    }
    snapStrips.add(strip);
    observeSnap(strip);
    const tabs = [
      ...strip.querySelectorAll<HTMLElement>(':scope > .kui-tab-bar-item'),
    ];
    tabs.forEach(observeSnap);
    const last = tabs.at(-1);
    const bounds = strip.getBoundingClientRect();
    const rtl = view.getComputedStyle(strip).direction === 'rtl';
    const baseMaximum = Math.max(
      0,
      strip.scrollWidth - strip.clientWidth - previousExtra,
    );
    let extra = 0;
    if (baseMaximum > 0 && last) {
      const lastBox = last.getBoundingClientRect();
      const desired = rtl
        ? -(strip.scrollLeft + lastBox.right - bounds.right)
        : strip.scrollLeft + lastBox.left - bounds.left;
      extra = Math.max(0, desired - baseMaximum);
    }
    if (Math.abs(extra - previousExtra) >= 0.5) {
      strip.style.setProperty('--kui-tab-bar-snap-end-extra', `${extra}px`);
      snapExtras.set(strip, extra);
      // The room is scroll content after the last tab, so writing it never
      // resizes the strip and no ResizeObserver notification follows. A room
      // measured during layout is re-measured next frame until it holds.
      scheduleSnapSync();
    }
  };
  /** Release observers and inline geometry of strips that left the root. */
  const releaseDetached = () => {
    for (const element of snapObserved)
      if (!root.contains(element)) {
        resizeObserver?.unobserve(element);
        snapObserved.delete(element);
      }
    for (const strip of snapStrips)
      if (!root.contains(strip)) {
        strip.style.removeProperty('--kui-tab-bar-snap-end-extra');
        snapStrips.delete(strip);
      }
  };
  const syncSnapInRoot = () => {
    releaseDetached();
    root.querySelectorAll<HTMLElement>(TAB_LIST).forEach(syncSnap);
  };
  // CSS snap settles direct gestures in most engines. WebKit can leave a
  // programmatic smooth scroll between snap points, so normalize its final
  // position to the nearest whole tab at the strip edge.
  const onStripScrollEnd = (event: Event) => {
    const strip = event.target;
    if (
      !(strip instanceof HTMLElement) ||
      !strip.matches('[data-kui-tab-list][data-snap-tabs="true"]') ||
      Math.abs(strip.scrollLeft) < 0.5
    )
      return;
    const peers = [
      ...strip.querySelectorAll<HTMLElement>(':scope > .kui-tab-bar-item'),
    ];
    if (!peers.length) return;
    const bounds = strip.getBoundingClientRect();
    const rtl = view.getComputedStyle(strip).direction === 'rtl';
    const edge = rtl ? bounds.right : bounds.left;
    const distances = peers.map((peer) => {
      const box = peer.getBoundingClientRect();
      return rtl ? box.right - edge : box.left - edge;
    });
    const closest = distances.reduce((best, distance) =>
      Math.abs(distance) < Math.abs(best) ? distance : best,
    );
    if (Math.abs(closest) > 0.5) strip.scrollLeft += closest;
  };
  let autoScroll:
    | {
        strip: HTMLElement;
        velocity: number;
        frame: number | undefined;
        previousTime: number | undefined;
      }
    | undefined;
  const stopAutoScroll = () => {
    if (!autoScroll) return;
    if (autoScroll.frame !== undefined)
      view.cancelAnimationFrame(autoScroll.frame);
    delete autoScroll.strip.dataset.tabAutoscroll;
    autoScroll = undefined;
  };
  const runAutoScroll = (time: number) => {
    const current = autoScroll;
    if (!current) return;
    current.frame = undefined;
    const elapsed =
      current.previousTime === undefined
        ? 1000 / 60
        : Math.min(40, Math.max(1, time - current.previousTime));
    current.previousTime = time;
    const maximum = Math.max(
      0,
      current.strip.scrollWidth - current.strip.clientWidth,
    );
    const previous = current.strip.scrollLeft;
    current.strip.scrollLeft = Math.max(
      0,
      Math.min(maximum, previous + (current.velocity * elapsed) / 1000),
    );
    if (current.strip.scrollLeft === previous) {
      stopAutoScroll();
      return;
    }
    current.frame = view.requestAnimationFrame(runAutoScroll);
  };
  const updateAutoScroll = (event: DragEvent, strip: HTMLElement) => {
    if (strip.scrollWidth <= strip.clientWidth) {
      stopAutoScroll();
      return;
    }
    const bounds = strip.getBoundingClientRect();
    const edge = Math.min(AUTO_SCROLL_EDGE_PX, bounds.width / 3);
    const startDistance = event.clientX - bounds.left;
    const endDistance = bounds.right - event.clientX;
    let direction = 0;
    let strength = 0;
    if (startDistance >= 0 && startDistance < edge) {
      direction = -1;
      strength = 1 - startDistance / edge;
    } else if (endDistance >= 0 && endDistance < edge) {
      direction = 1;
      strength = 1 - endDistance / edge;
    }
    if (direction === 0) {
      stopAutoScroll();
      return;
    }
    const maximum = Math.max(0, strip.scrollWidth - strip.clientWidth);
    if (
      (direction < 0 && strip.scrollLeft <= 0) ||
      (direction > 0 && strip.scrollLeft >= maximum)
    ) {
      stopAutoScroll();
      return;
    }
    const speed =
      AUTO_SCROLL_MIN_PX_PER_SECOND +
      (AUTO_SCROLL_MAX_PX_PER_SECOND - AUTO_SCROLL_MIN_PX_PER_SECOND) *
        strength *
        strength;
    if (autoScroll?.strip !== strip) stopAutoScroll();
    autoScroll ??= {
      strip,
      velocity: 0,
      frame: undefined,
      previousTime: undefined,
    };
    autoScroll.velocity = direction * speed;
    strip.dataset.tabAutoscroll = direction < 0 ? 'start' : 'end';
    autoScroll.frame ??= view.requestAnimationFrame(runAutoScroll);
  };
  let dragged: { barId: string; tabId: string; tab: TabRoot } | undefined;
  const clearDropPositions = () =>
    root
      .querySelectorAll<HTMLElement>('[data-tab-drop-position]')
      .forEach((tab) => delete tab.dataset.tabDropPosition);
  const clear = () => {
    stopAutoScroll();
    dragged = undefined;
    root
      .querySelectorAll<HTMLElement>(
        '[data-tab-dragging], [data-tab-drop-position]',
      )
      .forEach((tab) => {
        delete tab.dataset.tabDragging;
        delete tab.dataset.tabDropPosition;
      });
  };
  let disposed = false;
  const afterControlledRender = (sourceBarId: string, sourceTabId: string) =>
    globalThis.queueMicrotask(() => {
      if (disposed) return;
      const tab = [
        ...root.querySelectorAll<TabRoot>('[data-component="tab-bar-item"]'),
      ].find((candidate) => {
        const candidateBar = tabBar(candidate);
        return (
          tabId(candidate) === sourceTabId &&
          candidateBar !== undefined &&
          barId(candidateBar) === sourceBarId
        );
      });
      const button = tab?.querySelector<HTMLButtonElement>('[role="tab"]');
      if (button && !button.disabled) {
        button.focus();
        reveal(button);
      }
    });

  const onDragStart = (event: Event) => {
    const dragEvent = event as DragEvent;
    const tab = tabRoot(event.target);
    const bar = tab && tabBar(tab);
    const sourceId = tab && tabId(tab);
    const sourceBarId = bar && barId(bar);
    if (
      !tab ||
      !tabEnabled(tab) ||
      tab.getAttribute('draggable') !== 'true' ||
      !sourceId ||
      !sourceBarId
    )
      return;
    dragged = { barId: sourceBarId, tabId: sourceId, tab };
    tab.dataset.tabDragging = 'true';
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = 'move';
      dragEvent.dataTransfer.setData(
        'application/x-kerf-tab',
        `${sourceBarId}:${sourceId}`,
      );
    }
  };
  const onDragOver = (event: Event) => {
    const dragEvent = event as DragEvent;
    const tab = tabRoot(event.target);
    const bar =
      event.target instanceof Element
        ? (event.target.closest<TabBarRoot>('[data-component="tab-bar"]') ??
          undefined)
        : undefined;
    const targetId = tab && tabId(tab);
    const targetBarId = bar && barId(bar);
    if (!dragged || !bar || targetBarId !== dragged.barId) {
      stopAutoScroll();
      clearDropPositions();
      return;
    }
    dragEvent.preventDefault();
    const strip = bar.querySelector<HTMLElement>('[data-kui-tab-list]');
    if (strip) updateAutoScroll(dragEvent, strip);
    else stopAutoScroll();
    clearDropPositions();
    if (!tab || !tabEnabled(tab) || !targetId || targetId === dragged.tabId)
      return;
    tab.dataset.tabDropPosition = positionFor(dragEvent, tab);
    if (dragEvent.dataTransfer) dragEvent.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (event: Event) => {
    const dragEvent = event as DragEvent;
    const tab = tabRoot(event.target);
    const bar = tab && tabBar(tab);
    const targetId = tab && tabId(tab);
    const targetBarId = bar && barId(bar);
    if (
      !dragged ||
      !dragged.tab.isConnected ||
      !tabEnabled(dragged.tab) ||
      !tab ||
      !tabEnabled(tab) ||
      !targetId ||
      targetId === dragged.tabId ||
      targetBarId !== dragged.barId
    ) {
      clear();
      return;
    }
    dragEvent.preventDefault();
    const change: TabReorder = {
      barId: dragged.barId,
      sourceId: dragged.tabId,
      targetId,
      position: positionFor(dragEvent, tab),
      source: 'pointer',
    };
    clear();
    onReorder(change);
    afterControlledRender(change.barId, change.sourceId);
  };
  const onKeyDown = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[role="tab"]')
        : null;
    const tab = button && tabRoot(button);
    const bar = tab && tabBar(tab);
    if (!button || button.disabled || !tab || !bar) return;
    if (keyboardEvent.key === 'Delete' || keyboardEvent.key === 'Backspace') {
      const close = tab.querySelector<HTMLButtonElement>(
        '.kui-tab-bar-item__close',
      );
      if (!close) return;
      keyboardEvent.preventDefault();
      close.click();
      return;
    }
    const tabs = tabsIn(bar);
    const current = tabs.indexOf(button);
    if (current < 0) return;
    if (
      keyboardEvent.altKey &&
      keyboardEvent.shiftKey &&
      (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowRight')
    ) {
      const target =
        tabs[current + (keyboardEvent.key === 'ArrowLeft' ? -1 : 1)];
      const sourceId = tabId(tab);
      const targetRoot = target && tabRoot(target);
      const targetId = targetRoot && tabId(targetRoot);
      const sourceBarId = barId(bar);
      if (
        !target ||
        !sourceId ||
        !targetId ||
        !sourceBarId ||
        tab.getAttribute('draggable') !== 'true'
      )
        return;
      keyboardEvent.preventDefault();
      onReorder({
        barId: sourceBarId,
        sourceId,
        targetId,
        position: keyboardEvent.key === 'ArrowLeft' ? 'before' : 'after',
        source: 'keyboard',
      });
      afterControlledRender(sourceBarId, sourceId);
      return;
    }
    let next: number | undefined;
    if (keyboardEvent.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (keyboardEvent.key === 'ArrowLeft')
      next = (current - 1 + tabs.length) % tabs.length;
    else if (keyboardEvent.key === 'Home') next = 0;
    else if (keyboardEvent.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    keyboardEvent.preventDefault();
    // A per-bar data-tab-activation attribute overrides the wireTabBars option.
    const perBar = bar.dataset.tabActivation;
    const mode: TabActivation =
      perBar === 'manual' || perBar === 'automatic' ? perBar : activation;
    const target = tabs[next]!;
    target.focus();
    // Manual activation moves roving focus only; the user selects with Enter / Space
    // (native on the tab <button>) or click. Automatic also selects the focused tab.
    if (mode === 'automatic') {
      target.click();
      // Activation can synchronously replace the controlled strip. Resolve the
      // logical tab again after rendering instead of leaving focus on a dead node.
      if (!target.isConnected)
        afterControlledRender(
          bar.dataset.tabBarId!,
          tabRoot(target)!.dataset.tabId!,
        );
    }
    reveal(target);
  };
  const onFocusIn = (event: Event) => {
    const tab =
      event.target instanceof HTMLElement &&
      event.target.matches('[role="tab"]')
        ? event.target
        : undefined;
    reveal(tab);
  };

  root.addEventListener('dragstart', onDragStart);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('drop', onDrop);
  root.addEventListener('dragend', clear);
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('scrollend', onStripScrollEnd, true);
  syncSnapInRoot();
  root
    .querySelectorAll<HTMLElement>(
      '[data-kui-tab-list] [role="tab"][aria-selected="true"]',
    )
    .forEach(reveal);

  // Reveal a tab the application selects without focus (for example a tab it
  // adds and selects) once its controlled render lands. Only a change of a
  // bar's selected tab reveals, so a re-render that keeps the selection never
  // pulls a strip the user scrolled back to it.
  const selectedIds = new Map<string, string>();
  const recordSelection = (scopes: Iterable<ParentNode>) => {
    const changed: HTMLElement[] = [];
    for (const [bar, button] of selectedTabs(scopes)) {
      const id = barId(bar);
      const tab = tabRoot(button);
      const selectedId = tab && tabId(tab);
      if (!id || !selectedId) continue;
      if (selectedIds.has(id) && selectedIds.get(id) !== selectedId)
        changed.push(button);
      selectedIds.set(id, selectedId);
    }
    return changed;
  };
  recordSelection([root]);
  // Only the bars the records touched are re-measured: this observer watches
  // the whole application root, so most of its batches are unrelated content.
  const selectionObserver = new view.MutationObserver((records) => {
    if (disposed) return;
    // A removal anywhere may have taken a strip with it; releasing walks only
    // the few strips and tabs this wiring tracks.
    if (records.some((record) => record.removedNodes.length)) releaseDetached();
    const bars = touchedBars(records);
    if (!bars.size) return;
    const strips = [...bars].flatMap((bar) =>
      selfAndBelow<HTMLElement>(bar, TAB_LIST),
    );
    strips.forEach(syncSnap);
    for (const button of recordSelection(bars))
      if (ownerDocument.activeElement !== button) revealInStrip(button);
  });
  selectionObserver.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-selected', 'dir', 'data-snap-tabs'],
  });

  return () => {
    disposed = true;
    if (snapFrame !== undefined) view.cancelAnimationFrame(snapFrame);
    selectionObserver.disconnect();
    resizeObserver?.disconnect();
    for (const strip of snapStrips) {
      strip.style.removeProperty('--kui-tab-bar-snap-end-extra');
    }
    snapStrips.clear();
    snapObserved.clear();
    clear();
    root.removeEventListener('dragstart', onDragStart);
    root.removeEventListener('dragover', onDragOver);
    root.removeEventListener('drop', onDrop);
    root.removeEventListener('dragend', clear);
    root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('scrollend', onStripScrollEnd, true);
  };
}
