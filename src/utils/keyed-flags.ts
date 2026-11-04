/**
 * The per-key boolean signals behind `selector()` and `setSelector()`
 * (KF-769EW2 / KF-1TFHMP). `test(value, key)` answers the question for one
 * source value; `follow(flip)` subscribes to the source once and calls
 * `flip(key, value)` for each key whose answer changed, returning a stop.
 *
 * Each key is handed out as a `computed` with two modes (KF-4TXB21):
 *
 * - **Unwatched**, it reads `source` directly. Unwatched computeds are lazy,
 *   so this costs nothing per source change, and a signal held outside any
 *   subscriber (a click handler reading `.value`) is always current.
 * - **Watched**, it reads only a per-key flag that the single `follow`
 *   effect flips, so a source change notifies just the keys that changed.
 *
 * A key's flag joins the map when the computed gains its first subscriber
 * and leaves with its last (signals-core `watched` / `unwatched`), and the
 * source subscription runs only while some key is watched. Internal.
 */
import {
  computed,
  rawSignal,
  type ReadonlySignal,
  type Signal,
} from '../reactive.js';

interface WatchedKey {
  /** The flags `follow` flips: usually one; more when several unshared
   *  computeds for one key each gained a subscriber. */
  flags: Set<Signal<boolean>>;
  /** Handed out again for this key while it is watched. */
  shared: ReadonlySignal<boolean>;
}

export function keyedFlags<K, S>(
  source: ReadonlySignal<S>,
  test: (value: S, key: K) => boolean,
  follow: (flip: (key: K, value: boolean) => void) => () => void,
): (key: K) => ReadonlySignal<boolean> {
  const watched = new Map<K, WatchedKey>();
  let stop: (() => void) | undefined;

  const flip = (key: K, value: boolean): void => {
    const entry = watched.get(key);
    if (entry) for (const flag of entry.flags) flag.value = value;
  };

  return (key: K): ReadonlySignal<boolean> => {
    const existing = watched.get(key);
    if (existing) return existing.shared;
    let flag: Signal<boolean> | undefined;
    const reader: ReadonlySignal<boolean> = computed(
      () => (flag ? flag.value : test(source.value, key)),
      {
        watched() {
          flag = rawSignal(test(source.peek(), key));
          let entry = watched.get(key);
          if (!entry)
            watched.set(key, (entry = { flags: new Set(), shared: reader }));
          entry.flags.add(flag);
          if (stop === undefined) stop = follow(flip);
        },
        unwatched() {
          const released = flag as Signal<boolean>;
          flag = undefined;
          const entry = watched.get(key) as WatchedKey;
          entry.flags.delete(released);
          if (entry.flags.size === 0) watched.delete(key);
          // The computed's last dependency is this flag, which nothing will
          // flip again. Changing it makes the next read re-evaluate, and that
          // read goes back to tracking the source.
          released.value = !released.peek();
          if (watched.size === 0 && stop !== undefined) {
            stop();
            stop = undefined;
          }
        },
      },
    );
    return reader;
  };
}
