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
import { batch,each,mount,signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

describe('KF-387 seam: each() list identity across a varying call count', () => {
  interface Row { id: string; t: string }
  const A_ROWS = (): Row[] => [{ id: 'a1', t: 'A1' }, { id: 'a2', t: 'A2' }];
  const B_ROWS = (): Row[] => [{ id: 'b1', t: 'B1' }, { id: 'b2', t: 'B2' }];
  const bLabels = (): string[] =>
    Array.from(root.querySelectorAll('ul.b li')).map((li) => li.textContent ?? '');

  it('a batched conditional-toggle + granular patch renders its own list\'s rows', () => {
    // KF-388 (fixed): hiding the panel makes list B the render's FIRST each()
    // call, so it inherits list A's id — and A's binding, whose recorded count
    // used to make B's queued insert patch pass the drift check. The granular
    // path then applied B's patch to A's live rows and ul.b displayed
    // A1 A2 B3. each() now compares the recorded data source for the id and
    // snapshot-rebuilds on a mismatch, so B renders B's rows.
    const cond = signal(true);
    const a = arraySignal(A_ROWS());
    const b = arraySignal(B_ROWS());
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul class="a">{each(a, (r) => <li data-key={r.id}>{r.t}</li>)}</ul> : ''}
        <ul class="b">{each(b, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
      </div>
    ));
    expect(bLabels()).toEqual(['B1', 'B2']);
    batch(() => {
      cond.value = false;
      b.push({ id: 'b3', t: 'B3' });
    });
    expect(bLabels()).toEqual(['B1', 'B2', 'B3']);
    dispose();
  });

  it('a batched conditional-toggle + granular update keeps the two lists\' rows separate', () => {
    // KF-388 (fixed), update flavor: ul.b used to end up ['B1-upd', 'A2'] —
    // the updated B row patched over A's row 0, with A's row 1 kept.
    const cond = signal(true);
    const a = arraySignal(A_ROWS());
    const b = arraySignal(B_ROWS());
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul class="a">{each(a, (r) => <li data-key={r.id}>{r.t}</li>)}</ul> : ''}
        <ul class="b">{each(b, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
      </div>
    ));
    batch(() => {
      cond.value = false;
      b.update(0, (r) => ({ ...r, t: 'B1-upd' }));
    });
    expect(bLabels()).toEqual(['B1-upd', 'B2']);
    dispose();
  });

  it('an unkeyed identity shift keeps content correct but rebuilds the sibling list', () => {
    // The wrong-list routing defect is fixed: content always comes from B.
    // This unkeyed call-order identity shift still deliberately costs a
    // snapshot rebuild in BOTH toggle directions. Key the list when preserving
    // row identity (and therefore focus/scroll/IME state) matters.
    const cond = signal(true);
    const a = A_ROWS();
    const b = B_ROWS();
    const dispose = mount(root, () => (
      <div>
        {cond.value ? <ul class="a">{each(a, (r) => <li data-key={r.id}>{r.t}</li>)}</ul> : ''}
        <ul class="b">{each(b, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
      </div>
    ));
    const b1 = root.querySelector('ul.b li[data-key="b1"]');
    cond.value = false;
    expect(bLabels()).toEqual(['B1', 'B2']); // content correct
    // Documented unkeyed-list boundary: rebuilt from scratch, so row-local
    // focus/scroll/IME state is lost even though routing and content are right.
    expect(root.querySelector('ul.b li[data-key="b1"]')).not.toBe(b1);
    const b1After = root.querySelector('ul.b li[data-key="b1"]');
    cond.value = true; // return direction shifts the id back — rebuilt AGAIN
    expect(bLabels()).toEqual(['B1', 'B2']);
    expect(root.querySelector('ul.b li[data-key="b1"]')).not.toBe(b1After);
    dispose();
  });

  it('a nested each() inside a row drifts the id counter with cache hits, and the unrelated sibling list survives it', () => {
    // An each() inside a row render increments the shared list-id counter only
    // on cache-MISS renders of that row, so an unrelated signal bump (outer
    // rows all cache-hit) changes how many each() calls precede the second
    // list — its call-order id flips.
    //
    // That used to rebuild the second list, discarding its row nodes. It no
    // longer does: a changed call count now resets the call-order-keyed state
    // and re-renders, which routes the list through the snapshot path, where
    // the same refs in the same order are morphed in place. Identity survives.
    // (Nested-in-row lists themselves still flatten to static HTML — the inner
    // marker never reaches the segment tree — which is a separate boundary.)
    interface Outer { id: string; subs: { id: string; t: string }[] }
    const outer: Outer[] = [{ id: 'o1', subs: [{ id: 's1', t: 'S1' }] }];
    const others = [{ id: 'x1', t: 'X1' }, { id: 'x2', t: 'X2' }];
    const bump = signal(0);
    const dispose = mount(root, () => (
      <div>
        <p>{String(bump.value)}</p>
        <ul class="outer">
          {each(outer, (o) => (
            <li data-key={o.id}>
              <ol>{each(o.subs, (s) => <li data-key={s.id}>{s.t}</li>)}</ol>
            </li>
          ))}
        </ul>
        <ul class="second">{each(others, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
      </div>
    ));
    const x1 = root.querySelector('ul.second li[data-key="x1"]');
    bump.value = 1; // outer rows cache-hit → inner each() not called → ids shift
    const second = Array.from(root.querySelectorAll('ul.second li')).map((li) => li.textContent);
    expect(second).toEqual(['X1', 'X2']); // content correct
    // …and the unrelated sibling list kept its row nodes.
    expect(root.querySelector('ul.second li[data-key="x1"]')).toBe(x1);
    dispose();
  });
});
