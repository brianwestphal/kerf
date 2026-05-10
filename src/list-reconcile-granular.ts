/**
 * Granular reconcile path for `each(...)` bound to an `arraySignal` (KF-92).
 *
 * Applies the patch events emitted by `arraySignal` mutators directly to
 * the live DOM and to `binding.items`, without iterating the full snapshot
 * or doing a classify pass. Cost is O(patches), not O(N).
 *
 * Two perf optimisations:
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

import { type BoundItem, endAnchor, type ListBinding } from './list-binding.js';
import { captureFocus, restoreFocus } from './list-reconcile-focus.js';
import type { ListSegment } from './segment.js';
import { parseRowTemplate, rowContractError, truncateRowHtml } from './utils/rowContract.js';

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
          && (patches[runEnd] as { index: number }).index
            === (patches[runEnd - 1] as { index: number }).index + 1) {
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
}

function applySingleInsert(
  liveParent: Element,
  items: BoundItem[],
  patch: { type: 'insert'; index: number; item: object; html: string },
  tailAnchor: Element | null,
): void {
  const { html } = patch;
  const newNode = parseSingleRow(html);
  const anchor = patch.index < items.length ? items[patch.index].node : tailAnchor;
  liveParent.insertBefore(newNode, anchor);
  items.splice(patch.index, 0, {
    ref: patch.item, cacheKey: undefined, html, node: newNode,
  });
}

function applySingleUpdate(
  liveParent: Element,
  items: BoundItem[],
  patch: { type: 'update'; index: number; item: object; html: string },
): void {
  const { html } = patch;
  const oldEntry = items[patch.index];
  if (html === oldEntry.html) return;  // no-op (defensive: caller may emit redundant patches)
  const newNode = parseSingleRow(html);
  liveParent.replaceChild(newNode, oldEntry.node);
  items[patch.index] = { ref: patch.item, cacheKey: undefined, html, node: newNode };
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
  // Patches already carry pre-rendered HTML (KF-99). Filter out no-ops where
  // the new HTML matches the existing entry's html.
  interface Change { patchIdx: number; html: string }
  const changes: Change[] = [];
  for (let k = start; k < end; k++) {
    const p = patches[k] as { type: 'update'; index: number; item: object; html: string };
    if (p.html !== items[p.index].html) {
      changes.push({ patchIdx: k, html: p.html });
    }
  }
  if (changes.length === 0) return;  // every update was a no-op

  // Bulk-parse all real changes in one innerHTML call.
  const { tpl, count } = parseRowTemplate(changes.map((c) => c.html).join(''));
  if (count !== changes.length) {
    throw findOffendingChange(patches, changes);
  }
  // Count matches; walk children unconditionally.
  const newNodes = new Array<Element>(changes.length);
  let child = tpl.content.firstElementChild;
  for (let k = 0; k < newNodes.length; k++) {
    newNodes[k] = child as Element;
    child = (child as Element).nextElementSibling;
  }

  // Apply replaceChild for each real change.
  for (let k = 0; k < changes.length; k++) {
    const c = changes[k];
    const p = patches[c.patchIdx] as { type: 'update'; index: number; item: object; html: string };
    const oldEntry = items[p.index];
    liveParent.replaceChild(newNodes[k], oldEntry.node);
    items[p.index] = { ref: p.item, cacheKey: undefined, html: c.html, node: newNodes[k] };
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
  const startIdx = (patches[start] as { index: number }).index;
  const htmls = new Array<string>(end - start);
  for (let k = start; k < end; k++) {
    const p = patches[k] as { type: 'insert'; index: number; item: object; html: string };
    htmls[k - start] = p.html;
  }
  const { tpl, count } = parseRowTemplate(htmls.join(''));
  if (count !== htmls.length) {
    throw findOffendingInsert(patches, start, htmls);
  }
  // Count matches; capture child refs BEFORE the fragment-insert empties
  // tpl.content. Walk unconditionally — count check above guarantees
  // `firstElementChild` is non-null and there are exactly `end - start`
  // children.
  const newNodes = new Array<Element>(end - start);
  let child = tpl.content.firstElementChild;
  for (let k = 0; k < newNodes.length; k++) {
    newNodes[k] = child as Element;
    child = (child as Element).nextElementSibling;
  }
  const anchor = startIdx < items.length ? items[startIdx].node : tailAnchor;
  liveParent.insertBefore(tpl.content, anchor);
  // Splice all new entries into binding.items at the run's start index.
  const newEntries = new Array<BoundItem>(end - start);
  for (let k = 0; k < newEntries.length; k++) {
    const p = patches[start + k] as { type: 'insert'; index: number; item: object; html: string };
    newEntries[k] = {
      ref: p.item, cacheKey: undefined, html: htmls[k], node: newNodes[k],
    };
  }
  items.splice(startIdx, 0, ...newEntries);
}

/**
 * Parse a single row's HTML string into one Element. Used by the granular
 * reconciler's single-row paths (`applySingleInsert`, `applySingleUpdate`).
 * Each row is expected to render exactly one top-level element (the same
 * contract `each()` enforces in the snapshot path).
 */
function parseSingleRow(html: string): Element {
  const { tpl, count } = parseRowTemplate(html);
  if (count !== 1) {
    const reason = count === 0
      ? 'produced no top-level element'
      : `produced ${count} top-level elements; exactly one is required`;
    throw new Error(
      `each() granular reconcile: row render ${reason}. `
      + 'Each item\'s render must return exactly one element. '
      + `Got HTML: ${JSON.stringify(truncateRowHtml(html))}`,
    );
  }
  return tpl.content.firstElementChild as Element;
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
      const p = patches[start + i] as { type: 'insert'; index: number };
      return rowContractError(p.index, htmls[i]);
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
      const p = patches[c.patchIdx] as { type: 'update'; index: number };
      return rowContractError(p.index, c.html);
    }
  }
  /* c8 ignore start */
  return new Error('each(): bulk-update mismatch with no per-row offender (kerf bug).');
}
/* c8 ignore stop */
