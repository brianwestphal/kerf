export type TabReorderSource = 'pointer' | 'keyboard';
export type TabDropPosition = 'before' | 'after';

export interface TabReorder {
  barId: string;
  sourceId: string;
  targetId: string;
  position: TabDropPosition;
  source: TabReorderSource;
}

export interface WireTabBarsOptions {
  onReorder: (change: TabReorder) => void;
}

type TabRoot = HTMLElement;
type TabBarRoot = HTMLElement;

const AUTO_SCROLL_EDGE_PX = 56;
const AUTO_SCROLL_MIN_PX_PER_SECOND = 180;
const AUTO_SCROLL_MAX_PX_PER_SECOND = 900;

export function reorderTabs<T>(items: readonly T[], getId: (item: T) => string, sourceId: string, targetId: string, position: TabDropPosition): T[] {
  if (sourceId === targetId) return [...items];
  const source = items.find((item) => getId(item) === sourceId);
  if (!source || !items.some((item) => getId(item) === targetId)) return [...items];
  const remaining = items.filter((item) => getId(item) !== sourceId);
  const targetIndex = remaining.findIndex((item) => getId(item) === targetId);
  remaining.splice(targetIndex + (position === 'after' ? 1 : 0), 0, source);
  return remaining;
}

function tabRoot(target: EventTarget | null): TabRoot | undefined {
  return target instanceof Element ? target.closest<TabRoot>('[data-component="app-tab"]') ?? undefined : undefined;
}

function tabBar(tab: TabRoot): TabBarRoot | undefined {
  return tab.closest<TabBarRoot>('[data-component="tab-bar"]') ?? undefined;
}

function tabId(tab: TabRoot): string | undefined {
  return tab.dataset.tabId || undefined;
}

function barId(bar: TabBarRoot): string | undefined {
  return bar.dataset.tabBarId || undefined;
}

function positionFor(event: DragEvent, tab: TabRoot): TabDropPosition {
  const bounds = tab.getBoundingClientRect();
  return event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after';
}

function tabsIn(bar: TabBarRoot): HTMLButtonElement[] {
  return [...bar.querySelectorAll<HTMLButtonElement>('[data-kui-tab-list] [role="tab"]')];
}

function reveal(tab: HTMLElement | null | undefined): void {
  tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** Wire reordering and keyboard navigation while leaving controlled state in the application. */
export function wireTabBars(root: HTMLElement | Document, { onReorder }: WireTabBarsOptions): () => void {
  const ownerDocument = (root.nodeType === 9 ? root as Document : root.ownerDocument)!;
  const view = ownerDocument.defaultView!;
  let autoScroll: { strip: HTMLElement; velocity: number; frame: number | undefined; previousTime: number | undefined } | undefined;
  const stopAutoScroll = () => {
    if (!autoScroll) return;
    if (autoScroll.frame !== undefined) view.cancelAnimationFrame(autoScroll.frame);
    delete autoScroll.strip.dataset.tabAutoscroll;
    autoScroll = undefined;
  };
  const runAutoScroll = (time: number) => {
    const current = autoScroll;
    if (!current) return;
    current.frame = undefined;
    const elapsed = current.previousTime === undefined ? 1000 / 60 : Math.min(40, Math.max(1, time - current.previousTime));
    current.previousTime = time;
    const maximum = Math.max(0, current.strip.scrollWidth - current.strip.clientWidth);
    const previous = current.strip.scrollLeft;
    current.strip.scrollLeft = Math.max(0, Math.min(maximum, previous + current.velocity * elapsed / 1000));
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
    if ((direction < 0 && strip.scrollLeft <= 0) || (direction > 0 && strip.scrollLeft >= maximum)) {
      stopAutoScroll();
      return;
    }
    const speed = AUTO_SCROLL_MIN_PX_PER_SECOND + (AUTO_SCROLL_MAX_PX_PER_SECOND - AUTO_SCROLL_MIN_PX_PER_SECOND) * strength * strength;
    if (autoScroll?.strip !== strip) stopAutoScroll();
    autoScroll ??= { strip, velocity: 0, frame: undefined, previousTime: undefined };
    autoScroll.velocity = direction * speed;
    strip.dataset.tabAutoscroll = direction < 0 ? 'start' : 'end';
    autoScroll.frame ??= view.requestAnimationFrame(runAutoScroll);
  };
  let dragged: { barId: string; tabId: string } | undefined;
  const clearDropPositions = () => root.querySelectorAll<HTMLElement>('[data-tab-drop-position]').forEach((tab) => delete tab.dataset.tabDropPosition);
  const clear = () => {
    stopAutoScroll();
    dragged = undefined;
    root.querySelectorAll<HTMLElement>('[data-tab-dragging], [data-tab-drop-position]').forEach((tab) => {
      delete tab.dataset.tabDragging;
      delete tab.dataset.tabDropPosition;
    });
  };
  const afterControlledRender = (sourceBarId: string, sourceTabId: string) => globalThis.queueMicrotask(() => {
    const tab = [...root.querySelectorAll<TabRoot>('[data-component="app-tab"]')]
      .find((candidate) => {
        const candidateBar = tabBar(candidate);
        return tabId(candidate) === sourceTabId && candidateBar !== undefined && barId(candidateBar) === sourceBarId;
      });
    const button = tab?.querySelector<HTMLButtonElement>('[role="tab"]');
    button?.focus();
    reveal(button);
  });

  const onDragStart = (event: Event) => {
    const dragEvent = event as DragEvent;
    const tab = tabRoot(event.target);
    const bar = tab && tabBar(tab);
    const sourceId = tab && tabId(tab);
    const sourceBarId = bar && barId(bar);
    if (!tab || tab.getAttribute('draggable') !== 'true' || !sourceId || !sourceBarId) return;
    dragged = { barId: sourceBarId, tabId: sourceId };
    tab.dataset.tabDragging = 'true';
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = 'move';
      dragEvent.dataTransfer.setData('application/x-kerf-tab', `${sourceBarId}:${sourceId}`);
    }
  };
  const onDragOver = (event: Event) => {
    const dragEvent = event as DragEvent;
    const tab = tabRoot(event.target);
    const bar = event.target instanceof Element ? event.target.closest<TabBarRoot>('[data-component="tab-bar"]') ?? undefined : undefined;
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
    if (!tab || !targetId || targetId === dragged.tabId) return;
    tab.dataset.tabDropPosition = positionFor(dragEvent, tab);
    if (dragEvent.dataTransfer) dragEvent.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (event: Event) => {
    const dragEvent = event as DragEvent;
    const tab = tabRoot(event.target);
    const bar = tab && tabBar(tab);
    const targetId = tab && tabId(tab);
    const targetBarId = bar && barId(bar);
    if (!dragged || !tab || !targetId || targetId === dragged.tabId || targetBarId !== dragged.barId) {
      clear();
      return;
    }
    dragEvent.preventDefault();
    const change: TabReorder = { barId: dragged.barId, sourceId: dragged.tabId, targetId, position: positionFor(dragEvent, tab), source: 'pointer' };
    clear();
    onReorder(change);
    afterControlledRender(change.barId, change.sourceId);
  };
  const onKeyDown = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[role="tab"]') : null;
    const tab = button && tabRoot(button);
    const bar = tab && tabBar(tab);
    if (!button || !tab || !bar) return;
    if (keyboardEvent.key === 'Delete' || keyboardEvent.key === 'Backspace') {
      const close = tab.querySelector<HTMLButtonElement>('.kui-app-tab__close');
      if (!close) return;
      keyboardEvent.preventDefault();
      close.click();
      return;
    }
    const tabs = tabsIn(bar);
    const current = tabs.indexOf(button);
    if (current < 0) return;
    if (keyboardEvent.altKey && keyboardEvent.shiftKey && (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowRight')) {
      const target = tabs[current + (keyboardEvent.key === 'ArrowLeft' ? -1 : 1)];
      const sourceId = tabId(tab);
      const targetRoot = target && tabRoot(target);
      const targetId = targetRoot && tabId(targetRoot);
      const sourceBarId = barId(bar);
      if (!target || !sourceId || !targetId || !sourceBarId || tab.getAttribute('draggable') !== 'true') return;
      keyboardEvent.preventDefault();
      onReorder({ barId: sourceBarId, sourceId, targetId, position: keyboardEvent.key === 'ArrowLeft' ? 'before' : 'after', source: 'keyboard' });
      afterControlledRender(sourceBarId, sourceId);
      return;
    }
    let next: number | undefined;
    if (keyboardEvent.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (keyboardEvent.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (keyboardEvent.key === 'Home') next = 0;
    else if (keyboardEvent.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    keyboardEvent.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
    reveal(tabs[next]);
  };
  const onFocusIn = (event: Event) => {
    const tab = event.target instanceof HTMLElement && event.target.matches('[role="tab"]') ? event.target : undefined;
    reveal(tab);
  };

  root.addEventListener('dragstart', onDragStart);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('drop', onDrop);
  root.addEventListener('dragend', clear);
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('focusin', onFocusIn);
  root.querySelectorAll<HTMLElement>('[data-kui-tab-list] [role="tab"][aria-selected="true"]').forEach(reveal);

  return () => {
    clear();
    root.removeEventListener('dragstart', onDragStart);
    root.removeEventListener('dragover', onDragOver);
    root.removeEventListener('drop', onDrop);
    root.removeEventListener('dragend', clear);
    root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('focusin', onFocusIn);
  };
}
