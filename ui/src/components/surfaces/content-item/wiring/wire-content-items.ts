import { createKeyActivation } from '../../../../shared/dom/key-activation.js';
import {
  LINEAR_NAVIGATION_KEYS,
  linearNavigationTarget,
  wireRovingTabindex,
} from '../../../../shared/dom/roving-tabindex.js';
import { wireContentItemMedia } from './wire-content-item-media.js';

const ITEM_SELECTOR =
  '[data-component="content-item"][data-interactive="true"]';
const NESTED_CONTROL_SELECTOR =
  'button, a[href], input, select, textarea, [contenteditable="true"], [role="button"]';
const MULTI_GRID_SELECTOR = '[role="grid"][aria-multiselectable="true"]';
const MULTI_ROW_SELECTOR = `${ITEM_SELECTOR}[data-selection-mode="multiple"]`;
const LISTBOX_SELECTOR = '[role="listbox"]:not([aria-multiselectable="true"])';
const OPTION_SELECTOR = `${ITEM_SELECTOR}[data-selection-mode="single"]`;

/** The enabled selectable rows of one multi-select grid, in order. */
function gridRows(grid: Element): HTMLElement[] {
  return Array.from(
    grid.querySelectorAll<HTMLElement>(
      `${MULTI_ROW_SELECTOR}:not([data-disabled="true"])`,
    ),
  ).filter((row) => row.closest(MULTI_GRID_SELECTOR) === grid);
}

/** The enabled options of one single-select listbox, in order. */
function listboxOptions(listbox: Element): HTMLElement[] {
  return Array.from(
    listbox.querySelectorAll<HTMLElement>(
      `${OPTION_SELECTOR}:not([data-disabled="true"])`,
    ),
  ).filter((option) => option.closest(LISTBOX_SELECTOR) === listbox);
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

/**
 * Give interactive ContentItems native-like Enter/Space activation with one
 * delegated listener pair. Space activates on release and is cancelled if
 * focus moves; the item's own `data-action` still goes through the app's
 * ordinary delegated click handler. The activation click mirrors the Shift,
 * Ctrl, and Meta state of the activating key (Space uses the state at press),
 * so the click handler can read `shiftKey` / `metaKey` / `ctrlKey` for
 * keyboard range and toggle selection. Alt-modified keys are left to the
 * platform.
 *
 * A multi-select grid of `selectionMode="multiple"` rows and a single-select
 * listbox of `selectionMode="single"` options are each one Tab stop (roving
 * `tabindex`); Up/Down/Home/End move focus between their enabled items, and
 * a `Grid` also moves Left/Right along its rendered lines. Selection stays the
 * app's. Kerf skips any key event that is already `defaultPrevented`, so an
 * app overrides a key by handling it first (on the item, in the capture
 * phase, or from a listener added to the same root before wiring) and calling
 * `preventDefault()`. Returns a disposer.
 */
export function wireContentItems(root: HTMLElement): () => void {
  const stopMedia = wireContentItemMedia(root);
  const stopRoving = wireRovingTabindex(root, {
    containerSelector: `${MULTI_GRID_SELECTOR}, ${LISTBOX_SELECTOR}`,
    items: (container) =>
      container.matches(MULTI_GRID_SELECTOR)
        ? gridRows(container)
        : listboxOptions(container),
    itemFor: (target) =>
      target.closest<HTMLElement>(`${MULTI_ROW_SELECTOR}, ${OPTION_SELECTOR}`),
  });
  const activation = createKeyActivation((event) => actionItem(root, event));

  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey) return;
    const item = actionItem(root, event);
    if (!item) return;
    const commandKey = event.ctrlKey || event.metaKey;
    const mode = item.dataset.selectionMode;
    if (
      !commandKey &&
      (mode === 'multiple' || mode === 'single') &&
      [...LINEAR_NAVIGATION_KEYS, 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      const container = item.closest(
        mode === 'multiple' ? MULTI_GRID_SELECTOR : LISTBOX_SELECTOR,
      );
      if (!container) return;
      const items =
        mode === 'multiple' ? gridRows(container) : listboxOptions(container);
      const index = items.indexOf(item);
      if (index < 0) return;
      const isTileGrid = container.getAttribute('data-component') === 'grid';
      const next =
        isTileGrid && event.key.startsWith('Arrow')
          ? nextTile(item, items, event.key)
          : linearNavigationTarget(items, index, event.key);
      if (next) {
        event.preventDefault();
        next.focus();
      }
      return;
    }
    activation.keydown(event, item);
  };

  root.addEventListener('keydown', keydown);
  root.addEventListener('keyup', activation.keyup);
  root.addEventListener('focusout', activation.focusout);
  return () => {
    stopMedia();
    activation.clear();
    stopRoving();
    root.removeEventListener('keydown', keydown);
    root.removeEventListener('keyup', activation.keyup);
    root.removeEventListener('focusout', activation.focusout);
  };
}
