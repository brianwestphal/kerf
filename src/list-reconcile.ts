/**
 * Keyed list reconciler — the engine behind `each(...)` inside `mount()`.
 *
 * Public surface (re-exported via the rest of the runtime):
 *   - `BoundItem` / `ListBinding`: the binding shape `mount()` keeps
 *     per-list, mapping `each()` items to their live DOM nodes.
 *     Defined in `list-binding.ts` and re-exported here.
 *   - `endAnchor(binding)`: dynamic "insert at end of list" anchor.
 *     Also defined in `list-binding.ts` and re-exported here.
 *   - `reconcileList(binding, listSeg)`: top-level dispatch.
 *
 * Implementation lives in two sibling files:
 *   - `list-reconcile-snapshot.ts` — the original keyed algorithm
 *     (classify / bulk-parse / LIS / move). Used for plain-array `each()`
 *     and for arraySignal-backed `each()` when the patch path can't apply
 *     (first render, post-`replace()`, post-drift recovery).
 *   - `list-reconcile-granular.ts` — the KF-92 patch-driven path used
 *     when an `arraySignal`'s queued patches can be applied directly to
 *     the existing binding without iterating the snapshot.
 *
 * The split mirrors the two-axis nature of the reconciler: snapshot-vs-
 * granular path × shared bookkeeping (binding shape, end-of-list anchor,
 * focus capture/restore). The binding shape is in its own `list-binding.ts`
 * file so the two sibling reconcilers can import it without creating a
 * circular dependency back to `list-reconcile.ts`. Internal to kerf — not
 * part of the public API.
 */

export { type BoundItem, endAnchor, type ListBinding } from './list-binding.js';
import type { ListBinding } from './list-binding.js';
import { reconcileGranular } from './list-reconcile-granular.js';
import { reconcileSnapshot } from './list-reconcile-snapshot.js';
import type { ListSegment } from './segment.js';

/**
 * Reconcile `binding`'s live parent against `listSeg`. Mutates `binding.items`
 * to mirror the new segment when done.
 *
 * Dispatch:
 * - **Granular (KF-92)**: an `arraySignal`-backed `each()` whose patch
 *   queue is non-empty AND the binding has at least one row. Applies
 *   patches directly. `each()` filters `replace` patches upstream so the
 *   patches reaching here are guaranteed to be update/insert/remove/move
 *   only.
 * - **Snapshot**: every other case — first render of a list, plain-array
 *   `each()`, post-`replace()`, post-drift recovery. Runs the keyed
 *   classify/build/move algorithm.
 */
export function reconcileList(binding: ListBinding, listSeg: ListSegment): void {
  if (listSeg.patches !== undefined && binding.items.length > 0) {
    reconcileGranular(binding, listSeg.patches);
    return;
  }
  reconcileSnapshot(binding, listSeg);
}
