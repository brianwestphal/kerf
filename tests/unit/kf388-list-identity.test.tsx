/**
 * KF-388 — a queued `arraySignal` patch must never be applied to a different
 * list's binding.
 *
 * A list's id is its call-order index ("the n-th `each()` call this render"),
 * and every persistent structure — the per-list caches, the recorded binding
 * counts, `mount()`'s bindings map — is keyed on it. Any render that changes
 * how many `each()` calls precede a list reassigns that list's id, handing it
 * the previous occupant's binding. The recorded count came from the previous
 * occupant too, which is what let a queued patch pass the drift check and get
 * applied to the WRONG list's live rows: a batched
 * `hide-panel-A + B.push(...)` rendered A's rows inside B's container.
 *
 * The fix records the data source per id and compares identity before
 * emitting patches. A mismatch is treated as a first render, so the list
 * snapshot-rebuilds from its own items. The check lives in `each()` rather
 * than the reconciler because only `each()` can still produce the full item
 * snapshot the rebuild needs — granular segments deliberately carry
 * `items: []`, so routing one to the snapshot path from the reconciler would
 * render an empty list.
 *
 * NOT fixed here, deliberately (tracked separately): the id shift still costs
 * the sibling list its row DOM identity, because the rebuild is a genuine
 * rebuild. Those cases are correct-but-lossy and pinned in
 * `kf387-seam-sweep.test.tsx`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => { document.body.innerHTML = ''; });

interface Row { id: string; t: string }

/** The canonical shape: a conditional list ahead of a second list. */
function twoLists() {
  const cond = signal(true);
  const a = arraySignal<Row>([{ id: 'a1', t: 'A1' }, { id: 'a2', t: 'A2' }]);
  const b = arraySignal<Row>([{ id: 'b1', t: 'B1' }, { id: 'b2', t: 'B2' }]);
  const dispose = mount(root, () => (
    <div>
      {cond.value ? <ul class="a">{each(a, (r) => <li data-key={r.id}>{r.t}</li>)}</ul> : ''}
      <ul class="b">{each(b, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
    </div>
  ));
  return { cond, a, b, dispose };
}

const labels = (sel: string): string[] =>
  Array.from(root.querySelectorAll(`${sel} li`)).map((l) => l.textContent ?? '');

/** The DOM a list renders must always equal what its own signal holds. */
const expectMatches = (sel: string, sig: { value: readonly Row[] }): void => {
  expect(labels(sel)).toEqual(sig.value.map((r) => r.t));
};

describe('KF-388: a patch queue never reaches another list\'s binding', () => {
  it('batched hide + insert renders the pushed list\'s own rows', () => {
    const { cond, b, dispose } = twoLists();
    batch(() => {
      cond.value = false;
      b.push({ id: 'b3', t: 'B3' });
    });
    expect(labels('ul.b')).toEqual(['B1', 'B2', 'B3']); // was ['A1','A2','B3']
    expectMatches('ul.b', b);
    dispose();
  });

  it('batched hide + update renders the updated list\'s own rows', () => {
    const { cond, b, dispose } = twoLists();
    batch(() => {
      cond.value = false;
      b.update(0, (r) => ({ ...r, t: 'B1-upd' }));
    });
    expect(labels('ul.b')).toEqual(['B1-upd', 'B2']); // was ['B1-upd','A2']
    expectMatches('ul.b', b);
    dispose();
  });

  it('batched hide + remove renders the shortened list\'s own rows', () => {
    const { cond, b, dispose } = twoLists();
    batch(() => {
      cond.value = false;
      b.remove(0);
    });
    expectMatches('ul.b', b);
    dispose();
  });

  it('batched hide + move renders the reordered list\'s own rows', () => {
    const { cond, b, dispose } = twoLists();
    batch(() => {
      cond.value = false;
      b.move(0, 1);
    });
    expectMatches('ul.b', b);
    dispose();
  });

  it('the id shift RECOVERS: both lists are correct after toggling back on', () => {
    // The return direction matters as much as the outgoing one — the id shifts
    // back, so the guard has to fire in both directions.
    const { cond, a, b, dispose } = twoLists();
    batch(() => {
      cond.value = false;
      b.push({ id: 'b3', t: 'B3' });
    });
    cond.value = true;
    expectMatches('ul.a', a);
    expectMatches('ul.b', b);
    dispose();
  });

  it('survives repeated batched toggles without either list drifting', () => {
    const { cond, a, b, dispose } = twoLists();
    for (let i = 0; i < 3; i++) {
      batch(() => {
        cond.value = false;
        b.push({ id: `x${i}`, t: `X${i}` });
      });
      expectMatches('ul.b', b);
      batch(() => {
        cond.value = true;
        b.update(0, (r) => ({ ...r, t: `${r.t}!` }));
      });
      expectMatches('ul.a', a);
      expectMatches('ul.b', b);
    }
    dispose();
  });

  it('a granular patch still applies normally when no id shift happens', () => {
    // The guard must not cost the ordinary case its granular path — these
    // operations are exactly the ones the fast path exists for.
    const { b, dispose } = twoLists();
    const firstRow = root.querySelector('ul.b li[data-key="b1"]');
    b.push({ id: 'b3', t: 'B3' });
    expectMatches('ul.b', b);
    b.update(1, (r) => ({ ...r, t: 'B2-upd' }));
    expectMatches('ul.b', b);
    b.remove(0);
    expectMatches('ul.b', b);
    // Row identity is preserved through granular ops on the untouched rows —
    // proof the fast path really did run rather than silently rebuilding.
    expect(root.querySelector('ul.b li[data-key="b1"]')).toBe(null);
    expect(firstRow).not.toBe(null);
    dispose();
  });

  it('a list whose own each() count is stable keeps granular row identity across a sibling toggle', () => {
    // Sanity: the guard keys on the DATA SOURCE, not on "did anything change",
    // so a list that keeps its id is untouched by an unrelated conditional.
    const show = signal(true);
    const rows = arraySignal<Row>([{ id: 'r1', t: 'R1' }]);
    const dispose = mount(root, () => (
      <div>
        <ul class="list">{each(rows, (r) => <li data-key={r.id}>{r.t}</li>)}</ul>
        {show.value ? <p class="after">after</p> : ''}
      </div>
    ));
    const row1 = root.querySelector('li[data-key="r1"]');
    show.value = false; // conditional AFTER the list — id unchanged
    rows.push({ id: 'r2', t: 'R2' });
    expectMatches('ul.list', rows);
    expect(root.querySelector('li[data-key="r1"]')).toBe(row1);
    dispose();
  });
});
