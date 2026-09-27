/**
 * `mount()`'s list-binding lifecycle: turning the `<!--kf-list:{id}-->`
 * markers a render left in the live tree into `ListBinding`s, validating
 * first-render inlined rows against the row contract, and pruning bindings
 * for lists that left the segment.
 *
 * Primary export: `bindListsFromMarkers`. The other exports are the small
 * binding-map queries/mutations `mount()` runs around it on each render —
 * `cleanupOrphanBindings` (before the surrounds morph), `collectOwnedItems`
 * (the morph's `ownedItems`), and `anyRebuiltListIsGranular` (after a
 * self-heal). Split out of `mount.ts` so that file holds only the render
 * orchestration. Stateless: every function works on the arguments it is
 * handed. Internal.
 */

import { disposeRowBindings, wireRowBindings } from './bindings.js';
import { devHooks } from './dev-hooks.js';
import type { RenderContext } from './each.js';
import type { BoundItem, ListBinding } from './list-binding.js';
import {
  collectLists,
  LIST_MARKER_PREFIX,
  type ListSegment,
  type Segment,
} from './segment.js';
import { parseRowTemplate, rowContractError } from './utils/row-contract.js';

/**
 * KF-411: did the morph rebuild a list's container whose `each()` emitted a
 * GRANULAR segment this render? Such a segment carries `items: []`, so the
 * freshly self-healed (empty) binding would reconcile the live rows to zero.
 * `mount()` re-renders those lists onto the snapshot path when this is true.
 */
export function anyRebuiltListIsGranular(
  segment: Segment,
  rebuilt: ReadonlySet<string>,
): boolean {
  if (!rebuilt.size) return false;
  const lists = collectLists(segment);
  for (const id of rebuilt) {
    if (lists.get(id)?.patches) return true;
  }
  return false;
}

/**
 * Walk the live tree's comment nodes; every `<!--kf-list:{id}-->` marker
 * is the start anchor of a list inside `liveParent`. Bind the list (parent +
 * already-rendered item nodes between the marker and the tail). The marker
 * stays in the live DOM (KF-102 round 2): keeping it as a permanent
 * comment-node anchor lets the static-surrounds diff insert/remove/morph
 * non-list siblings around the list without needing to re-establish the
 * list's begin position.
 *
 * `inlinedItems` distinguishes the first-render path (where `flatten(seg,
 * true)` inlines item HTML right after the marker, so the marker's element
 * siblings *are* the list rows) from subsequent renders that newly
 * introduce a list (where `flattenWithoutListItems` emits only the marker
 * and the list reconciler populates items afterwards).
 *
 * Existing bindings whose marker is still in the DOM are left intact —
 * `bindings.has(id)` skips re-binding so the prior render's item nodes
 * survive across static-surrounds diffs.
 */
export function bindListsFromMarkers(
  rootEl: Element,
  segment: Segment,
  bindings: Map<string, ListBinding>,
  inlinedItems: boolean,
  rebuiltLists?: Set<string>,
): void {
  const lists = collectLists(segment);
  const found: Comment[] = [];
  collectComments(rootEl, found);
  for (const marker of found) {
    if (!marker.data.startsWith(LIST_MARKER_PREFIX)) continue;
    const id = marker.data.slice(LIST_MARKER_PREFIX.length);
    const existing = bindings.get(id);
    if (existing) {
      // Existing binding survives the diff — the prior render's item nodes stay
      // bound — but only when this id is still carried by the SAME marker node.
      //
      // Identity of the node, not merely "a marker with this id is somewhere in
      // the tree": a call-order id can be handed to a different list when the
      // number of unkeyed `each()` calls changes, and the departed list's own
      // marker is typically still live under its new id. Accepting that binding
      // would point the arriving list at the previous occupant's parent and
      // anchor, so its rows land inside the wrong container.
      if (existing.marker === marker && rootEl.contains(existing.marker))
        continue;
      // KF-377 self-heal: the marker we found is a fresh clone — the list's
      // container was rebuilt by the morph (e.g. an ancestor's tag changed,
      // so replaceChild swapped the whole subtree). The old binding points at
      // a detached tree; keeping it would make every future reconcile mutate
      // that detached parent, permanently rendering zero rows. Drop it
      // (disposing the dead rows' fine-grained binding effects) and fall
      // through to re-bind against the live marker, so the next reconcile
      // repopulates the list from scratch.
      for (const item of existing.items) {
        disposeRowBindings(item.bindingDisposers);
        // KF-381: the morph can separate the marker comment from its owned
        // rows while leaving those rows attached to the LIVE tree — a
        // conditional sibling that shifted the marker (rows stranded next to
        // the clone), or a same-tag sibling that positionally hijacked the
        // container (rows stranded inside it). Those survivors aren't removed
        // by the trailing pass (owned items are protected), so the reconcile
        // that repopulates the re-bound list would render a SECOND copy beside
        // them. Remove any still-live row here so recovery replaces rather than
        // duplicates. Rows already gone with a replaced subtree (the ancestor-
        // tag-swap case) fail the containment check and are left untouched.
        if (rootEl.contains(item.node)) {
          item.node.parentElement?.removeChild(item.node);
        }
      }
      bindings.delete(id);
      // KF-411: record the rebuild so `mount()` can re-render if this list
      // emitted a granular segment (which carries no items and would otherwise
      // reconcile the fresh empty binding straight back to zero rows).
      rebuiltLists?.add(id);
      // Opt-in dev warning (KERF_DEV_WARN_LIST_REBIND=1): the recovery is
      // correct but lossy — row DOM state is discarded — so surface it.
      devHooks.listRebind?.(id, marker.parentElement as Element);
    }
    const listSeg = lists.get(id) as ListSegment;
    const liveParent = marker.parentElement as Element;
    const items: BoundItem[] = [];
    if (inlinedItems) {
      // KF-103: enforce the "exactly one top-level element per row" contract
      // on first render too. Without this check, a multi-root row inlined
      // via `flatten(seg, true)` would silently misalign the binding (each
      // bound item.node points at only the first of a row's 2+ elements,
      // and the leftover elements are picked up as "next" rows). The check
      // is per-row so we can pinpoint the offender by index.
      let next: Element | null = marker.nextElementSibling;
      for (let i = 0; i < listSeg.items.length && next !== null; i++) {
        validateInlinedRowMatch(listSeg.items[i].html, i, next, liveParent);
        items.push({
          ref: listSeg.items[i].ref,
          cacheKey: listSeg.items[i].cacheKey,
          html: listSeg.items[i].html,
          node: next,
          bindings: listSeg.items[i].bindings,
        });
        next = next.nextElementSibling;
      }
    }
    const binding: ListBinding = { liveParent, items, marker };
    // KF-173: dev-only one-shot warning if the first row has no id/data-key.
    if (items.length > 0) {
      devHooks.missingRowKey?.(items[0].node, items[0].html, binding);
    }
    // Dev-mode: warn when an each() list is inside a data-morph-skip subtree
    // (list rows still update; static reactive siblings are frozen).
    devHooks.eachInMorphSkip?.(id, liveParent, rootEl);
    bindings.set(id, binding);
    // KF-294: wire the inlined first-render rows' fine-grained bindings — only
    // once every row passed the contract check and the binding is registered,
    // so if a row's wiring throws, the rows wired before it are reachable
    // through `bindings` and mount's failed-first-render rollback disposes them.
    for (const bound of items) {
      if (bound.bindings?.length) {
        bound.bindingDisposers = wireRowBindings(bound.node, bound.bindings);
      }
    }
  }
}

/**
 * KF-103: validate that `expectedHtml` (one row's render output) matches
 * the live `boundEl`'s `outerHTML` — confirming the row produced exactly
 * one top-level element. If they differ, parse the row in isolation and
 * throw a precise error mentioning the row index and the actual count.
 *
 * Fast path: outerHTML compare is a string equality check (zero allocs in
 * happy-dom; one alloc in V8). Only when they DON'T match (multi-root or
 * subtle browser-normalized single-root case) do we fall back to a full
 * per-row parse for the precise count.
 */
function validateInlinedRowMatch(
  expectedHtml: string,
  index: number,
  boundEl: Element,
  liveParent: Element,
): void {
  if (boundEl.outerHTML === expectedHtml) return;
  // The bound element's outerHTML differs from what we emitted. Parse the
  // expected html in isolation; if it's still single-root the difference
  // is whitespace / browser-normalization (e.g. `<br/>` → `<br>`) and
  // we proceed silently. Otherwise build the precise contract-violation
  // error from the shared helper.
  // KF-396: parse in the LIVE PARENT's namespace. Without it an SVG row
  // (`<circle/>`) parses HTML and comes back `tagName === 'CIRCLE'` while the
  // live element is a real SVG `circle` — and the tag comparison below, being
  // case-sensitive, then rejected a perfectly good list. The everyday trigger
  // was an apostrophe in any attribute (kerf emits `&#39;`, serializers emit
  // `'`), which is what makes the outerHTML compare miss and reach here at all.
  const { content, count } = parseRowTemplate(expectedHtml, liveParent);
  if (count !== 1) throw rowContractError(index, expectedHtml, liveParent);
  // KF-391: single-root, but is it the SAME root? The HTML parser restructures
  // some markup — most commonly `<tr>` directly under `<table>`, where it
  // inserts an implicit `<tbody>` around the whole row run. The binding walk
  // then takes that wrapper as row 0 and never finds the real rows, the
  // reconcile re-inserts them outside the wrapper (visible duplicates), and
  // the missing-row-key warning fires falsely against the wrapper. Comparing
  // tags catches it: this is the same "the parse can't line up one row per
  // element" class the row contract exists to reject, so reject it loudly
  // rather than binding to the wrong node.
  const expectedTag = (content.firstElementChild as Element).tagName;
  if (boundEl.tagName !== expectedTag)
    throw rowStructureError(index, boundEl.tagName, expectedTag);
}

/**
 * KF-391: the author's row markup parsed into a different element than the row
 * itself, because the HTML parser restructured it. Names both tags and points
 * at the fix — the shape kerf supports (and that the benchmark entry uses) is
 * an explicit sectioning element around the list.
 */
function rowStructureError(
  index: number,
  gotTag: string,
  wantTag: string,
): Error {
  const got = gotTag.toLowerCase();
  const want = wantTag.toLowerCase();
  return new Error(
    `each(): row ${index} renders <${want}>, but the HTML parser wrapped the rows in ` +
      `<${got}> — so kerf cannot bind one row per element. This happens when an each() of ` +
      `<${want}> sits directly inside a table: the parser inserts <${got}> around the whole run. ` +
      `Put the each() inside an explicit <${got}> (e.g. <table><${got}>{each(...)}</${got}></table>) ` +
      'so the rows are the direct children kerf binds.',
  );
}

/**
 * Build the set of element nodes owned by `each()` list reconcilers, the
 * union of every binding's `items[].node`. The static-surrounds diff
 * skips these so list rows are invisible to the parent walk while
 * sibling reconciliation continues normally (KF-102 round 2).
 */
export function collectOwnedItems(
  bindings: Map<string, ListBinding>,
): Set<Element> {
  const owned = new Set<Element>();
  for (const b of bindings.values()) {
    for (const item of b.items) owned.add(item.node);
  }
  return owned;
}

/**
 * Remove items + binding entries for any list that's no longer present in
 * the new segment. The diff's trailing-removal pass would have removed the
 * marker (since the new template no longer emits one for this id), but
 * items are owned and stay protected from removal — so we drop them
 * explicitly here before the diff runs.
 */
export function cleanupOrphanBindings(
  segment: Segment,
  bindings: Map<string, ListBinding>,
  renderCtx: RenderContext,
): void {
  const liveIds = collectLists(segment);
  for (const [id, binding] of bindings) {
    if (liveIds.has(id)) continue;
    for (const item of binding.items) {
      // KF-294: dispose the removed list's row binding effects.
      disposeRowBindings(item.bindingDisposers);
      item.node.remove();
    }
    binding.marker.remove();
    bindings.delete(id);
    renderCtx.bindingCounts.delete(id);
    renderCtx.bindingSources.delete(id);
    renderCtx.caches.delete(id);
  }
}

/**
 * Recursive collector for comment nodes — happy-dom's `TreeWalker` doesn't
 * surface `Node.COMMENT_NODE` despite accepting `NodeFilter.SHOW_COMMENT`,
 * so we walk children directly. Cheap (O(elements)) and portable.
 */
function collectComments(node: Node, out: Comment[]): void {
  for (let c: Node | null = node.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === Node.COMMENT_NODE) out.push(c as Comment);
    else if (c.nodeType === Node.ELEMENT_NODE) collectComments(c, out);
  }
}
