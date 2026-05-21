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
 *     The escape hatch for cases the auto-promotion list doesn't cover, or
 *     when you want capture-phase semantics and direct `matches()`-style
 *     selector matching (no walk-up).
 *
 *   - Tier 3 (per-element instances / library-owned subtrees) — mark the
 *     host element with `data-morph-skip` and manage the library's
 *     lifecycle directly. No delegation helper applies.
 */

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
 * Delegation that "just works" for both bubbling and the common non-bubbling
 * events. Installs ONE listener on `rootEl`; for known non-bubblers (see
 * `NON_BUBBLING` above) the listener is registered on the capture phase so
 * it actually reaches the target, otherwise on the bubble phase. Either way,
 * matching walks up from `event.target` via `closest(selector)` and fires
 * `handler(event, matched)` if the match is inside `rootEl`.
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
): () => void {
  assertValidSelector(selector, 'delegate');
  const listener = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const matched = target.closest(selector);
    if (matched !== null && rootEl.contains(matched)) {
      handler(event, matched as T);
    }
  };
  const capture = NON_BUBBLING.has(type);
  rootEl.addEventListener(type, listener, capture);
  return () => {
    rootEl.removeEventListener(type, listener, capture);
  };
}

/**
 * Capture-phase delegation — for non-bubbling events (`focus`, `blur`,
 * `scroll`, `load`, `error`). Reaches descendants of `rootEl` that match
 * `selector` regardless of how many times the diff has rebuilt them.
 *
 * The generic `T` narrows the second handler argument to the expected element
 * type, mirroring `delegate<T>()`. Defaults to `Element` for untyped calls.
 *
 * Usage (pseudo-code — see examples for live ones):
 *   delegateCapture(rootEl, 'focus', 'input, textarea', handlerFn);
 */
export function delegateCapture<T extends Element = Element>(
  rootEl: HTMLElement,
  type: string,
  selector: string,
  handler: (event: Event, target: T) => void,
): () => void {
  assertValidSelector(selector, 'delegateCapture');
  const listener = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches(selector) && rootEl.contains(target)) {
      handler(event, target as T);
    }
  };
  rootEl.addEventListener(type, listener, true);
  return () => {
    rootEl.removeEventListener(type, listener, true);
  };
}
