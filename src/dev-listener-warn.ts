/**
 * Dev-mode warning for Rule 4 violations (KF-174). When the opt-in env var
 * `KERF_DEV_WARN_REBUILT_LISTENERS=1` is set in a non-production build,
 * `mount()` calls `installListenerRebuildWarn()` to set up two things:
 *
 *   1. A global one-time monkey-patch on `EventTarget.prototype.addEventListener`
 *      that marks the `Element` receiver with a `Symbol.for("kerfjs.devListener")`
 *      flag. The patch is idempotent across mounts.
 *
 *   2. A `MutationObserver` on the mount root, scoped to `{ childList: true,
 *      subtree: true }`. When a removed Element (or any descendant of a
 *      removed subtree) carries the marker, the observer emits a one-shot
 *      `console.warn` pointing at `delegate()` and `data-morph-skip` as the
 *      canonical fixes.
 *
 * Why opt-in: the heuristic catches every imperative `addEventListener` whose
 * receiver is later removed from the live tree, including some legitimate
 * patterns (custom elements that attach listeners in their constructor,
 * third-party widgets the user forgot to wrap in `data-morph-skip`, library
 * teardown code that detaches a node it owns). The warning is opt-in so
 * existing projects aren't surprised; CI / dev environments that want the
 * diagnostic enable the env var.
 *
 * The MutationObserver delivers mutations asynchronously (microtask after the
 * morph), so the warning fires AFTER the bad re-render rather than at the
 * call to `addEventListener`. That's why the diagnostic-error audit scores
 * Rule 4 at 2 with the opt-in (not 3) — the model sees the warning paired
 * with the broken listener, not at the read site.
 *
 * Production behavior is unchanged for zero runtime cost.
 */

import { isDevMode } from './utils/devMode.js';

const LISTENER_MARKER = Symbol.for('kerfjs.devListener');

let patched = false;
let warned = false;

function isOptedIn(): boolean {
  if (!isDevMode()) return false;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.KERF_DEV_WARN_REBUILT_LISTENERS === '1';
}

type ElementProto = { addEventListener: (type: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) => void };

function findAddEventListenerProto(): ElementProto {
  // Walk a probe Element's prototype chain to find the prototype that
  // actually owns `addEventListener`. In real browsers this is
  // `EventTarget.prototype`; in test environments (happy-dom) the realm's
  // EventTarget can differ from `globalThis.EventTarget`, so we have to
  // resolve via a live DOM node rather than the global symbol. Every Element
  // extends EventTarget which owns `addEventListener`, so the walk always
  // succeeds before falling off the end of the chain.
  const probe = document.createElement('div');
  let proto: object = Object.getPrototypeOf(probe) as object;
  while (!Object.prototype.hasOwnProperty.call(proto, 'addEventListener')) {
    proto = Object.getPrototypeOf(proto) as object;
  }
  return proto as unknown as ElementProto;
}

function patchAddEventListenerOnce(): void {
  if (patched) return;
  patched = true;
  const proto = findAddEventListenerProto();
  const orig = proto.addEventListener;
  proto.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    // Only mark Element receivers — Document, Window, AbortSignal etc. are
    // valid addEventListener receivers but are never in a mount tree.
    if (this instanceof Element) {
      (this as unknown as Record<symbol, boolean>)[LISTENER_MARKER] = true;
    }
    return orig.call(this, type, listener, options);
  };
}

function hasMarkedListener(el: Element): boolean {
  if ((el as unknown as Record<symbol, boolean>)[LISTENER_MARKER] === true) return true;
  // Walk descendants — when the morph removes a whole subtree, only the root
  // appears in the MutationRecord's removedNodes; an imperative listener on a
  // grandchild would otherwise be invisible.
  const stack: Element[] = [];
  for (let i = 0; i < el.children.length; i++) stack.push(el.children[i]);
  while (stack.length > 0) {
    const cur = stack.pop() as Element;
    if ((cur as unknown as Record<symbol, boolean>)[LISTENER_MARKER] === true) return true;
    for (let i = 0; i < cur.children.length; i++) stack.push(cur.children[i]);
  }
  return false;
}

function emitWarning(): void {
  /* c8 ignore next — paired with the observer's own one-shot check; doubly-guards against re-entry under engines that batch mutations across microtasks */
  if (warned) return;
  warned = true;
  console.warn(
    'kerf: a node inside a mount()-managed tree was removed/rebuilt while carrying an imperative addEventListener listener. '
    + 'The listener is gone with the old node. Use `delegate(rootEl, \'click\', \'[data-action="..."]\', handler)` '
    + 'so the listener lives on a stable ancestor and survives re-renders, or wrap the host in `data-morph-skip` if '
    + 'the subtree is library-owned (Monaco, xterm, D3 charts). '
    + 'Set KERF_DEV_WARN_REBUILT_LISTENERS=0 (or unset it) to silence this warning.',
  );
}

export function installListenerRebuildWarn(rootEl: Element): MutationObserver | null {
  if (!isOptedIn()) return null;
  patchAddEventListenerOnce();
  const observer = new MutationObserver((mutations) => {
    if (warned) return;
    for (const m of mutations) {
      for (let i = 0; i < m.removedNodes.length; i++) {
        const removed = m.removedNodes[i];
        /* c8 ignore next — text/comment-node removals from morph; never carry the addEventListener marker but we filter to keep the Element-only contract explicit */
        if (!(removed instanceof Element)) continue;
        if (hasMarkedListener(removed)) {
          emitWarning();
          return;
        }
      }
    }
  });
  observer.observe(rootEl, { childList: true, subtree: true });
  return observer;
}

/**
 * Test helper — resets the one-shot `warned` flag so a subsequent test in the
 * same module can re-exercise the first-warning path. Not exported from the
 * public barrel; the unit-test file imports it directly via the relative path.
 */
export function _resetWarnedForTests(): void {
  warned = false;
}
