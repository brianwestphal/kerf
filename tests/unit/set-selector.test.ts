import { describe, expect, it } from 'vitest';

import { batch, computed, effect, signal } from '../../src/reactive.js';
import { setSelector } from '../../src/set-selector.js';

/** One counting effect per key, the way a row binding subscribes. */
function watchKeys<K>(isMember: (k: K) => { value: boolean }, keys: K[]) {
  const runs = new Map<K, number>();
  const seen = new Map<K, boolean>();
  const stops = new Map<K, () => void>();
  for (const key of keys) {
    runs.set(key, 0);
    stops.set(
      key,
      effect(() => {
        seen.set(key, isMember(key).value);
        runs.set(key, (runs.get(key) ?? 0) + 1);
      }),
    );
  }
  const reset = () => {
    for (const key of runs.keys()) runs.set(key, 0);
  };
  const changed = () =>
    [...runs.entries()].filter(([, n]) => n > 0).map(([key]) => key);
  return { runs, seen, stops, reset, changed };
}

const set = <K>(...keys: K[]): ReadonlySet<K> => new Set(keys);

describe('setSelector()', () => {
  it('adding and removing members notifies only those keys', () => {
    const chosen = signal(set<number>());
    const keys = Array.from({ length: 500 }, (_, i) => i);
    const { seen, reset, changed } = watchKeys(setSelector(chosen), keys);
    reset();
    chosen.value = set(3, 7);
    expect(changed()).toEqual([3, 7]);
    expect([seen.get(3), seen.get(7), seen.get(4)]).toEqual([
      true,
      true,
      false,
    ]);
    reset();
    chosen.value = set(7, 9);
    expect(changed()).toEqual([3, 9]);
    expect([seen.get(3), seen.get(7), seen.get(9)]).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('replacing the whole set flips every member that changed, once', () => {
    const chosen = signal(set('a', 'b'));
    const { runs, seen, reset } = watchKeys(setSelector(chosen), [
      'a',
      'b',
      'c',
      'd',
    ]);
    reset();
    chosen.value = set('c', 'd');
    expect(Object.fromEntries(runs)).toEqual({ a: 1, b: 1, c: 1, d: 1 });
    expect(Object.fromEntries(seen)).toEqual({
      a: false,
      b: false,
      c: true,
      d: true,
    });
  });

  it('a new set with the same members flips nothing', () => {
    const chosen = signal(set(1, 2));
    const { reset, changed } = watchKeys(setSelector(chosen), [1, 2, 3]);
    reset();
    chosen.value = set(2, 1);
    expect(changed()).toEqual([]);
  });

  it('empties and refills', () => {
    const chosen = signal(set('x', 'y'));
    const { seen, reset, changed } = watchKeys(setSelector(chosen), [
      'x',
      'y',
      'z',
    ]);
    chosen.value = set();
    expect(Object.fromEntries(seen)).toEqual({ x: false, y: false, z: false });
    reset();
    chosen.value = set('y', 'z');
    expect(changed()).toEqual(['y', 'z']);
    expect(Object.fromEntries(seen)).toEqual({ x: false, y: true, z: true });
  });

  it('batched writes diff the first set against the last', () => {
    const chosen = signal(set('a'));
    const { runs, reset } = watchKeys(setSelector(chosen), ['a', 'b', 'c']);
    reset();
    batch(() => {
      chosen.value = set('b');
      chosen.value = set('a', 'c');
    });
    // `a` left and came back, `b` came and went: only `c` changed.
    expect(Object.fromEntries(runs)).toEqual({ a: 0, b: 0, c: 1 });
  });

  it('a removed row releases its key, and the source once none is watched', () => {
    const chosen = signal(set(1));
    let reads = 0;
    const counted = computed(() => {
      reads++;
      return chosen.value;
    });
    const isMember = setSelector(counted);
    const { stops, seen } = watchKeys(isMember, [1, 2]);
    stops.get(1)!();
    chosen.value = set(2);
    expect(seen.get(2)).toBe(true);
    // The released key's last answer is what it saw before it went.
    expect(seen.get(1)).toBe(true);
    stops.get(2)!();
    reads = 0;
    chosen.value = set(1, 2);
    expect(reads).toBe(0);
    const again = watchKeys(isMember, [1, 2, 3]);
    expect(Object.fromEntries(again.seen)).toEqual({
      1: true,
      2: true,
      3: false,
    });
  });

  it('an unwatched read is the current membership, uncached; a held one re-syncs', () => {
    const chosen = signal(set('k'));
    const isMember = setSelector(chosen);
    const held = isMember('k');
    expect(held.peek()).toBe(true);
    expect(isMember('k')).not.toBe(held);
    chosen.value = set();
    expect(isMember('k').peek()).toBe(false);
    let seen: boolean | undefined;
    const stop = effect(() => {
      seen = held.value;
    });
    expect(seen).toBe(false);
    chosen.value = set('k');
    expect(seen).toBe(true);
    stop();
  });

  it('matches like Set.has (NaN, object identity)', () => {
    const one = { id: 1 };
    const chosen = signal(set<unknown>(Number.NaN));
    const { seen } = watchKeys(setSelector(chosen), [Number.NaN, one]);
    expect(seen.get(Number.NaN)).toBe(true);
    expect(seen.get(one)).toBe(false);
    chosen.value = set<unknown>(one);
    expect(seen.get(one)).toBe(true);
    expect(seen.get(Number.NaN)).toBe(false);
  });
});
