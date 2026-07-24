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
 *     `morph()` reconciler walks a freshly-built template against the live
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

import {
  _setBindingContext,
  type Binding,
  type BindingContext,
  disposeRowBindings,
  newBindingContext,
  wireBindings,
  wireRowBindings,
} from './bindings.js';
import { isOptedIn as isStaleBindingWarnOptedIn, maybeWarnStaleBinding } from './dev-binding-warn.js';
import { maybeWarnEachInMorphSkip } from './dev-each-warn.js';
import { maybeCheckListInvariants } from './dev-invariants.js';
import { maybeWarnListIdShift } from './dev-list-key-warn.js';
import { maybeWarnListRebind } from './dev-list-rebind-warn.js';
import { installListenerRebuildWarn } from './dev-listener-warn.js';
import { maybeWarnParserRepair } from './dev-parser-repair-warn.js';
import { maybeWarnValueOnlyRerender, type ValueOnlyWarnContext } from './dev-rerender-warn.js';
import { _resetCallOrderListState, _setRenderContext, type RenderContext } from './each.js';
import type { SafeHtml } from './jsx-runtime.js';
import { isSafeHtml } from './jsx-runtime.js';
import {
  type BoundItem,
  type ListBinding,
  reconcileList,
} from './list-reconcile.js';
import { morph } from './morph.js';
import { effect } from './reactive.js';
import {
  collectLists,
  flatten,
  flattenWithoutListItems,
  LIST_MARKER_PREFIX,
  type ListSegment,
  type Segment,
} from './segment.js';
import { maybeWarnMissingRowKey, parseRowTemplate, rowContractError } from './utils/rowContract.js';

/** What `mount()`'s render function may return; non-SafeHtml values coerce (nullish/boolean → render nothing). */
export type MountResult = SafeHtml | string | number | boolean | null | undefined;

// KF-175 — non-enumerable marker placed on `mount()`'s rootEl so that a
// second `mount()` call on a descendant, ancestor, or the same element can be
// detected and rejected. `Symbol.for(...)` so the marker survives multiple
// kerfjs imports in the same realm (e.g. the dist-full test suite running a
// rebuilt bundle against the src test infrastructure).
const MOUNTED_MARKER = Symbol.for('kerfjs.mounted');

const NESTED_MOUNT_MSG
  = 'mount: rootEl is already inside (or contains) a mounted tree. '
  + 'kerf supports one mount per tree — compose with plain functions that return JSX instead of nesting mounts.';

function isMounted(el: Element): boolean {
  return (el as unknown as Record<symbol, unknown>)[MOUNTED_MARKER] === true;
}

function setMounted(el: Element, on: boolean): void {
  if (on) {
    (el as unknown as Record<symbol, unknown>)[MOUNTED_MARKER] = true;
  } else {
    delete (el as unknown as Record<symbol, unknown>)[MOUNTED_MARKER];
  }
}

function describeEl(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  return `<${tag}${id}>`;
}

function assertNotInsideMountedTree(rootEl: HTMLElement): void {
  // The element itself — same element mounted twice.
  if (isMounted(rootEl)) {
    throw new Error(
      `mount: ${describeEl(rootEl)} is already mounted. `
      + 'Call the disposer returned by the first mount() before mounting again. '
      + 'kerf supports one mount per element — compose with plain functions that return JSX instead of nesting mounts.',
    );
  }
  // Ancestors — walk up.
  let ancestor: Element | null = rootEl.parentElement;
  while (ancestor !== null) {
    if (isMounted(ancestor)) throw new Error(NESTED_MOUNT_MSG);
    ancestor = ancestor.parentElement;
  }
  // Descendants — DFS.
  const stack: Element[] = [];
  for (let i = 0; i < rootEl.children.length; i++) stack.push(rootEl.children[i]);
  while (stack.length > 0) {
    const cur = stack.pop() as Element;
    if (isMounted(cur)) throw new Error(NESTED_MOUNT_MSG);
    for (let i = 0; i < cur.children.length; i++) stack.push(cur.children[i]);
  }
}

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
export function mount(rootEl: HTMLElement, render: () => MountResult): () => void {
  if (rootEl == null) {
    throw new Error(
      'mount: rootEl is null/undefined — pass the live element, e.g. mount(document.getElementById("app")!, render). '
      + 'A common cause is a typo in the id or selector that returns null at runtime even though the TypeScript types say HTMLElement.',
    );
  }
  // KF-243: defense-in-depth for inert-document roots. `toElement()` already
  // adopts its output into the live document, but a consumer can hand `mount()`
  // an element built some other way — their own `DOMParser`, a detached
  // `<template>.content` child, `document.implementation.createHTMLDocument()`
  // — whose `ownerDocument` has no browsing context. `mount()`'s first-render
  // `rootEl.innerHTML = …` on such an inert-document element trips the WebKit
  // fragment-parsing bug fixed in KF-240, so adopt it into the live document
  // first. Only genuinely inert owners (`defaultView === null`) are adopted; a
  // live element in another realm (e.g. an iframe, `defaultView !== null`) is
  // left in place — `mount()` works on it as-is, and we must never yank a node
  // out of its own window.
  const owner = rootEl.ownerDocument as Document;
  if (owner !== document) {
    /* c8 ignore start -- the defaultView!==null arm needs a second live browsing context (iframe element); not constructible in the unit environment */
    if (owner.defaultView === null) document.adoptNode(rootEl);
    /* c8 ignore stop */
  }
  assertNotInsideMountedTree(rootEl);
  setMounted(rootEl, true);
  // KF-174: opt-in dev MutationObserver that warns when a node carrying an
  // imperative addEventListener listener is removed/rebuilt by the morph.
  const listenerWarnObserver = installListenerRebuildWarn(rootEl);
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
    bindingSources: new Map(),
    keysThisRender: new Set(),
    shiftCandidates: [],
    warnedShiftIds: new Set(),
    rebuiltLists: new Set(),
  };
  // KF-294: per-mount fine-grained binding context + live-effect disposers.
  // `bindingCtx` is reset and repopulated each render; `bindingDisposers`
  // holds the per-hole effects so they're torn down on unmount.
  const bindingCtx: BindingContext = newBindingContext();
  let bindingDisposers: ReadonlyArray<() => void> = [];
  // KF-338: the global-hole binding list that is ACTUALLY wired (bound to live
  // effects) right now. On the fast path the effects aren't re-wired, so this
  // list — captured whenever `wireBindings` runs — describes the signal
  // instances the live effects are still bound to. The stale-binding dev warn
  // compares it against this render's registered holes. Retained only when the
  // warning is opted in, so the fast path stays allocation-free when it's off.
  let prevWiredBindings: Binding[] = [];
  let isFirst = true;
  // KF-88: the static-surrounds HTML string from the previous render. If a
  // re-render produces the same string (the common case when a signal flips
  // a class on one row but the page chrome is unchanged), we skip the
  // template clone, the innerHTML re-parse, and the morph() walk entirely
  // and go straight to the per-list reconcilers. Saves ~8 ms per update-
  // path render against the krausest harness.
  let prevStaticHtml = '';
  // Per-mount one-shot context for the opt-in value-only-re-render warning.
  const valueOnlyWarnCtx: ValueOnlyWarnContext = { warned: false };

  /** One pass of the user's render function with both collection contexts fresh. */
  const runRenderPass = (): MountResult => {
    renderCtx.counter = 0;
    renderCtx.keysThisRender.clear();
    renderCtx.shiftCandidates.length = 0;
    bindingCtx.counter = 0;
    bindingCtx.list = [];
    _setRenderContext(renderCtx);
    _setBindingContext(bindingCtx);
    try {
      return render();
    } finally {
      _setRenderContext(null);
      _setBindingContext(null);
    }
  };

  const disposeEffect = effect(() => {
    let result = runRenderPass();

    // An unkeyed list is identified by its position among the `each()` calls,
    // so a render that changed how many of them ran may have handed some ids to
    // a different list. Only now is this render's count known — and by now the
    // damage is in `result`, because the departed list's per-item HTML memo
    // lives under the id its successor just rendered with. Two lists over one
    // source hit each other's memo exactly (same refs, same cacheKey), so the
    // surviving list emitted the other list's row markup.
    //
    // The documented cost of an identity shift is a from-scratch rebuild, not
    // wrong output, so that is what happens: drop the call-order-keyed state
    // and render again. The discarded pass costs one extra render on precisely
    // the render that was already going to rebuild — and never on a steady-state
    // one, where the count is unchanged.
    const countChanged = renderCtx.previousCallCount !== undefined
      && renderCtx.previousCallCount !== renderCtx.counter;
    if (countChanged) {
      // Warn from the FIRST pass: the reset clears the recorded sources the
      // shift detection compares against, so a second pass has nothing to spot.
      for (const id of renderCtx.shiftCandidates) {
        if (renderCtx.warnedShiftIds.has(id)) continue;
        renderCtx.warnedShiftIds.add(id);
        maybeWarnListIdShift(id);
      }
      _resetCallOrderListState(renderCtx);
      result = runRenderPass();
    }

    // The `MountResult` union covers `null`, `undefined`, `false`, `true`,
    // and `number` so consumers can write `() => cond ? <jsx/> : null` and
    // `() => cond && <jsx/>` without a cast. `resultToSegment` collapses
    // nullish + boolean to `''` (render nothing) and stringifies numbers.
    let segment: Segment = resultToSegment(result);

    if (isFirst) {
      runFirstRender(rootEl, segment, bindings);
      prevStaticHtml = flattenWithoutListItems(segment);
      // Opt-in scan for markup the HTML parser silently restructures
      // (KERF_DEV_WARN_PARSER_REPAIR). First render only: the shape is a
      // property of the markup, not of any particular update.
      maybeWarnParserRepair(prevStaticHtml);
      bindingDisposers = wireBindings(rootEl, bindingCtx, bindingDisposers);
      if (isStaleBindingWarnOptedIn()) prevWiredBindings = bindingCtx.list;
      isFirst = false;
    } else {
      let nextStaticHtml = runSubsequentRender(
        rootEl, segment, bindings, renderCtx, prevStaticHtml, valueOnlyWarnCtx,
      );

      // KF-411: the morph just rebuilt one or more lists' containers, so their
      // bindings were self-healed to empty. A list that emitted a granular
      // segment (it looked `bound` when `each()` ran, before the morph) now has
      // items:[] against an empty binding — the reconcile below would render it
      // blank, discarding rows that still live in the arraySignal. Reset those
      // lists to unbound and render again: `each()` re-emits a full snapshot,
      // and the second bind pass finds the (now valid) self-healed binding and
      // reconciles it to the real rows. Only fires on a container-rebuild
      // render — already O(N) — never in steady state.
      if (anyRebuiltListIsGranular(segment, renderCtx.rebuiltLists)) {
        for (const id of renderCtx.rebuiltLists) renderCtx.bindingCounts.delete(id);
        result = runRenderPass();
        segment = resultToSegment(result);
        nextStaticHtml = runSubsequentRender(
          rootEl, segment, bindings, renderCtx, prevStaticHtml, valueOnlyWarnCtx,
        );
      }
      // A changed static-surrounds string means morph() ran, which strips
      // bound attributes (absent from the template) and removes inserted text
      // nodes. Re-wire against the post-morph DOM. When the surrounds are
      // unchanged (KF-88 fast path — the select-row / partial-update case),
      // morph is skipped and the existing binding effects stay live, so we
      // leave them untouched.
      //
      // KF-299 staleness note: leaving the effects untouched on the fast path
      // is correct for the canonical pattern — `class={computed(() => sig.value)}`
      // re-creates the `computed` each render, but the live effect stays bound
      // to the FIRST computed, which reads the SAME underlying signal(s), so
      // later changes still fire. It goes stale only if a render switches which
      // signal INSTANCE it binds (e.g. `class={cond ? sigA : sigB}` where the
      // surrounds byte-string is unchanged) — an anti-pattern; bind one
      // `computed` that switches internally instead. Same "bound signal must be
      // stable across renders" constraint as row bindings (see docs 2-reactivity
      // §2.9). Re-wiring here would need fast-path text-node reuse to avoid
      // duplicating inserted text nodes, so it's not worth it for an anti-pattern.
      if (nextStaticHtml !== prevStaticHtml) {
        bindingDisposers = wireBindings(rootEl, bindingCtx, bindingDisposers);
        if (isStaleBindingWarnOptedIn()) prevWiredBindings = bindingCtx.list;
      } else {
        // KF-338: fast path — the effects stay bound to `prevWiredBindings`.
        // Dev-warn (opt-in) if this render tried to bind a DIFFERENT signal
        // instance to a hole, which silently goes stale (the effect isn't
        // re-wired). The warner short-circuits on its env gate first.
        maybeWarnStaleBinding(prevWiredBindings, bindingCtx.list);
      }
      prevStaticHtml = nextStaticHtml;
    }

    for (const listSeg of collectLists(segment).values()) {
      // Invariant: `bindListsFromMarkers` just ran over this segment, so every
      // list id has a binding — EXCEPT when the list's marker never reached the
      // live DOM because it sits inside a `data-morph-skip` subtree the morph
      // refused to update. Guard that edge with a descriptive error instead of
      // letting `reconcileList(undefined, …)` die on a bare TypeError.
      const binding = bindings.get(listSeg.id);
      if (binding === undefined) {
        throw new Error(
          'mount: an each() list appeared in the render output but its marker never reached the live DOM. '
          + 'The most common cause is an each() introduced inside a data-morph-skip subtree on a re-render — '
          + 'the morph leaves that subtree untouched, so the list can never bind. '
          + 'Move the each() outside the skipped subtree, or remove data-morph-skip from its ancestor.',
        );
      }
      reconcileList(binding, listSeg);
      // KF-99: record the post-reconcile binding length so the next render's
      // granular path can detect drift (a prior render that threw mid-batch
      // leaves the binding shorter than the signal expects).
      renderCtx.bindingCounts.set(listSeg.id, binding.items.length);
      // KF-388: record WHICH list this id now holds, so the next render can
      // tell a genuine continuation from an id reused by a different list.
      renderCtx.bindingSources.set(listSeg.id, listSeg.source);
    }

    renderCtx.previousCallCount = renderCtx.counter;

    // Opt-in structural audit of every list binding against the live DOM
    // (KERF_DEV_INVARIANTS). Placed after the reconcile loop so it sees the
    // render's final state; a no-op, with no DOM walking at all, when unset.
    maybeCheckListInvariants(rootEl, bindings);
  });

  return () => {
    disposeEffect();
    for (const d of bindingDisposers) d();
    bindingDisposers = [];
    // KF-294: tear down every list row's fine-grained binding effects too.
    for (const b of bindings.values()) {
      for (const item of b.items) disposeRowBindings(item.bindingDisposers);
    }
    listenerWarnObserver?.disconnect();
    // Clear the mounted marker so `mount(sameEl, ...)` after dispose works.
    setMounted(rootEl, false);
  };
}

/**
 * First render of a mount: bulk-flatten the segment (items inlined, markers
 * around each list) into `rootEl.innerHTML`, then walk the markers to
 * register a `ListBinding` per list. The subsequent `reconcileList` pass is
 * a no-op (every row's a cache hit on the just-bound items).
 */
function runFirstRender(
  rootEl: HTMLElement,
  segment: Segment,
  bindings: Map<string, ListBinding>,
): void {
  rootEl.innerHTML = flatten(segment, true);
  bindListsFromMarkers(rootEl, segment, bindings, true);
}

/**
 * Subsequent render of a mount. Returns the new `prevStaticHtml` so the
 * caller can carry it forward.
 *
 * Two paths:
 *
 * - **KF-88 fast path**: when the static-surrounds string didn't change
 *   byte-for-byte, `bindListsFromMarkers` has nothing to discover and the
 *   diff would short-circuit on `isEqualNode` for every element it visited —
 *   but the visit itself isn't free. Skip both to save ~8 ms per partial-
 *   update / select-row / swap-rows render against the krausest harness.
 *
 *   Trade-off (KF-117, documented in `docs/4-render.md` §4.4.2): any
 *   attribute or child set imperatively on a kerf-managed element (e.g.
 *   `el.setAttribute(...)`) survives across no-op re-renders because the
 *   diff doesn't run to wipe it. When the surrounds DO change, the diff
 *   runs and `morphAttributes` removes anything the JSX didn't authorise.
 *   This matches the framework's "smallest cut" model: don't touch what
 *   JSX didn't change.
 *
 * - **Surrounds-changed path**: clean up orphan bindings (lists that
 *   disappeared from this render's segment), build a template from the
 *   static-only HTML, run `morph()` over the surrounds with the
 *   list-owned items as `ownedItems` (KF-102 round 2 — the morph skips
 *   owned items individually but still walks every parent so non-list
 *   siblings around an each() reconcile correctly), then bind any
 *   newly-appearing lists.
 */
function runSubsequentRender(
  rootEl: HTMLElement,
  segment: Segment,
  bindings: Map<string, ListBinding>,
  renderCtx: RenderContext,
  prevStaticHtml: string,
  valueOnlyWarnCtx: ValueOnlyWarnContext,
): string {
  // KF-411: reflects only this bind pass. Cleared here — before the fast-path
  // early return — so the surrounds-unchanged path leaves it empty (no morph,
  // no bind, no self-heal to record) rather than carrying a stale set forward.
  renderCtx.rebuiltLists.clear();
  const currentStaticHtml = flattenWithoutListItems(segment);
  if (currentStaticHtml === prevStaticHtml) {
    return prevStaticHtml;
  }
  // Opt-in dev diagnostic (KERF_DEV_WARN_VALUE_ONLY_RERENDER=1): if this
  // changed render is confined to text/attribute values, every changed hole
  // could have been a fine-grained binding — surface the bound-first guidance
  // once per mount. Gate short-circuits before any parsing.
  maybeWarnValueOnlyRerender(prevStaticHtml, currentStaticHtml, valueOnlyWarnCtx);
  cleanupOrphanBindings(segment, bindings, renderCtx);
  const template = rootEl.cloneNode(false) as HTMLElement;
  template.innerHTML = currentStaticHtml;
  morph(rootEl, template, collectOwnedItems(bindings));
  bindListsFromMarkers(rootEl, segment, bindings, false, renderCtx.rebuiltLists);
  return currentStaticHtml;
}

/**
 * Coerce a non-`SafeHtml` render result to a safe HTML string. Nullish
 * values and booleans become `''` (render nothing) — matches the React /
 * Solid convention so `{cond ? <jsx/> : null}` and `{cond && <jsx/>}`
 * patterns work without each consumer adding a sentinel. Everything else
 * is stringified (numbers → `"42"`, strings pass through).
 */
function coerceRenderResult(result: unknown): string {
  if (result === null || result === undefined) return '';
  if (result === false || result === true) return '';
  return String(result);
}

/**
 * A render result → the `Segment` the pipeline consumes. `SafeHtml` carries its
 * structured segment (or a plain `__html` for a cross-bundle shim); everything
 * else is coerced to a static-html segment.
 */
function resultToSegment(result: MountResult): Segment {
  return isSafeHtml(result)
    ? (result.__segment ?? { kind: 'static', html: result.__html })
    : { kind: 'static', html: coerceRenderResult(result) };
}

/**
 * KF-411: did the morph rebuild a list's container whose `each()` emitted a
 * GRANULAR segment this render? Such a segment carries `items: []`, so the
 * freshly self-healed (empty) binding would reconcile the live rows to zero.
 * `mount()` re-renders those lists onto the snapshot path when this is true.
 */
function anyRebuiltListIsGranular(segment: Segment, rebuilt: ReadonlySet<string>): boolean {
  if (rebuilt.size === 0) return false;
  const lists = collectLists(segment);
  for (const id of rebuilt) {
    if (lists.get(id)?.patches !== undefined) return true;
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
function bindListsFromMarkers(
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
    if (existing !== undefined) {
      // Existing binding survives the diff — the prior render's item nodes stay
      // bound — but only when this id is still carried by the SAME marker node.
      //
      // Identity of the node, not merely "a marker with this id is somewhere in
      // the tree": a call-order id can be handed to a different list when the
      // number of unkeyed `each()` calls changes, and the departed list's own
      // marker is typically still live under its new id. Accepting that binding
      // would point the arriving list at the previous occupant's parent and
      // anchor, so its rows land inside the wrong container.
      if (existing.marker === marker && rootEl.contains(existing.marker)) continue;
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
      maybeWarnListRebind(id, marker.parentElement as Element);
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
        const rowBindings = listSeg.items[i].bindings;
        const bound: BoundItem = {
          ref: listSeg.items[i].ref,
          cacheKey: listSeg.items[i].cacheKey,
          html: listSeg.items[i].html,
          node: next,
          bindings: rowBindings,
        };
        // KF-294: wire this inlined first-render row's fine-grained bindings.
        if (rowBindings !== undefined && rowBindings.length > 0) {
          bound.bindingDisposers = wireRowBindings(next, rowBindings);
        }
        items.push(bound);
        next = next.nextElementSibling;
      }
    }
    const binding: ListBinding = { liveParent, items, marker };
    // KF-173: dev-only one-shot warning if the first row has no id/data-key.
    if (items.length > 0) {
      maybeWarnMissingRowKey(items[0].node, items[0].html, binding);
    }
    // Dev-mode: warn when an each() list is inside a data-morph-skip subtree
    // (list rows still update; static reactive siblings are frozen).
    maybeWarnEachInMorphSkip(id, liveParent, rootEl);
    bindings.set(id, binding);
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
  if (count !== 1) throw rowContractError(index, expectedHtml);
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
  if (boundEl.tagName !== expectedTag) throw rowStructureError(index, boundEl.tagName, expectedTag);
}

/**
 * KF-391: the author's row markup parsed into a different element than the row
 * itself, because the HTML parser restructured it. Names both tags and points
 * at the fix — the shape kerf supports (and that the benchmark entry uses) is
 * an explicit sectioning element around the list.
 */
function rowStructureError(index: number, gotTag: string, wantTag: string): Error {
  const got = gotTag.toLowerCase();
  const want = wantTag.toLowerCase();
  return new Error(
    `each(): row ${index} renders <${want}>, but the HTML parser wrapped the rows in `
    + `<${got}> — so kerf cannot bind one row per element. This happens when an each() of `
    + `<${want}> sits directly inside a table: the parser inserts <${got}> around the whole run. `
    + `Put the each() inside an explicit <${got}> (e.g. <table><${got}>{each(...)}</${got}></table>) `
    + 'so the rows are the direct children kerf binds.',
  );
}

/**
 * Build the set of element nodes owned by `each()` list reconcilers, the
 * union of every binding's `items[].node`. The static-surrounds diff
 * skips these so list rows are invisible to the parent walk while
 * sibling reconciliation continues normally (KF-102 round 2).
 */
function collectOwnedItems(bindings: Map<string, ListBinding>): Set<Element> {
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
function cleanupOrphanBindings(
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
      if (item.node.parentElement !== null) {
        item.node.parentElement.removeChild(item.node);
      }
    }
    if (binding.marker.parentElement !== null) {
      binding.marker.parentElement.removeChild(binding.marker);
    }
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
  for (let c: Node | null = node.firstChild; c !== null; c = c.nextSibling) {
    if (c.nodeType === Node.COMMENT_NODE) out.push(c as Comment);
    else if (c.nodeType === Node.ELEMENT_NODE) collectComments(c, out);
  }
}
