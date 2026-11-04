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
 * watched. A key signal handed out outside any subscriber is not cached, and
 * a held one is always current: unsubscribed, it reads `source` lazily.
 *
 * Keys compare by `Map` identity (SameValueZero): primitives or object
 * references. There is deliberately no custom equality — a comparator would
 * need to visit every key, which is the O(N) this exists to avoid.
 */
import { effect, type ReadonlySignal } from './reactive.js';
import { keyedFlags } from './utils/keyed-flags.js';

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
  return keyedFlags<K, K>(source, same, (flip) => {
    let current = source.peek();
    return effect(() => {
      const next = source.value;
      if (same(next, current)) return;
      const previous = current;
      current = next;
      flip(previous, false);
      flip(next, true);
    });
  });
}
