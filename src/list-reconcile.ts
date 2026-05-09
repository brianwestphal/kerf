/**
 * Keyed list reconciler — the engine behind `each(...)` inside `mount()`.
 *
 * Given a `ListBinding` (the live parent + the items currently mounted under
 * it) and a fresh `ListSegment` from this render, mutate the live DOM with
 * the minimum number of operations:
 *
 * 1. Classify each new item as `stable` (cache hit on identity + html),
 *    `replaced` (same ref, html changed), or `new` (never seen before).
 * 2. Bulk-parse every fresh row's HTML in ONE `innerHTML` call — for an
 *    initial population of 10k rows that's 1 parse instead of 10k.
 * 3. Remove orphan refs (gone from the new list) + replaced rows' old nodes.
 * 4. Compute a longest-increasing-subsequence over old positions; items in
 *    the LIS are already in the right relative order, so they don't move.
 * 5. Reverse-pass over the new record, `insertBefore` only the items that
 *    didn't anchor the LIS.
 *
 * Lives in its own file so `mount.ts` can stay an orchestrator under the
 * 200-LOC guideline. Internal to kerf — not part of the public API.
 */

import { captureFocus, restoreFocus } from './list-reconcile-focus.js';
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
}

interface Classification {
  newRecord: BoundItem[];
  prevIdx: number[];
  replacedNodes: Element[];
  freshIndices: number[];
  freshHtmls: string[];
}

/**
 * Classify each item in the new segment against the old binding. Items with
 * a cache-hit (same ref + same html) are reused; replaced/new items get a
 * placeholder `BoundItem` whose `node` is filled in by the bulk parse below.
 */
function classifyItems(oldItems: BoundItem[], listSeg: ListSegment): Classification {
  // Single Map<ref, [item, index]> instead of two Maps over the same key set
  // (KF-90). Halves the .set() calls during the build, halves the lookup
  // probe count during classification. ~1-2 ms saved per render on 1k-row
  // lists.
  const oldByRef = new Map<object, [BoundItem, number]>();
  for (let i = 0; i < oldItems.length; i++) {
    oldByRef.set(oldItems[i].ref, [oldItems[i], i]);
  }

  const newRecord: BoundItem[] = new Array(listSeg.items.length);
  const prevIdx = new Array<number>(listSeg.items.length);
  const replacedNodes: Element[] = [];
  const freshIndices: number[] = [];
  const freshHtmls: string[] = [];

  for (let i = 0; i < listSeg.items.length; i++) {
    const ni = listSeg.items[i];
    const oi = oldByRef.get(ni.ref);
    if (oi !== undefined) {
      oldByRef.delete(ni.ref);
      if (oi[0].html === ni.html) {
        newRecord[i] = oi[0];
        prevIdx[i] = oi[1];
        continue;
      }
      replacedNodes.push(oi[0].node);
    }
    newRecord[i] = {
      ref: ni.ref, cacheKey: ni.cacheKey, html: ni.html, node: null as unknown as Element,
    };
    prevIdx[i] = -1;
    freshIndices.push(i);
    freshHtmls.push(ni.html);
  }

  // Whatever's left in oldByRef is an orphan ref that disappeared from the
  // new list. The caller removes those nodes.
  for (const [, orphan] of oldByRef) replacedNodes.push(orphan[0].node);
  // Distinguish: replacedNodes here mixes "old node for replaced row" and
  // "orphan node". That's fine — the caller removes both unconditionally.

  return { newRecord, prevIdx, replacedNodes, freshIndices, freshHtmls };
}

/**
 * Bulk-parse every fresh row's HTML in one `innerHTML` call, then walk the
 * parsed children in order and fill in each placeholder's `node` field.
 */
function buildFreshNodes(
  newRecord: BoundItem[],
  freshIndices: number[],
  freshHtmls: string[],
): void {
  if (freshHtmls.length === 0) return;
  const tpl = document.createElement('template');
  tpl.innerHTML = freshHtmls.join('');
  let node = tpl.content.firstElementChild;
  for (const idx of freshIndices) {
    if (node === null) {
      throw new Error(
        `each(): row render produced no top-level element. Each item's render must return exactly one element. Got HTML: ${newRecord[idx].html.slice(0, 120)}`,
      );
    }
    const next = node.nextElementSibling;
    newRecord[idx].node = node;
    node = next;
  }
}

/**
 * Remove every replaced/orphan node still attached to the live parent.
 */
function removeOldNodes(liveParent: Element, replacedNodes: Element[]): void {
  for (const node of replacedNodes) {
    if (node.parentElement === liveParent) liveParent.removeChild(node);
  }
}

/**
 * `insertBefore` everything that's not in the LIS. Walks the new record in
 * reverse so each move's anchor (`nextSibling`) is already in its final
 * position by the time we reach earlier items.
 */
function applyMoves(
  liveParent: Element,
  newRecord: BoundItem[],
  prevIdx: number[],
  stable: ReadonlySet<number>,
): void {
  let nextSibling: Element | null = null;
  for (let i = newRecord.length - 1; i >= 0; i--) {
    const node = newRecord[i].node;
    if (prevIdx[i] === -1 || !stable.has(i)) {
      liveParent.insertBefore(node, nextSibling);
    }
    nextSibling = node;
  }
}

/**
 * Patience-sort LIS: returns the *set of indices* in `arr` that participate
 * in a longest strictly-increasing subsequence. `-1` entries (representing
 * brand-new items in the new list) are ignored — they can't anchor the
 * subsequence and shouldn't count as stable.
 */
function lis(arr: ReadonlyArray<number>): ReadonlySet<number> {
  const tails: number[] = [];
  const tailIdx: number[] = [];
  const prev = new Array<number>(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v === -1) {
      prev[i] = -1;
      continue;
    }
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    prev[i] = lo > 0 ? tailIdx[lo - 1] : -1;
    tails[lo] = v;
    tailIdx[lo] = i;
  }
  const out = new Set<number>();
  let k = tailIdx.length > 0 ? tailIdx[tailIdx.length - 1] : -1;
  while (k !== -1) {
    out.add(k);
    k = prev[k];
  }
  return out;
}

/**
 * Reconcile `binding`'s live parent against `listSeg`. Mutates `binding.items`
 * to mirror the new segment when done.
 *
 * Focus capture/restore lives in `list-reconcile-focus.ts` — `insertBefore`
 * of a focused descendant's ancestor blurs the element in some engines
 * (happy-dom, older Safari) even when it stays connected; the snapshot fixes
 * those engines and is a no-op on engines that already preserve focus.
 */
export function reconcileList(binding: ListBinding, listSeg: ListSegment): void {
  const { liveParent } = binding;
  const { newRecord, prevIdx, replacedNodes, freshIndices, freshHtmls }
    = classifyItems(binding.items, listSeg);

  // KF-89 fast path: if no items were replaced, none are fresh, and every
  // surviving item kept its original position, the live tree already matches
  // the new segment. Skip buildFreshNodes (nothing to build), removeOldNodes
  // (nothing to remove), the LIS pass (no reorder possible), and applyMoves'
  // reverse walk (no moves). For a 1k-row list whose only change is a signal
  // re-read with no item-array delta, this collapses ~10–15 ms of per-render
  // bookkeeping into a single classification pass + the binding update.
  if (replacedNodes.length === 0 && freshIndices.length === 0
      && isInOrder(prevIdx)) {
    binding.items = newRecord;
    return;
  }

  buildFreshNodes(newRecord, freshIndices, freshHtmls);
  const focusSnap = captureFocus(liveParent);
  removeOldNodes(liveParent, replacedNodes);
  applyMoves(liveParent, newRecord, prevIdx, lis(prevIdx));
  if (focusSnap !== null) restoreFocus(focusSnap);
  binding.items = newRecord;
}

/**
 * True iff `prevIdx` is `[0, 1, 2, …, n-1]` — every item kept the position it
 * had in the previous render. Used by `reconcileList` to short-circuit the
 * LIS + move pass when nothing structural changed.
 */
function isInOrder(prevIdx: number[]): boolean {
  for (let i = 0; i < prevIdx.length; i++) {
    if (prevIdx[i] !== i) return false;
  }
  return true;
}
