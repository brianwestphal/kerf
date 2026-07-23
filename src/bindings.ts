/**
 * Fine-grained signal bindings (KF-294 spike).
 *
 * When a `Signal` is interpolated straight into a JSX attribute
 * (`class={sig}`) or a text child (`{sig}`) INSIDE a `mount()` render, the
 * JSX runtime stops stringifying it. Instead it emits a marker into the HTML
 * string and records a binding here; after the string is parsed to DOM, a
 * wiring pass attaches one `effect` per binding that writes straight to the
 * live node. A later change to that signal then updates the node WITHOUT
 * re-running the render function or walking the list reconciler.
 *
 * This reuses the "marker in string, wire up after parse" mechanism the
 * keyed-list reconciler already uses for `<!--kf-list:{id}-->` markers.
 *
 * TWO SCOPES of binding, with disjoint marker namespaces so their wiring
 * passes never collide:
 *
 *   - GLOBAL holes — signals in the static surrounds (outside any `each()`
 *     row). Markers: `data-kfb` attribute / `<!--kfb:{id}-->` comment. Ids come
 *     from the mount render context's counter; wired by `wireBindings()` over
 *     the whole mount root; disposed/re-wired by `mount()` each render.
 *
 *   - ROW holes — signals inside an `each()` row. Markers: `data-kfbrow`
 *     attribute / `<!--kfbr:{id}-->` comment. Ids are row-LOCAL (reset per row)
 *     so they stay stable and collision-free as rows are inserted/removed/moved.
 *     Captured per row by `captureRowBindings()`, carried on the list segment
 *     item, and wired/disposed by the list reconciler at each row node's
 *     create/remove — so a binding's lifetime tracks its row node's lifetime,
 *     and row reorders (which reuse the same node) are free.
 *
 * Outside a `mount()` render (SSR / `SafeHtml.toString()`) neither scope is
 * active: the runtime snapshots `signal.value` and emits no markers, so server
 * output is correct and legacy `.toString()` callers are unaffected.
 *
 * Module-level mutable state note: `context` / `rowSink` (plus `rowCounter`,
 * the row-hole id counter that resets with each row capture) are a third
 * sanctioned module-level mutable location (alongside `store.ts:REGISTRY` and
 * `each.ts:context`). They hold the current render's binding sinks and are set
 * / cleared by `mount()` and `each()` around the render calls. The only other
 * module-level container here is `insertedTextNodes`, a WeakMap keyed on text
 * marker comments — a pure cache whose entries die with their nodes (GC-tied
 * lifetime), so it carries no cross-render semantics.
 */

import { effect, isSignal, type Signal } from './reactive.js';
import { syncFormProp } from './utils/syncFormProp.js';
import { isDangerousUrlValue, reportDangerousUrl } from './utils/urlScreen.js';

// RESERVED NAMESPACE (consumer contract, KF-314). The wiring pass finds these
// markers by scanning the mounted subtree and matching by id, and resolves an
// id collision by document order (last/first wins) with no ownership check — so
// a consumer element that carries `data-kfb`/`data-kfbrow`, or a comment
// beginning `kfb:`/`kfbr:`/`kf-list:`, can collide with a real binding's id and
// steal its effect (the update wires to the wrong node). These names are
// therefore reserved: consumers must not emit them (documented in
// docs/2-reactivity.md § "Reserved marker names"). Kerf's own escaping already
// prevents a plain text/attribute *value* from forging one; the remaining ways
// in are a hand-written attribute or a `raw()` payload — i.e. the consumer's
// own trust boundary. A dev-mode collision warning is a possible future
// enhancement (fix direction (a) on KF-314) if silent mis-wiring proves easy to
// hit in practice.

/** Marker attribute for GLOBAL (static-surround) attribute bindings. */
export const BIND_ATTR = 'data-kfb';
/** Comment-marker prefix for a GLOBAL text binding: `<!--kfb:{id}-->`. */
export const TEXT_MARKER_PREFIX = 'kfb:';
/** Marker attribute for ROW (each()-scoped) attribute bindings. */
export const BIND_ATTR_ROW = 'data-kfbrow';
/** Comment-marker prefix for a ROW text binding: `<!--kfbr:{id}-->`. */
export const ROW_TEXT_PREFIX = 'kfbr:';

interface AttrBinding {
  kind: 'attr';
  id: string;
  attr: string;
  signal: Signal<unknown>;
}
interface TextBinding {
  kind: 'text';
  id: string;
  signal: Signal<unknown>;
}
export type Binding = AttrBinding | TextBinding;

/**
 * Per-render GLOBAL binding sink. `counter` assigns ids by registration order
 * (stable across renders since the JSX render is deterministic); `list`
 * accumulates this render's global (static-surround) holes.
 */
export interface BindingContext {
  counter: number;
  list: Binding[];
}

let context: BindingContext | null = null;

// Active row-capture sink + its row-local id counter. Non-null only while
// `each()` renders a single row through `captureRowBindings()`.
let rowSink: Binding[] | null = null;
let rowCounter = 0;

// Frozen shared sentinel for the no-holes case — readonly so no caller can
// push into it and corrupt every other no-hole mount.
const NO_DISPOSERS: ReadonlyArray<() => void> = Object.freeze([]);

export function newBindingContext(): BindingContext {
  return { counter: 0, list: [] };
}

export function _setBindingContext(c: BindingContext | null): void {
  context = c;
}

/**
 * Render one `each()` row while capturing the row-scoped bindings it emits.
 * Row ids are local (reset to 0) so they're stable + collision-free per row.
 * Returns the row HTML and its captured bindings (empty when the row has no
 * signal holes). Restores the prior capture state (supports nested `each()`).
 */
export function captureRowBindings(renderRow: () => string): { html: string; bindings: Binding[] } {
  const prevSink = rowSink;
  const prevCounter = rowCounter;
  rowSink = [];
  rowCounter = 0;
  try {
    const html = renderRow();
    return { html, bindings: rowSink };
  } finally {
    rowSink = prevSink;
    rowCounter = prevCounter;
  }
}

/**
 * Register a signal attribute. Routes to the row sink when a row capture is
 * active, else the global context. Returns the marker id,
 * or null to snapshot. The marker attribute NAME (`data-kfb` vs `data-kfbrow`)
 * is fetched once per element via `bindMarkerAttr()` — all of an element's
 * signal attrs share the same scope — so this avoids a per-attr object alloc.
 */
export function bindAttr(attr: string, signal: Signal<unknown>): string | null {
  if (rowSink !== null) {
    const id = `a${rowCounter++}`;
    rowSink.push({ kind: 'attr', id, attr, signal });
    return id;
  }
  if (context !== null) {
    const id = `a${context.counter++}`;
    context.list.push({ kind: 'attr', id, attr, signal });
    return id;
  }
  return null;
}

/**
 * The marker attribute name for the currently-active binding scope — row holes
 * use `data-kfbrow`, global holes `data-kfb`. Called once per element by the
 * JSX runtime after collecting the element's signal-attr ids.
 */
export function bindMarkerAttr(): string {
  return rowSink !== null ? BIND_ATTR_ROW : BIND_ATTR;
}

/**
 * Register a signal text hole. Returns the comment-marker HTML to emit, or
 * null to snapshot. Same routing as `bindAttr()`.
 */
export function bindText(signal: Signal<unknown>): string | null {
  if (rowSink !== null) {
    const id = `t${rowCounter++}`;
    rowSink.push({ kind: 'text', id, signal });
    return `<!--${ROW_TEXT_PREFIX}${id}-->`;
  }
  if (context !== null) {
    const id = `t${context.counter++}`;
    context.list.push({ kind: 'text', id, signal });
    return `<!--${TEXT_MARKER_PREFIX}${id}-->`;
  }
  return null;
}

/**
 * Wire this render's GLOBAL bindings against the freshly-built live DOM.
 * Disposes `prevDisposers` first (a surrounds-changed morph strips bound attrs
 * and removes inserted text nodes, so we re-establish them), then attaches one
 * effect per hole. Zero-cost when there are no global holes.
 */
export function wireBindings(
  rootEl: Element,
  ctx: BindingContext,
  prevDisposers: ReadonlyArray<() => void>,
): ReadonlyArray<() => void> {
  for (const d of prevDisposers) d();
  if (ctx.list.length === 0) return NO_DISPOSERS;
  const disposers: Array<() => void> = [];
  wireInto(rootEl, ctx.list, disposers);
  return disposers;
}

/**
 * Wire one row's ROW-scoped bindings against its freshly-built row node
 * (including the node itself, since a row's top-level element may carry the
 * marker, e.g. `<tr data-kfbrow>`). Returns the row's disposers for the
 * reconciler to store on the bound item and call when the row node is removed.
 */
export function wireRowBindings(rowNode: Element, bindings: Binding[]): Array<() => void> {
  // Callers (snapshot buildFreshNodes, mount first-render inline) only invoke
  // this for rows with at least one binding, so no empty-guard is needed.
  //
  // Hot path: most row holes are an attribute on the row's ROOT element (e.g.
  // `<tr class={sig}>`). For those we resolve the node with a single
  // `getAttribute` + allocation-free id membership check — no `querySelectorAll`,
  // no `collectComments` walk, no Map. The descendant-attr index and the
  // text-comment index are built lazily, only if a hole actually needs them.
  const disposers: Array<() => void> = new Array(bindings.length);
  const rootIds = rowNode.getAttribute(BIND_ATTR_ROW);
  // For the common single-root-binding row, `rootIds === b.id` resolves the
  // node with zero allocation. Only a row with 2+ root bindings builds the Set.
  let rootIdSet: Set<string> | null = null;
  let descIndex: Map<string, Element> | null = null;
  let textMarkers: Map<string, Comment> | null = null;

  for (let i = 0; i < bindings.length; i++) {
    const b = bindings[i];
    if (b.kind === 'attr') {
      let onRoot = false;
      if (rootIds !== null) {
        if (rootIds === b.id) {
          onRoot = true;
        } else if (rootIds.indexOf(',') !== -1) {
          rootIdSet ??= new Set(rootIds.split(','));
          onRoot = rootIdSet.has(b.id);
        }
      }
      let el: Element | undefined;
      if (onRoot) {
        el = rowNode;
      } else {
        descIndex ??= indexAttrEls(rowNode, BIND_ATTR_ROW);
        el = descIndex.get(b.id);
      }
      /* c8 ignore next -- defensive: a registered binding always emits its marker into the row. */
      if (el === undefined) continue;
      disposers[i] = attachAttrEffect(el, b.attr, b.signal);
    } else {
      if (textMarkers === null) {
        textMarkers = new Map();
        collectComments(rowNode, ROW_TEXT_PREFIX, textMarkers);
      }
      const marker = textMarkers.get(b.id);
      /* c8 ignore next -- defensive: same invariant as the attr branch. */
      if (marker === undefined) continue;
      disposers[i] = attachTextEffect(marker, b.signal);
    }
  }
  return disposers;
}

/** Dispose a row's binding effects (called when its node leaves the DOM). */
export function disposeRowBindings(disposers: Array<() => void> | undefined): void {
  if (disposers === undefined) return;
  for (const d of disposers) d();
}

/**
 * KF-347 — decide, for a row whose DOM node survives an in-place update,
 * whether the live binding effects can be carried forward or must be
 * re-wired. The old effects closed over the signal INSTANCES captured at the
 * previous render; if this render's bindings reference the same instances
 * per hole (the cache-hit case, and rows binding stable external signals),
 * the old effects remain correct and re-wiring would be wasted work — the
 * select-row hot path stays free. If any hole's instance changed — the
 * typical shape after `arraySignal.update()` swaps the row object and the
 * row re-renders fresh `computed`s closing over the NEW item — the old
 * effects are stale (they'd keep reading the pre-update row), so dispose
 * them and wire the fresh bindings against the surviving node. Marker
 * alignment holds across every in-place route: row-local binding ids are
 * deterministic per render, the surgical fast paths leave marker attrs and
 * comments untouched, and `_morphElement` syncs them.
 *
 * Also covers the from-scratch case (`oldBindings` undefined with fresh
 * `newBindings`): the length mismatch routes to the wire branch, so a
 * replaceChild caller can hand its brand-new node straight here.
 */
export function carryOrRewireRowBindings(
  node: Element,
  oldBindings: Binding[] | undefined,
  oldDisposers: Array<() => void> | undefined,
  newBindings: Binding[] | undefined,
): { bindings: Binding[] | undefined; bindingDisposers: Array<() => void> | undefined } {
  const oldLen = oldBindings === undefined ? 0 : oldBindings.length;
  const newLen = newBindings === undefined ? 0 : newBindings.length;
  if (oldLen === newLen) {
    let same = true;
    for (let i = 0; i < newLen; i++) {
      if ((oldBindings as Binding[])[i].signal !== (newBindings as Binding[])[i].signal) {
        same = false;
        break;
      }
    }
    if (same) return { bindings: oldBindings, bindingDisposers: oldDisposers };
  }
  disposeRowBindings(oldDisposers);
  return {
    bindings: newBindings,
    bindingDisposers: newLen > 0 ? wireRowBindings(node, newBindings as Binding[]) : undefined,
  };
}

/**
 * GLOBAL-scope wiring core. Indexes `data-kfb`-marked elements + `kfb:`
 * comment markers under `scope` by binding id, then attaches an effect per
 * binding. Row-scope wiring lives in `wireRowBindings` (with its own inlined
 * root-attr fast path), so this always operates on the GLOBAL marker names.
 */
function wireInto(
  scope: Element,
  bindings: Binding[],
  disposers: Array<() => void>,
): void {
  const attrEls = indexAttrEls(scope, BIND_ATTR);
  const textMarkers = new Map<string, Comment>();
  collectComments(scope, TEXT_MARKER_PREFIX, textMarkers);

  for (const b of bindings) {
    if (b.kind === 'attr') {
      const el = attrEls.get(b.id);
      /* c8 ignore next -- defensive: a registered binding always emits its marker into `scope`. */
      if (el === undefined) continue;
      disposers.push(attachAttrEffect(el, b.attr, b.signal));
    } else {
      const marker = textMarkers.get(b.id);
      /* c8 ignore next -- defensive: same invariant as the attr branch. */
      if (marker === undefined) continue;
      disposers.push(attachTextEffect(marker, b.signal));
    }
  }
}

/**
 * Index every DESCENDANT element under `scope` carrying `attrName` by binding
 * id. Callers that also need the scope root itself check it separately (row
 * roots via the `rootIds` fast path; global holes are never on the mount root).
 */
function indexAttrEls(scope: Element, attrName: string): Map<string, Element> {
  const map = new Map<string, Element>();
  for (const el of scope.querySelectorAll(`[${attrName}]`)) {
    for (const id of (el.getAttribute(attrName) as string).split(',')) map.set(id, el);
  }
  return map;
}

/** Attach a fine-grained attribute effect; returns its disposer. */
function attachAttrEffect(el: Element, attr: string, signal: Signal<unknown>): () => void {
  return effect(() => setBoundAttr(el, attr, signal.value));
}

/**
 * Tracks the live text node each text-hole marker owns, so RE-wiring a hole
 * (KF-347 — an in-place row update whose binding instances changed) reuses
 * the node it inserted the first time instead of stacking a second one next
 * to it. Keyed on the marker comment: markers persist exactly as long as
 * their row/surround nodes do, so the WeakMap entries die with them.
 */
const insertedTextNodes = new WeakMap<Comment, Text>();

/**
 * Bind a live text node after `marker` to `signal`; returns the effect
 * disposer. Reuses the marker's previously-inserted node when it is still
 * exactly where we put it (`marker.nextSibling`) — a rewire then just
 * retargets the write, preserving node identity. Anything else (fresh parse,
 * node removed by a morph) inserts anew. The reuse check is deliberately
 * position-strict so a static text node that legitimately follows the marker
 * in template output can never be hijacked: static content sits at
 * `nextSibling` only until the FIRST wiring inserts our node in front of it.
 */
function attachTextEffect(marker: Comment, signal: Signal<unknown>): () => void {
  let text = insertedTextNodes.get(marker);
  if (text === undefined || marker.nextSibling !== text) {
    text = (marker.ownerDocument as Document).createTextNode('');
    (marker.parentNode as Node).insertBefore(text, marker.nextSibling);
    insertedTextNodes.set(marker, text);
  }
  const node = text;
  return effect(() => { node.data = coerceText(signal.value); });
}

/**
 * Apply a bound value to a live attribute, mirroring the JSX runtime's
 * `renderAttr` rules: boolean/nullish toggling, `SafeHtml` (raw()) unwrapping,
 * and the KF-297 URL-screening that drops `javascript:` / `vbscript:` /
 * `data:text/html` on `href`/`src`/`formaction`/`action`/`xlink:href`.
 *
 * Unlike `renderAttr` (which builds an HTML string, so escapes with
 * `escapeAttr`), this writes the RAW value via `setAttribute` — the DOM stores
 * attribute values verbatim, so no HTML-escaping is applied here.
 *
 * The attribute NAME is trusted here: `on*` and malformed names are rejected at
 * binding-registration time in the JSX runtime's `jsx()` signal branch (shared
 * `assertEmittableAttrName`, KF-322), so `setAttribute('onclick', …)` — which
 * would install a live inline handler — can never reach this writer.
 */
function setBoundAttr(el: Element, name: string, value: unknown): void {
  // KF-335: every attribute write below also syncs the matching form-state
  // property (checked/value/selected) — after user interaction the dirty flag
  // detaches the property from the attribute, so an attribute-only write
  // leaves the visible state stale. `syncFormProp` no-ops for other names.
  if (value == null || value === false) {
    el.removeAttribute(name);
    syncFormProp(el, name, '', false);
    return;
  }
  if (value === true) {
    el.setAttribute(name, '');
    syncFormProp(el, name, '', true);
    return;
  }
  // SafeHtml (raw()) is the documented opt-out — bypasses URL screening and is
  // written verbatim, matching renderAttr's SafeHtml branch.
  if (isSafeHtmlValue(value)) {
    el.setAttribute(name, value.__html);
    syncFormProp(el, name, value.__html, true);
    return;
  }
  const str = String(value);
  if (isDangerousUrlValue(name, str)) {
    // KF-340: throw in dev (fail loudly), warn+drop in prod.
    reportDangerousUrl('kerf binding', name, str);
    el.removeAttribute(name);
    return;
  }
  el.setAttribute(name, str);
  syncFormProp(el, name, str, true);
}

// Cross-bundle SafeHtml brand check (mirrors jsx-runtime's `isSafeHtml`).
// Duplicated here — rather than importing `isSafeHtml` from jsx-runtime — to
// keep the bindings ← jsx-runtime dependency acyclic. `Symbol.for` makes it
// recognize SafeHtml instances from any copy of the module.
const SAFE_HTML_BRAND = Symbol.for('kerfjs.SafeHtml');
function isSafeHtmlValue(v: unknown): v is { __html: string } {
  return typeof v === 'object' && v !== null
    && (v as Record<symbol, unknown>)[SAFE_HTML_BRAND] === true;
}

/** Coerce a bound text value: nullish + boolean render nothing (React-style). */
function coerceText(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  return String(value);
}

/**
 * Collect comment markers with the given prefix under `node`, keyed by id.
 * Hand-rolled recursion (same as `mount.ts`'s comment walker) because
 * happy-dom's `TreeWalker` does not surface comment nodes.
 */
function collectComments(node: Node, prefix: string, out: Map<string, Comment>): void {
  for (let c: Node | null = node.firstChild; c !== null; c = c.nextSibling) {
    if (c.nodeType === Node.COMMENT_NODE) {
      const data = (c as Comment).data;
      if (data.startsWith(prefix)) out.set(data.slice(prefix.length), c as Comment);
    } else if (c.nodeType === Node.ELEMENT_NODE) {
      collectComments(c, prefix, out);
    }
  }
}

// Re-exported so the JSX runtime imports signal-detection + binding
// registration from one place.
export { isSignal };
