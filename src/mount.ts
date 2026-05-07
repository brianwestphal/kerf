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
 *   - Static surrounds (everything outside `each()` lists): morphdom diffs
 *     a freshly-built template against the live tree. Same conventions as
 *     before — id/data-key matching, `data-morph-skip`, focus preservation.
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
import { _setListCounter } from './each.js';
import type { SafeHtml } from './jsx-runtime.js';
import { isSafeHtml } from './jsx-runtime.js';
import { effect } from './reactive.js';
import {
  collectLists,
  flatten,
  flattenWithoutListItems,
  type ListSegment,
  type Segment,
} from './segment.js';

interface BoundItem {
  ref: object;
  cacheKey: unknown;
  html: string;
  node: Element;
}

interface ListBinding {
  liveParent: Element;
  /**
   * One entry per item currently mounted under `liveParent`, in order.
   * Mirrors the current segment's `items` length after each reconcile.
   */
  items: BoundItem[];
}

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
  const bindings = new Map<string, ListBinding>();
  const counter = { value: 0 };
  let isFirst = true;

  return effect(() => {
    counter.value = 0;
    _setListCounter(counter);
    let result: SafeHtml | string;
    try {
      result = render();
    } finally {
      _setListCounter(null);
    }

    const segment: Segment = isSafeHtml(result)
      ? (result.__segment ?? { kind: 'static', html: result.__html })
      : { kind: 'static', html: result };

    if (isFirst) {
      // Bulk-render with items inlined and a marker per list. The marker walk
      // afterwards binds each list to the rows already in the DOM, so the
      // first-render reconcile is a no-op (every item is a cache hit).
      rootEl.innerHTML = flatten(segment, true);
      bindListsFromMarkers(rootEl, segment, bindings);
      isFirst = false;
    } else {
      // Static-surrounds-only render: lists become marker-only in the
      // template. `diff()` skips bound list parents' children entirely
      // (so existing rows stay) and inserts the marker for any list that
      // didn't exist before. The marker walk afterwards binds those new
      // lists; the per-list reconcile below patches every list's items.
      const template = rootEl.cloneNode(false) as HTMLElement;
      template.innerHTML = flattenWithoutListItems(segment);
      const listParents = new Set<Element>();
      for (const b of bindings.values()) listParents.add(b.liveParent);
      diff(rootEl, template, listParents);
      bindListsFromMarkers(rootEl, segment, bindings);
    }

    for (const listSeg of collectLists(segment).values()) {
      const binding = bindings.get(listSeg.id) as ListBinding;
      reconcileList(binding, listSeg);
    }
  });
}

/**
 * Walk the live tree's comment nodes; every `<!--kf-list:{id}-->` marker
 * is the first child of a list parent. Record the binding (parent + the
 * already-rendered item nodes that follow the marker) and then remove the
 * marker — bindings live in JS, not in the DOM.
 */
function bindListsFromMarkers(
  rootEl: Element,
  segment: Segment,
  bindings: Map<string, ListBinding>,
): void {
  const lists = collectLists(segment);
  const found: Comment[] = [];
  collectComments(rootEl, found);
  for (const marker of found) {
    if (!marker.data.startsWith(LIST_MARKER_PREFIX)) continue;
    const id = marker.data.slice(LIST_MARKER_PREFIX.length);
    // Markers are only emitted by `flatten(..., true)` paired with a list
    // segment in the same render, so both lookups always succeed here.
    const listSeg = lists.get(id) as ListSegment;
    const liveParent = marker.parentElement as Element;
    // On first render, items are inlined right after the marker (so the
    // first element sibling is `items[0]`, the next is `items[1]`, etc.).
    // On subsequent renders for a list newly appearing, the list parent
    // is empty after the marker; the loop falls through with `items=[]`
    // and the reconcile phase below builds the items.
    const items: BoundItem[] = [];
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
    bindings.set(id, { liveParent, items });
    marker.remove();
  }
}

function reconcileList(binding: ListBinding, listSeg: ListSegment): void {
  const { liveParent } = binding;
  const oldItems = binding.items;
  const oldByRef = new Map<object, BoundItem>();
  const oldIndex = new Map<object, number>();
  for (let i = 0; i < oldItems.length; i++) {
    oldByRef.set(oldItems[i].ref, oldItems[i]);
    oldIndex.set(oldItems[i].ref, i);
  }

  // Build the new record. Per item, decide:
  //   - "stable": cache hit (same ref, byte-identical html) — reuse the
  //     existing live node. Captures its old position in `prevIdx` so the
  //     LIS pass can decide whether the node also needs to move.
  //   - "replaced": same ref but html changed — schedule a fresh node;
  //     the old node will be removed before the move pass.
  //   - "new": ref didn't exist before — schedule a fresh node.
  //
  // Fresh nodes aren't built one-at-a-time; instead we collect every fresh
  // item's HTML and parse them all in one `innerHTML` call below. For an
  // initial population of, say, 10k rows that's 1 parse instead of 10k.
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
      if (oi.html === ni.html) {
        newRecord[i] = oi;
        prevIdx[i] = oldIndex.get(ni.ref) as number;
        continue;
      }
      replacedNodes.push(oi.node);
    }
    // Placeholder; node is filled in by the bulk parse below.
    newRecord[i] = {
      ref: ni.ref, cacheKey: ni.cacheKey, html: ni.html, node: null as unknown as Element,
    };
    prevIdx[i] = -1;
    freshIndices.push(i);
    freshHtmls.push(ni.html);
  }

  if (freshHtmls.length > 0) {
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

  // Remove orphans (refs that disappeared from the new list) and the old
  // nodes for replaced items. Both are out of `oldByRef` already; replaced
  // ones were captured separately.
  for (const orphan of oldByRef.values()) {
    if (orphan.node.parentElement === liveParent) liveParent.removeChild(orphan.node);
  }
  for (const node of replacedNodes) {
    if (node.parentElement === liveParent) liveParent.removeChild(node);
  }

  // Compute the longest increasing subsequence of `prevIdx`. New positions
  // whose index is in the LIS are already in the right relative order — we
  // skip moving them. Everything else (replaced, new, or relatively-out-of-
  // order stable items) gets `insertBefore`d in a single reverse pass.
  const stable = lis(prevIdx);
  let nextSibling: Element | null = null;
  for (let i = newRecord.length - 1; i >= 0; i--) {
    const node = newRecord[i].node;
    if (prevIdx[i] !== -1 && stable.has(i)) {
      // In LIS — already in the right place.
    } else {
      liveParent.insertBefore(node, nextSibling);
    }
    nextSibling = node;
  }

  binding.items = newRecord;
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
 * Recursive collector for comment nodes — happy-dom's `TreeWalker` doesn't
 * surface `Node.COMMENT_NODE` despite accepting `NodeFilter.SHOW_COMMENT`,
 * so we walk children directly. Cheap (O(elements)) and portable.
 */
function collectComments(node: Node, out: Comment[]): void {
  for (let c: Node | null = node.firstChild; c !== null; c = c.nextSibling) {
    if (c.nodeType === 8) out.push(c as Comment);
    else if (c.nodeType === 1) collectComments(c, out);
  }
}


