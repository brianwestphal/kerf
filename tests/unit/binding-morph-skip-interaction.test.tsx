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

import { mount,signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('KF-387 seam: fine-grained bindings × data-morph-skip', () => {
  it('bound text and attr holes inside a data-morph-skip subtree stay live across a surrounds morph', () => {
    // The skip subtree is invisible to the morph, but wireBindings re-wires
    // over the whole root each surrounds-changed render — the hole's marker
    // (from the first render) must keep resolving and the inserted text node
    // must be reused, not stacked.
    const flag = signal(false);
    const v = signal('V');
    const cls = signal('c1');
    const dispose = mount(root, () => (
      <div>
        {flag.value ? <p class="x">extra</p> : ''}
        <div data-morph-skip class="lib">
          <span class={cls}>{v} tail</span>
        </div>
      </div>
    ));
    const span = root.querySelector('span') as HTMLElement;
    expect(span.textContent).toBe('V tail');
    flag.value = true; // surrounds change; the skipped subtree is untouched
    expect(root.querySelector('span')).toBe(span);
    v.value = 'W';
    cls.value = 'c2';
    expect(span.textContent).toBe('W tail'); // exactly one inserted text node — no stacking
    expect(span.getAttribute('class')).toBe('c2');
    flag.value = false; // and the return direction
    v.value = 'X';
    expect(span.textContent).toBe('X tail');
    dispose();
  });

  it('switching the bound signal INSTANCE re-binds when the surrounds change in the same render', () => {
    // docs/2 §2.9 scopes the stale-binding hazard to the BYTE-EQUAL fast
    // path. The complement claim — a render that switches instances while
    // also changing the surrounds re-wires cleanly — was never asserted.
    const use2 = signal(false);
    const s1 = signal('one');
    const s2 = signal('two');
    const dispose = mount(root, () => (
      <div>
        <p class={use2.value ? 'v2' : 'v1'}>{use2.value ? s2 : s1}</p>
      </div>
    ));
    expect((root.querySelector('p') as HTMLElement).textContent).toBe('one');
    use2.value = true; // surrounds changed (class) → morph + re-wire → binds s2
    expect((root.querySelector('p') as HTMLElement).textContent).toBe('two');
    s2.value = 'TWO'; // the new instance is live
    expect((root.querySelector('p') as HTMLElement).textContent).toBe('TWO');
    s1.value = 'ONE'; // the old instance is fully detached — no ghost write
    expect((root.querySelector('p') as HTMLElement).textContent).toBe('TWO');
    dispose();
  });
});
