/**
 * KF-393 — third adversarial sweep: the KF-385…KF-392 fix cadence audited as a
 * body of new code, plus the brand-new `each(items, render, { cacheKey, key })`
 * public surface probed adversarially.
 *
 * Layout mirrors the sweep's six areas (see
 * `docs/ai/test-gap-analysis-kf393.md`):
 *
 *  - options-API adversarial probes (empty options, colliding keys, mutation,
 *    SSR, `html` templates, multi-mount, later-render duplicates);
 *  - the identity-shift warning's false positives — fixed by KF-394;
 *  - the marker-comment key injection — rejected by KF-395 validation;
 *  - the row-structure tag check × SVG cross — fixed by KF-396;
 *  - the textarea text-content fast path's form-state sync — fixed by KF-397;
 *  - whole-morph focus capture/restore edges and row-region bounds — all
 *    correct, pinned asserting.
 *
 * Every regression test asserts the shipped behavior (never `.skip`).
 */
import { afterEach,beforeEach,describe,expect,it,type MockInstance,vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch,each,mount,signal } from '../../src/index.js';

let root: HTMLElement;
let warnSpy: MockInstance<typeof console.warn>;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  warnSpy.mockRestore();
});

describe('KF-393: row-region bounds and cross-fix interactions', () => {
  it('a KEYED marker run-move carries interlopers and keeps row identity, both toggle directions', () => {
    // Keys × the row-region move: the 2.6 lookahead matches marker data
    // exactly, so a `k:`-namespaced marker must move as a unit like a
    // call-order one — interloper carried, rows before the trailing sibling.
    const hd = signal(true);
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'main' })}
        <button class="more">more</button>
      </ul>
    ));
    const ul = root.querySelector('ul') as Element;
    const pres = document.createElement('div');
    pres.setAttribute('data-morph-preserve', '');
    ul.insertBefore(pres, root.querySelector('li[data-key="a"]'));
    const rowA = root.querySelector('li[data-key="a"]');

    hd.value = false;
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    // Rows precede the trailing button; the interloper stays where the
    // consumer put it (between marker and rows).
    const order = Array.from(ul.children).map((c) => c.tagName + (c.className ? `.${c.className}` : ''));
    expect(order).toEqual(['DIV', 'LI', 'LI', 'BUTTON.more']);

    hd.value = true;
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    const order2 = Array.from(ul.children).map((c) => c.tagName + (c.className ? `.${c.className}` : ''));
    expect(order2).toEqual(['LI.hd', 'DIV', 'LI', 'LI', 'BUTTON.more']);
    dispose();
  });

  it('two ADJACENT keyed lists survive a leading toggle — neither region absorbs the other', () => {
    const hd = signal(true);
    const a = arraySignal([{ id: 'a1' }, { id: 'a2' }]);
    const b = arraySignal([{ id: 'b1' }]);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(a, (r) => <li data-key={r.id} class="la">{r.id}</li>, { key: 'a' })}
        {each(b, (r) => <li data-key={r.id} class="lb">{r.id}</li>, { key: 'b' })}
        <button>tail</button>
      </ul>
    ));
    const a1 = root.querySelector('li[data-key="a1"]');
    const b1 = root.querySelector('li[data-key="b1"]');
    hd.value = false;
    expect(root.querySelector('li[data-key="a1"]')).toBe(a1);
    expect(root.querySelector('li[data-key="b1"]')).toBe(b1);
    const classes = Array.from((root.querySelector('ul') as Element).querySelectorAll('li'))
      .map((l) => l.className);
    expect(classes).toEqual(['la', 'la', 'lb']); // a-rows first, then b-rows
    // Both lists still reconcile against their own signals after the move.
    batch(() => { a.push({ id: 'a3' }); b.push({ id: 'b2' }); });
    expect(Array.from(root.querySelectorAll('li.la')).map((l) => l.textContent))
      .toEqual(a.value.map((r) => r.id));
    expect(Array.from(root.querySelectorAll('li.lb')).map((l) => l.textContent))
      .toEqual(b.value.map((r) => r.id));
    dispose();
  });

  it('an EMPTY keyed list at the very end of its parent survives a leading toggle and a later refill', () => {
    // afterListRegion's empty-list bound: the region is the bare marker; the
    // toggle moves it alone, and the refill lands rows after it correctly.
    const hd = signal(true);
    const a = arraySignal<{ id: string }>([]);
    const dispose = mount(root, () => (
      <ul>
        {hd.value ? <li class="hd">header</li> : ''}
        {each(a, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'a' })}
      </ul>
    ));
    hd.value = false;
    a.push({ id: 'x' });
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['x']);
    hd.value = true;
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['header', 'x']);
    dispose();
  });

  it('a keyed arraySignal list stays correct through replace() and back onto the granular path', () => {
    // Source guard × keys × replace(): replace routes to snapshot, and the
    // NEXT granular op applies to the rebuilt binding without drift.
    const rows = arraySignal([{ id: 'a' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'r' })}</ul>
    ));
    rows.replace([{ id: 'b' }, { id: 'c' }]);
    const rowB = root.querySelector('li[data-key="b"]');
    rows.push({ id: 'd' });
    expect(root.querySelector('li[data-key="b"]')).toBe(rowB); // granular kept identity
    expect(Array.from(root.querySelectorAll('li')).map((l) => l.textContent))
      .toEqual(rows.value.map((r) => r.id));
    dispose();
  });
});
