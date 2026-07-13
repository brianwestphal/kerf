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
 * Module-level mutable state note: `context` / `rowSink` here are a third
 * sanctioned module-level mutable location (alongside `store.ts:REGISTRY` and
 * `each.ts:context`). They hold the current render's binding sinks and are set
 * / cleared by `mount()` and `each()` around the render calls.
 */

import { effect, isSignal, type Signal } from './reactive.js';

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

/** What `bindAttr()` returns so the JSX runtime knows which marker attr to emit. */
export interface AttrMarker {
  id: string;
  markerAttr: string;
}

/**
 * Per-render GLOBAL binding sink. `counter` assigns ids by registration order
 * (stable across renders since the JSX render is deterministic); `list`
 * accumulates this render's global holes; `suppressed` is set by the granular
 * (`arraySignal`) `each()` path, which snapshots row signals in this spike.
 */
export interface BindingContext {
  counter: number;
  list: Binding[];
  suppressed: boolean;
}

let context: BindingContext | null = null;

// Active row-capture sink + its row-local id counter. Non-null only while
// `each()` renders a single row through `captureRowBindings()`.
let rowSink: Binding[] | null = null;
let rowCounter = 0;

const NO_DISPOSERS: Array<() => void> = [];

export function newBindingContext(): BindingContext {
  return { counter: 0, list: [], suppressed: false };
}

export function _setBindingContext(c: BindingContext | null): void {
  context = c;
}

/**
 * Toggle GLOBAL-scope suppression (used by the granular `each()` path so its
 * row signals snapshot for now). Returns the prior value for restore. No-op
 * when no context is active.
 */
export function _setBindingsSuppressed(v: boolean): boolean {
  /* c8 ignore next -- defensive: only called from each() inside an active mount context. */
  if (context === null) return false;
  const prev = context.suppressed;
  context.suppressed = v;
  return prev;
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
 * active, else the global context (unless suppressed). Returns the marker id +
 * which marker attribute the JSX runtime should emit, or null to snapshot.
 */
export function bindAttr(attr: string, signal: Signal<unknown>): AttrMarker | null {
  if (rowSink !== null) {
    const id = `a${rowCounter++}`;
    rowSink.push({ kind: 'attr', id, attr, signal });
    return { id, markerAttr: BIND_ATTR_ROW };
  }
  if (context !== null && !context.suppressed) {
    const id = `a${context.counter++}`;
    context.list.push({ kind: 'attr', id, attr, signal });
    return { id, markerAttr: BIND_ATTR };
  }
  return null;
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
  if (context !== null && !context.suppressed) {
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
  prevDisposers: Array<() => void>,
): Array<() => void> {
  for (const d of prevDisposers) d();
  if (ctx.list.length === 0) return NO_DISPOSERS;
  const disposers: Array<() => void> = [];
  wireInto(rootEl, false, BIND_ATTR, TEXT_MARKER_PREFIX, ctx.list, disposers);
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
  const disposers: Array<() => void> = [];
  wireInto(rowNode, true, BIND_ATTR_ROW, ROW_TEXT_PREFIX, bindings, disposers);
  return disposers;
}

/** Dispose a row's binding effects (called when its node leaves the DOM). */
export function disposeRowBindings(disposers: Array<() => void> | undefined): void {
  if (disposers === undefined) return;
  for (const d of disposers) d();
}

/**
 * Shared wiring core. Indexes marked elements + comment markers under `scope`
 * by binding id, then attaches an effect per binding. `includeRoot` also
 * indexes `scope` itself (row roots carry their own marker).
 */
function wireInto(
  scope: Element,
  includeRoot: boolean,
  attrName: string,
  textPrefix: string,
  bindings: Binding[],
  disposers: Array<() => void>,
): void {
  const attrEls = new Map<string, Element>();
  if (includeRoot && scope.hasAttribute(attrName)) {
    for (const id of (scope.getAttribute(attrName) as string).split(',')) attrEls.set(id, scope);
  }
  for (const el of scope.querySelectorAll(`[${attrName}]`)) {
    for (const id of (el.getAttribute(attrName) as string).split(',')) attrEls.set(id, el);
  }
  const textMarkers = new Map<string, Comment>();
  collectComments(scope, textPrefix, textMarkers);

  for (const b of bindings) {
    if (b.kind === 'attr') {
      const el = attrEls.get(b.id);
      /* c8 ignore next -- defensive: a registered binding always emits its marker into `scope`. */
      if (el === undefined) continue;
      disposers.push(effect(() => setBoundAttr(el, b.attr, b.signal.value)));
    } else {
      const marker = textMarkers.get(b.id);
      /* c8 ignore next -- defensive: same invariant as the attr branch. */
      if (marker === undefined) continue;
      const parent = marker.parentNode as Node;
      const text = (marker.ownerDocument as Document).createTextNode('');
      parent.insertBefore(text, marker.nextSibling);
      disposers.push(effect(() => { text.data = coerceText(b.signal.value); }));
    }
  }
}

/**
 * Apply a bound value to a live attribute, mirroring the JSX runtime's
 * boolean/nullish attribute rules. Spike scope: string/number/boolean values
 * (the common `class`/`aria-*`/`disabled` cases). URL screening and
 * `SafeHtml` attr values are deferred follow-ups.
 */
function setBoundAttr(el: Element, name: string, value: unknown): void {
  if (value == null || value === false) {
    el.removeAttribute(name);
    return;
  }
  if (value === true) {
    el.setAttribute(name, '');
    return;
  }
  el.setAttribute(name, String(value));
}

/** Coerce a bound text value: nullish + boolean render nothing (React-style). */
function coerceText(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  return String(value);
}

/** Collect comment markers with the given prefix under `node`, keyed by id. */
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
