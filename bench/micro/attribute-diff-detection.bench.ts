/**
 * KF-198 + KF-206 — detection cost of the granular update fast paths.
 *
 * The fast paths run BEFORE the parse-and-morph path on every update
 * patch. To pay, their detection cost has to be cheaper than the parse
 * they skip when they fire AND cheaper-on-net than just running the
 * parse-and-morph when they don't.
 *
 * Compare against `parse-row.bench.ts` — `parseRowTemplate` for a
 * krausest-shaped row is the cost the fast path avoids. The fast-path
 * detection must run in well under that time to pay.
 *
 * Run: `npm run bench:micro`.
 */

import { bench, describe } from 'vitest';

import {
  tryAttributeOnlyFastPath,
  tryTextContentFastPath,
} from '../../src/list-reconcile-fast-paths.js';

const ROW_BEFORE = '<tr data-key="1" class="">'
  + '<td class="col-md-1">1</td>'
  + '<td class="col-md-4"><a class="lbl" data-id="1">pretty red house</a></td>'
  + '<td class="col-md-1"><a class="remove" data-id="1"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>'
  + '<td class="col-md-6"></td>'
  + '</tr>';

const ROW_SELECTED = ROW_BEFORE.replace('class=""', 'class="danger"');
const ROW_LABEL_UPDATED = ROW_BEFORE.replace('pretty red house', 'pretty red house !!!');
const ROW_STRUCTURAL = ROW_BEFORE.replace(
  '<a class="lbl" data-id="1">pretty red house</a>',
  '<a class="lbl" data-id="1"><strong>pretty red house</strong></a>',
);

// Build live elements once per bench so the DOM allocation isn't measured.
function buildLive(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as Element;
}

describe('attribute-only fast path: detection cost', () => {
  const liveRow = buildLive(ROW_BEFORE);

  bench('tryAttributeOnlyFastPath — fires (class flip)', () => {
    tryAttributeOnlyFastPath(liveRow, ROW_BEFORE, ROW_SELECTED);
  });

  bench('tryAttributeOnlyFastPath — bails on text-only diff (must scan to first >)', () => {
    tryAttributeOnlyFastPath(liveRow, ROW_BEFORE, ROW_LABEL_UPDATED);
  });

  bench('tryAttributeOnlyFastPath — bails on structural diff', () => {
    tryAttributeOnlyFastPath(liveRow, ROW_BEFORE, ROW_STRUCTURAL);
  });
});

describe('text-content fast path: detection cost', () => {
  const liveRow = buildLive(ROW_BEFORE);

  bench('tryTextContentFastPath — fires (label change)', () => {
    tryTextContentFastPath(liveRow, ROW_BEFORE, ROW_LABEL_UPDATED);
  });

  bench('tryTextContentFastPath — bails on attribute-only diff (diff window has \'"\')', () => {
    tryTextContentFastPath(liveRow, ROW_BEFORE, ROW_SELECTED);
  });

  bench('tryTextContentFastPath — bails on structural diff', () => {
    tryTextContentFastPath(liveRow, ROW_BEFORE, ROW_STRUCTURAL);
  });
});
