/**
 * KF-387 — second adversarial sweep: the cross-subsystem seams NOBODY had
 * walked (the KF-380 matrix swept only morph × bindings × owned rows).
 *
 * Each describe below is one seam from the KF-387 seam inventory
 * (docs/ai/test-gap-analysis-kf387.md), probed through the public API only.
 * Four seams turned out to be broken, not merely untested. Their fixes have
 * shipped, and the tests below now assert the corrected behavior:
 *
 *   - KF-388 — wrong-list patch routing is fixed; an unkeyed call-order shift
 *     still has the documented cost of rebuilding row identity.
 *   - KF-389 — each() rows inside <svg> keep their namespace on every parse.
 *   - KF-390 — the attribute-only row fast path synchronizes form properties.
 *   - KF-391 — each() of <tr> directly under <table> fails actionably when the
 *     parser inserts a tbody, rather than silently misbinding and duplicating.
 *
 * The rest pin documented claims verified true by execution (the KF-383
 * lesson: run the claim, don't read the code).
 */
import { beforeEach,describe,expect,it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each,mount,signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('KF-387 seam: SVG × list reconcile', () => {
  it('a conditional SVG element in the static surrounds gets the SVG namespace when the morph inserts it', () => {
    // docs/7's "mount() is enough with an <svg> root" claim, verified true
    // for the static-surrounds diff: the template parse sees the <svg>
    // context, so foreign-content mode applies.
    const on = signal(false);
    const dispose = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {on.value ? <circle class="dot" cx="1" cy="1" r="1" /> : ''}
        <rect x="0" y="0" width="2" height="2" />
      </svg>
    ));
    on.value = true;
    expect((root.querySelector('.dot') as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
    on.value = false;
    on.value = true; // round trip: still correctly namespaced
    expect((root.querySelector('.dot') as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
    dispose();
  });

  it('each() rows inside an svg root keep the SVG namespace through every post-first-render parse', () => {
    // KF-389 (fixed): each() rows inside <svg> keep the SVG namespace on
    // EVERY parse, not just the first render. Rows used to be re-parsed
    // through a bare HTML <template> that never saw the <svg> context, so a
    // granular insert, a snapshot append, and a structural update each
    // produced HTML-namespace nodes a real browser will not paint — and
    // because first render was correct, it presented as a flake. Row parsing
    // is now namespace-aware (utils/rowContract.ts).
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Granular insert.
    const pts = arraySignal([{ id: 'p1' }]);
    const dispose1 = mount(root, () => (
      <svg viewBox="0 0 10 10">{each(pts, (p) => <circle data-key={p.id} cx="1" cy="1" r="1" />)}</svg>
    ));
    expect((root.querySelector('circle[data-key="p1"]') as Element).namespaceURI).toBe(SVG_NS);
    pts.push({ id: 'p2' });
    expect((root.querySelector('circle[data-key="p2"]') as Element).namespaceURI)
      .toBe(SVG_NS);
    dispose1();
    root.innerHTML = '';

    // Snapshot append (plain array, new row identity).
    const list = signal([{ id: 's1' }]);
    const dispose2 = mount(root, () => (
      <svg viewBox="0 0 10 10">{each(list.value, (p) => <circle data-key={p.id} cx="1" cy="1" r="1" />)}</svg>
    ));
    list.value = [...list.value, { id: 's2' }];
    expect((root.querySelector('circle[data-key="s2"]') as Element).namespaceURI)
      .toBe(SVG_NS);
    dispose2();
    root.innerHTML = '';

    // Granular structural update (row replaced).
    const shapes = arraySignal([{ id: 'g1', big: false }]);
    const dispose3 = mount(root, () => (
      <svg viewBox="0 0 10 10">
        {each(shapes, (p) => (p.big
          ? <g data-key={p.id}><circle cx="1" cy="1" r="5" /></g>
          : <circle data-key={p.id} cx="1" cy="1" r="1" />))}
      </svg>
    ));
    shapes.update(0, (r) => ({ ...r, big: true }));
    expect((root.querySelector('g') as Element).namespaceURI)
      .toBe(SVG_NS);
    dispose3();
  });
});
