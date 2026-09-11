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
import { each,mount } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('KF-387 seam: form-state sync × list reconcile', () => {
  it('a dirty checkbox row follows arraySignal updates when the diff routes through the morph path', () => {
    // The KF-335 contract holding on the morph route: attribute mutation
    // syncs the live property even after user interaction dirtied the
    // control. The label text changes alongside `done`, so the attr-only
    // fast path bails and _morphElement runs.
    const rows = arraySignal([{ id: 'a', done: false, label: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <label data-key={r.id}><input type="checkbox" checked={r.done} />{r.label}</label>)}</div>
    ));
    const box = root.querySelector('input') as HTMLInputElement;
    box.checked = true; // user checks — control is dirty
    rows.update(0, (r) => ({ ...r, done: true, label: 'one!' }));
    expect(root.querySelector('input')).toBe(box);
    expect(box.checked).toBe(true);
    rows.update(0, (r) => ({ ...r, done: false, label: 'one!!' }));
    expect(box.hasAttribute('checked')).toBe(false);
    expect(box.checked).toBe(false); // property followed the attribute removal
    dispose();
  });

  it('a dirty checkbox row is left alone when the update changes no attribute (uncontrolled preservation)', () => {
    // This shape was originally filed as the KF-390 repro, but it does not
    // demonstrate the bug: `done` goes false → false, so the `checked`
    // attribute is absent before AND after and kerf mutates nothing. Leaving
    // the user's state alone is then exactly right — the KF-335 rule is
    // "sync the property only where we actually mutate the attribute", which
    // is what keeps uncontrolled usage working. Pinned so the distinction
    // between "no mutation" and "mutation without sync" stays explicit.
    const rows = arraySignal([{ id: 'a', done: false }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <input type="checkbox" data-key={r.id} checked={r.done} />)}</div>
    ));
    const box = root.querySelector('input') as HTMLInputElement;
    box.checked = true; // user checks — control is dirty
    rows.update(0, (r) => ({ ...r, done: false })); // no attribute change at all
    expect(root.querySelector('input')).toBe(box);
    expect(box.hasAttribute('checked')).toBe(false);
    expect(box.checked).toBe(true); // untouched, by design
    dispose();
  });

  it('a dirty checkbox row DOES follow an attribute-only update that really changes the attribute', () => {
    // The genuine KF-390 shape: the row's top-level element is the control
    // and the attribute actually flips, so the fast path mutates it — and
    // must carry the property along, exactly as the morph route does.
    const rows = arraySignal([{ id: 'a', done: true }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <input type="checkbox" data-key={r.id} checked={r.done} />)}</div>
    ));
    const box = root.querySelector('input') as HTMLInputElement;
    box.checked = false;
    box.checked = true; // dirty
    rows.update(0, (r) => ({ ...r, done: false })); // attribute genuinely removed
    expect(root.querySelector('input')).toBe(box); // same node — fast path ran
    expect(box.hasAttribute('checked')).toBe(false);
    expect(box.checked).toBe(false); // property followed (was stale before KF-390)
    dispose();
  });

  it('a dirty text input row follows an attribute-only value update', () => {
    // The `value` flavor of KF-390, now fixed. The input is NOT focused, so
    // syncFormProp's focused-element exception does not apply and the
    // property follows the mutated attribute — as it always did on the morph
    // route.
    const rows = arraySignal([{ id: 'a', v: 'one' }]);
    const dispose = mount(root, () => (
      <div>{each(rows, (r) => <input data-key={r.id} value={r.v} />)}</div>
    ));
    const inp = root.querySelector('input') as HTMLInputElement;
    inp.value = 'user-typed'; // dirty, not focused
    rows.update(0, (r) => ({ ...r, v: 'two' }));
    expect(inp.getAttribute('value')).toBe('two');
    expect(inp.value).toBe('two'); // was left at 'user-typed' before KF-390
    dispose();
  });
});
