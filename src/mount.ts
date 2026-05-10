/**
 * `mount(rootEl, render)` — kerf's render primitive.
 *
 * Wraps `effect()` so that whenever any signal read inside `render()`
 * changes, we re-run `render()` and apply the minimum DOM mutations against
 * the live tree. Element identity (and thus focus, selection, in-flight
 * pointer interactions, and event listeners on preserved nodes) is preserved
 * wherever the keyed/positional diff matches.
 *
 * Two phases per render:
 *
 *   - Static surrounds (everything outside `each()` lists): kerf's native
 *     `diff()` reconciler walks a freshly-built template against the live
 *     tree. Conventions: id/data-key matching, `data-morph-skip`, focus
 *     preservation.
 *
 *   - List interiors (children of every `each()` parent): native keyed
 *     reconciler operates directly on the live parent's children. No
 *     re-parse, no morph walk for cache-hit rows. Cost is O(changes), not
 *     O(rows).
 *
 * Compared to a `replaceChildren(...rows.map(toElement))` rebuild pattern,
 * the user-visible win is that an `<input>` the user is typing into
 * survives an unrelated re-render — its DOM node, focus state, and cursor
 * position are not destroyed and recreated on each tick.
 */

import { diff } from './diff.js';
import { _setRenderContext, type RenderContext } from './each.js';
import type { SafeHtml } from './jsx-runtime.js';
import { isSafeHtml } from './jsx-runtime.js';
import {
  type BoundItem,
  type ListBinding,
  reconcileList,
} from './list-reconcile.js';
import { effect } from './reactive.js';
import {
  collectLists,
  flatten,
  flattenWithoutListItems,
  type ListSegment,
  type Segment,
} from './segment.js';

const LIST_MARKER_PREFIX = 'kf-list:';

/**
 * Bind `render()` to the children of `rootEl`. Re-runs whenever any signal
 * read inside `render()` changes. Returns a disposer that tears down the
 * effect; call it when the host element is removed from the DOM.
 *
 * Conventions:
 *
 * - Diff keys: `id` and `data-key` are matched across the morph by key
 *   rather than positionally, so list reorders move existing nodes instead
 *   of churning unrelated siblings.
 * - `data-morph-skip`: any element with this attribute is left untouched
 *   inside on subsequent renders. Used for library-owned subtrees (xterm-
 *   style widgets, charts, third-party editors) where the library's own
 *   lifecycle manages the children.
 * - Focused text-entry inputs (`<input>` of typing kinds, `<textarea>`)
 *   keep their current value + selection range across morphs while focused.
 *   The user never sees their cursor jump mid-keystroke.
 * - Focused `[contenteditable]` elements have their entire subtree
 *   skipped (same mechanism as `data-morph-skip`). The user's in-progress
 *   edit — typed content, caret position, multi-range selections, anything
 *   else they did to the DOM — survives verbatim. The next render after
 *   blur catches up.
 */
export function mount(rootEl: HTMLElement, render: () => SafeHtml | string): () => void {
  if (rootEl == null) {
    throw new Error(
      'mount: rootEl is null/undefined — pass the live element, e.g. mount(document.getElementById("app")!, render). '
      + 'A common cause is a typo in the id or selector that returns null at runtime even though the TypeScript types say HTMLElement.',
    );
  }
  const bindings = new Map<string, ListBinding>();
  // Per-mount render context: the list-id counter is reset at the start of
  // each render (so the n-th `each()` call gets the same id every render);
  // the `caches` map persists across renders so unchanged items skip the
  // JSX work via cache hits even when the JSX render function is an inline
  // arrow that's a fresh function reference on every closure run (KF-87).
  const renderCtx: RenderContext = {
    counter: 0,
    caches: new Map(),
    bindingCounts: new Map(),
  };
  let isFirst = true;
  // KF-88: the static-surrounds HTML string from the previous render. If a
  // re-render produces the same string (the common case when a signal flips
  // a class on one row but the page chrome is unchanged), we skip the
  // template clone, the innerHTML re-parse, and the diff() walk entirely
  // and go straight to the per-list reconcilers. Saves ~8 ms per update-
  // path render against the krausest harness.
  let prevStaticHtml = '';

  return effect(() => {
    renderCtx.counter = 0;
    _setRenderContext(renderCtx);
    let result: SafeHtml | string;
    try {
      result = render();
    } finally {
      _setRenderContext(null);
    }

    const segment: Segment = isSafeHtml(result)
      ? (result.__segment ?? { kind: 'static', html: result.__html })
      : { kind: 'static', html: result };

    if (isFirst) {
      // Bulk-render with items inlined and a marker per list. The marker walk
      // afterwards binds each list to the rows already in the DOM, so the
      // first-render reconcile is a no-op (every item is a cache hit).
      rootEl.innerHTML = flatten(segment, true);
      bindListsFromMarkers(rootEl, segment, bindings, true);
      prevStaticHtml = flattenWithoutListItems(segment);
      isFirst = false;
    } else {
      const currentStaticHtml = flattenWithoutListItems(segment);
      if (currentStaticHtml === prevStaticHtml) {
        // KF-88 fast path: static surrounds didn't change byte-for-byte. The
        // diff would do no work and bindListsFromMarkers has nothing to
        // discover (every list id already bound). Skip both.
      } else {
        // Static surrounds changed (a signal-driven attribute flip outside
        // any `each()`, a conditional sub-tree appearing or disappearing,
        // a list newly added at this position, etc.). Clean up bindings
        // for lists that disappeared from the segment, then run diff over
        // the surrounds, then bind any newly-appearing lists.
        cleanupOrphanBindings(segment, bindings, renderCtx);
        const template = rootEl.cloneNode(false) as HTMLElement;
        template.innerHTML = currentStaticHtml;
        // KF-102 round 2: instead of telling diff to skip a list parent's
        // entire children subtree (which made non-list siblings invisible
        // to the diff), pass the set of list-owned item nodes. The diff
        // walks every parent's children but skips owned items individually,
        // so non-list siblings around an each() reconcile correctly.
        const ownedItems = new Set<Element>();
        for (const b of bindings.values()) {
          for (const item of b.items) ownedItems.add(item.node);
        }
        diff(rootEl, template, ownedItems);
        bindListsFromMarkers(rootEl, segment, bindings, false);
        prevStaticHtml = currentStaticHtml;
      }
    }

    for (const listSeg of collectLists(segment).values()) {
      const binding = bindings.get(listSeg.id) as ListBinding;
      reconcileList(binding, listSeg);
      // KF-99: record the post-reconcile binding length so the next render's
      // granular path can detect drift (a prior render that threw mid-batch
      // leaves the binding shorter than the signal expects).
      renderCtx.bindingCounts.set(listSeg.id, binding.items.length);
    }
  });
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
function bindListsFromMarkers(
  rootEl: Element,
  segment: Segment,
  bindings: Map<string, ListBinding>,
  inlinedItems: boolean,
): void {
  const lists = collectLists(segment);
  const found: Comment[] = [];
  collectComments(rootEl, found);
  for (const marker of found) {
    if (!marker.data.startsWith(LIST_MARKER_PREFIX)) continue;
    const id = marker.data.slice(LIST_MARKER_PREFIX.length);
    if (bindings.has(id)) continue;  // existing binding survives the diff
    const listSeg = lists.get(id) as ListSegment;
    const liveParent = marker.parentElement as Element;
    const items: BoundItem[] = [];
    if (inlinedItems) {
      let next: Element | null = marker.nextElementSibling;
      for (let i = 0; i < listSeg.items.length && next !== null; i++) {
        items.push({
          ref: listSeg.items[i].ref,
          cacheKey: listSeg.items[i].cacheKey,
          html: listSeg.items[i].html,
          node: next,
        });
        next = next.nextElementSibling;
      }
    }
    bindings.set(id, { liveParent, items, marker });
  }
}

/**
 * Remove items + binding entries for any list that's no longer present in
 * the new segment. The diff's trailing-removal pass would have removed the
 * marker (since the new template no longer emits one for this id), but
 * items are owned and stay protected from removal — so we drop them
 * explicitly here before the diff runs.
 */
function cleanupOrphanBindings(
  segment: Segment,
  bindings: Map<string, ListBinding>,
  renderCtx: RenderContext,
): void {
  const liveIds = collectLists(segment);
  for (const [id, binding] of bindings) {
    if (liveIds.has(id)) continue;
    for (const item of binding.items) {
      if (item.node.parentElement !== null) {
        item.node.parentElement.removeChild(item.node);
      }
    }
    if (binding.marker.parentElement !== null) {
      binding.marker.parentElement.removeChild(binding.marker);
    }
    bindings.delete(id);
    renderCtx.bindingCounts.delete(id);
    renderCtx.caches.delete(id);
  }
}

/**
 * Recursive collector for comment nodes — happy-dom's `TreeWalker` doesn't
 * surface `Node.COMMENT_NODE` despite accepting `NodeFilter.SHOW_COMMENT`,
 * so we walk children directly. Cheap (O(elements)) and portable.
 */
function collectComments(node: Node, out: Comment[]): void {
  for (let c: Node | null = node.firstChild; c !== null; c = c.nextSibling) {
    if (c.nodeType === Node.COMMENT_NODE) out.push(c as Comment);
    else if (c.nodeType === Node.ELEMENT_NODE) collectComments(c, out);
  }
}


