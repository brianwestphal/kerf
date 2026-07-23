/**
 * KF-387 — the `html` tagged template × morph × bindings × owned-row seam,
 * swept adversarially.
 *
 * Why this file exists: every reconciler defect in the KF-374 → KF-386 run
 * (dropped static siblings of a bound hole, a conditional sibling emptying a
 * keyed list, stranded-row duplication, the wedge/unit-move pair) was found,
 * fixed, and regression-guarded exclusively through the JSX front-end. The
 * `html` tagged template is a SECOND authoring front-end over the identical
 * runtime machinery — and it had never been walked through a single one of
 * those shapes. "html`` shares the JSX runtime paths" was an architectural
 * claim, not an asserted behavior. This file asserts it: each test replays a
 * named bug shape through `html` templates only, multi-step and round-trip
 * (both toggle directions — the KF-385 second manifestation was a
 * return-direction bug).
 *
 * Everything here passes today; the value is pinning the shared-machinery
 * claim so an html``-only divergence (its own static-chunk shapes, its own
 * marker-attribute injection point, no camelCase aliasing) fails loudly.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { html } from '../../src/html.js';
import { computed, each, mount, signal } from '../../src/index.js';

interface Item { id: string; label: string }
const ROWS: Item[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
];

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

function labels(scope: HTMLElement = root): string[] {
  return Array.from(scope.querySelectorAll('li:not(.hd)')).map((li) => li.textContent ?? '');
}

describe('KF-387 html`` seam: conditional siblings around a keyed list (KF-377/KF-381/KF-382 shapes)', () => {
  it('html template: a conditional sibling before a keyed list survives the round trip with row identity', () => {
    const banner = signal(false);
    const dispose = mount(root, () => html`<div>
      ${banner.value ? html`<div class="banner">warn</div>` : ''}
      <ul>${each(ROWS, (r) => html`<li data-key="${r.id}">${r.label}</li>`)}</ul>
    </div>`);
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');

    banner.value = true;
    expect(labels()).toEqual(['A', 'B']);
    banner.value = false; // the KF-377 direction: container shifts one slot left
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA); // moved, not rebuilt
    banner.value = true; // and back again
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    dispose();
  });

  it('html template: a conditional header INSIDE the list parent before the marker keeps rows single and identical', () => {
    // KF-381 shape 1 / KF-382 marker unit-move, authored via html``.
    const hd = signal(true);
    const dispose = mount(root, () => html`<ul>${hd.value ? html`<li class="hd">header</li>` : ''}${each(ROWS, (r) => html`<li data-key="${r.id}">${r.label}</li>`)}</ul>`);
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');

    hd.value = false;
    expect(labels()).toEqual(['A', 'B']); // no duplication (KF-381), no emptying (KF-377)
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA); // marker moved with its run (KF-382)
    hd.value = true;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    dispose();
  });

  it('html template: a trailing template sibling cannot wedge between the marker and its rows', () => {
    // The KF-382 wedge shape via html``: rows must still precede the trailing
    // button after the header toggles off.
    const hd = signal(true);
    const dispose = mount(root, () => html`<ul>${hd.value ? html`<li class="hd">header</li>` : ''}${each(ROWS, (r) => html`<li data-key="${r.id}">${r.label}</li>`)}<button class="more">more</button></ul>`);
    expect(labels()).toEqual(['A', 'B']);
    hd.value = false;
    expect(labels()).toEqual(['A', 'B']);
    const tags = Array.from((root.querySelector('ul') as HTMLElement).children)
      .map((el) => el.tagName.toLowerCase() + (el.className ? `.${el.className}` : ''));
    expect(tags).toEqual(['li', 'li', 'button.more']);
    hd.value = true; // round trip: header re-inserts BEFORE the marker again
    expect(labels()).toEqual(['A', 'B']);
    const tagsBack = Array.from((root.querySelector('ul') as HTMLElement).children)
      .map((el) => el.tagName.toLowerCase() + (el.className ? `.${el.className}` : ''));
    expect(tagsBack).toEqual(['li.hd', 'li', 'li', 'button.more']);
    dispose();
  });

  it('html template: keying the LIST CONTAINER protects it from a same-tag conditional sibling in both directions', () => {
    // The KF-383 documented escape hatch, exercised through html`` (static
    // attributes in the template chunk, not JSX attrs).
    const banner = signal(true);
    const dispose = mount(root, () => html`<div>
      ${banner.value ? html`<ul class="banner"><li class="hd">warn</li></ul>` : ''}
      <ul class="list" data-key="the-list">${each(ROWS, (r) => html`<li data-key="${r.id}">${r.label}</li>`)}</ul>
    </div>`);
    expect(labels()).toEqual(['A', 'B']);
    const rowA = root.querySelector('li[data-key="a"]');

    banner.value = false;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    banner.value = true;
    expect(labels()).toEqual(['A', 'B']);
    expect(root.querySelector('li[data-key="a"]')).toBe(rowA);
    expect(labels(root.querySelector('ul.banner') as HTMLElement)).toEqual([]);
    dispose();
  });

  it('html template: an arraySignal list stays granular-patchable after both toggle directions', () => {
    const banner = signal(false);
    const rows = arraySignal<Item>([...ROWS]);
    const dispose = mount(root, () => html`<div>
      ${banner.value ? html`<div class="banner">warn</div>` : ''}
      <ul>${each(rows, (r) => html`<li data-key="${r.id}">${r.label}</li>`)}</ul>
    </div>`);
    banner.value = true;
    rows.push({ id: 'c', label: 'C' }); // granular insert after the morph
    expect(labels()).toEqual(['A', 'B', 'C']);
    banner.value = false; // the KF-377 shift direction
    rows.remove(0); // granular remove after the shift
    expect(labels()).toEqual(['B', 'C']);
    rows.update(0, (r) => ({ ...r, label: 'B!' })); // granular update too
    expect(labels()).toEqual(['B!', 'C']);
    dispose();
  });
});

describe('KF-387 html`` seam: fine-grained holes × structural morphs (KF-374 shape)', () => {
  it('html template: a bound text hole sharing its parent with static tail text survives morph cycles with the current value', () => {
    // The exact KF-374 time-label shape, authored via html``: the static
    // ' / 0:05' tail must survive every structural re-render, and a rebuild
    // must re-wire with the CURRENT signal value, not the initial one.
    const banner = signal(false);
    const v = signal('0:01');
    const dispose = mount(root, () => html`<div>${banner.value ? html`<p class="b">warn</p>` : ''}<div class="time">${v} / 0:05</div></div>`);
    const t = root.querySelector('.time') as HTMLElement;
    expect(t.textContent).toBe('0:01 / 0:05');

    banner.value = true; // structural insert before the hole's parent
    expect((root.querySelector('.time') as HTMLElement).textContent).toBe('0:01 / 0:05');
    v.value = '0:02'; // binding still live after the morph
    expect((root.querySelector('.time') as HTMLElement).textContent).toBe('0:02 / 0:05');
    banner.value = false; // the shift-left direction
    expect((root.querySelector('.time') as HTMLElement).textContent).toBe('0:02 / 0:05');
    v.value = '0:03';
    expect((root.querySelector('.time') as HTMLElement).textContent).toBe('0:03 / 0:05');
    dispose();
  });

  it('html template: bound attr + text holes on the shifted element both stay live, and writes never re-run the render', () => {
    const banner = signal(true);
    const cls = signal('c1');
    const txt = signal('t1');
    let renders = 0;
    const dispose = mount(root, () => {
      renders++;
      return html`<div>${banner.value ? html`<div class="banner">warn</div>` : ''}<span class="${cls}">${txt} end</span></div>`;
    });
    const span = root.querySelector('span') as HTMLElement;
    expect(renders).toBe(1);
    banner.value = false; // shift left; morph strips bound attrs → re-wire restores
    expect(root.querySelector('span')).toBe(span);
    expect(span.getAttribute('class')).toBe('c1');
    expect(span.textContent).toBe('t1 end');
    cls.value = 'c2';
    txt.value = 't2';
    expect(span.getAttribute('class')).toBe('c2');
    expect(span.textContent).toBe('t2 end');
    expect(renders).toBe(2); // only the banner toggle re-ran the render; the writes were fine-grained
    dispose();
  });

  it('html template: row-scoped holes stay live across surrounds toggles and a granular re-wire', () => {
    const banner = signal(false);
    const unit = signal('ms');
    const rows = arraySignal([{ id: 1, label: 'lat' }, { id: 2, label: 'p95' }]);
    const dispose = mount(root, () => html`<div>
      ${banner.value ? html`<div class="banner">warn</div>` : ''}
      <ul>${each(rows, (r) => html`<li data-key="${String(r.id)}">${computed(() => r.label)} in ${unit}</li>`)}</ul>
    </div>`);
    const li = (i: number): HTMLElement => root.querySelectorAll('li')[i] as HTMLElement;
    expect(li(0).textContent).toBe('lat in ms');
    banner.value = true; // surrounds morph with owned rows present
    unit.value = 's'; // row holes still live after the morph
    expect(li(0).textContent).toBe('lat in s');
    expect(li(1).textContent).toBe('p95 in s');
    banner.value = false; // the KF-377 direction
    unit.value = 'us';
    expect(li(0).textContent).toBe('lat in us');
    rows.update(0, (r) => ({ ...r, label: 'lat99' })); // granular re-wire of the changed row
    expect(li(0).textContent).toBe('lat99 in us');
    unit.value = 'ns'; // and the re-wired row still tracks the external signal
    expect(li(0).textContent).toBe('lat99 in ns');
    dispose();
  });
});
