/**
 * Tiny event-delegation helpers. Replace per-element `addEventListener` calls
 * (which don't survive morph re-renders for nodes morphdom creates) with one
 * listener at the morph-root that dispatches via `closest()`.
 *
 * Three-tier listener model:
 *
 *   - Tier 1 (bubbling events) — use `delegate()`.
 *     click, input, change, submit, keydown/keyup, pointer*, drag*, drop,
 *     contextmenu, wheel, copy/paste/cut.
 *
 *   - Tier 2 (non-bubbling events: focus / blur / scroll / load / error) —
 *     use `delegateCapture()`. The capture phase fires on the way down from
 *     the root to the target, so a root-level listener with `capture: true`
 *     reaches events that wouldn't bubble back up.
 *
 *   - Tier 3 (per-element instances / library-owned subtrees) — mark the
 *     host element with `data-morph-skip` and manage the library's
 *     lifecycle directly. No delegation helper applies.
 */

type Handler = (event: Event, target: Element) => void;

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
 * Bubble-phase delegation. Installs ONE listener on `rootEl` for the given
 * event type. When the event fires, walks up from `event.target` to the root
 * looking for an element matching `selector`; if found, fires `handler` with
 * the matched element as the second arg.
 *
 * Returns a disposer that removes the listener.
 *
 * Usage (pseudo-code — see examples for live ones):
 *   delegate(rootEl, 'click', '[data-action="add"]', handlerFn);
 */
export function delegate(
  rootEl: HTMLElement,
  type: string,
  selector: string,
  handler: Handler,
): () => void {
  assertValidSelector(selector, 'delegate');
  const listener = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const matched = target.closest(selector);
    if (matched !== null && rootEl.contains(matched)) {
      handler(event, matched);
    }
  };
  rootEl.addEventListener(type, listener);
  return () => {
    rootEl.removeEventListener(type, listener);
  };
}

/**
 * Capture-phase delegation — for non-bubbling events (`focus`, `blur`,
 * `scroll`, `load`, `error`). Reaches descendants of `rootEl` that match
 * `selector` regardless of how many times morphdom has rebuilt them.
 *
 * Usage (pseudo-code — see examples for live ones):
 *   delegateCapture(rootEl, 'focus', 'input, textarea', handlerFn);
 */
export function delegateCapture(
  rootEl: HTMLElement,
  type: string,
  selector: string,
  handler: Handler,
): () => void {
  assertValidSelector(selector, 'delegateCapture');
  const listener = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches(selector) && rootEl.contains(target)) {
      handler(event, target);
    }
  };
  rootEl.addEventListener(type, listener, true);
  return () => {
    rootEl.removeEventListener(type, listener, true);
  };
}
