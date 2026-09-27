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
} from './bindings.js';
import { devHooks, type WarnOnceContext } from './dev-hooks.js';
import {
  _resetCallOrderListState,
  _setRenderContext,
  type RenderContext,
} from './each.js';
import type { SafeHtml } from './jsx-runtime.js';
import { isSafeHtml } from './jsx-runtime.js';
import { type ListBinding, reconcileList } from './list-reconcile.js';
import { morph } from './morph.js';
import {
  anyRebuiltListIsGranular,
  bindListsFromMarkers,
  cleanupOrphanBindings,
  collectOwnedItems,
} from './mount-list-bindings.js';
import { effect } from './reactive.js';
import {
  collectLists,
  flatten,
  flattenWithoutListItems,
  type Segment,
} from './segment.js';

/** What `mount()`'s render function may return; non-SafeHtml values coerce (nullish/boolean → render nothing). */
export type MountResult =
  SafeHtml | string | number | boolean | null | undefined;

// KF-175 — non-enumerable marker placed on `mount()`'s rootEl so that a
// second `mount()` call on a descendant, ancestor, or the same element can be
// detected and rejected. `Symbol.for(...)` so the marker survives multiple
// kerfjs imports in the same realm (e.g. the dist-full test suite running a
// rebuilt bundle against the src test infrastructure).
const MOUNTED_MARKER = Symbol.for('kerfjs.mounted');

const NESTED_MOUNT_MSG =
  'mount: rootEl is already inside (or contains) a mounted tree. ' +
  'kerf supports one mount per tree — compose with plain functions that return JSX instead of nesting mounts.';

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
      `mount: ${describeEl(rootEl)} is already mounted. ` +
        'Call the disposer returned by the first mount() before mounting again. ' +
        'kerf supports one mount per element — compose with plain functions that return JSX instead of nesting mounts.',
    );
  }
  // Ancestors — walk up.
  let ancestor: Element | null = rootEl.parentElement;
  while (ancestor) {
    if (isMounted(ancestor)) throw new Error(NESTED_MOUNT_MSG);
    ancestor = ancestor.parentElement;
  }
  // Descendants — DFS.
  const stack: Element[] = [];
  for (let i = 0; i < rootEl.children.length; i++)
    stack.push(rootEl.children[i]);
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
export function mount(
  rootEl: HTMLElement,
  render: () => MountResult,
): () => void {
  if (rootEl == null) {
    throw new Error(
      'mount: rootEl is null/undefined — pass the live element, e.g. mount(document.getElementById("app")!, render). ' +
        'A common cause is a typo in the id or selector that returns null at runtime even though the TypeScript types say HTMLElement.',
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
    if (!owner.defaultView) document.adoptNode(rootEl);
    /* c8 ignore stop */
  }
  assertNotInsideMountedTree(rootEl);
  setMounted(rootEl, true);
  // KF-174: opt-in dev MutationObserver that warns when a node carrying an
  // imperative addEventListener listener is removed/rebuilt by the morph.
  const listenerWarnObserver = devHooks.listenerRebuild?.(rootEl) ?? null;
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
  const valueOnlyWarnCtx: WarnOnceContext = { warned: false };

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

  /** Recover list call order, then render/morph surrounds and align bindings. */
  function renderStaticPhase(): Segment {
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
    if (
      renderCtx.previousCallCount !== undefined &&
      renderCtx.previousCallCount !== renderCtx.counter
    ) {
      // Warn from the FIRST pass: the reset clears the recorded sources the
      // shift detection compares against, so a second pass has nothing to spot.
      for (const id of renderCtx.shiftCandidates) {
        if (renderCtx.warnedShiftIds.has(id)) continue;
        renderCtx.warnedShiftIds.add(id);
        devHooks.listIdShift?.(id);
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
      devHooks.parserRepair?.(prevStaticHtml);
      bindingDisposers = wireBindings(rootEl, bindingCtx, bindingDisposers);
      if (devHooks.staleBindingEnabled?.()) prevWiredBindings = bindingCtx.list;
      isFirst = false;
    } else {
      let nextStaticHtml = runSubsequentRender(
        rootEl,
        segment,
        bindings,
        renderCtx,
        prevStaticHtml,
        valueOnlyWarnCtx,
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
        for (const id of renderCtx.rebuiltLists)
          renderCtx.bindingCounts.delete(id);
        result = runRenderPass();
        segment = resultToSegment(result);
        nextStaticHtml = runSubsequentRender(
          rootEl,
          segment,
          bindings,
          renderCtx,
          prevStaticHtml,
          valueOnlyWarnCtx,
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
        if (devHooks.staleBindingEnabled?.())
          prevWiredBindings = bindingCtx.list;
      } else {
        // KF-338: fast path — the effects stay bound to `prevWiredBindings`.
        // Dev-warn (opt-in) if this render tried to bind a DIFFERENT signal
        // instance to a hole, which silently goes stale (the effect isn't
        // re-wired). The warner short-circuits on its env gate first.
        devHooks.staleBinding?.(prevWiredBindings, bindingCtx.list);
      }
      prevStaticHtml = nextStaticHtml;
    }
    return segment;
  }

  /** Reconcile every list, commit bookkeeping, then audit the final DOM. */
  function reconcileAndCommitListPhase(segment: Segment): void {
    // KF-416: per-list expected row count, for the dev-mode row-count invariant.
    // Only built when the checks are enabled — otherwise the map would cost an
    // allocation per render for nothing, and this family promises zero prod cost.
    const expectedCounts = devHooks.listInvariantsEnabled?.()
      ? new Map<string, number>()
      : null;

    for (const listSeg of collectLists(segment).values()) {
      // Invariant: `bindListsFromMarkers` just ran over this segment, so every
      // list id has a binding — EXCEPT when the list's marker never reached the
      // live DOM because it sits inside a `data-morph-skip` subtree the morph
      // refused to update. Guard that edge with a descriptive error instead of
      // letting `reconcileList(undefined, …)` die on a bare TypeError.
      const binding = bindings.get(listSeg.id);
      if (!binding) {
        throw new Error(
          'mount: an each() list appeared in the render output but its marker never reached the live DOM. ' +
            'The most common cause is an each() introduced inside a data-morph-skip subtree on a re-render — ' +
            'the morph leaves that subtree untouched, so the list can never bind. ' +
            'Move the each() outside the skipped subtree, or remove data-morph-skip from its ancestor.',
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
      // KF-416: a granular segment carries no items but its source (an
      // arraySignal) knows the count; a snapshot segment's `items` ARE the
      // count. Duck-typed on the granular case so mount never hard-imports
      // ArraySignal (which would pull it into the main bundle — KF-95).
      expectedCounts?.set(
        listSeg.id,
        listSeg.patches && listSeg.source
          ? (listSeg.source as { value: readonly unknown[] }).value.length
          : listSeg.items.length,
      );
    }
    renderCtx.previousCallCount = renderCtx.counter;

    // Opt-in structural audit of every list binding against the live DOM
    // (KERF_DEV_INVARIANTS). Placed after the reconcile loop so it sees the
    // render's final state; a no-op, with no DOM walking at all, when unset.
    devHooks.listInvariants?.(rootEl, bindings, expectedCounts || undefined);
  }

  /** Release everything the mount holds except the effect itself. */
  const releaseResources = (): void => {
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

  // KF-KGFJP6 (transactional first render): the effect's first run is
  // synchronous, and a throw from it — the user's render, the each() row
  // contract, a binding whose first write throws, a dev invariant — means
  // `mount()` returns no disposer. Release everything acquired so far instead,
  // so a retry on the same element is not refused as "already mounted" and no
  // half-wired binding effect keeps subscribing to signals, and put back the
  // child nodes the element held before `mount()` was called. The original
  // error is rethrown unchanged. `@preact/signals-core`'s `effect()` already
  // disposed the failed effect before rethrowing, and the render-scoped module
  // contexts (each.ts / bindings.ts) are restored by their own try/finally
  // blocks, so neither needs handling here.
  const priorChildren = rootEl.firstChild ? Array.from(rootEl.childNodes) : [];
  let disposeEffect: () => void;
  try {
    disposeEffect = effect(() => {
      reconcileAndCommitListPhase(renderStaticPhase());
    });
  } catch (err) {
    releaseResources();
    rootEl.replaceChildren(...priorChildren);
    throw err;
  }

  return () => {
    disposeEffect();
    releaseResources();
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
  valueOnlyWarnCtx: WarnOnceContext,
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
  devHooks.valueOnlyRerender?.(
    prevStaticHtml,
    currentStaticHtml,
    valueOnlyWarnCtx,
  );
  cleanupOrphanBindings(segment, bindings, renderCtx);
  const template = rootEl.cloneNode(false) as HTMLElement;
  template.innerHTML = currentStaticHtml;
  morph(rootEl, template, collectOwnedItems(bindings));
  bindListsFromMarkers(
    rootEl,
    segment,
    bindings,
    false,
    renderCtx.rebuiltLists,
  );
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
  if (result == null || typeof result === 'boolean') return '';
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
