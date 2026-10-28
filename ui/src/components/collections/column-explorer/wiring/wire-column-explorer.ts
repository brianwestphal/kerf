// KF-JY68DQ: keyboard navigation for ColumnExplorer, and bringing a newly
// opened column into view. Choosing a row clicks it, so the application's
// `action` handler stays the one owner of the chosen path.
import { delegate } from 'kerfjs';

const EXPLORER = '[data-component="column-explorer"]';
const ROW = `${EXPLORER} .kui-list-item[data-column-explorer-level]`;
const TYPEAHEAD_RESET_MS = 500;

const levelOf = (row: HTMLElement) => Number(row.dataset.columnExplorerLevel);

/** The rows of one column of the explorer that holds `from`. */
function columnRows(from: HTMLElement, level: number): HTMLElement[] {
  return [
    ...from
      .closest(EXPLORER)!
      .querySelectorAll<HTMLElement>(
        `.kui-list-item[data-column-explorer-level="${level}"]`,
      ),
  ];
}

/** Moves a column's single Tab stop to `row` and focuses it. */
function focusRow(row: HTMLElement | undefined) {
  if (!row) return;
  for (const other of columnRows(row, levelOf(row)))
    other.tabIndex = other === row ? 0 : -1;
  row.focus();
}

/** The column's chosen row, or its first. */
function stopOf(rows: HTMLElement[]) {
  return rows.find((row) => row.getAttribute('aria-current')) ?? rows[0];
}

/**
 * Brings the explorer's last column into view by scrolling its track to the
 * end (a paged track snaps there). Only the track scrolls, never the page.
 */
function revealLastColumn(explorer: Element) {
  const track = explorer.querySelector<HTMLElement>('.kui-column-track')!;
  track.scrollLeft = track.scrollWidth;
}

/**
 * Wires every ColumnExplorer under `root`:
 * - Down and Up move within a column; Home and End go to its first and last.
 * - Right opens the focused row's column (choosing it) and moves into it;
 *   Left returns to the chosen row of the column before.
 * - Enter and Space choose the row (its native button click sends `action`).
 * - Typing letters moves to the next row in the column that starts with them.
 * The deepest column starts in view, and choosing a row brings the column it
 * opens into view. Returns a disposer.
 */
export function wireColumnExplorer(root: HTMLElement): () => void {
  let typed = '';
  let typedAt = 0;
  const view = root.ownerDocument.defaultView!;
  for (const explorer of root.querySelectorAll(EXPLORER))
    revealLastColumn(explorer);

  const stopChoose = delegate<HTMLElement>(root, 'click', ROW, (_e, row) => {
    const explorer = row.closest(EXPLORER)!;
    view.requestAnimationFrame(() => revealLastColumn(explorer));
  });

  const stopKeys = delegate<HTMLElement>(root, 'keydown', ROW, (event, row) => {
    const key = event as KeyboardEvent;
    if (key.ctrlKey || key.metaKey || key.altKey) return;
    const level = levelOf(row);
    const rows = columnRows(row, level);
    const index = rows.indexOf(row);
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
        if (row.dataset.expandable && row.dataset.action) {
          if (!row.getAttribute('aria-current')) row.click();
          focusRow(stopOf(columnRows(row, level + 1)));
        }
        break;
      case 'ArrowLeft':
        focusRow(stopOf(columnRows(row, level - 1)));
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
    const start = typed.length === 1 ? index + 1 : index;
    const ordered = [...rows.slice(start), ...rows.slice(0, start)];
    focusRow(
      ordered.find((candidate) =>
        (
          candidate.querySelector('.kui-list-item__primary-label')
            ?.textContent ?? ''
        )
          .trim()
          .toLowerCase()
          .startsWith(typed),
      ),
    );
    return true;
  }

  return () => {
    stopChoose();
    stopKeys();
  };
}
