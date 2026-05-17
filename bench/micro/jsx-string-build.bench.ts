/**
 * KF-202 — cost of building one row's HTML string via the JSX runtime.
 *
 * Every cache-miss row in `eachSnapshotById` calls `render(item)` which
 * invokes the JSX runtime to produce a `SafeHtml`, then `.toString()` on
 * it. This bench measures that path in isolation: the JSX-to-string
 * pipeline for a krausest-shaped row.
 *
 * Useful for:
 * - Sanity-checking that JSX evaluation isn't the bottleneck (it shouldn't
 *   be — it's mostly string concatenation + attribute escaping).
 * - Comparing to alternative approaches that skip JSX (raw string
 *   templates) if future investigation goes that way.
 *
 * Run: `npm run bench:micro`.
 */

import { bench, describe } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';

interface Row { id: number; label: string; danger: boolean }

const ROW: Row = { id: 1, label: 'pretty red house', danger: false };

function renderRowJsx(r: Row): string {
  const tr = jsx('tr', {
    'data-key': String(r.id),
    className: r.danger ? 'danger' : '',
    children: [
      jsx('td', { className: 'col-md-1', children: String(r.id) }),
      jsx('td', { className: 'col-md-4', children: jsx('a', { className: 'lbl', 'data-id': String(r.id), children: r.label }) }),
      jsx('td', { className: 'col-md-1', children: jsx('a', { className: 'remove', 'data-id': String(r.id), children: jsx('span', { className: 'glyphicon glyphicon-remove', 'aria-hidden': 'true' }) }) }),
      jsx('td', { className: 'col-md-6' }),
    ],
  });
  return tr.toString();
}

function renderRowStringConcat(r: Row): string {
  return `<tr data-key="${r.id}" class="${r.danger ? 'danger' : ''}">`
    + `<td class="col-md-1">${r.id}</td>`
    + `<td class="col-md-4"><a class="lbl" data-id="${r.id}">${r.label}</a></td>`
    + `<td class="col-md-1"><a class="remove" data-id="${r.id}"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>`
    + `<td class="col-md-6"></td>`
    + `</tr>`;
}

describe('jsx-string-build: row HTML construction', () => {
  bench('JSX runtime (jsx() → toString())', () => {
    renderRowJsx(ROW);
  });

  bench('Plain string concat (baseline for the floor)', () => {
    renderRowStringConcat(ROW);
  });
});
