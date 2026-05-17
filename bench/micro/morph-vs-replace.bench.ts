/**
 * KF-202 — morph() vs replaceChild() for a kerf-typical row.
 *
 * This is the retrospective check that would have caught the KF-201
 * nothingburger before we shipped it. KF-201 swapped `liveParent.replaceChild
 * (newNode, oldEntry.node)` for `_morphElement(oldEntry.node, newNode)` in
 * the granular reconciler, expecting partial-update to drop from 44.6ms to
 * ~25-30ms. The krausest rerun showed it landed at 46.8ms — flat. This
 * microbench answers WHY: on a kerf-typical 4-cell `<tr>` row, morph's
 * walk-and-compare cost is roughly equivalent to the layout cost
 * replaceChild incurs.
 *
 * Scenarios:
 * - **attribute-only diff** (select-row pattern): top-level `class` flips
 *   `""` ↔ `"danger"`; everything below is byte-identical.
 * - **text-node diff** (partial-update pattern): one descendant `<a>`'s
 *   text content gets ` !!!` appended.
 * - **no diff** (isEqualNode short-circuit): old and new HTMLs are
 *   byte-identical; both ops should be near-free.
 *
 * Run: `npm run bench:micro`. Reads in seconds; informative, not gating.
 */

import { bench, describe } from 'vitest';

import { _morphElement } from '../../src/morph.js';
import { parseRowTemplate } from '../../src/utils/rowContract.js';

const KRAUSEST_ROW_TEMPLATE = (id: number, label: string, danger: boolean): string =>
  `<tr data-key="${id}" class="${danger ? 'danger' : ''}">`
  + `<td class="col-md-1">${id}</td>`
  + `<td class="col-md-4"><a class="lbl" data-id="${id}">${label}</a></td>`
  + `<td class="col-md-1"><a class="remove" data-id="${id}"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>`
  + `<td class="col-md-6"></td>`
  + `</tr>`;

/** Build a live row + a parent for it. Parent has no other siblings. */
function buildLiveRow(html: string): { parent: Element; row: Element } {
  const parent = document.createElement('tbody');
  parent.innerHTML = html;
  return { parent, row: parent.firstElementChild as Element };
}

/** Parse one row HTML into an Element. */
function parseRow(html: string): Element {
  return parseRowTemplate(html).tpl.content.firstElementChild as Element;
}

describe('morph-vs-replace: attribute-only diff on top-level <tr> (select-row pattern)', () => {
  const oldHtml = KRAUSEST_ROW_TEMPLATE(1, 'pretty red house', false);
  const newHtml = KRAUSEST_ROW_TEMPLATE(1, 'pretty red house', true);

  bench('replaceChild (pre-KF-201 path)', () => {
    const { parent, row } = buildLiveRow(oldHtml);
    const newRow = parseRow(newHtml);
    parent.replaceChild(newRow, row);
  });

  bench('_morphElement (post-KF-201 path)', () => {
    const { row } = buildLiveRow(oldHtml);
    const newRow = parseRow(newHtml);
    _morphElement(row, newRow);
  });
});

describe('morph-vs-replace: text-node diff inside <a> (partial-update pattern)', () => {
  const oldHtml = KRAUSEST_ROW_TEMPLATE(1, 'pretty red house', false);
  const newHtml = KRAUSEST_ROW_TEMPLATE(1, 'pretty red house !!!', false);

  bench('replaceChild (pre-KF-201 path)', () => {
    const { parent, row } = buildLiveRow(oldHtml);
    const newRow = parseRow(newHtml);
    parent.replaceChild(newRow, row);
  });

  bench('_morphElement (post-KF-201 path)', () => {
    const { row } = buildLiveRow(oldHtml);
    const newRow = parseRow(newHtml);
    _morphElement(row, newRow);
  });
});

describe('morph-vs-replace: no diff (isEqualNode short-circuit)', () => {
  const html = KRAUSEST_ROW_TEMPLATE(1, 'pretty red house', false);

  bench('replaceChild (still does the swap even though identical)', () => {
    const { parent, row } = buildLiveRow(html);
    const newRow = parseRow(html);
    parent.replaceChild(newRow, row);
  });

  bench('_morphElement (isEqualNode short-circuit makes this near-free)', () => {
    const { row } = buildLiveRow(html);
    const newRow = parseRow(html);
    _morphElement(row, newRow);
  });
});
