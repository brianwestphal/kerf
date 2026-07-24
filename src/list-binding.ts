/**
 * Per-list binding shape kept by `mount()` and consumed by both reconcile
 * paths in `list-reconcile-snapshot.ts` and `list-reconcile-granular.ts`.
 *
 * Living in its own file (not re-exported through `list-reconcile.ts`) so
 * the snapshot + granular paths can import it without creating a circular
 * dependency on `list-reconcile.ts` itself. ESM handles cycles via function
 * hoisting, but a cycle involving a non-function helper would be a temporal
 * dead zone — extracting the binding shape + `endAnchor` here keeps the
 * dependency graph acyclic.
 */

import type { Binding } from './bindings.js';

export interface BoundItem {
  ref: object;
  cacheKey: unknown;
  html: string;
  node: Element;
  /** KF-294: this row's fine-grained binding specs (undefined/empty if none). */
  bindings?: Binding[];
  /**
   * KF-294: live disposers for this row's bound effects. Set when the row node
   * is wired (first-render inline in `mount()`, or `buildFreshNodes` during a
   * reconcile) and called when the node is removed / the mount is torn down.
   */
  bindingDisposers?: Array<() => void>;
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
   * `marker.nextSibling` (empty list) or `items[last].node.nextSibling`
   * (non-empty list) — picking up whatever the diff placed between the
   * list and the parent's tail.
   */
  marker: Comment;

  /**
   * KF-173: once we've emitted the missing-key dev warning for this list,
   * we suppress further warnings for the same binding. The flag is set
   * inside `maybeWarnMissingRowKey()` and never cleared — the list is
   * considered "decided" after the first row check.
   */
  warnedMissingKey?: boolean;
}

/**
 * Compute the live-DOM anchor that comes after the list's last item, used
 * by the apply* functions when inserting at the tail of the list.
 *
 * - Empty list: `marker.nextSibling`.
 * - Non-empty list: `items[last].node.nextSibling` — derived dynamically so
 *   that siblings the diff inserted between the list's last item and the
 *   parent's tail still anchor correctly.
 *
 * **`nextSibling`, not `nextElementSibling`.** The list's region ends at its
 * last row, and the very next node — of any type — is the boundary. Skipping
 * to the next *element* walks straight past the two things most likely to sit
 * there and appends at the parent's tail instead: static text or comments
 * after the list (so a new row jumps a trailing `footer`), and the next
 * sibling list's `<!--kf-list:…-->` marker (so two lists that are both empty
 * both anchor at `null` and interleave their rows in the wrong order — with
 * the *second* list's rows landing first, since the first list to fill has
 * nothing to anchor against).
 */
export function endAnchor(binding: ListBinding): Node | null {
  if (binding.items.length > 0) {
    return binding.items[binding.items.length - 1].node.nextSibling;
  }
  return binding.marker.nextSibling;
}
