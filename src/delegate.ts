/**
 * Tiny event-delegation helpers. Replace per-element `addEventListener` calls
 * (which don't survive morph re-renders for nodes the diff creates) with one
 * listener at the morph-root that dispatches via `closest()`.
 *
 * Three-tier listener model:
 *
 *   - Tier 1 (bubbling events) — use `delegate()`.
 *     click, input, change, submit, mousedown/up, keydown/up, pointerdown/up/move,
 *     drag*, drop, contextmenu, wheel, copy/paste/cut, focusin/focusout.
 *
 *     `delegate()` also auto-promotes the well-known non-bubbling event
 *     types (`focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`,
 *     `mouseleave`) to the capture phase under the hood, so the call site
 *     looks identical for "interactive thing happens on a descendant"
 *     regardless of whether that event bubbles. Selector matching stays
 *     `closest()`-style — the same as for bubbling events — so a wrapper
 *     selector like `'.field-row'` still matches when the event fires on
 *     a descendant `<input>`.
 *
 *   - Tier 2 (explicit capture) — use `delegateCapture()`.
 *     The escape hatch for cases the auto-promotion list doesn't cover
 *     (custom non-bubbling events) or when you want capture-phase
 *     interception. Selector matching is `closest()`-style by default —
 *     the same walk-up as `delegate()`, and it passes the matched ancestor
 *     (not the raw target) to the handler — so a click on any descendant of
 *     the selected element climbs to it. Pass `{ match: 'direct' }` to opt
 *     into strict `matches()`-style matching (fire only when the event lands
 *     on the exact element the selector identifies).
 *
 *   - Tier 3 (per-element instances / library-owned subtrees) — mark the
 *     host element with `data-morph-skip` and manage the library's
 *     lifecycle directly. No delegation helper applies.
 */

import { devHooks } from './dev-hooks.js';

/**
 * Event types that don't bubble and so wouldn't reach a root-level
 * bubble-phase listener. `delegate()` flips to capture for these; the
 * caller doesn't need to know or care.
 *
 * Membership is conservative — it covers the cases that "should obviously
 * work" with delegate() but otherwise don't. For exotic non-bubbling events
 * (custom events, less-common DOM events) the explicit `delegateCapture()`
 * remains the escape hatch.
 */
export const NON_BUBBLING = new Set<string>([
  'focus',
  'blur',
  'scroll',
  'load',
  'error',
  'mouseenter',
  'mouseleave',
]);

/**
 * How the selector is matched against the event's target:
 *
 *   - `'closest'` (the default for both helpers) — walk UP from `event.target`
 *     via `closest(selector)`, firing for the nearest matching ancestor inside
 *     `rootEl`. This is the delegation behavior you almost always want: a click
 *     on an icon inside a button fires the button's handler.
 *   - `'direct'` — strict `matches()` match: fire only when `event.target`
 *     itself matches the selector, with no walk-up.
 */
export interface DelegateOptions {
  match?: 'closest' | 'direct';
}

/**
 * Validate a CSS selector at registration time, so a typo throws immediately
 * with the bad selector quoted instead of producing a cryptic DOMException
 * the first time a matching event fires.
 */
function assertValidSelector(selector: string, fn: string): void {
  try {
    document.createElement('div').matches(selector);
  } catch {
    throw new Error(
      `${fn}: invalid selector "${selector}". ` +
        "Pass a valid CSS selector (e.g. '[data-action=\"add\"]', '.btn', 'input').",
    );
  }
}

/**
 * Per-root registry of the delegates installed on that root, and the per-event
 * dispatch snapshot. Both live ON the DOM objects, under one symbol key (a
 * root and an event are never the same object), rather than in module-level
 * maps — so they are collected with the root / event and add no module-level
 * mutable state (Design rule 5).
 */
const KEY = Symbol();

/**
 * Resolves one delegate's selector against an event's target: the bound
 * handler call for a match, `undefined` otherwise.
 */
type Resolve = (event: Event) => (() => void) | undefined;

interface Registered {
  [KEY]?: Set<Resolve>;
}

interface Snapshotted {
  [KEY]?: Map<Resolve, (() => void) | undefined>;
}

/**
 * Install one root-level delegate — the shared core of `delegate()`,
 * `delegateCapture()`, and `kerfjs/actions`' `delegateActions()`.
 *
 * The listener resolves the event's target to a matched element (walk-up
 * `closest()` or strict `matches()`, per `options.match`) that must lie inside
 * `rootEl`, then runs the call `bind(event, matched)` prepared. `bind` runs at
 * RESOLUTION time, so a caller can read matched-element state there (such as
 * `delegateActions`' action attribute) before any handler has mutated it.
 *
 * **Dispatch snapshot.** A handler that writes a signal makes `mount()` morph
 * synchronously, inside the same dispatch, and the morph can recycle the
 * clicked element in place into a control with a different selector identity
 * (same tag, same position, new `data-action`). Resolving later delegates
 * against that live DOM would fire one the user never clicked — typically one
 * that immediately undoes the first handler's state change. So the FIRST kerf
 * delegate listener to see an event resolves every kerf delegate on the
 * event's propagation path (fixed at dispatch start, per the DOM spec, and
 * listed by `composedPath()`) before any delegated handler runs, and stores
 * the results on the event; each listener then consumes its own entry. The
 * set of delegates an event reaches is fixed when it starts dispatching, like
 * per-element listeners. The matched element must also still be inside
 * `rootEl` when the listener runs: a handler that removed the target still
 * suppresses the later delegates, as before.
 *
 * A missing entry (a re-dispatch of the same event object, a delegate added
 * mid-dispatch, or a root hidden from the first listener by a closed shadow
 * boundary) takes a fresh snapshot. Accepted residuals: a same-path
 * re-dispatch after a stopped dispatch can reuse an unconsumed entry if all
 * earlier kerf listeners were disposed, and a closed shadow boundary can
 * hide delegates from the first listener's path view. See docs/5 §5.2.1.
 * Internal — exported for `kerfjs/actions`.
 */
export function _delegate(
  rootEl: HTMLElement,
  type: string,
  selector: string,
  bind: (event: Event, matched: Element) => () => void,
  options: DelegateOptions | undefined,
  capture: boolean,
  fn: 'delegate' | 'delegateCapture',
): () => void {
  assertValidSelector(selector, fn);
  devHooks.delegateInEffect?.(fn);
  const direct = options?.match === 'direct';
  const resolve: Resolve = (event) => {
    const target = event.target;
    if (event.type === type && target instanceof Element) {
      const matched = direct
        ? target.matches(selector)
          ? target
          : null
        : target.closest(selector);
      if (matched !== null) {
        const run = bind(event, matched);
        // Checked when the handler would run, not at resolution: a match
        // outside `rootEl` never fires, and neither does one an earlier
        // handler removed from `rootEl`.
        return () => {
          if (rootEl.contains(matched)) run();
        };
      }
    }
    return undefined;
  };
  const listener = (event: Event): void => {
    let snap = (event as Snapshotted)[KEY];
    if (!snap?.has(resolve)) {
      snap = (event as Snapshotted)[KEY] = new Map();
      for (const node of event.composedPath()) {
        for (const other of (node as Registered)[KEY] ?? []) {
          snap.set(other, other(event));
        }
      }
    }
    const run = snap.get(resolve);
    snap.delete(resolve);
    run?.();
  };
  const registry = ((rootEl as Registered)[KEY] ??= new Set()).add(resolve);
  rootEl.addEventListener(type, listener, capture);
  return () => {
    registry.delete(resolve);
    rootEl.removeEventListener(type, listener, capture);
  };
}

/**
 * Delegation that "just works" for both bubbling and the common non-bubbling
 * events. Installs ONE listener on `rootEl`; for known non-bubblers (see
 * `NON_BUBBLING` above) the listener is registered on the capture phase so
 * it actually reaches the target, otherwise on the bubble phase. Either way,
 * matching walks up from `event.target` via `closest(selector)` and fires
 * `handler(event, matched)` if the match is inside `rootEl`.
 *
 * Pass `{ match: 'direct' }` to fire only when `event.target` itself matches
 * the selector (no walk-up); the default is `'closest'`.
 *
 * The generic `T` narrows the second handler argument to the expected element
 * type — `delegate<HTMLButtonElement>(root, 'click', 'button', (e, btn) => btn.value)`
 * — so consumers can avoid casts. Defaults to `Element` for untyped calls.
 *
 * Returns a disposer that removes the listener.
 *
 * Usage (pseudo-code — see examples for live ones):
 *   delegate(rootEl, 'click', '[data-action="add"]', handlerFn);
 *   delegate(rootEl, 'focus', 'input',                handlerFn); // auto-capture
 */
export function delegate<T extends Element = Element>(
  rootEl: HTMLElement,
  type: string,
  selector: string,
  handler: (event: Event, target: T) => void,
  options?: DelegateOptions,
): () => void {
  return _delegate(
    rootEl,
    type,
    selector,
    (event, matched) => () => handler(event, matched as T),
    options,
    NON_BUBBLING.has(type),
    'delegate',
  );
}

/**
 * Capture-phase delegation — the escape hatch for custom non-bubbling events
 * (ones `delegate()`'s auto-promotion list doesn't know about) and for
 * capture-phase interception (run before any descendant's bubble-phase
 * handler). Reaches descendants of `rootEl` that match `selector` regardless
 * of how many times the diff has rebuilt them.
 *
 * Selector matching is `closest()`-style by default — the same walk-up as
 * `delegate()`, and it passes the matched ancestor (not the raw target) to
 * the handler — so a click on any descendant of the selected element climbs
 * to it. Pass `{ match: 'direct' }` to opt into strict `matches()`-style
 * matching (fire only when the event lands on the exact element the selector
 * identifies, with no walk-up).
 *
 * The generic `T` narrows the second handler argument to the expected element
 * type, mirroring `delegate<T>()`. Defaults to `Element` for untyped calls.
 *
 * Usage (pseudo-code — see examples for live ones):
 *   delegateCapture(rootEl, 'focus', 'input, textarea', handlerFn);
 *   delegateCapture(rootEl, 'click', '.exact', handlerFn, { match: 'direct' });
 */
export function delegateCapture<T extends Element = Element>(
  rootEl: HTMLElement,
  type: string,
  selector: string,
  handler: (event: Event, target: T) => void,
  options?: DelegateOptions,
): () => void {
  return _delegate(
    rootEl,
    type,
    selector,
    (event, matched) => () => handler(event, matched as T),
    options,
    true,
    'delegateCapture',
  );
}
