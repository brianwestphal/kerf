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

import { warnIfInsideEffect } from './dev-delegate-warn.js';

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
const NON_BUBBLING = new Set<string>([
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
      `${fn}: invalid selector "${selector}". `
      + 'Pass a valid CSS selector (e.g. \'[data-action="add"]\', \'.btn\', \'input\').',
    );
  }
}

/**
 * Build the shared root-level listener used by both helpers. Resolves the
 * event's target to a matched element (walk-up `closest()` or strict
 * `matches()`, per `match`), requires the match to be inside `rootEl`, then
 * fires `handler(event, matched)`.
 */
function makeListener<T extends Element>(
  rootEl: HTMLElement,
  selector: string,
  handler: (event: Event, target: T) => void,
  match: 'closest' | 'direct',
): (event: Event) => void {
  return (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const matched = match === 'direct'
      ? (target.matches(selector) ? target : null)
      : target.closest(selector);
    if (matched !== null && rootEl.contains(matched)) {
      handler(event, matched as T);
    }
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
  assertValidSelector(selector, 'delegate');
  warnIfInsideEffect('delegate');
  const listener = makeListener(rootEl, selector, handler, options?.match ?? 'closest');
  const capture = NON_BUBBLING.has(type);
  rootEl.addEventListener(type, listener, capture);
  return () => {
    rootEl.removeEventListener(type, listener, capture);
  };
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
  assertValidSelector(selector, 'delegateCapture');
  warnIfInsideEffect('delegateCapture');
  const listener = makeListener(rootEl, selector, handler, options?.match ?? 'closest');
  rootEl.addEventListener(type, listener, true);
  return () => {
    rootEl.removeEventListener(type, listener, true);
  };
}
