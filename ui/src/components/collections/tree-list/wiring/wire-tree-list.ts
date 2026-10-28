// KF-ECR4XG: keyboard navigation for TreeList, following the WAI-ARIA tree
// pattern. Expanding and collapsing click a row's disclosure arrow, so the
// application's `toggleAction` handler stays the one owner of `expanded`.
import { delegate } from 'kerfjs';

const ROW = '.kui-tree-list > [role="treeitem"]';
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
 * - Enter and Space choose the row (its native button click sends `action`).
 * - Typing letters moves to the next row whose label starts with them.
 * Focus keeps one Tab stop in the tree (roving tabindex). Returns a disposer.
 */
export function wireTreeList(root: HTMLElement): () => void {
  let typed = '';
  let typedAt = 0;
  const stopFocus = delegate<HTMLElement>(root, 'focusin', ROW, (_e, row) => {
    for (const other of rowsOf(row)) other.tabIndex = other === row ? 0 : -1;
  });
  const stopKeys = delegate<HTMLElement>(root, 'keydown', ROW, (event, row) => {
    const key = event as KeyboardEvent;
    if (key.ctrlKey || key.metaKey || key.altKey) return;
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

  return () => {
    stopFocus();
    stopKeys();
  };
}
