// @vitest-environment jsdom
/**
 * KF-417 — `each()` rows under a `<math>` parent keep the MathML namespace on
 * EVERY parse, not just the first.
 *
 * This is the KF-389 SVG bug one namespace over. First render inlines rows into
 * the mount root's `innerHTML`, where the surrounding `<math>` puts the parser
 * in foreign-content mode — so first paint was always correct. Every later parse
 * (granular insert, snapshot rebuild, replaced row) went through a bare
 * `<template>` in the HTML namespace and produced `HTMLUnknownElement`s that
 * don't render as math in a real browser. `parseRowTemplate` now wraps rows for
 * a MathML parent in `<math>…</math>` the same way it wraps SVG rows in `<svg>`.
 *
 * jsdom is required: happy-dom does not namespace `<math>` content at all (its
 * documented limitation), while jsdom matches real browsers — the same reason
 * `tests/unit/toElement.test.ts` overrides to jsdom for SVG. The MathML JSX tags
 * aren't in kerf's typed `IntrinsicElements`, so these use the `html` tagged
 * template, which routes through the identical row-parse machinery.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { html } from '../../src/html.js';
import { each, mount, signal } from '../../src/index.js';

const MATHML = 'http://www.w3.org/1998/Math/MathML';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

const nsOf = (sel: string): string | null | undefined => root.querySelector(sel)?.namespaceURI;

describe('KF-417: MathML each() rows keep their namespace across updates', () => {
  it('env sanity: jsdom namespaces <math> content (the whole reason this file is jsdom)', () => {
    root.innerHTML = '<math><mrow><mn>1</mn></mrow></math>';
    expect(nsOf('mrow')).toBe(MATHML);
  });

  it('a granular arraySignal insert keeps the new row in the MathML namespace', () => {
    const rows = arraySignal([{ id: 1 }]);
    const dispose = mount(root, () => html`<div><math>${
      each(rows, (r) => html`<mrow data-key="${String(r.id)}"><mn>${String(r.id)}</mn></mrow>`, { key: 'M' })
    }</math></div>`);
    expect(nsOf('[data-key="1"]')).toBe(MATHML); // first paint (never broken)
    rows.push({ id: 2 });
    expect(nsOf('[data-key="2"]')).toBe(MATHML); // the row that used to land in xhtml
    expect(nsOf('mn')).toBe(MATHML);             // and its descendants
    dispose();
  });

  it('a snapshot rebuild keeps every row in the MathML namespace', () => {
    const data = signal([{ id: 1, v: 1 }]);
    const dispose = mount(root, () => html`<div><math>${
      each(data.value, (r) => html`<mrow data-key="${String(r.id)}"><mn>${String(r.v)}</mn></mrow>`, { key: 'M' })
    }</math></div>`);
    data.value = [{ id: 1, v: 2 }, { id: 2, v: 3 }];
    expect(nsOf('[data-key="1"]')).toBe(MATHML);
    expect(nsOf('[data-key="2"]')).toBe(MATHML);
    dispose();
  });

  it('SVG rows are unaffected by the generalization (KF-389 unregressed)', () => {
    const SVG = 'http://www.w3.org/2000/svg';
    const rows = arraySignal([{ id: 1 }]);
    const dispose = mount(root, () => html`<svg>${
      each(rows, (r) => html`<g data-key="${String(r.id)}"><circle></circle></g>`, { key: 'S' })
    }</svg>`);
    rows.push({ id: 2 });
    expect(nsOf('[data-key="2"]')).toBe(SVG);
    expect(nsOf('circle')).toBe(SVG);
    dispose();
  });
});
