/**
 * Keyed list reconciler — the engine behind `each(...)` inside `mount()`.
 *
 * Public surface (re-exported via the rest of the runtime):
 *   - `BoundItem` / `ListBinding`: the binding shape `mount()` keeps
 *     per-list, mapping `each()` items to their live DOM nodes.
 *   - `endAnchor(binding)`: dynamic "insert at end of list" anchor.
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
 * focus capture/restore). Internal to kerf — not part of the public API.
 */

import { reconcileGranular } from './list-reconcile-granular.js';
import { reconcileSnapshot } from './list-reconcile-snapshot.js';
import type { ListSegment } from './segment.js';

export interface BoundItem {
  ref: object;
  cacheKey: unknown;
  html: string;
  node: Element;
}

export interface ListBinding {
  liveParent: Element;
  /**
   * One entry per item currently mounted under `liveParent`, in order.
   * Mirrors the segment's `items` length after each reconcile.
   */
  items: BoundItem[];
  /**
   * The list's `<!--kf-list:N-->` start marker, kept in the live DOM as
   * a permanent anchor (KF-102 round 2). The marker stays put across
   * static-surrounds diffs (it morphs as a comment node), so it gives
   * the list reconciler a stable "begin" position even when surrounding
   * siblings get inserted, removed, or reordered around the list.
   *
   * `endAnchor(binding)` derives the "insert at end of list" anchor from
   * `marker.nextElementSibling` (empty list) or
   * `items[last].node.nextElementSibling` (non-empty list) — picking up
   * any non-list element the diff inserted between the list and the
   * parent's tail.
   */
  marker: Comment;
}

/**
 * Compute the live-DOM anchor that comes after the list's last item, used
 * by the apply* functions when inserting at the tail of the list.
 *
 * - Empty list: `marker.nextElementSibling` — the next non-list element
 *   after the marker, or `null` if the list is the last thing in `liveParent`.
 * - Non-empty list: `items[last].node.nextElementSibling` — derived
 *   dynamically so that non-list siblings the diff inserted between the
 *   list's last item and the parent's tail still anchor correctly.
 */
export function endAnchor(binding: ListBinding): Element | null {
  if (binding.items.length > 0) {
    return binding.items[binding.items.length - 1].node.nextElementSibling;
  }
  return binding.marker.nextElementSibling;
}

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
