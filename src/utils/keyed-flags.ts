/**
 * The per-key boolean signals behind `selector()` and `setSelector()`
 * (KF-769EW2 / KF-1TFHMP). `test(key)` answers the question for the source's
 * current value; `follow(flip)` subscribes to the source once and calls
 * `flip(key, value)` for each key whose answer changed, returning a stop.
 *
 * A key's signal joins the map when its first subscriber arrives and leaves
 * it with its last (signals-core `watched` / `unwatched`), and the source
 * subscription runs only while some key is watched. A key read outside any
 * subscriber is a fresh, uncached signal holding the current answer; a held
 * signal re-syncs when it is first watched. Internal.
 */
import { rawSignal, type ReadonlySignal, type Signal } from '../reactive.js';

export function keyedFlags<K>(
  test: (key: K) => boolean,
  follow: (flip: (key: K, value: boolean) => void) => () => void,
): (key: K) => ReadonlySignal<boolean> {
  // Watched key signals by key. Usually one signal per key; a set covers two
  // uncached signals for one key that each gained a subscriber.
  const watched = new Map<K, Set<Signal<boolean>>>();
  let stop: (() => void) | undefined;

  const flip = (key: K, value: boolean): void => {
    const entries = watched.get(key);
    if (entries) for (const entry of entries) entry.value = value;
  };

  return (key: K): ReadonlySignal<boolean> => {
    const existing = watched.get(key);
    if (existing) for (const entry of existing) return entry;
    const entry: Signal<boolean> = rawSignal(test(key), {
      watched() {
        let entries = watched.get(key);
        if (!entries) watched.set(key, (entries = new Set()));
        entries.add(entry);
        if (stop === undefined) stop = follow(flip);
        // A signal handed out earlier and watched only now may hold a stale
        // answer; nothing watched it, so nothing saw it go stale.
        const value = test(key);
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
