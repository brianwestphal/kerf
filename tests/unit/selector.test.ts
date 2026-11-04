import { describe, expect, it } from 'vitest';

import { batch, computed, effect, signal } from '../../src/reactive.js';
import { selector } from '../../src/selector.js';

/** Subscribe one counting effect per key, the way a row binding does. */
function watchKeys<K>(isSelected: (k: K) => { value: boolean }, keys: K[]) {
  const runs = new Map<K, number>();
  const seen = new Map<K, boolean>();
  const stops = new Map<K, () => void>();
  for (const key of keys) {
    runs.set(key, 0);
    stops.set(
      key,
      effect(() => {
        seen.set(key, isSelected(key).value);
        runs.set(key, (runs.get(key) ?? 0) + 1);
      }),
    );
  }
  const reset = () => {
    for (const key of runs.keys()) runs.set(key, 0);
  };
  return { runs, seen, stops, reset };
}

describe('selector()', () => {
  it('select A then B notifies only the two keys that changed', () => {
    const selected = signal<number>(0);
    const isSelected = selector(selected);
    const keys = Array.from({ length: 1000 }, (_, i) => i + 1);
    const { runs, seen, reset } = watchKeys(isSelected, keys);
    expect([...seen.values()].every((v) => !v)).toBe(true);

    reset();
    selected.value = 1;
    expect([...runs.entries()].filter(([, n]) => n > 0)).toEqual([[1, 1]]);
    expect(seen.get(1)).toBe(true);

    reset();
    selected.value = 2;
    expect([...runs.entries()].filter(([, n]) => n > 0)).toEqual([
      [1, 1],
      [2, 1],
    ]);
    expect(seen.get(1)).toBe(false);
    expect(seen.get(2)).toBe(true);
  });

  it('one source write costs O(1) key effects regardless of N', () => {
    for (const n of [10, 10_000]) {
      const selected = signal(-1);
      const isSelected = selector(selected);
      const { runs, reset } = watchKeys(
        isSelected,
        Array.from({ length: n }, (_, i) => i),
      );
      reset();
      selected.value = 3;
      selected.value = 7;
      const total = [...runs.values()].reduce((a, b) => a + b, 0);
      expect(total).toBe(3); // 3 on, then 3 off + 7 on
    }
  });

  it('selecting the same key again is a no-op', () => {
    const selected = signal('a');
    const { runs, reset } = watchKeys(selector(selected), ['a', 'b']);
    reset();
    selected.value = 'a';
    expect([...runs.values()]).toEqual([0, 0]);
  });

  it('a key first rendered while already selected starts true', () => {
    const selected = signal(5);
    const isSelected = selector(selected);
    watchKeys(isSelected, [1]);
    selected.value = 9;
    const { seen } = watchKeys(isSelected, [9]);
    expect(seen.get(9)).toBe(true);
  });

  it('batched A → B → C flips A off and C on once, never B', () => {
    const selected = signal('a');
    const { runs, seen, reset } = watchKeys(selector(selected), [
      'a',
      'b',
      'c',
    ]);
    reset();
    batch(() => {
      selected.value = 'b';
      selected.value = 'c';
    });
    expect(Object.fromEntries(runs)).toEqual({ a: 1, b: 0, c: 1 });
    expect(Object.fromEntries(seen)).toEqual({ a: false, b: false, c: true });
  });

  it('removing the selected row, then clear and re-add, keeps the entries consistent', () => {
    const selected = signal(1);
    const isSelected = selector(selected);
    const first = watchKeys(isSelected, [1, 2]);
    first.stops.get(1)!(); // the selected row is removed
    selected.value = 2;
    expect(first.seen.get(2)).toBe(true);
    first.stops.get(2)!(); // clear
    selected.value = 1;
    const again = watchKeys(isSelected, [1, 2]); // re-add
    expect(Object.fromEntries(again.seen)).toEqual({ 1: true, 2: false });
    again.reset();
    selected.value = 2;
    expect(Object.fromEntries(again.runs)).toEqual({ 1: 1, 2: 1 });
  });

  it('drops every entry and its source subscription once no key is watched', () => {
    const selected = signal(0);
    let sourceReads = 0;
    const counted = computed(() => {
      sourceReads++;
      return selected.value;
    });
    const isSelected = selector(counted);
    const { stops } = watchKeys(isSelected, [1, 2, 3]);
    for (const stop of stops.values()) stop();
    sourceReads = 0;
    selected.value = 1;
    // Nothing subscribes to `counted` any more, so writing its input
    // recomputes nothing: the selector let go of the source.
    expect(sourceReads).toBe(0);
    // A later subscriber resubscribes and reads the current value.
    const { seen } = watchKeys(isSelected, [1]);
    expect(seen.get(1)).toBe(true);
  });

  it('an unwatched read returns the current comparison without caching it', () => {
    const selected = signal('x');
    const isSelected = selector(selected);
    const before = isSelected('x');
    expect(before.peek()).toBe(true);
    expect(isSelected('x')).not.toBe(before); // not cached
    selected.value = 'y';
    expect(isSelected('x').peek()).toBe(false);
    expect(isSelected('y').peek()).toBe(true);
  });

  it('a signal handed out earlier and watched later reads the current value', () => {
    const selected = signal(1);
    const isSelected = selector(selected);
    const held = isSelected(1); // true now, not watched
    selected.value = 2; // nothing watches `held`, so nothing updates it
    let seen: boolean | undefined;
    const stop = effect(() => {
      seen = held.value;
    });
    expect(seen).toBe(false);
    selected.value = 1;
    expect(seen).toBe(true);
    stop();
  });

  it('two uncached signals for one key both follow the source once watched', () => {
    const selected = signal(0);
    const isSelected = selector(selected);
    const a = isSelected(1);
    const b = isSelected(1);
    const seen: boolean[] = [];
    const stopA = effect(() => void seen.push(a.value));
    const stopB = effect(() => void seen.push(b.value));
    selected.value = 1;
    expect(a.value && b.value).toBe(true);
    stopA();
    selected.value = 0;
    expect(b.value).toBe(false);
    stopB();
    expect(seen).toEqual([false, false, true, true, false]);
  });

  it('compares like a Map key (NaN equals NaN; object keys by identity)', () => {
    const nan = signal(Number.NaN);
    const { seen } = watchKeys(selector(nan), [Number.NaN]);
    expect(seen.get(Number.NaN)).toBe(true);

    const one = { id: 1 };
    const obj = signal<object>({ id: 1 });
    const objects = watchKeys(selector(obj), [one]);
    expect(objects.seen.get(one)).toBe(false);
    obj.value = one;
    expect(objects.seen.get(one)).toBe(true);
  });
});
