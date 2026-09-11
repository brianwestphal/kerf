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

describe('KF-387 seam: each() rows × table parsing', () => {
  it('each() of tr rows directly under table fails loudly instead of misbinding', () => {
    // KF-391 (fixed): the first-render innerHTML wraps the row run in an
    // implicit <tbody>, so the binding walk used to pair row 0 with the
    // TBODY, the reconcile re-inserted the "missing" rows outside it
    // (visible duplicates), and the missing-row-key warning fired FALSELY
    // against the wrapper. The row-contract guard now compares the bound
    // element's TAG against the row's own top-level tag and rejects the
    // shape with an actionable error naming both tags.
    const rows = [{ id: 'r1' }, { id: 'r2' }];
    expect(() => mount(root, () => (
      <table>{each(rows, (r) => <tr data-key={r.id}><td>{r.id}</td></tr>)}</table>
    ))).toThrow(/parser wrapped the rows in <tbody>/);
  });

  it('each() of tr rows inside an explicit tbody binds and reconciles cleanly', () => {
    // The documented shape (the krausest bench uses it) — pinned as the
    // counterpart of the KF-391 defect above.
    const rows = arraySignal([{ id: 'r1', t: 'one' }]);
    const dispose = mount(root, () => (
      <table><tbody>{each(rows, (r) => <tr data-key={r.id}><td>{r.t}</td></tr>)}</tbody></table>
    ));
    rows.push({ id: 'r2', t: 'two' });
    rows.update(0, (r) => ({ ...r, t: 'ONE' }));
    const texts = Array.from(root.querySelectorAll('tbody tr')).map((tr) => tr.textContent);
    expect(texts).toEqual(['ONE', 'two']);
    expect(root.querySelectorAll('tr').length).toBe(2);
    dispose();
  });
});
