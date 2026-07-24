// @vitest-environment jsdom
/**
 * KF-420 — `each()` rows parented at a foreign-content HTML integration point are
 * ordinary HTML and must NOT be wrapped in `<svg>`/`<math>` on re-parse.
 *
 * This is the KF-417 bug at the OTHER integration points. `foreignWrapper`
 * originally excepted only SVG `<foreignObject>`, but the HTML parser also
 * re-enters HTML content unconditionally under SVG `<desc>`/`<title>` and the
 * MathML text integration points `<mi>/<mo>/<mn>/<ms>/<mtext>`. An HTML list
 * under one of these first-rendered correctly (rows inlined into the mount root's
 * innerHTML) but every LATER parse wrapped the rows: a breakout tag (`<div>`,
 * `<span>`) popped the wrapper — emptying it and throwing a bogus row-contract
 * error on a valid single-element row — and a non-breakout tag (`<abbr>`) came
 * back foreign-namespaced instead of XHTML.
 *
 * jsdom is required (happy-dom can't namespace `<math>` at all — the same reason
 * `kf417-*` and `toElement` use jsdom); MathML JSX tags aren't in kerf's typed
 * IntrinsicElements, so these use the `html` tagged template through the identical
 * row-parse machinery.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { html } from '../../src/html.js';
import { each, mount, signal } from '../../src/index.js';

const XHTML = 'http://www.w3.org/1999/xhtml';
const MATHML = 'http://www.w3.org/1998/Math/MathML';
const SVG = 'http://www.w3.org/2000/svg';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

const nsOf = (sel: string): string | null | undefined => root.querySelector(sel)?.namespaceURI;

describe('KF-420: HTML rows under a foreign integration point stay HTML on re-parse', () => {
  it('env sanity: jsdom parses <mtext> and <desc> children as HTML', () => {
    root.innerHTML = '<math><mtext><span id="a">x</span></mtext></math>';
    expect(nsOf('#a')).toBe(XHTML);
    root.innerHTML = '<svg><desc><div id="b">y</div></desc></svg>';
    expect(nsOf('#b')).toBe(XHTML);
  });

  it('breakout <span> rows under MathML <mtext>: a granular insert neither throws nor mis-namespaces', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }]);
    const dispose = mount(root, () => html`<math><mtext>${
      each(rows, (r) => html`<span data-key="${String(r.id)}">${r.t}</span>`, { key: 'M' })
    }</mtext></math>`);
    expect(nsOf('[data-key="1"]')).toBe(XHTML);
    expect(() => rows.push({ id: 2, t: 'b' })).not.toThrow();
    expect(nsOf('[data-key="2"]')).toBe(XHTML);
    dispose();
  });

  it('non-breakout <abbr> rows under MathML <mtext>: the inserted row stays HTML-namespaced', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }]);
    const dispose = mount(root, () => html`<math><mtext>${
      each(rows, (r) => html`<abbr data-key="${String(r.id)}">${r.t}</abbr>`, { key: 'M' })
    }</mtext></math>`);
    rows.push({ id: 2, t: 'b' });
    expect(nsOf('[data-key="2"]')).toBe(XHTML);
    dispose();
  });

  it('breakout <div> rows under SVG <desc>: a granular insert neither throws nor mis-namespaces', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }]);
    const dispose = mount(root, () => html`<svg><desc>${
      each(rows, (r) => html`<div data-key="${String(r.id)}">${r.t}</div>`, { key: 'S' })
    }</desc></svg>`);
    expect(nsOf('[data-key="1"]')).toBe(XHTML);
    expect(() => rows.push({ id: 2, t: 'b' })).not.toThrow();
    expect(nsOf('[data-key="2"]')).toBe(XHTML);
    dispose();
  });

  it('a snapshot rebuild under an integration point keeps all rows HTML', () => {
    const data = signal([{ id: 1, v: 1 }]);
    const dispose = mount(root, () => html`<svg><title>${
      each(data.value, (r) => html`<b data-key="${String(r.id)}">${String(r.v)}</b>`, { key: 'T' })
    }</title></svg>`);
    data.value = [{ id: 1, v: 2 }, { id: 2, v: 3 }];
    expect(nsOf('[data-key="1"]')).toBe(XHTML);
    expect(nsOf('[data-key="2"]')).toBe(XHTML);
    dispose();
  });

  it('MathML token element <mi> is also an HTML integration point', () => {
    const rows = arraySignal([{ id: 1 }]);
    const dispose = mount(root, () => html`<math><mi>${
      each(rows, (r) => html`<span data-key="${String(r.id)}">${String(r.id)}</span>`, { key: 'I' })
    }</mi></math>`);
    expect(() => rows.push({ id: 2 })).not.toThrow();
    expect(nsOf('[data-key="2"]')).toBe(XHTML);
    dispose();
  });

  it('rowContractError reports the count seen under the parent namespace (truthful message)', () => {
    // A <div> row directly under a REAL <math> (a wrapping parent, not an integration
    // point) is a genuine contract violation: <div> is an HTML breakout element, so the
    // <math> wrapper pops it out and comes back EMPTY (count 0). Pre-KF-420 the error
    // re-parsed the row WITHOUT the parent (HTML → count 1) and printed the
    // self-contradictory "produced 1 top-level elements; exactly one is required".
    // Start empty so the throw happens on the granular insert, not at first paint.
    const rows = arraySignal<{ id: number }>([]);
    const dispose = mount(root, () => html`<math>${
      each(rows, (r) => html`<div data-key="${String(r.id)}">${String(r.id)}</div>`, { key: 'D' })
    }</math>`);
    let msg = '';
    try {
      rows.push({ id: 1 });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('produced no top-level element');
    expect(msg).not.toContain('produced 1 top-level elements');
    dispose();
  });

  it('SVG <foreignObject> and ordinary <math>/<svg> parents are unregressed', () => {
    // foreignObject: HTML rows stay HTML (already worked pre-KF-420).
    const a = arraySignal([{ id: 1 }]);
    const d1 = mount(root, () => html`<svg><foreignObject>${
      each(a, (r) => html`<div data-key="${'fo' + String(r.id)}">${String(r.id)}</div>`, { key: 'FO' })
    }</foreignObject></svg>`);
    a.push({ id: 2 });
    expect(nsOf('[data-key="fo2"]')).toBe(XHTML);
    d1();

    // A real MathML row under <math> still wraps and namespaces correctly.
    root.innerHTML = '';
    const b = arraySignal([{ id: 1 }]);
    const d2 = mount(root, () => html`<math>${
      each(b, (r) => html`<mrow data-key="${'mr' + String(r.id)}"><mn>${String(r.id)}</mn></mrow>`, { key: 'MR' })
    }</math>`);
    b.push({ id: 2 });
    expect(nsOf('[data-key="mr2"]')).toBe(MATHML);
    expect(nsOf('mn')).toBe(MATHML);
    d2();

    // A real SVG row under <svg> still wraps and namespaces correctly.
    root.innerHTML = '';
    const c = arraySignal([{ id: 1 }]);
    const d3 = mount(root, () => html`<svg>${
      each(c, (r) => html`<g data-key="${'g' + String(r.id)}"><circle></circle></g>`, { key: 'G' })
    }</svg>`);
    c.push({ id: 2 });
    expect(nsOf('[data-key="g2"]')).toBe(SVG);
    d3();
  });
});
