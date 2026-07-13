/**
 * Fine-grained signal bindings (KF-294 spike).
 *
 * When a `Signal` is interpolated straight into a JSX attribute
 * (`class={sig}`) or a text child (`{sig}`) INSIDE a `mount()` render, the
 * JSX runtime stops stringifying it. Instead it emits a marker into the HTML
 * string and records a binding here; after `mount()` parses the string to
 * DOM, `wireBindings()` attaches one `effect` per binding that writes straight
 * to the live node. A later change to that signal then updates the node
 * WITHOUT re-running the render function or walking the list reconciler — the
 * coarse `mount()` effect never subscribed to the signal, because `render()`
 * never read its `.value`.
 *
 * This is the same "emit marker in string, wire up after parse" mechanism the
 * keyed-list reconciler already uses for `<!--kf-list:{id}-->` markers.
 *
 * Two marker shapes:
 *   - attribute: a `data-kfb="a0,a3"` marker attribute on the element,
 *     listing the binding ids whose attributes this element owns.
 *   - text:      a `<!--kfb:t2-->` comment node at the interpolation point;
 *     wiring inserts a live text node right after it.
 *
 * Outside a `mount()` render (SSR / `SafeHtml.toString()`) there is no active
 * binding context: the runtime falls back to reading `signal.value` and
 * stringifying it (a static snapshot), so server output is correct and
 * marker-free, and legacy `.toString()` callers are unaffected.
 *
 * Module-level mutable state note: `context` here is a third sanctioned
 * module-level mutable reference (alongside `store.ts:REGISTRY` and
 * `each.ts:context`). It holds the current render's binding sink and is set /
 * cleared by `mount()` around each `render()` call, exactly like the each()
 * render context. Everything else flows through arguments.
 */

import { effect, isSignal, type Signal } from './reactive.js';

/** Marker attribute listing the binding ids whose attrs an element owns. */
export const BIND_ATTR = 'data-kfb';
/** Comment-marker prefix for a text-position binding: `<!--kfb:{id}-->`. */
export const TEXT_MARKER_PREFIX = 'kfb:';

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
type Binding = AttrBinding | TextBinding;

/**
 * Per-render binding sink. `counter` assigns stable ids by registration order
 * (like the each() list-id counter, ids are stable across renders because the
 * JSX render is deterministic). `list` accumulates this render's bindings.
 * `suppressed` is toggled true by `each()` around row renders so signals
 * inside list rows fall back to the snapshot path in this spike (the list-row
 * integration is a follow-up — see KF-294 friction #3).
 */
export interface BindingContext {
  counter: number;
  list: Binding[];
  suppressed: boolean;
}

let context: BindingContext | null = null;

export function newBindingContext(): BindingContext {
  return { counter: 0, list: [], suppressed: false };
}

export function _setBindingContext(c: BindingContext | null): void {
  context = c;
}

/**
 * True when the JSX runtime should emit a binding marker for a signal it sees
 * (a mount render is active and row-render suppression is off). False for
 * SSR / `.toString()` and inside `each()` rows, where signals snapshot their
 * current value instead.
 */
export function bindingsEnabled(): boolean {
  return context !== null && !context.suppressed;
}

/**
 * Toggle row-render suppression, returning the prior value so the caller can
 * restore it (supports nested `each()`). No-op when no context is active.
 */
export function _setBindingsSuppressed(v: boolean): boolean {
  if (context === null) return false;
  const prev = context.suppressed;
  context.suppressed = v;
  return prev;
}

/** Register an attribute binding; returns its marker id. Caller pre-checks `bindingsEnabled()`. */
export function registerAttrBinding(attr: string, signal: Signal<unknown>): string {
  const c = context as BindingContext;
  const id = `a${c.counter++}`;
  c.list.push({ kind: 'attr', id, attr, signal });
  return id;
}

/** Register a text binding; returns its marker id. Caller pre-checks `bindingsEnabled()`. */
export function registerTextBinding(signal: Signal<unknown>): string {
  const c = context as BindingContext;
  const id = `t${c.counter++}`;
  c.list.push({ kind: 'text', id, signal });
  return id;
}

/**
 * Wire this render's bindings against the freshly-built live DOM. Disposes
 * `prevDisposers` first (a surrounds-changed morph strips bound attrs and
 * removes inserted text nodes, so we re-establish them from scratch), then
 * creates one `effect` per binding whose node is present. Returns the new
 * disposer list for the caller to hold and tear down on unmount.
 *
 * Zero-cost for renders with no bindings: returns immediately.
 */
export function wireBindings(
  rootEl: Element,
  ctx: BindingContext,
  prevDisposers: Array<() => void>,
): Array<() => void> {
  for (const d of prevDisposers) d();
  if (ctx.list.length === 0) return [];

  // Index attr-marked elements + text markers by binding id in one pass each.
  const attrEls = new Map<string, Element>();
  for (const el of rootEl.querySelectorAll(`[${BIND_ATTR}]`)) {
    for (const id of (el.getAttribute(BIND_ATTR) as string).split(',')) {
      attrEls.set(id, el);
    }
  }
  const textMarkers = new Map<string, Comment>();
  collectBindComments(rootEl, textMarkers);

  const disposers: Array<() => void> = [];
  for (const b of ctx.list) {
    if (b.kind === 'attr') {
      const el = attrEls.get(b.id);
      // Defensive: a registered binding always emits its `data-kfb` marker
      // into rootEl, so the element is present by construction. This guards a
      // future path where a bound hole lives in un-mounted/suppressed content.
      /* c8 ignore next */
      if (el === undefined) continue;
      disposers.push(effect(() => setBoundAttr(el, b.attr, b.signal.value)));
    } else {
      const marker = textMarkers.get(b.id);
      // Defensive: same invariant as the attr branch — the comment marker is
      // always parsed into rootEl for a registered text binding.
      /* c8 ignore next */
      if (marker === undefined) continue;
      const parent = marker.parentNode as Node;
      const text = (marker.ownerDocument as Document).createTextNode('');
      parent.insertBefore(text, marker.nextSibling);
      disposers.push(effect(() => { text.data = coerceText(b.signal.value); }));
    }
  }
  return disposers;
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

/** Collect `<!--kfb:{id}-->` comment markers into `out`, keyed by id. */
function collectBindComments(node: Node, out: Map<string, Comment>): void {
  for (let c: Node | null = node.firstChild; c !== null; c = c.nextSibling) {
    if (c.nodeType === Node.COMMENT_NODE) {
      const data = (c as Comment).data;
      if (data.startsWith(TEXT_MARKER_PREFIX)) {
        out.set(data.slice(TEXT_MARKER_PREFIX.length), c as Comment);
      }
    } else if (c.nodeType === Node.ELEMENT_NODE) {
      collectBindComments(c, out);
    }
  }
}

// `isSignal` is re-exported here so the JSX runtime imports its signal-detection
// and its binding registration from one place.
export { isSignal };
