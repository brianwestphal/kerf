/**
 * A granular arraySignal patch batched with a container rebuild must not blank
 * the list.
 *
 * `each()` decides "granular" from the binding count it saw when it ran and
 * emits a segment carrying `items: []` (the reconciler is trusted to hold the
 * prior rows). But the same render, the morph can rebuild the list's container —
 * a `replaceChild` tag swap, or a same-tag sibling positionally taking the
 * container's place — and `mount()` self-heals the binding to empty. The
 * granular segment then has no items and the empty binding no rows, so a naive
 * reconcile renders zero. The data still lives in the arraySignal, so `mount()`
 * resets the rebuilt list to unbound and re-renders it onto the snapshot path.
 *
 * Found by a Fable sweep and independently by the fuzz harness (KF-399).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch, each, mount, signal } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

const rowsIn = (sel = 'li'): (string | null)[] =>
  Array.from(root.querySelectorAll(sel)).map((el) => el.textContent);

describe('KF-411: a container rebuild batched with a granular patch keeps the rows', () => {
  it('a tag swap of an ancestor batched with a remove', () => {
    const rows = arraySignal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    const swap = signal(false);
    const dispose = mount(root, () => (
      <div>{swap.value
        ? <section><ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</ul></section>
        : <article><ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</ul></article>}</div>
    ));
    batch(() => { swap.value = true; rows.remove(0); });
    expect(rowsIn()).toEqual(['2', '3', '4']);
    // …and the list keeps working afterwards, on the granular path again.
    rows.push({ id: 5 });
    expect(rowsIn()).toEqual(['2', '3', '4', '5']);
    dispose();
  });

  it('a same-tag sibling appearing batched with a remove (the ordinary banner shape)', () => {
    const rows = arraySignal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const show = signal(false);
    const dispose = mount(root, () => (
      <div>
        {show.value ? <div class="banner">banner</div> : ''}
        <div class="host"><ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</ul></div>
      </div>
    ));
    batch(() => { show.value = true; rows.remove(0); });
    expect(rowsIn('.host li')).toEqual(['2', '3']);
    dispose();
  });

  it('a rebuild batched with an insert and an update', () => {
    const rows = arraySignal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    const swap = signal(false);
    const dispose = mount(root, () => (
      <div>{swap.value
        ? <section><ul>{each(rows, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'L' })}</ul></section>
        : <article><ul>{each(rows, (r) => <li data-key={r.id}>{r.t}</li>, { key: 'L' })}</ul></article>}</div>
    ));
    batch(() => {
      swap.value = true;
      rows.insert(1, { id: 3, t: 'c' });
      rows.update(0, (r) => ({ ...r, t: 'A' }));
    });
    expect(rowsIn()).toEqual(['A', 'c', 'b']);
    dispose();
  });

  it('an empty list stays empty when rebuilt with no patches (no spurious re-render)', () => {
    const rows = arraySignal<{ id: number }>([]);
    const swap = signal(false);
    let renders = 0;
    const dispose = mount(root, () => {
      renders++;
      return (
        <div>{swap.value
          ? <section><ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</ul></section>
          : <article><ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</ul></article>}</div>
      );
    });
    const before = renders;
    swap.value = true; // container rebuild, but the list has no patches
    expect(rowsIn()).toEqual([]);
    // The rebuild render should not trigger the KF-411 re-render (no granular
    // segment to salvage), so exactly one extra render pass.
    expect(renders).toBe(before + 1);
    dispose();
  });

  it('a plain-array list rebuilt batched with a change still renders (never took the granular path)', () => {
    const data = signal([{ id: 1 }, { id: 2 }]);
    const swap = signal(false);
    const dispose = mount(root, () => (
      <div>{swap.value
        ? <section><ul>{each(data.value, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</ul></section>
        : <article><ul>{each(data.value, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</ul></article>}</div>
    ));
    batch(() => { swap.value = true; data.value = [{ id: 2 }, { id: 3 }]; });
    expect(rowsIn()).toEqual(['2', '3']);
    dispose();
  });
});
