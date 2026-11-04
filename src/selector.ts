/**
 * `selector(source)` — keyed equality against one signal, at O(1) per change.
 *
 * The everyday "is this row the selected one?" pattern,
 *
 *   className={computed(() => (row.id === selectedId.value ? 'danger' : ''))}
 *
 * subscribes EVERY row's computed to `selectedId`, so one write re-evaluates
 * all N of them although only two rows change. `selector()` subscribes to the
 * source ONCE and hands out a boolean signal per key; a source change flips
 * only the previous key's and the next key's signals:
 *
 *   const isSelected = selector(selectedId);
 *   <tr className={computed(() => (isSelected(row.id).value ? 'danger' : ''))}>
 *
 * Per-key entries exist only while something watches them. A key signal joins
 * the closure's map when its first subscriber arrives and leaves it when its
 * last one goes (signals-core's `watched` / `unwatched` hooks), so removing a
 * row — which disposes its binding effects — removes its entry. The one
 * subscription to `source` likewise exists only while at least one key is
 * watched. A key read outside any subscriber (`isSelected(k).peek()`) is a
 * fresh, uncached signal holding the current comparison.
 *
 * Keys compare by `Map` identity (SameValueZero): primitives or object
 * references. There is deliberately no custom equality — a comparator would
 * need to visit every key, which is the O(N) this exists to avoid.
 */
import {
  effect,
  rawSignal,
  type ReadonlySignal,
  type Signal,
} from './reactive.js';

/** A keyed-equality reader returned by {@link selector}. */
export type Selector<K> = (key: K) => ReadonlySignal<boolean>;

// SameValueZero, the comparison a Map key lookup uses.
const same = (a: unknown, b: unknown): boolean =>
  a === b || (a !== a && b !== b);

/**
 * Create a keyed-equality reader over `source`: `selector(source)(key).value`
 * is `true` exactly when `source.value` equals `key`, and one source change
 * notifies only the subscribers of the previous and next keys.
 */
export function selector<K>(source: ReadonlySignal<K>): Selector<K> {
  // Watched key signals by key. Usually one signal per key; a set covers two
  // uncached signals for one key that each gained a subscriber.
  const watched = new Map<K, Set<Signal<boolean>>>();
  let stop: (() => void) | undefined;
  let current: K;

  const flip = (key: K, value: boolean): void => {
    const entries = watched.get(key);
    if (entries) for (const entry of entries) entry.value = value;
  };

  const start = (): void => {
    current = source.peek();
    stop = effect(() => {
      const next = source.value;
      if (same(next, current)) return;
      const previous = current;
      current = next;
      flip(previous, false);
      flip(next, true);
    });
  };

  return (key: K): ReadonlySignal<boolean> => {
    const existing = watched.get(key);
    if (existing) for (const entry of existing) return entry;
    const entry: Signal<boolean> = rawSignal(same(source.peek(), key), {
      watched() {
        let entries = watched.get(key);
        if (!entries) watched.set(key, (entries = new Set()));
        entries.add(entry);
        if (stop === undefined) start();
        // A signal handed out earlier and watched only now may hold a stale
        // comparison; nothing watched it, so nothing saw it go stale.
        const value = same(source.peek(), key);
        if (entry.peek() !== value) entry.value = value;
      },
      unwatched() {
        const entries = watched.get(key);
        entries?.delete(entry);
        if (entries?.size === 0) watched.delete(key);
        if (watched.size === 0 && stop !== undefined) {
          stop();
          stop = undefined;
        }
      },
    });
    return entry;
  };
}
