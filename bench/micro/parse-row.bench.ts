/**
 * KF-202 — cost of parsing one row's HTML string via `parseRowTemplate`.
 *
 * This is `template.innerHTML = ...` for a single row. It's the cost
 * driver KF-198 (surgical attribute-only updates) is trying to avoid for
 * the select-row case: if the new and old row HTMLs differ only in a
 * top-level attribute value, KF-198 would skip this parse entirely and
 * just call `setAttribute` on the live node.
 *
 * The bench answers: "if KF-198 lets us skip this for attribute-only
 * diffs, how much do we save per row?"
 *
 * Run: `npm run bench:micro`.
 */

import { bench, describe } from 'vitest';

import { parseRowTemplate } from '../../src/utils/rowContract.js';

const KRAUSEST_ROW_HTML = '<tr data-key="1" class="">'
  + '<td class="col-md-1">1</td>'
  + '<td class="col-md-4"><a class="lbl" data-id="1">pretty red house</a></td>'
  + '<td class="col-md-1"><a class="remove" data-id="1"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>'
  + '<td class="col-md-6"></td>'
  + '</tr>';

describe('parse-row: parseRowTemplate cost for a krausest-shaped row', () => {
  bench('parseRowTemplate (single row)', () => {
    parseRowTemplate(KRAUSEST_ROW_HTML);
  });
});

describe('parse-row: bulk-parse 100 rows in one innerHTML call', () => {
  // Bulk-parse is what KF-94 / applyBulkUpdate uses — 100 row HTMLs joined
  // and parsed in one innerHTML. This is the partial-update path's main
  // parse cost.
  const bulkHtml = Array.from({ length: 100 }, (_, i) =>
    KRAUSEST_ROW_HTML.replace('"1"', `"${i + 1}"`).replace('>1<', `>${i + 1}<`),
  ).join('');

  bench('parseRowTemplate (100 rows joined)', () => {
    parseRowTemplate(bulkHtml);
  });
});
