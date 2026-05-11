/**
 * `arraySignal(initial)` — granular collection signal.
 *
 * A keyed-list-friendly variant of `signal()` that emits typed patch events
 * for every mutation (update / insert / remove / move / replace). When such
 * a signal is bound to `each(...)` inside a `mount()`, the keyed list
 * reconciler applies just the patches against the live DOM — no per-item
 * iteration, no `classifyItems` Map build, no LIS pass over unchanged rows.
 *
 *   const rows = arraySignal<Row>([]);
 *
 *   rows.update(42, (r) => ({ ...r, label: 'changed' }));   // 1 update event
 *   rows.insert(0, { id: 'x', ... });                        // 1 insert event
 *   rows.remove(7);                                          // 1 remove event
 *   rows.move(3, 0);                                          // 1 move event
 *   rows.replace([...]);                                      // falls back to snapshot reconcile
 *
 * Read-side semantics match a regular signal: `arraySig.value` is a
 * snapshot, and reads inside `effect()` / `computed()` register as
 * dependencies, so derived values keep working.
 */

import type { Signal } from './reactive.js';
import { signal } from './reactive.js';

/** A single granular mutation event. */
export type ArrayPatch<T> =
  | { type: 'update'; index: number; item: T }
  | { type: 'insert'; index: number; item: T }
  | { type: 'remove'; index: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'replace'; items: readonly T[] };

/**
 * Cross-bundle brand for `ArraySignal` instances. `each()` and the
 * granular reconciler check for this brand instead of `instanceof
 * ArraySignal`, so the main `kerfjs` barrel can detect arraySignal
 * inputs without importing the class at runtime — the class lives
 * only in the `kerfjs/array-signal` subpath, so apps that don't need
 * granular collections shed ~1 KB.
 *
 * Same `Symbol.for(...)`-based pattern as `SafeHtml` (KF-14): cross-
 * bundle-safe, zero-cost runtime check.
 */
export const ARRAY_SIGNAL_BRAND = Symbol.for('kerfjs.ArraySignal');

export class ArraySignal<T> {
  private _items: T[];
  private _version: Signal<number>;
  private _patches: ArrayPatch<T>[];
  // Branded so `isArraySignal()` recognizes instances from any copy of this module.
  readonly [ARRAY_SIGNAL_BRAND] = true as const;

  constructor(initial: readonly T[] = []) {
    this._items = [...initial];
    this._version = signal(0);
    this._patches = [];
  }

  /** Read-only snapshot. Reads inside an effect/computed register a dependency. */
  get value(): readonly T[] {
    // Touch the version signal so signals-core treats reads as tracked.
    void this._version.value;
    return this._items;
  }

  /** Replace the item at `index` with `fn(currentItem)`. Emits one `update` patch. */
  update(index: number, fn: (item: T) => T): void {
    if (index < 0 || index >= this._items.length) {
      throw new Error(
        `arraySignal.update: index ${index} out of bounds [0, ${this._items.length}).`,
      );
    }
    const next = fn(this._items[index]);
    this._items[index] = next;
    this._patches.push({ type: 'update', index, item: next });
    this._version.value++;
  }

  /** Insert `item` at `index`. Existing items at index..N shift right. Emits one `insert` patch. */
  insert(index: number, item: T): void {
    if (index < 0 || index > this._items.length) {
      throw new Error(
        `arraySignal.insert: index ${index} out of bounds [0, ${this._items.length}].`,
      );
    }
    this._items.splice(index, 0, item);
    this._patches.push({ type: 'insert', index, item });
    this._version.value++;
  }

  /** Append `item` at the end. Sugar for `insert(items.length, item)`. */
  push(item: T): void {
    this.insert(this._items.length, item);
  }

  /** Remove and return the item at `index`. Emits one `remove` patch. */
  remove(index: number): T {
    if (index < 0 || index >= this._items.length) {
      throw new Error(
        `arraySignal.remove: index ${index} out of bounds [0, ${this._items.length}).`,
      );
    }
    const [removed] = this._items.splice(index, 1);
    this._patches.push({ type: 'remove', index });
    this._version.value++;
    return removed;
  }

  /** Move the item at `from` to position `to`. Emits one `move` patch (no-op when from === to). */
  move(from: number, to: number): void {
    if (from === to) return;
    if (from < 0 || from >= this._items.length || to < 0 || to >= this._items.length) {
      throw new Error(
        `arraySignal.move: indices out of bounds (from=${from}, to=${to}, length=${this._items.length}).`,
      );
    }
    const [item] = this._items.splice(from, 1);
    this._items.splice(to, 0, item);
    this._patches.push({ type: 'move', from, to });
    this._version.value++;
  }

  /** Replace every item. Emits one `replace` patch — the granular reconciler falls back to a full keyed diff for this case. */
  replace(items: readonly T[]): void {
    this._items = [...items];
    this._patches.push({ type: 'replace', items: this._items });
    this._version.value++;
  }

  /**
   * @internal Used by `each()` when binding this signal to a list. Returns
   * the queue of granular patches issued since the previous call, then
   * clears the queue. Best paired with a single binding — a second consumer
   * in the same render gets an empty array (which forces the snapshot
   * fall-back path, which is correct but slower).
   */
  _consumePatches(): ArrayPatch<T>[] {
    const out = this._patches;
    this._patches = [];
    return out;
  }
}

/** Construct an array signal seeded with `initial`. */
export function arraySignal<T>(initial: readonly T[] = []): ArraySignal<T> {
  return new ArraySignal(initial);
}
