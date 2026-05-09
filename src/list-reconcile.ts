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
  // KF-92 fast path: arraySignal-backed each() emits patches and a
  // renderFn. The granular reconciler applies the patches directly without
  // iterating the full snapshot. `each()` filters out `replace` patches
  // upstream (those force the snapshot path), so the patches reaching here
  // are guaranteed to be update/insert/remove/move only. The
  // `binding.items.length > 0` guard handles the very-first-render case
  // where no binding exists yet.
  if (listSeg.patches !== undefined && listSeg.renderFn !== undefined
      && binding.items.length > 0) {
    reconcileGranular(binding, listSeg.patches, listSeg.renderFn);
    return;
  }

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

/**
 * KF-92 granular reconciler. Applies an `arraySignal`'s patch events
 * directly to the live DOM and to `binding.items`, without iterating the
 * full snapshot or doing a classify pass. O(patches), not O(N).
 *
 * `replace` patches are filtered out at the `each()` level; they never
 * reach this function. The TypeScript type allows them, but the runtime
 * contract guarantees they're absent here.
 */
function reconcileGranular(
  binding: ListBinding,
  patches: NonNullable<ListSegment['patches']>,
  renderFn: NonNullable<ListSegment['renderFn']>,
): void {
  const { liveParent } = binding;
  const items = binding.items;

  let i = 0;
  while (i < patches.length) {
    const patch = patches[i];
    /* c8 ignore next 5 — replace is filtered upstream by each(); this branch
       is defensive type-completeness only. */
    if (patch.type === 'replace') {
      i += 1;
      continue;
    }
    if (patch.type === 'update') {
      const html = renderFn(patch.item, patch.index);
      const oldEntry = items[patch.index];
      if (html !== oldEntry.html) {
        const newNode = parseSingleRow(html);
        liveParent.replaceChild(newNode, oldEntry.node);
        items[patch.index] = { ref: patch.item, cacheKey: undefined, html, node: newNode };
      }
      i += 1;
      continue;
    }
    if (patch.type === 'insert') {
      // KF-93 fast path: detect a contiguous run of inserts at adjacent
      // indices (each next insert at the previous one's index + 1) and
      // bulk-parse all their HTML in a single `template.innerHTML` call,
      // followed by a single `insertBefore(fragment, anchor)`. Saves ~50 ms
      // on append-1k vs the per-patch path (1k individual parses + 1k
      // individual insertBefore).
      let runEnd = i + 1;
      while (runEnd < patches.length
          && patches[runEnd].type === 'insert'
          && (patches[runEnd] as { index: number }).index
            === (patches[runEnd - 1] as { index: number }).index + 1) {
        runEnd += 1;
      }
      const runLen = runEnd - i;
      if (runLen === 1) {
        applySingleInsert(liveParent, items, patch, renderFn);
      } else {
        applyBulkInsert(liveParent, items, patches, i, runEnd, renderFn);
      }
      i = runEnd;
      continue;
    }
    if (patch.type === 'remove') {
      const entry = items[patch.index];
      liveParent.removeChild(entry.node);
      items.splice(patch.index, 1);
      i += 1;
      continue;
    }
    if (patch.type === 'move') {
      const moved = items[patch.from];
      // Compute the anchor BEFORE we splice, so the index references the
      // pre-move state.
      let anchorIdx = patch.to;
      if (patch.from < patch.to) anchorIdx += 1;  // account for upcoming splice removal
      const anchor = anchorIdx < items.length ? items[anchorIdx].node : null;
      liveParent.insertBefore(moved.node, anchor);
      items.splice(patch.from, 1);
      items.splice(patch.to, 0, moved);
      i += 1;
      continue;
    }
  }
}

function applySingleInsert(
  liveParent: Element,
  items: BoundItem[],
  patch: { type: 'insert'; index: number; item: object },
  renderFn: NonNullable<ListSegment['renderFn']>,
): void {
  const html = renderFn(patch.item, patch.index);
  const newNode = parseSingleRow(html);
  const anchor = patch.index < items.length ? items[patch.index].node : null;
  liveParent.insertBefore(newNode, anchor);
  items.splice(patch.index, 0, {
    ref: patch.item, cacheKey: undefined, html, node: newNode,
  });
}

/**
 * Bulk-parse a contiguous run of insert patches (KF-93). The run starts at
 * `start` (inclusive) and ends at `end` (exclusive); every patch in that
 * range is type `insert` with index === previous.index + 1. We render each
 * row's HTML, concatenate, parse the lot in one `template.innerHTML`, and
 * insert the resulting fragment in a single DOM op.
 */
function applyBulkInsert(
  liveParent: Element,
  items: BoundItem[],
  patches: NonNullable<ListSegment['patches']>,
  start: number,
  end: number,
  renderFn: NonNullable<ListSegment['renderFn']>,
): void {
  const startIdx = (patches[start] as { index: number }).index;
  const htmls = new Array<string>(end - start);
  for (let k = start; k < end; k++) {
    const p = patches[k] as { type: 'insert'; index: number; item: object };
    htmls[k - start] = renderFn(p.item, p.index);
  }
  const tpl = document.createElement('template');
  tpl.innerHTML = htmls.join('');
  // Capture child refs BEFORE the fragment-insert empties tpl.content.
  const newNodes = new Array<Element>(end - start);
  let child = tpl.content.firstElementChild;
  for (let k = 0; k < newNodes.length; k++) {
    if (child === null) {
      throw new Error(
        `each() granular reconcile: bulk-insert run produced fewer top-level elements than insert patches (${k} of ${newNodes.length}). Each item's render must return exactly one element.`,
      );
    }
    newNodes[k] = child;
    child = child.nextElementSibling;
  }
  const anchor = startIdx < items.length ? items[startIdx].node : null;
  liveParent.insertBefore(tpl.content, anchor);
  // Splice all new entries into binding.items at the run's start index.
  const newEntries = new Array<BoundItem>(end - start);
  for (let k = 0; k < newEntries.length; k++) {
    const p = patches[start + k] as { type: 'insert'; index: number; item: object };
    newEntries[k] = {
      ref: p.item, cacheKey: undefined, html: htmls[k], node: newNodes[k],
    };
  }
  items.splice(startIdx, 0, ...newEntries);
}

/**
 * Parse a single row's HTML string into one Element. Used by the granular
 * reconciler. Each row is expected to render exactly one top-level element
 * (the same contract `each()` already enforces in the snapshot path).
 */
function parseSingleRow(html: string): Element {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const el = tpl.content.firstElementChild;
  if (el === null) {
    throw new Error(
      `each() granular reconcile: row render produced no top-level element. Each item's render must return exactly one element. Got HTML: ${html.slice(0, 120)}`,
    );
  }
  return el;
}
