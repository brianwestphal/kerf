const ITEM_SELECTOR =
  '[data-component="content-item"][data-interactive="true"]';
const NESTED_CONTROL_SELECTOR =
  'button, a[href], input, select, textarea, [contenteditable="true"], [role="button"]';
const MULTI_GRID_SELECTOR = '[role="grid"][aria-multiselectable="true"]';

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

/**
 * Give interactive ContentItems native-like Enter/Space activation with one
 * delegated listener pair. Space activates on release and is cancelled if
 * focus moves; the item's own `data-action` still goes through the app's
 * ordinary delegated click handler. Returns a disposer.
 */
export function wireContentItems(root: HTMLElement): () => void {
  let pendingSpace: HTMLElement | null = null;

  const clearSpace = () => {
    pendingSpace?.removeAttribute('data-kui-pressed');
    pendingSpace = null;
  };

  const keydown = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const item = actionItem(root, event);
    if (!item) return;
    if (
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
      const rows = Array.from(
        grid.querySelectorAll<HTMLElement>(
          `${ITEM_SELECTOR}[data-selection-mode="multiple"]:not([data-disabled="true"])`,
        ),
      ).filter((row) => row.closest(MULTI_GRID_SELECTOR) === grid);
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
      item.click();
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (event.repeat) return;
      clearSpace();
      pendingSpace = item;
      item.setAttribute('data-kui-pressed', 'true');
    }
  };

  const keyup = (event: KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Spacebar') return;
    const item = pendingSpace;
    if (!item) return;
    event.preventDefault();
    clearSpace();
    if (
      item === actionItem(root, event) &&
      item.ownerDocument.activeElement === item
    )
      item.click();
  };

  const focusout = (event: FocusEvent) => {
    if (event.target === pendingSpace) clearSpace();
  };

  root.addEventListener('keydown', keydown);
  root.addEventListener('keyup', keyup);
  root.addEventListener('focusout', focusout);
  return () => {
    clearSpace();
    root.removeEventListener('keydown', keydown);
    root.removeEventListener('keyup', keyup);
    root.removeEventListener('focusout', focusout);
  };
}
