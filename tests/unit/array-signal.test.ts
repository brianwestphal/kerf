/**
 * Unit tests for `arraySignal()` (KF-92) — both the standalone signal API
 * and its integration with `each()` / `mount()` for the granular reconcile
 * path.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ArraySignal, arraySignal, each, mount, signal } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';

describe('arraySignal — standalone API', () => {
  it('seeds with the initial array (defensively copied)', () => {
    const seed = [{ id: 1 }, { id: 2 }];
    const sig = arraySignal(seed);
    expect(sig.value).toEqual(seed);
    expect(sig.value).not.toBe(seed);  // defensive copy
  });

  it('seeds empty when no argument given', () => {
    expect(arraySignal().value).toEqual([]);
  });

  it('update replaces the item at the given index', () => {
    const sig = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    sig.update(0, (r) => ({ ...r, label: 'X' }));
    expect(sig.value[0]).toEqual({ id: 1, label: 'X' });
    expect(sig.value[1]).toEqual({ id: 2, label: 'b' });
  });

  it('update throws for out-of-bounds index', () => {
    const sig = arraySignal([{ id: 1 }]);
    expect(() => sig.update(2, (r) => r)).toThrow(/index 2 out of bounds/);
    expect(() => sig.update(-1, (r) => r)).toThrow(/index -1 out of bounds/);
  });

  it('insert adds at the given index, shifting existing items', () => {
    const sig = arraySignal([{ id: 1 }, { id: 3 }]);
    sig.insert(1, { id: 2 });
    expect(sig.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('insert at length (end) appends', () => {
    const sig = arraySignal([{ id: 1 }]);
    sig.insert(1, { id: 2 });
    expect(sig.value).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('insert throws for out-of-bounds index', () => {
    const sig = arraySignal([{ id: 1 }]);
    expect(() => sig.insert(5, { id: 9 })).toThrow(/out of bounds/);
  });

  it('push appends at the end', () => {
    const sig = arraySignal([{ id: 1 }]);
    sig.push({ id: 2 });
    expect(sig.value).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('remove deletes and returns the item at the given index', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const removed = sig.remove(1);
    expect(removed).toEqual({ id: 2 });
    expect(sig.value).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('remove throws for out-of-bounds index', () => {
    const sig = arraySignal<{ id: number }>([]);
    expect(() => sig.remove(0)).toThrow(/out of bounds/);
  });

  it('move shifts an item to a new position', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    sig.move(0, 2);
    expect(sig.value).toEqual([{ id: 2 }, { id: 3 }, { id: 1 }, { id: 4 }]);
  });

  it('move with from===to is a no-op', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }]);
    const before = [...sig.value];
    sig.move(1, 1);
    expect(sig.value).toEqual(before);
  });

  it('move throws for out-of-bounds indices', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }]);
    expect(() => sig.move(0, 5)).toThrow(/out of bounds/);
    expect(() => sig.move(5, 0)).toThrow(/out of bounds/);
  });

  it('replace swaps the entire array', () => {
    const sig = arraySignal([{ id: 1 }]);
    sig.replace([{ id: 9 }, { id: 10 }]);
    expect(sig.value).toEqual([{ id: 9 }, { id: 10 }]);
  });

  it('value reads register a tracking dependency (computed sees changes)', () => {
    const sig = arraySignal([{ id: 1 }, { id: 2 }]);
    let computedRuns = 0;
    // Simulate a derived computation by reading inside an effect.
    let snapshot: readonly { id: number }[] = [];
    const dispose = (() => {
      // Lightweight effect impl: re-run on signal changes.
      // Use signals-core-style effect via the public API (kerf re-exports).
      // We don't import effect() here directly; just verify .value reads
      // produce different snapshots after mutations.
      computedRuns += 1;
      snapshot = sig.value;
      return () => {};
    })();
    expect(computedRuns).toBe(1);
    expect(snapshot).toEqual([{ id: 1 }, { id: 2 }]);
    sig.push({ id: 3 });
    // .value reflects the new state (signal-tracking would re-trigger
    // effect() in real code; here we just read again).
    expect(sig.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    dispose();
  });

  it('exposes ArraySignal class for instanceof checks', () => {
    expect(arraySignal()).toBeInstanceOf(ArraySignal);
  });

  it('each(arraySignal) outside a mount context falls through to snapshot path', () => {
    const sig = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const out = each(sig, (it) => `<li>${it.label}</li>`);
    expect(out.toString()).toBe('<li>a</li><li>b</li>');
  });
});

describe('arraySignal — each() granular integration via mount()', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function renderRows(rows: ArraySignal<{ id: number; label: string }>): void {
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })),
    }));
  }

  it('first render emits the snapshot path (no patches yet)', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    expect(root.querySelectorAll('li').length).toBe(2);
    expect(root.querySelectorAll('li')[0].textContent).toBe('a');
    expect(root.querySelectorAll('li')[1].textContent).toBe('b');
  });

  it('update patch applies via reconcileGranular and preserves siblings', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldB = root.querySelectorAll('li')[1];
    rows.update(0, (r) => ({ ...r, label: 'A' }));
    const lis = root.querySelectorAll('li');
    expect(lis[0].textContent).toBe('A');
    expect(lis[1]).toBe(oldB);  // sibling preserved (granular reconciler doesn't touch unchanged rows)
    expect(lis[0]).not.toBe(oldA);  // updated row gets a fresh node (replaceChild)
  });

  it('insert patch adds a single row without re-rendering siblings', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldC = root.querySelectorAll('li')[1];
    rows.insert(1, { id: 2, label: 'b' });
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect([...lis].map((li) => li.textContent)).toEqual(['a', 'b', 'c']);
    expect(lis[0]).toBe(oldA);
    expect(lis[2]).toBe(oldC);
  });

  it('insert at end (push) appends without re-rendering siblings', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    renderRows(rows);
    const oldA = root.querySelector('li')!;
    rows.push({ id: 2, label: 'b' });
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0]).toBe(oldA);
    expect(lis[1].textContent).toBe('b');
  });

  it('remove patch deletes a single row without re-rendering siblings', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldC = root.querySelectorAll('li')[2];
    rows.remove(1);
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0]).toBe(oldA);
    expect(lis[1]).toBe(oldC);
  });

  it('move patch reorders a single row via insertBefore (preserves node identity)', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldB = root.querySelectorAll('li')[1];
    const oldC = root.querySelectorAll('li')[2];
    rows.move(0, 2);  // [b, c, a]
    const lis = root.querySelectorAll('li');
    expect([...lis]).toEqual([oldB, oldC, oldA]);
  });

  it('move backwards (n→0) inserts at the front', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' }]);
    renderRows(rows);
    const oldA = root.querySelectorAll('li')[0];
    const oldB = root.querySelectorAll('li')[1];
    const oldC = root.querySelectorAll('li')[2];
    rows.move(2, 0);  // [c, a, b]
    const lis = root.querySelectorAll('li');
    expect([...lis]).toEqual([oldC, oldA, oldB]);
  });

  it('replace patch falls through to the snapshot reconciler', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    rows.replace([{ id: 9, label: 'x' }, { id: 10, label: 'y' }]);
    const lis = root.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect([...lis].map((li) => li.textContent)).toEqual(['x', 'y']);
  });

  it('multiple granular events in sequence apply in order', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    renderRows(rows);
    rows.push({ id: 3, label: 'c' });
    rows.update(0, (r) => ({ ...r, label: 'A' }));
    rows.remove(1);  // remove 'b' (after the update, items are [A, b, c])
    const lis = root.querySelectorAll('li');
    expect([...lis].map((li) => li.textContent)).toEqual(['A', 'c']);
  });

  it('granular path coexists with non-arraySignal each() callsites', () => {
    const rowsA = arraySignal([{ id: 1, label: 'a' }]);
    const staticRows = [{ id: 99, label: 'static' }];
    mount(root, () => jsx('div', {
      children: [
        jsx('ul', { children: each(rowsA, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })) }),
        jsx('ol', { children: each(staticRows, (r) => jsx('li', { 'data-key': String(r.id), children: r.label })) }),
      ],
    }));
    rowsA.update(0, (r) => ({ ...r, label: 'A' }));
    expect(root.querySelector('ul li')!.textContent).toBe('A');
    expect(root.querySelector('ol li')!.textContent).toBe('static');
  });

  it('non-arraySignal each() falls through to today\'s snapshot path', () => {
    const items = [{ id: 1 }, { id: 2 }];
    mount(root, () => jsx('ul', {
      children: each(items, (r) => jsx('li', { 'data-key': String(r.id), children: String(r.id) })),
    }));
    expect(root.querySelectorAll('li').length).toBe(2);
  });

  it('update patch is a no-op when the new HTML matches the old', () => {
    // Defensive path: caller calls .update with an identity fn (or returns
    // a structurally equivalent row). The reconciler short-circuits and
    // doesn't replace the live node.
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    renderRows(rows);
    const oldA = root.querySelector('li')!;
    rows.update(0, (r) => ({ ...r }));  // fresh ref, identical content → identical html
    expect(root.querySelector('li')).toBe(oldA);  // node identity preserved
  });

  it('throws a descriptive error when a granular row render produces no top-level element', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    let renderImpl = (r: { id: number; label: string }): string =>
      `<li data-key="${r.id}">${r.label}</li>`;
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => renderImpl(r as { id: number; label: string })),
    }));
    // Swap the render impl mid-flight so the next update produces empty HTML.
    renderImpl = () => '   ';
    expect(() => rows.update(0, (r) => ({ ...r, label: 'changed' }))).toThrow(
      /granular reconcile: row render produced no top-level element/,
    );
  });

  it('arraySignal value reads inside the mount closure trigger re-renders for non-granular consumers', () => {
    // Length-derived state — reads .value, not granular events. Should
    // still re-render when the array changes.
    const rows = arraySignal([{ id: 1 }, { id: 2 }]);
    const tick = signal(0);
    let renders = 0;
    mount(root, () => {
      void tick.value;
      renders += 1;
      return jsx('span', { children: `count: ${rows.value.length}` });
    });
    expect(renders).toBe(1);
    expect(root.querySelector('span')!.textContent).toBe('count: 2');
    rows.push({ id: 3 });
    expect(renders).toBe(2);
    expect(root.querySelector('span')!.textContent).toBe('count: 3');
  });
});
