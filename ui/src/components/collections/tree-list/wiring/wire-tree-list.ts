// KF-ECR4XG: keyboard navigation for TreeList, following the WAI-ARIA tree
// pattern. Expanding and collapsing click a row's disclosure arrow, so the
// application's `toggleAction` handler stays the one owner of `expanded`.
import { delegate } from 'kerfjs';

import {
  closedPopupMenuRoot,
  isPopupMenuOpen,
  openPopupMenu,
  openPopupMenuAt,
} from '../../../actions/popup-menu/popup-menu.js';
import {
  type TreeListDragOptions,
  wireTreeListDrag,
} from './tree-list-drag.js';

export type {
  TreeListDragOptions,
  TreeListDropPosition,
  TreeListExternalDrop,
  TreeListMove,
} from './tree-list-drag.js';
export { treeListExternalDrop } from './tree-list-drag.js';

const ROW = '.kui-tree-list > [role="treeitem"]';
const MENU = '[data-kui-tree-row-menu]';
const TYPEAHEAD_RESET_MS = 500;

const rowsOf = (row: HTMLElement) =>
  [...row.parentElement!.children].filter(
    (child): child is HTMLElement => child.getAttribute('role') === 'treeitem',
  );
const levelOf = (row: HTMLElement) => Number(row.getAttribute('aria-level'));
const labelOf = (row: HTMLElement) =>
  (
    row.querySelector('.kui-list-item__primary-label')?.textContent ?? ''
  ).trim();

/** Moves the tree's single Tab stop to `row` and focuses it. */
function focusRow(row: HTMLElement | undefined) {
  if (!row) return;
  for (const other of rowsOf(row)) other.tabIndex = other === row ? 0 : -1;
  row.focus();
}

/** Expands or collapses a row through its disclosure arrow's action. */
function toggle(row: HTMLElement) {
  row
    .querySelector<HTMLElement>('.kui-list-item__disclosure[data-action]')
    ?.click();
}

/**
 * Wires keyboard navigation for every TreeList under `root`:
 * - Down and Up move between visible rows; Home and End go to the first and
 *   last.
 * - Right expands a collapsed row, or moves into an expanded one's first
 *   child; Left collapses an expanded row, or moves to its parent.
 * - Enter and Space choose the row through its primary action.
 * - Shift+F10 and the context-menu key open a row's trailing menu when present.
 * - Typing letters moves to the next row whose label starts with them.
 * Focus keeps one Tab stop in the tree (roving tabindex). With `onMove`,
 * `draggable` rows also drag before, after, or inside other rows of their
 * tree; `canDrop` decides which drops are legal (KF-WXP6AB). Returns a
 * disposer.
 */
export function wireTreeList(
  root: HTMLElement,
  options: Partial<TreeListDragOptions> = {},
): () => void {
  let typed = '';
  let typedAt = 0;
  const menuOrigins = new WeakMap<HTMLElement, HTMLElement>();
  const showRowMenu = (
    row: HTMLElement,
    point?: { x: number; y: number },
  ): boolean => {
    const menu = row.querySelector<HTMLElement>(`:scope > ${MENU}`);
    if (!menu?.querySelector(':scope > button:not(:disabled)')) return false;
    if (point) openPopupMenuAt(menu, point.x, point.y);
    else openPopupMenu(menu);
    if (!isPopupMenuOpen(menu)) return false;
    menuOrigins.set(menu, row);
    return true;
  };
  const stopContext = delegate<HTMLElement>(
    root,
    'contextmenu',
    ROW,
    (event, row) => {
      if (
        event.defaultPrevented ||
        (event.target instanceof Element && event.target.closest(MENU))
      )
        return;
      const { clientX: x, clientY: y } = event as MouseEvent;
      if (showRowMenu(row, x || y ? { x, y } : undefined))
        event.preventDefault();
    },
  );
  const restoreMenuFocus = (event: Event) => {
    const menu = closedPopupMenuRoot(event);
    if (!menu) return;
    const row = menuOrigins.get(menu);
    menuOrigins.delete(menu);
    const trigger = menu.querySelector(':scope > button');
    if (row?.isConnected && root.ownerDocument.activeElement === trigger)
      row.focus({ preventScroll: true });
  };
  root.addEventListener('toggle', restoreMenuFocus, true);
  const stopFocus = delegate<HTMLElement>(root, 'focusin', ROW, (_e, row) => {
    for (const other of rowsOf(row)) other.tabIndex = other === row ? 0 : -1;
  });
  const stopKeys = delegate<HTMLElement>(root, 'keydown', ROW, (event, row) => {
    const key = event as KeyboardEvent;
    if (key.target !== row || key.ctrlKey || key.metaKey || key.altKey) return;
    if (
      (key.key === 'ContextMenu' || (key.shiftKey && key.key === 'F10')) &&
      showRowMenu(row)
    ) {
      key.preventDefault();
      return;
    }
    if (
      (key.key === 'Enter' || key.key === ' ') &&
      row.hasAttribute('data-kui-tree-menu-row')
    ) {
      if (!key.repeat)
        row
          .querySelector<HTMLElement>(
            ':scope > .kui-list-item__tree-primary[data-action]',
          )
          ?.click();
      key.preventDefault();
      return;
    }
    const rows = rowsOf(row);
    const index = rows.indexOf(row);
    const expanded = row.getAttribute('aria-expanded');
    let handled = true;
    switch (key.key) {
      case 'ArrowDown':
        focusRow(rows[index + 1]);
        break;
      case 'ArrowUp':
        focusRow(rows[index - 1]);
        break;
      case 'Home':
        focusRow(rows[0]);
        break;
      case 'End':
        focusRow(rows.at(-1));
        break;
      case 'ArrowRight':
        if (expanded === 'false') toggle(row);
        else if (
          expanded === 'true' &&
          rows[index + 1] &&
          levelOf(rows[index + 1]!) > levelOf(row)
        )
          focusRow(rows[index + 1]);
        break;
      case 'ArrowLeft':
        if (expanded === 'true') toggle(row);
        else {
          const level = levelOf(row);
          focusRow(
            rows
              .slice(0, index)
              .reverse()
              .find((candidate) => levelOf(candidate) < level),
          );
        }
        break;
      default:
        handled = typeahead(key, rows, index);
    }
    if (handled) key.preventDefault();
  });

  function typeahead(
    key: KeyboardEvent,
    rows: HTMLElement[],
    index: number,
  ): boolean {
    if (key.key.length !== 1 || key.key === ' ') return false;
    const now = Date.now();
    typed =
      now - typedAt > TYPEAHEAD_RESET_MS
        ? key.key.toLowerCase()
        : typed + key.key.toLowerCase();
    typedAt = now;
    // A repeated single letter cycles; a longer prefix may match the row
    // it started on.
    const start = typed.length === 1 ? index + 1 : index;
    const ordered = [...rows.slice(start), ...rows.slice(0, start)];
    focusRow(
      ordered.find((candidate) =>
        labelOf(candidate).toLowerCase().startsWith(typed),
      ),
    );
    return true;
  }

  const stopDrag = options.onMove
    ? wireTreeListDrag(root, { ...options, onMove: options.onMove })
    : () => {};

  return () => {
    stopFocus();
    stopKeys();
    stopContext();
    root.removeEventListener('toggle', restoreMenuFocus, true);
    stopDrag();
  };
}
