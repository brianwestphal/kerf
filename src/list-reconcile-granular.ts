/**
 * Granular reconcile path for `each(...)` bound to an `arraySignal` (KF-92).
 *
 * Applies the patch events emitted by `arraySignal` mutators directly to
 * the live DOM and to `binding.items`, without iterating the full snapshot
 * or doing a classify pass. Cost is O(patches), not O(N).
 *
 * Two perf optimizations:
 * - **KF-93**: contiguous insert runs (patches at index N, N+1, N+2, …) are
 *   bulk-parsed in one `template.innerHTML` call and inserted as a single
 *   fragment. Saves ~50 ms on append-1k.
 * - **KF-94**: consecutive update runs (any indices — `replaceChild`
 *   operates on each row's existing live node independently) are bulk-
 *   parsed in one `template.innerHTML` call. Saves the per-patch parse
 *   cost on the krausest partial-update scenario.
 *
 * Patches with `type: 'replace'` are filtered out by `each()` upstream and
 * never reach this function (the runtime contract guarantees absence even
 * though the TypeScript type allows them).
 *
 * Internal to kerf — re-exported via `list-reconcile.ts`'s `reconcileList`.
 */

import { type Binding, carryOrRewireRowBindings, disposeRowBindings, wireRowBindings } from './bindings.js';
import { type BoundItem, endAnchor, type ListBinding } from './list-binding.js';
import { tryAttributeOnlyFastPath, tryTextContentFastPath } from './list-reconcile-fast-paths.js';
import { captureFocus, restoreFocus } from './list-reconcile-focus.js';
import { _morphElement } from './morph.js';
import type { InsertPatch, ListSegment, UpdatePatch } from './segment.js';
import {
  collectTemplateChildren,
  maybeWarnMissingRowKey,
  parseRowTemplate,
  parseSingleRow,
  rowContractError,
} from './utils/rowContract.js';

export function reconcileGranular(
  binding: ListBinding,
  patches: NonNullable<ListSegment['patches']>,
): void {
  const { liveParent } = binding;
  const items = binding.items;

  // Capture/restore focus around the whole batch (mirrors the snapshot
  // path's KF-65 fix). Some engines (older Safari, happy-dom) blur a
  // focused descendant on `insertBefore` / `replaceChild` even when the
  // ancestor stays connected — covers the move patch (which moves an
  // existing row's <li>), and is a no-op on engines that already
  // preserve focus across DOM ops.
  const focusSnap = captureFocus(liveParent);

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
      // KF-94: detect a run of consecutive update patches (any indices —
      // replaceChild operates on each row's existing live node independently,
      // so contiguity isn't required) and bulk-parse all their HTML in a
      // single `template.innerHTML` call. Saves the per-patch parse overhead
      // on krausest's partial-update scenario (100 update patches at
      // indices 0, 10, 20, … — non-contiguous, so KF-93's run detector
      // doesn't kick in).
      let runEnd = i + 1;
      while (runEnd < patches.length && patches[runEnd].type === 'update') {
        runEnd += 1;
      }
      const runLen = runEnd - i;
      if (runLen === 1) {
        applySingleUpdate(liveParent, items, patch);
      } else {
        applyBulkUpdate(liveParent, items, patches, i, runEnd);
      }
      i = runEnd;
      continue;
    }
    if (patch.type === 'insert') {
      // KF-93: detect a contiguous run of inserts at adjacent indices (each
      // next insert at the previous one's index + 1) and bulk-parse all
      // their HTML in a single `template.innerHTML` call, followed by a
      // single `insertBefore(fragment, anchor)`.
      let runEnd = i + 1;
      while (runEnd < patches.length
          && patches[runEnd].type === 'insert'
          && (patches[runEnd] as InsertPatch).index
            === (patches[runEnd - 1] as InsertPatch).index + 1) {
        runEnd += 1;
      }
      const runLen = runEnd - i;
      if (runLen === 1) {
        applySingleInsert(liveParent, items, patch, endAnchor(binding));
      } else {
        applyBulkInsert(liveParent, items, patches, i, runEnd, endAnchor(binding));
      }
      i = runEnd;
      continue;
    }
    if (patch.type === 'remove') {
      const entry = items[patch.index];
      disposeRowBindings(entry.bindingDisposers);  // KF-294
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
      const anchor = anchorIdx < items.length ? items[anchorIdx].node : endAnchor(binding);
      liveParent.insertBefore(moved.node, anchor);
      items.splice(patch.from, 1);
      items.splice(patch.to, 0, moved);
      i += 1;
      continue;
    }
  }

  if (focusSnap !== null) restoreFocus(focusSnap);
  // KF-173: warn once per binding if rows lack id / data-key.
  if (items.length > 0) {
    maybeWarnMissingRowKey(items[0].node, items[0].html, binding);
  }
}

function applySingleInsert(
  liveParent: Element,
  items: BoundItem[],
  patch: InsertPatch,
  tailAnchor: Element | null,
): void {
  const { html } = patch;
  const newNode = parseSingleRow(html, patch.index, liveParent);
  const anchor = patch.index < items.length ? items[patch.index].node : tailAnchor;
  liveParent.insertBefore(newNode, anchor);
  items.splice(patch.index, 0, {
    ref: patch.item, cacheKey: undefined, html, node: newNode,
    bindings: patch.bindings,
    // KF-294: wire the inserted row's fine-grained bindings to its new node.
    bindingDisposers: wireRowIfBound(newNode, patch.bindings),
  });
}

/** Wire a fresh row's bindings if it has any; undefined otherwise. */
function wireRowIfBound(node: Element, bindings: Binding[] | undefined): Array<() => void> | undefined {
  return bindings !== undefined && bindings.length > 0 ? wireRowBindings(node, bindings) : undefined;
}

function applySingleUpdate(
  liveParent: Element,
  items: BoundItem[],
  patch: UpdatePatch,
): void {
  const { html } = patch;
  const oldEntry = items[patch.index];
  if (html === oldEntry.html) {
    // Identical HTML is NOT a full no-op when the row has bound holes: a
    // self-reading hole's value lives behind a marker, so the string never
    // changes while the binding instances do (KF-347). Route through
    // reuseBound so instance drift re-wires; binding-free rows exit as
    // cheaply as the old early-return.
    items[patch.index] = reuseBound(patch, html, oldEntry);
    return;
  }
  // KF-198 + KF-206: surgical fast paths for the common arraySignal update
  // shapes — top-level attribute flip (krausest select-row) and one-text-
  // node content change (krausest partial-update). Both apply the change
  // directly to the live row, skipping the parse + morph entirely. They
  // bail conservatively on anything that could be unsafe and fall through
  // to the existing _morphElement / replaceChild routes below.
  if (tryAttributeOnlyFastPath(oldEntry.node, oldEntry.html, html)
      || tryTextContentFastPath(oldEntry.node, oldEntry.html, html)) {
    items[patch.index] = reuseBound(patch, html, oldEntry);
    return;
  }
  const newNode = parseSingleRow(html, patch.index, liveParent);
  applyParsedRowUpdate(liveParent, items, patch, html, newNode);
}

/**
 * Shared tail of both update paths (KF-201): morph the existing live node in
 * place when tags match, so structure-preserving updates (text-node change,
 * attribute flip) apply surgically — preserving DOM identity, focus, scroll,
 * IME state, and skipping the layout cost of a full subtree
 * discard-and-reinsert. For the rare tag-mismatch case (consumer's render fn
 * returns a different top-level tag for the same item), fall back to explicit
 * replaceChild so we keep a reference to the new live node.
 */
function applyParsedRowUpdate(
  liveParent: Element,
  items: BoundItem[],
  patch: UpdatePatch,
  html: string,
  newNode: Element,
): void {
  const oldEntry = items[patch.index];
  if (oldEntry.node.tagName === newNode.tagName) {
    _morphElement(oldEntry.node, newNode);
    items[patch.index] = reuseBound(patch, html, oldEntry);
  } else {
    disposeRowBindings(oldEntry.bindingDisposers);  // KF-294: old node discarded
    liveParent.replaceChild(newNode, oldEntry.node);
    items[patch.index] = {
      ref: patch.item, cacheKey: undefined, html, node: newNode,
      bindings: patch.bindings, bindingDisposers: wireRowIfBound(newNode, patch.bindings),
    };
  }
}

/**
 * KF-294: build the updated `BoundItem` for an in-place update (node reused
 * via a fast path, `_morphElement`, or an html-identical no-op). The row's
 * DOM node survives; whether its live bound effects survive with it is
 * decided per hole by `carryOrRewireRowBindings` (KF-347): same signal
 * instances → carry the existing disposers forward for free; any changed
 * instance — the shape after `arraySignal.update()` swaps the row object and
 * fresh `computed`s close over the NEW item — → dispose + re-wire against
 * the surviving node, so self-reading bound holes update instead of going
 * silently stale.
 */
function reuseBound(
  patch: { item: object; bindings?: Binding[] },
  html: string,
  oldEntry: BoundItem,
): BoundItem {
  const kept = carryOrRewireRowBindings(
    oldEntry.node, oldEntry.bindings, oldEntry.bindingDisposers, patch.bindings,
  );
  return {
    ref: patch.item, cacheKey: undefined, html, node: oldEntry.node,
    bindings: kept.bindings, bindingDisposers: kept.bindingDisposers,
  };
}

/**
 * Bulk-parse a run of consecutive update patches (KF-94). Indices may be
 * scattered (non-contiguous). Renders all HTMLs first, filters out no-ops
 * where the new HTML matches the old, then bulk-parses the remaining HTMLs
 * in one `template.innerHTML` call. The replaceChild loop afterwards is
 * unavoidable (one DOM op per row), but we save the per-patch parse cost.
 */
function applyBulkUpdate(
  liveParent: Element,
  items: BoundItem[],
  patches: NonNullable<ListSegment['patches']>,
  start: number,
  end: number,
): void {
  // Patches already carry pre-rendered HTML (KF-99). One pass over the run:
  // skip no-ops, try the KF-198 / KF-206 fast paths (apply in place when
  // they fire), and collect everything else for one bulk parse + morph.
  interface Change { patchIdx: number; html: string }
  const morphChanges: Change[] = [];
  for (let k = start; k < end; k++) {
    const p = patches[k] as UpdatePatch;
    const oldEntry = items[p.index];
    if (p.html === oldEntry.html) {
      // Same as applySingleUpdate's no-op arm: identical HTML can still carry
      // changed binding instances (self-reading holes render as markers) —
      // reuseBound re-wires on instance drift (KF-347).
      items[p.index] = reuseBound(p, p.html, oldEntry);
      continue;
    }
    if (tryAttributeOnlyFastPath(oldEntry.node, oldEntry.html, p.html)
        || tryTextContentFastPath(oldEntry.node, oldEntry.html, p.html)) {
      items[p.index] = reuseBound(p, p.html, oldEntry);  // KF-294: node reused
      continue;
    }
    morphChanges.push({ patchIdx: k, html: p.html });
  }
  if (morphChanges.length === 0) return;

  // Bulk-parse only the rows the fast paths couldn't handle.
  const { content, count } = parseRowTemplate(morphChanges.map((c) => c.html).join(''), liveParent);
  if (count !== morphChanges.length) {
    throw findOffendingChange(patches, morphChanges);
  }
  const newNodes = collectTemplateChildren(content, morphChanges.length);

  // Shared KF-201 morph-vs-replace ladder per row (same tail as
  // applySingleUpdate).
  for (let k = 0; k < morphChanges.length; k++) {
    const c = morphChanges[k];
    const p = patches[c.patchIdx] as UpdatePatch;
    applyParsedRowUpdate(liveParent, items, p, c.html, newNodes[k]);
  }
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
  tailAnchor: Element | null,
): void {
  const startIdx = (patches[start] as InsertPatch).index;
  const htmls = new Array<string>(end - start);
  for (let k = start; k < end; k++) {
    htmls[k - start] = (patches[k] as InsertPatch).html;
  }
  const { content, count } = parseRowTemplate(htmls.join(''), liveParent);
  if (count !== htmls.length) {
    throw findOffendingInsert(patches, start, htmls);
  }
  // Count matches; capture child refs BEFORE the fragment-insert empties
  // the fragment.
  const newNodes = collectTemplateChildren(content, end - start);
  const anchor = startIdx < items.length ? items[startIdx].node : tailAnchor;
  liveParent.insertBefore(content, anchor);
  // Splice all new entries into binding.items at the run's start index.
  const newEntries = new Array<BoundItem>(end - start);
  for (let k = 0; k < newEntries.length; k++) {
    const p = patches[start + k] as InsertPatch;
    newEntries[k] = {
      ref: p.item, cacheKey: undefined, html: htmls[k], node: newNodes[k],
      bindings: p.bindings,
      bindingDisposers: wireRowIfBound(newNodes[k], p.bindings),  // KF-294
    };
  }
  items.splice(startIdx, 0, ...newEntries);
}

/**
 * Slow-path helper for `applyBulkInsert`. Walks each pre-rendered insert
 * patch's html in isolation to find the offending row.
 */
function findOffendingInsert(
  patches: NonNullable<ListSegment['patches']>,
  start: number,
  htmls: string[],
): Error {
  for (let i = 0; i < htmls.length; i++) {
    if (parseRowTemplate(htmls[i]).count !== 1) {
      return rowContractError((patches[start + i] as InsertPatch).index, htmls[i]);
    }
  }
  /* c8 ignore start */
  return new Error('each(): bulk-insert mismatch with no per-row offender (kerf bug).');
}
/* c8 ignore stop */

/**
 * Slow-path helper for `applyBulkUpdate`. Walks each non-no-op change to
 * find the offending row.
 */
function findOffendingChange(
  patches: NonNullable<ListSegment['patches']>,
  changes: { patchIdx: number; html: string }[],
): Error {
  for (const c of changes) {
    if (parseRowTemplate(c.html).count !== 1) {
      return rowContractError((patches[c.patchIdx] as UpdatePatch).index, c.html);
    }
  }
  /* c8 ignore start */
  return new Error('each(): bulk-update mismatch with no per-row offender (kerf bug).');
}
/* c8 ignore stop */
