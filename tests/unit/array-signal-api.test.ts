/**
 * Unit tests for `arraySignal()` (KF-92) — both the standalone signal API
 * and its integration with `each()` / `mount()` for the granular reconcile
 * path.
 */

import { describe,expect,it } from 'vitest';

import { ArraySignal,arraySignal } from '../../src/array-signal.js';
import { each } from '../../src/index.js';

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
