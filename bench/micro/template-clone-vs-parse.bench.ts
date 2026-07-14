/**
 * KF-295 — profiling probe: template-clone vs build-string + innerHTML parse
 * for the create/replace/append path.
 *
 * Measures the JS-side work of instantiating 1,000 krausest-shape rows two
 * ways, isolating what a runtime template-clone would save vs kerf's current
 * build-string-then-parse:
 *
 *   A. CURRENT: build 1,000 row HTML strings, join, one `template.innerHTML`
 *      parse (what `buildFreshNodes` does today).
 *   B. TEMPLATE-CLONE: parse ONE skeleton into a `<template>` once, then per
 *      row `cloneNode(true)` + fill the 2 text holes + 1 attribute (what
 *      Solid/Lit/blockdom do).
 *
 * Plus the two sub-costs of A in isolation (string-build only, parse only) so
 * the note can attribute the split.
 *
 * happy-dom has no layout engine, so this measures exactly the JS work
 * template-clone targets (real-browser create adds layout to BOTH approaches
 * equally, so the RELATIVE JS improvement here is an upper bound on the
 * real-browser create-path win). Run: `npm run bench:micro`.
 */

import { bench, describe } from 'vitest';

interface Row { id: number; label: string }
const N = 1000;
const ADJ = ['pretty', 'large', 'big', 'small', 'tall'];
const rows: Row[] = Array.from({ length: N }, (_, i) => ({ id: i + 1, label: `${ADJ[i % 5]} red chair` }));

// One row's HTML (krausest shape: <tr data-key><td>id</td><td><a>label</a></td> + 2 static cells).
const rowHtml = (r: Row): string =>
  `<tr data-key="${r.id}"><td class="col-md-1">${r.id}</td>`
  + `<td class="col-md-4"><a class="lbl">${r.label}</a></td>`
  + `<td class="col-md-1"><a class="remove"><span class="glyphicon glyphicon-remove"></span></a></td>`
  + `<td class="col-md-6"></td></tr>`;

const SKELETON = '<tr data-key=""><td class="col-md-1"></td>'
  + '<td class="col-md-4"><a class="lbl"></a></td>'
  + '<td class="col-md-1"><a class="remove"><span class="glyphicon glyphicon-remove"></span></a></td>'
  + '<td class="col-md-6"></td></tr>';

describe('create 1k rows: instantiate strategies (JS work only)', () => {
  bench('A. current — build 1k strings + one innerHTML parse', () => {
    let s = '';
    for (let i = 0; i < N; i++) s += rowHtml(rows[i]);
    const tpl = document.createElement('template');
    tpl.innerHTML = s;
    // Walk to force realization of every node (mirrors buildFreshNodes).
    let n = tpl.content.firstElementChild;
    while (n) n = n.nextElementSibling;
  });

  // Parse the skeleton once (module scope of the bench body would re-run per
  // iteration; do it here but note it is amortized to ~0 across N rows).
  bench('B. template-clone — clone 1k + fill holes', () => {
    const skelTpl = document.createElement('template');
    skelTpl.innerHTML = SKELETON;
    const proto = skelTpl.content.firstElementChild as Element;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < N; i++) {
      const r = rows[i];
      const el = proto.cloneNode(true) as Element;
      el.setAttribute('data-key', String(r.id));
      // hole 1: first td text = id
      (el.firstElementChild as Element).textContent = String(r.id);
      // hole 2: the .lbl anchor text = label
      (el.querySelector('a.lbl') as Element).textContent = r.label;
      frag.appendChild(el);
    }
  });
});

describe('create 1k rows: sub-cost attribution of approach A', () => {
  bench('A1. string-build only (no parse)', () => {
    let s = '';
    for (let i = 0; i < N; i++) s += rowHtml(rows[i]);
    if (s.length < 0) throw new Error('unreachable');
  });

  // Pre-build the big string once so this bench measures ONLY the parse.
  const big = (() => { let s = ''; for (let i = 0; i < N; i++) s += rowHtml(rows[i]); return s; })();
  bench('A2. innerHTML parse only (string prebuilt)', () => {
    const tpl = document.createElement('template');
    tpl.innerHTML = big;
    let n = tpl.content.firstElementChild;
    while (n) n = n.nextElementSibling;
  });
});
