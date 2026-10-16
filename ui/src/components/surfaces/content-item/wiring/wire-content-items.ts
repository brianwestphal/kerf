const ITEM_SELECTOR =
  '[data-component="content-item"][data-interactive="true"]';
const NESTED_CONTROL_SELECTOR =
  'button, a[href], input, select, textarea, [contenteditable="true"], [role="button"]';
const MULTI_GRID_SELECTOR = '[role="grid"][aria-multiselectable="true"]';
const MULTI_ROW_SELECTOR = `${ITEM_SELECTOR}[data-selection-mode="multiple"]`;

/** The enabled selectable rows of one multi-select grid, in order. */
function gridRows(grid: Element): HTMLElement[] {
  return Array.from(
    grid.querySelectorAll<HTMLElement>(
      `${MULTI_ROW_SELECTOR}:not([data-disabled="true"])`,
    ),
  ).filter((row) => row.closest(MULTI_GRID_SELECTOR) === grid);
}

function nextTile(
  item: HTMLElement,
  rows: HTMLElement[],
  key: string,
): HTMLElement | undefined {
  const current = item.getBoundingClientRect();
  const centerX = current.left + current.width / 2;
  const candidates = rows
    .filter((row) => row !== item)
    .map((row) => {
      const rect = row.getBoundingClientRect();
      return { row, x: rect.left + rect.width / 2, y: rect.top };
    });
  const sameLine = (y: number) => Math.abs(y - current.top) < 1;
  const directed = candidates.filter(({ x, y }) => {
    switch (key) {
      case 'ArrowLeft':
        return sameLine(y) && x < centerX;
      case 'ArrowRight':
        return sameLine(y) && x > centerX;
      case 'ArrowUp':
        return y < current.top - 1;
      default:
        return y > current.top + 1;
    }
  });
  directed.sort((a, b) => {
    if (key === 'ArrowLeft') return b.x - a.x;
    if (key === 'ArrowRight') return a.x - b.x;
    const vertical = Math.abs(a.y - current.top) - Math.abs(b.y - current.top);
    return vertical || Math.abs(a.x - centerX) - Math.abs(b.x - centerX);
  });
  return directed[0]?.row;
}

function actionItem(root: HTMLElement, event: Event) {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const item = target.closest<HTMLElement>(ITEM_SELECTOR);
  if (!item || !root.contains(item) || item.dataset.disabled === 'true')
    return null;
  // Composed events expose native controls inside a custom element's shadow
  // root even though event.target is retargeted to its host here.
  for (const node of event.composedPath()) {
    if (node === item) break;
    if (node instanceof Element && node.matches(NESTED_CONTROL_SELECTOR))
      return null;
  }
  return item;
}

/** True when a card action originated on the card rather than a nested control. */
export function isContentItemActivation(
  event: Event,
  item: HTMLElement,
): boolean {
  return actionItem(item, event) === item;
}

type ActivationModifiers = Pick<
  KeyboardEvent,
  'shiftKey' | 'ctrlKey' | 'metaKey'
>;

/**
 * Activate an item with a click that carries the activating key's modifier
 * state, so one delegated click handler serves pointer and keyboard
 * multi-selection alike (Shift extends a range, Cmd/Ctrl toggles one item).
 */
function activate(item: HTMLElement, modifiers: ActivationModifiers) {
  item.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: item.ownerDocument.defaultView,
      shiftKey: modifiers.shiftKey,
      ctrlKey: modifiers.ctrlKey,
      metaKey: modifiers.metaKey,
    }),
  );
}

/**
 * Give interactive ContentItems native-like Enter/Space activation with one
 * delegated listener pair. Space activates on release and is cancelled if
 * focus moves; the item's own `data-action` still goes through the app's
 * ordinary delegated click handler. The activation click mirrors the Shift,
 * Ctrl, and Meta state of the activating key (Space uses the state at press),
 * so the click handler can read `shiftKey` / `metaKey` / `ctrlKey` for
 * keyboard range and toggle selection. Alt-modified keys are left to the
 * platform. Returns a disposer.
 */
export function wireContentItems(root: HTMLElement): () => void {
  // Roving tabindex: each multi-select grid is one Tab stop, on the last
  // focused row, else the first selected, else the first enabled row.
  const activeRows = new WeakMap<Element, HTMLElement>();
  const rove = (grid: Element) => {
    const rows = gridRows(grid);
    const remembered = activeRows.get(grid);
    const stop =
      remembered && rows.includes(remembered)
        ? remembered
        : (rows.find((row) => row.getAttribute('aria-selected') === 'true') ??
          rows[0]);
    for (const row of rows) {
      const want = row === stop ? '0' : '-1';
      if (row.getAttribute('tabindex') !== want)
        row.setAttribute('tabindex', want);
    }
  };
  const grids = () =>
    [
      ...(root.matches(MULTI_GRID_SELECTOR) ? [root] : []),
      ...root.querySelectorAll(MULTI_GRID_SELECTOR),
    ] as Element[];
  // A re-render resets every row's tabindex to its template value, so the
  // roving stop is restored after each change (deduplicated per task).
  let roving = false;
  const scheduleRove = () => {
    if (roving) return;
    roving = true;
    globalThis.queueMicrotask(() => {
      roving = false;
      for (const grid of grids()) rove(grid);
    });
  };
  const View = root.ownerDocument.defaultView;
  const observer =
    View && 'MutationObserver' in View
      ? new View.MutationObserver(scheduleRove)
      : null;
  observer?.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['tabindex', 'aria-selected', 'data-disabled'],
  });
  for (const grid of grids()) rove(grid);

  const focusin = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>(MULTI_ROW_SELECTOR);
    const grid = row?.closest(MULTI_GRID_SELECTOR);
    if (!row || !grid || !root.contains(grid)) return;
    activeRows.set(grid, row);
    rove(grid);
  };

  let pendingSpace: {
    item: HTMLElement;
    modifiers: ActivationModifiers;
  } | null = null;

  const clearSpace = () => {
    pendingSpace?.item.removeAttribute('data-kui-pressed');
    pendingSpace = null;
  };

  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey) return;
    const item = actionItem(root, event);
    if (!item) return;
    const commandKey = event.ctrlKey || event.metaKey;
    if (
      !commandKey &&
      item.dataset.selectionMode === 'multiple' &&
      [
        'ArrowDown',
        'ArrowUp',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(event.key)
    ) {
      const grid = item.closest(MULTI_GRID_SELECTOR);
      if (!grid) return;
      const rows = gridRows(grid);
      const index = rows.indexOf(item);
      if (index < 0) return;
      const isTileGrid = grid.getAttribute('data-component') === 'grid';
      let next: HTMLElement | undefined;
      switch (event.key) {
        case 'Home':
          next = rows[0];
          break;
        case 'End':
          next = rows[rows.length - 1];
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          next = isTileGrid
            ? nextTile(item, rows, event.key)
            : rows[index + (event.key === 'ArrowDown' ? 1 : -1)];
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          next = isTileGrid ? nextTile(item, rows, event.key) : undefined;
          break;
      }
      if (next) {
        event.preventDefault();
        next.focus();
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      activate(item, event);
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (event.repeat) return;
      clearSpace();
      pendingSpace = {
        item,
        modifiers: {
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        },
      };
      item.setAttribute('data-kui-pressed', 'true');
    }
  };

  const keyup = (event: KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Spacebar') return;
    if (!pendingSpace) return;
    const { item, modifiers } = pendingSpace;
    event.preventDefault();
    clearSpace();
    if (
      item === actionItem(root, event) &&
      item.ownerDocument.activeElement === item
    )
      activate(item, modifiers);
  };

  const focusout = (event: FocusEvent) => {
    if (event.target === pendingSpace?.item) clearSpace();
  };

  root.addEventListener('keydown', keydown);
  root.addEventListener('keyup', keyup);
  root.addEventListener('focusout', focusout);
  root.addEventListener('focusin', focusin);
  return () => {
    clearSpace();
    observer?.disconnect();
    root.removeEventListener('focusin', focusin);
    root.removeEventListener('keydown', keydown);
    root.removeEventListener('keyup', keyup);
    root.removeEventListener('focusout', focusout);
  };
}
