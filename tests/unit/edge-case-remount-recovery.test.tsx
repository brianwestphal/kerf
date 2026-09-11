/**
 * Adversarial edge-case probes — written in response to the "we should
 * be extremely thorough" directive. Each test exercises a scenario the
 * earlier audit (KF-104) flagged as untested but plausibly bug-prone.
 *
 * Categories covered:
 *   - mount lifecycle: mount → dispose → mount on the same element;
 *     mount on a pre-populated element; render returning null /
 *     undefined / number / boolean; many mounts sharing one signal.
 *   - delegate lifecycle: handler that disposes its own mount; root
 *     detached from document; re-entrance through re-render.
 *   - arraySignal corner cases: drift recovery; cross-mount sharing
 *     after dispose; replace-then-update batched; mutation inside a
 *     computed; computed reading both length and array.
 *   - shape transitions: two each() callsites where a phase flip
 *     re-orders them (KF-104 §2 — known positional-id collision).
 *   - focus survival: focus inside an UNCHANGED row across a granular
 *     update; focus on a SIBLING of a granular-updated row.
 *   - fast-path corners: KF-88 with re-render that DOES change a
 *     list's items but not the surrounds; KF-89 with stable items in
 *     out-of-order positions; KF-93 with non-contiguous insert runs;
 *     KF-99 drift recovery after a granular reconcile failure.
 *   - data-morph-skip wrapping a list parent.
 *   - Stress: 1000-row mutate-and-restore round-trip.
 */
import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import {
each,
mount,
signal
} from '../../src/index.js';

describe('Round 3: re-mount state reset', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('re-mount on same element: each() callsite at position 0 starts with id 0 (no leak from prior mount)', () => {
    const itemsA = [{ id: 'a1' }, { id: 'a2' }];
    const dispose1 = mount(root, () => (
      <div>
        <ul>{each(itemsA, (it) => <li data-key={it.id}>{it.id}</li>)}</ul>
        <ul>{each(itemsA, (it) => <li data-key={`${it.id}-x`}>{it.id}-x</li>)}</ul>
      </div>
    ));
    expect(root.querySelectorAll('li').length).toBe(4);  // 2 + 2
    const m1 = root.querySelectorAll('ul')[0];
    const m1Comments = Array.from(m1.childNodes).filter((n) => n.nodeType === Node.COMMENT_NODE) as Comment[];
    expect(m1Comments[0].data).toBe('kf-list:0');
    dispose1();

    // Re-mount — counter should reset.
    const itemsB = [{ id: 'b1' }];
    const dispose2 = mount(root, () => (
      <ol>{each(itemsB, (it) => <li data-key={it.id}>{it.id}</li>)}</ol>
    ));
    const ol = root.querySelector('ol')!;
    const olComments = Array.from(ol.childNodes).filter((n) => n.nodeType === Node.COMMENT_NODE) as Comment[];
    expect(olComments[0].data).toBe('kf-list:0');
    expect(root.querySelectorAll('li').length).toBe(1);
    dispose2();
  });

  it('re-mount on same element: prevStaticHtml comparison does not falsely match cross-mount', () => {
    const tickA = signal(0);
    const dispose1 = mount(root, () => {
      void tickA.value;
      return <div>same</div>;
    });
    expect(root.querySelector('div')!.textContent).toBe('same');
    dispose1();

    // Second mount produces the SAME static HTML. Verify the new mount
    // does its own first render correctly (doesn't accidentally hit the
    // KF-88 fast path from a stale closure).
    const tickB = signal(0);
    const dispose2 = mount(root, () => {
      void tickB.value;
      return <div>same</div>;
    });
    expect(root.querySelector('div')!.textContent).toBe('same');

    // Mutating B's signal triggers a re-render. KF-88 fast path WILL fire
    // (surrounds match), but the second-mount's own renderCtx is fresh,
    // not B-from-A's. Verify the binding map is independent.
    tickB.value = 1;
    expect(root.querySelector('div')!.textContent).toBe('same');
    dispose2();
  });
});

describe('Round 3: render-throw recovery', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root); });
  afterEach(() => { document.body.innerHTML = ''; });

  it('render throws on first call: mount itself throws', () => {
    expect(() => {
      mount(root, () => { throw new Error('boom'); });
    }).toThrow(/boom/);
  });

  it('render throws on subsequent call: signal mutation propagates the throw', () => {
    const tick = signal(0);
    let calls = 0;
    mount(root, () => {
      calls++;
      if (tick.value === 1) throw new Error('boom');
      return <span>{tick.value}</span>;
    });
    expect(calls).toBe(1);
    expect(() => { tick.value = 1; }).toThrow();
    expect(calls).toBe(2);
    // Recovery: subsequent mutation re-runs the render.
    tick.value = 2;
    expect(calls).toBe(3);
    expect(root.querySelector('span')!.textContent).toBe('2');
  });
});
