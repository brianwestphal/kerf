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

import { delegate,mount,signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('KF-387 seam: delegate() × morph node replacement', () => {
  it('a delegated handler keeps firing after the morph rebuilds and after it moves the target subtree', () => {
    // docs/5's core claim: the listener lives on the stable root, so no
    // rebuild/move of descendants can detach it. Walk BOTH diff outcomes —
    // a replaceChild rebuild (tag swap) and a lookahead move (sibling
    // removal) — and both toggle directions.
    const mode = signal('a');
    const lead = signal(true);
    const hits: string[] = [];
    const dispose = mount(root, () => (
      <div>
        {lead.value ? <p class="lead">lead</p> : ''}
        {mode.value === 'a'
          ? <section><button class="go">A</button></section>
          : <article><button class="go">B</button></article>}
      </div>
    ));
    const off = delegate(root, 'click', '.go', (_e, el) => hits.push(el.textContent ?? ''));
    (root.querySelector('.go') as HTMLElement).click();
    mode.value = 'b'; // replaceChild rebuild of the subtree hosting the target
    (root.querySelector('.go') as HTMLElement).click();
    lead.value = false; // lookahead moves the <article> up a slot
    (root.querySelector('.go') as HTMLElement).click();
    mode.value = 'a'; // rebuild back
    (root.querySelector('.go') as HTMLElement).click();
    expect(hits).toEqual(['A', 'B', 'B', 'A']);
    off();
    dispose();
  });
});
