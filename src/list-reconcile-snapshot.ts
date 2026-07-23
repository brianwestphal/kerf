/**
 * Snapshot reconcile path for `each(...)` — the original (non-granular)
 * keyed-list algorithm. Used when:
 * - The list is rendered with a plain array (not an `arraySignal`).
 * - The list is rendered with an `arraySignal` but no patch queue is
 *   present (first render, post-`replace()`, or post-drift recovery).
 *
 * Algorithm:
 *   1. Classify each new item as `stable` (cache hit on identity + html),
 *      `replaced` (same ref, html changed), or `new` (never seen before).
 *   2. Bulk-parse every fresh row's HTML in ONE `innerHTML` call — for an
 *      initial population of 10k rows that's 1 parse instead of 10k.
 *   3. Remove orphan refs (gone from the new list) + replaced rows' old nodes.
 *   4. Compute a longest-increasing-subsequence over old positions; items in
 *      the LIS are already in the right relative order, so they don't move.
 *   5. Reverse-pass over the new record, `insertBefore` only the items that
 *      didn't anchor the LIS.
 *
 * The KF-89 fast path short-circuits when nothing structural changed —
 * the live tree already matches the new segment, so we can return after
 * step 1 with just the binding update.
 *
 * Internal to kerf — re-exported via `list-reconcile.ts`'s `reconcileList`.
 */

import { disposeRowBindings, wireRowBindings } from './bindings.js';
import { type BoundItem, endAnchor, type ListBinding } from './list-binding.js';
import { captureFocus, restoreFocus } from './list-reconcile-focus.js';
import { tryInPlaceContentUpdate } from './list-reconcile-inplace.js';
import type { ListSegment } from './segment.js';
import { maybeWarnMissingRowKey, parseRowTemplate, rowContractError } from './utils/rowContract.js';

interface Classification {
  newRecord: BoundItem[];
  prevIdx: number[];
  removedItems: BoundItem[];
  freshIndices: number[];
  freshHtmls: string[];
}

/**
 * Reconcile via the snapshot algorithm. Mutates `binding.items` to mirror
 * the new segment when done.
 *
 * Focus capture/restore lives in `list-reconcile-focus.ts` — `insertBefore`
 * of a focused descendant's ancestor blurs the element in some engines
 * (happy-dom, older Safari) even when it stays connected; the snapshot fixes
 * those engines and is a no-op on engines that already preserve focus.
 */
export function reconcileSnapshot(binding: ListBinding, listSeg: ListSegment): void {
  // In-place fast path: same refs in the same order (no inserts/removes/moves)
  // → only content changed, so morph changed rows in place instead of swapping
  // their DOM nodes. Avoids the table-relayout cost of node replacement for
  // external-state-driven row changes (e.g. a single selectedId + cacheKey).
  if (tryInPlaceContentUpdate(binding, listSeg)) return;

  // Anything reaching here has a structural change (insert, remove, or move);
  // the pure "same refs in same order" case — including the no-op re-render
  // where nothing changed — is handled earlier by tryInPlaceContentUpdate,
  // which keeps every surviving node and morphs only changed rows in place.
  const { liveParent } = binding;
  const { newRecord, prevIdx, removedItems, freshIndices, freshHtmls }
    = classifyItems(binding.items, listSeg);

  // Compute tail anchor BEFORE removing old nodes: once an item is
  // detached, its `.nextElementSibling` is null and we lose the
  // boundary. Capturing here uses the binding's current (pre-mutation)
  // items[last].node which is still attached.
  const tailAnchor = endAnchor(binding);
  buildFreshNodes(newRecord, freshIndices, freshHtmls);
  const focusSnap = captureFocus(liveParent);
  removeOldNodes(liveParent, removedItems);
  applyMoves(liveParent, newRecord, prevIdx, lis(prevIdx), tailAnchor);
  if (focusSnap !== null) restoreFocus(focusSnap);
  binding.items = newRecord;
  if (newRecord.length > 0) {
    maybeWarnMissingRowKey(newRecord[0].node, newRecord[0].html, binding);
  }
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
  const removedItems: BoundItem[] = [];
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
      // Same ref, new html → the old node is replaced. Its bound effects go
      // with it (KF-294); `removeOldNodes` disposes them.
      removedItems.push(oi[0]);
    }
    newRecord[i] = {
      // `node` placeholder is filled by `buildFreshNodes`; its parse-count
      // check guarantees every fresh index gets a real element before use.
      ref: ni.ref, cacheKey: ni.cacheKey, html: ni.html, node: null as unknown as Element,
      bindings: ni.bindings,
    };
    prevIdx[i] = -1;
    freshIndices.push(i);
    freshHtmls.push(ni.html);
  }

  // Whatever's left in oldByRef is an orphan ref that disappeared from the
  // new list. The caller removes those nodes alongside the replaced ones.
  for (const [, orphan] of oldByRef) removedItems.push(orphan[0]);

  return { newRecord, prevIdx, removedItems, freshIndices, freshHtmls };
}

/**
 * Bulk-parse every fresh row's HTML in one `innerHTML` call, then walk the
 * parsed children in order and fill in each placeholder's `node` field.
 *
 * Enforces the "exactly one top-level element per row" contract (KF-103):
 * if the bulk parse produces a different number of top-level elements
 * than fresh rows, fall back to per-row parsing to identify the offending
 * row and throw a precise error. The success path stays a single parse.
 */
function buildFreshNodes(
  newRecord: BoundItem[],
  freshIndices: number[],
  freshHtmls: string[],
): void {
  if (freshHtmls.length === 0) return;
  const { tpl, count } = parseRowTemplate(freshHtmls.join(''));
  if (count !== freshHtmls.length) {
    throw findOffendingRow(newRecord, freshIndices, freshHtmls);
  }
  // After the count check above, we know `tpl.content.children.length`
  // equals `freshIndices.length`, so the walk below always finds an element
  // for every index. No defensive null-guard needed.
  let node = tpl.content.firstElementChild;
  for (const idx of freshIndices) {
    const next = (node as Element).nextElementSibling;
    const item = newRecord[idx];
    item.node = node as Element;
    // KF-294: wire this fresh row's fine-grained bindings to its new node.
    if (item.bindings !== undefined && item.bindings.length > 0) {
      item.bindingDisposers = wireRowBindings(item.node, item.bindings);
    }
    node = next;
  }
}

/**
 * Walk per-row to find the offending row that violated the contract,
 * returning a precise error to throw. Only invoked when the bulk parse
 * detected a count mismatch — the success path is one parse with no
 * per-row work.
 */
function findOffendingRow(
  newRecord: BoundItem[],
  freshIndices: number[],
  freshHtmls: string[],
): Error {
  for (let i = 0; i < freshHtmls.length; i++) {
    if (parseRowTemplate(freshHtmls[i]).count !== 1) {
      return rowContractError(freshIndices[i], newRecord[freshIndices[i]].html);
    }
  }
  /* c8 ignore next 2 — unreachable: bulk mismatch ⇒ at least one row violates. */
  return new Error('each(): bulk-parse mismatch with no per-row offender (kerf bug).');
}

/**
 * Remove every replaced/orphan node still attached to the live parent, and
 * dispose each removed row's fine-grained binding effects (KF-294) so they
 * don't leak subscriptions to now-detached nodes.
 */
function removeOldNodes(liveParent: Element, removedItems: BoundItem[]): void {
  for (const item of removedItems) {
    disposeRowBindings(item.bindingDisposers);
    if (item.node.parentElement === liveParent) liveParent.removeChild(item.node);
  }
}

/**
 * `insertBefore` everything that's not in the LIS. Walks the new record in
 * reverse so each move's anchor (`nextSibling`) is already in its final
 * position by the time we reach earlier items.
 *
 * `tailAnchor` is the element that comes AFTER the list inside `liveParent`
 * (or `null` if the list is at the end). The reconciler computes it via
 * `endAnchor(binding)` so it picks up non-list siblings the diff may have
 * inserted between the list and the parent's tail (KF-102).
 */
function applyMoves(
  liveParent: Element,
  newRecord: BoundItem[],
  prevIdx: number[],
  stable: ReadonlySet<number>,
  tailAnchor: Element | null,
): void {
  let nextSibling: Element | null = tailAnchor;
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
