/**
 * `setSelector(source)` — membership in one set signal, flipping only the
 * members that changed (KF-1TFHMP).
 *
 * `selector()` answers "is this key THE selected one?". `setSelector()`
 * answers "is this key IN the set?", for multi-select, a tree's expanded
 * rows, fields with errors, or a router's active path prefixes:
 *
 *   const checked = signal<ReadonlySet<string>>(new Set());
 *   const isChecked = setSelector(checked);
 *   <tr class={computed(() => (isChecked(row.id).value ? 'on' : ''))}>
 *
 * One write diffs the previous set against the next, O(|old| + |new|), and
 * notifies only the subscribers of members that were added or removed. A
 * new Set with the same members flips nothing. That pays off when the sets
 * are small next to the number of subscribed keys (a few selected rows of
 * many); for a set that holds most keys, a plain `computed` per row costs
 * about the same.
 *
 * Per-key signals follow their subscribers exactly as `selector()`'s do, and
 * membership is `Set.prototype.has` (SameValueZero).
 */
import { effect, type ReadonlySignal } from './reactive.js';
import { keyedFlags } from './utils/keyed-flags.js';

/** A set-membership reader returned by {@link setSelector}. */
export type SetSelector<K> = (key: K) => ReadonlySignal<boolean>;

/**
 * Create a membership reader over `source`: `setSelector(source)(key).value`
 * is `true` exactly when `source.value.has(key)`, and one source change
 * notifies only the subscribers of members added or removed.
 */
export function setSelector<K>(
  source: ReadonlySignal<ReadonlySet<K>>,
): SetSelector<K> {
  return keyedFlags<K, ReadonlySet<K>>(
    source,
    (members, key) => members.has(key),
    (flip) => {
      let current = source.peek();
      return effect(() => {
        const next = source.value;
        if (next === current) return;
        const previous = current;
        current = next;
        for (const key of previous) if (!next.has(key)) flip(key, false);
        for (const key of next) if (!previous.has(key)) flip(key, true);
      });
    },
  );
}
