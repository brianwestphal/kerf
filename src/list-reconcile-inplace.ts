/**
 * In-place content-update fast path for the snapshot reconciler.
 *
 * When a re-render produces a list segment with the **same item refs in the
 * same order** as the current binding — no inserts, removes, or moves — then
 * only row CONTENT can have changed. The general snapshot path would treat a
 * same-ref/changed-html row as "replaced": remove the old DOM node and insert
 * a freshly-parsed one. In a large `<table>` that node swap forces a full
 * relayout, which is expensive even when only one attribute (e.g. a selection
 * class) flipped.
 *
 * This path instead updates each changed row **in place** — reusing the same
 * surgical/morph/replace ladder the granular path uses for `arraySignal`
 * updates (`list-reconcile-fast-paths.ts` + `_morphElement`). Preserving the
 * row's DOM node keeps focus/scroll/IME state and avoids the layout cost, so
 * external-state-driven row changes (e.g. a single `selectedId` signal read
 * via `each()`'s `cacheKey`) update as cheaply as every other framework does.
 *
 * Only the "no structural change" shape is handled here; anything with an
 * insert, remove, or move falls through to the full snapshot algorithm. The
 * rare "row moved AND changed content" case therefore stays on the general
 * (node-replacing) path.
 *
 * Internal to kerf — invoked from `reconcileSnapshot`.
 */

import { type BoundItem, type ListBinding } from './list-binding.js';
import { tryAttributeOnlyFastPath, tryTextContentFastPath } from './list-reconcile-fast-paths.js';
import { captureFocus, restoreFocus } from './list-reconcile-focus.js';
import { _morphElement } from './morph.js';
import type { ListItem, ListSegment } from './segment.js';
import { maybeWarnMissingRowKey, parseRowTemplate, rowContractError } from './utils/rowContract.js';

/**
 * If the new segment has the same refs in the same order as `binding.items`,
 * apply each changed row in place and return `true` (handled). Otherwise
 * return `false` so the caller runs the full classify + LIS + move algorithm.
 */
export function tryInPlaceContentUpdate(binding: ListBinding, listSeg: ListSegment): boolean {
  const oldItems = binding.items;
  const items = listSeg.items;
  const n = items.length;
  // Empty lists and any length change can't be a pure content update. Empty
  // is left to the main path (which also handles the missing-key warning edge).
  if (n === 0 || n !== oldItems.length) return false;
  for (let i = 0; i < n; i++) {
    if (items[i].ref !== oldItems[i].ref) return false;
  }

  const { liveParent } = binding;
  const newRecord: BoundItem[] = new Array(n);
  // Capture focus once: the surgical + morph routes preserve it inherently,
  // but the rare tag-mismatch `replaceChild` fallback would blur a focused
  // descendant. restoreFocus is a no-op when focus never moved.
  const focusSnap = captureFocus(liveParent);
  for (let i = 0; i < n; i++) {
    newRecord[i] = updateRowInPlace(liveParent, oldItems[i], items[i], i);
  }
  if (focusSnap !== null) restoreFocus(focusSnap);

  binding.items = newRecord;
  maybeWarnMissingRowKey(newRecord[0].node, 0, newRecord[0].html, binding);
  return true;
}

/**
 * Apply one row's content change in place. Mirrors the granular path's
 * `applySingleUpdate` ladder: no-op if unchanged → surgical attribute/text
 * fast paths → `_morphElement` when the top-level tag matches → `replaceChild`
 * when it doesn't (consumer's render fn returned a different top-level tag).
 */
function updateRowInPlace(
  liveParent: Element,
  old: BoundItem,
  ni: ListItem,
  index: number,
): BoundItem {
  if (old.html === ni.html
      || tryAttributeOnlyFastPath(old.node, old.html, ni.html)
      || tryTextContentFastPath(old.node, old.html, ni.html)) {
    return { ref: ni.ref, cacheKey: ni.cacheKey, html: ni.html, node: old.node };
  }
  const newNode = parseSingleRow(ni.html, index);
  if (old.node.tagName === newNode.tagName) {
    _morphElement(old.node, newNode);
    return { ref: ni.ref, cacheKey: ni.cacheKey, html: ni.html, node: old.node };
  }
  liveParent.replaceChild(newNode, old.node);
  return { ref: ni.ref, cacheKey: ni.cacheKey, html: ni.html, node: newNode };
}

/** Parse one row's HTML to its single top-level element (row contract). */
function parseSingleRow(html: string, index: number): Element {
  const { tpl, count } = parseRowTemplate(html);
  if (count !== 1) throw rowContractError(index, html);
  return tpl.content.firstElementChild as Element;
}
