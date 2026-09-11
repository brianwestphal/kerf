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
import { each,mount,signal } from '../../src/index.js';

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

describe('KF-393: textarea text fast path form-state sync (KF-397)', () => {
  it('a dirty unfocused textarea row follows a granular text-only update (KF-397)', () => {
    // The fourth writer subject to the KF-335 rule: a textarea's value lives in
    // its child text, so patching that text must carry the property — the morph
    // route already did, which made behavior depend on the internal route.
    // A textarea's value lives in that text, and once the control is dirty the
    // property is detached. The fast path now carries the property so visible
    // state follows the DOM text and the app's model.
    const rows = arraySignal([{ id: 'a', v: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <textarea data-key={r.id}>{r.v}</textarea>)}</div>
    ));
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'user typed'; // dirty, not focused
    rows.update(0, (r) => ({ ...r, v: 'two' }));
    expect(root.querySelector('textarea')).toBe(ta); // fast path kept the node
    expect(ta.textContent).toBe('two');
    expect(ta.value).toBe('two'); // was left at 'user typed' before KF-397
    dispose();
  });

  it('the identical update routed through the morph path syncs the dirty textarea (the route dependency)', () => {
    // Control: an attribute change in the same update() makes the text fast
    // path bail, and morph.ts's syncTextareaValue carries the property along.
    const rows = arraySignal([{ id: 'a', v: 'one', cls: '' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <li data-key={r.id} class={r.cls}><textarea>{r.v}</textarea></li>)}</div>
    ));
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'user typed';
    rows.update(0, (r) => ({ ...r, v: 'two', cls: 'x' }));
    expect(root.querySelector('textarea')).toBe(ta);
    expect(ta.value).toBe('two'); // morph route obeys the app
    dispose();
  });

  it('a FOCUSED textarea keeps the user\'s in-progress edit on both routes (already consistent)', () => {
    const rows = arraySignal([{ id: 'a', v: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <textarea data-key={r.id}>{r.v}</textarea>)}</div>
    ));
    const ta = root.querySelector('textarea') as HTMLTextAreaElement;
    ta.focus();
    ta.value = 'mid-edit';
    rows.update(0, (r) => ({ ...r, v: 'two' }));
    expect(ta.textContent).toBe('two');
    expect(ta.value).toBe('mid-edit'); // focused exception holds on the fast path too
    dispose();
  });

  it('the in-place snapshot route (plain array + cacheKey) syncs checked through the attribute fast path', () => {
    // The KF-390 sync verified through the OTHER caller of the same ladder —
    // the plain-array in-place path — including the dirty-control direction.
    const sel = signal<string | null>(null);
    const rows = [{ id: 'a' }, { id: 'b' }];
    const dispose = mount(root, () => (
      <div>
        {each(
          rows,
          (r) => <input type="checkbox" data-key={r.id} checked={sel.value === r.id} />,
          (r) => sel.value === r.id,
        )}
      </div>
    ));
    const boxA = root.querySelector('input[data-key="a"]') as HTMLInputElement;
    sel.value = 'a';
    expect(root.querySelector('input[data-key="a"]')).toBe(boxA); // in-place, not rebuilt
    expect(boxA.checked).toBe(true);
    boxA.checked = false; // user unchecks — control is dirty
    sel.value = 'b';
    const boxB = root.querySelector('input[data-key="b"]') as HTMLInputElement;
    expect(boxA.hasAttribute('checked')).toBe(false);
    expect(boxA.checked).toBe(false);
    expect(boxB.checked).toBe(true);
    dispose();
  });
});
