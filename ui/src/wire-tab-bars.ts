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
  let dragged: { barId: string; tabId: string } | undefined;
  const clear = () => {
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
    const bar = tab && tabBar(tab);
    const targetId = tab && tabId(tab);
    const targetBarId = bar && barId(bar);
    if (!dragged || !tab || !targetId || targetId === dragged.tabId || targetBarId !== dragged.barId) return;
    dragEvent.preventDefault();
    root.querySelectorAll<HTMLElement>('[data-tab-drop-position]').forEach((candidate) => delete candidate.dataset.tabDropPosition);
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
