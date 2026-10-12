/**
 * KF-VBQJAX — a large, list-free static tree, shaped like a real app page that
 * renders everything from one `mount()` with plain `.map()` (no `each()`).
 *
 * 300 rows × ~170 nodes each (nested `div`s, Web Awesome-style custom
 * elements, `aria-*` / `data-*` / `href` attributes, text), so the flattened
 * HTML lands around 1.5–2 MB — the Karwan Procurement demand page that the
 * ticket's profile came from. `selected` flips one row's `class` /
 * `aria-selected`: the one-attribute change whose re-render cost should scale
 * with the change, not with the whole page.
 *
 * Shared by `large-static-rerender.bench.ts` and by ad-hoc `node --cpu-prof`
 * profiling runs.
 */

import { jsx } from '../../src/jsx-runtime.js';
import type { SafeHtml } from '../../src/jsx-runtime.js';

export const ROWS = 300;

function cell(row: number, col: number): SafeHtml {
  return jsx('div', {
    className: 'cell',
    'data-col': col,
    children: [
      jsx('wa-icon', { name: 'circle', 'aria-hidden': 'true' }),
      jsx('span', {
        className: 'cell-label',
        title: `Row ${row} column ${col}`,
        children: `Value ${row}.${col} & more`,
      }),
      jsx('a', {
        href: `/demands/${row}/lines/${col}`,
        className: 'cell-link',
        children: jsx('wa-badge', {
          variant: 'neutral',
          pill: true,
          children: String(col * row),
        }),
      }),
    ],
  });
}

function menu(row: number): SafeHtml {
  const items: SafeHtml[] = [];
  for (let i = 0; i < 8; i++) {
    items.push(
      jsx('wa-dropdown-item', {
        value: `action-${i}`,
        'data-row': row,
        children: [
          jsx('wa-icon', { slot: 'icon', name: `icon-${i}` }),
          `Action ${i}`,
        ],
      }),
    );
  }
  return jsx('wa-dropdown', {
    placement: 'bottom-end',
    children: [
      jsx('wa-button', {
        slot: 'trigger',
        appearance: 'plain',
        size: 'small',
        'aria-label': `Row ${row} actions`,
        children: jsx('wa-icon', { name: 'ellipsis' }),
      }),
      ...items,
    ],
  });
}

function row(i: number, selected: boolean): SafeHtml {
  const cells: SafeHtml[] = [];
  for (let c = 0; c < 12; c++) cells.push(cell(i, c));
  return jsx('div', {
    className: selected ? 'row row--selected' : 'row',
    role: 'row',
    'aria-selected': selected ? 'true' : 'false',
    'data-key': `row-${i}`,
    children: [
      jsx('div', {
        className: 'row-head',
        children: [
          jsx('wa-checkbox', {
            checked: selected,
            'aria-label': `Select ${i}`,
          }),
          jsx('h3', { className: 'row-title', children: `Line item ${i}` }),
        ],
      }),
      jsx('div', { className: 'row-cells', children: cells }),
      menu(i),
    ],
  });
}

/** The whole page; `selected` is the index of the selected row (or -1). */
export function renderPage(selected: number): SafeHtml {
  const rows: SafeHtml[] = [];
  for (let i = 0; i < ROWS; i++) rows.push(row(i, i === selected));
  return jsx('main', {
    className: 'app',
    children: [
      jsx('header', {
        className: 'app-header',
        children: jsx('h1', { children: 'Demand 42' }),
      }),
      jsx('section', {
        className: 'lines',
        children: jsx('div', { role: 'grid', children: rows }),
      }),
    ],
  });
}

/** One line of the keyed-list variant; identity is what `each()` memoizes on. */
export interface Line {
  id: number;
}

export const LINES: readonly Line[] = Array.from({ length: ROWS }, (_, id) => ({
  id,
}));

/**
 * KF-03KWNV — the same page with its rows rendered through a memoized keyed
 * `each()`, plus a details pane whose text follows the selection. Selecting a
 * row re-renders two rows (their `cacheKey` flips) AND changes the static
 * surrounds, which is the shape that used to disqualify the change-scoped
 * morph.
 */
export function renderKeyedPage(selected: number, each: EachFn): SafeHtml {
  return jsx('main', {
    className: 'app',
    children: [
      jsx('header', {
        className: 'app-header',
        children: jsx('h1', { children: 'Demand 42' }),
      }),
      jsx('aside', {
        className: 'details',
        children: jsx('p', {
          children: selected < 0 ? 'Nothing selected' : `Line ${selected}`,
        }),
      }),
      jsx('section', {
        className: 'lines',
        children: jsx('div', {
          role: 'grid',
          children: each(LINES, (line) => row(line.id, line.id === selected), {
            key: 'lines',
            cacheKey: (line) => line.id === selected,
          }),
        }),
      }),
    ],
  });
}

/** `each()` as the fixture needs it, injected so this file stays DOM-free. */
export type EachFn = (
  items: readonly Line[],
  render: (line: Line) => SafeHtml,
  options: {
    key: string;
    cacheKey: (line: Line) => unknown;
  },
) => SafeHtml;
