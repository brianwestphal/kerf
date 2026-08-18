/**
 * `kerfjs/scope` — tie a set of disposers to a DOM element's lifetime.
 *
 * kerf hands out disposers (`mount()` / `effect()` / `delegate()` all return
 * `() => void`), but nothing scopes them to a subtree's lifetime — so an
 * append-heavy app (a feed, a list of cards) leaks detached-but-subscribed
 * effects, listeners, and observers. Every such app hand-rolls the same
 * `WeakMap<Element, disposers[]>` swept on removal. This subpath blesses it.
 *
 *   import { disposeScope, disposeSubtree, observeRemovals } from 'kerfjs/scope';
 *
 *   const s = disposeScope(card);
 *   s.mount(card, renderCard);              // mounts AND registers its disposer
 *   s.effect(() => syncCard(card));
 *   s.delegate(card, 'click', '.del', del);
 *   s.add(() => observer.disconnect());     // any () => void disposer
 *   // …when the card goes away:
 *   disposeSubtree(feed);                   // runs every scope in feed (incl. feed)
 *   feed.remove();
 *
 * Or install one observer and let removals auto-dispose:
 *   observeRemovals(document.body);
 *
 * No module-level mutable state: scopes live in a `WeakMap` (GC-tied, keyed by
 * element), and `disposeSubtree` finds them by walking the subtree.
 */
import { delegate, type DelegateOptions } from './delegate.js';
import { mount, type MountResult } from './mount.js';
import { effect } from './reactive.js';

/** A per-element teardown scope. Calling `disposeScope(el)` again returns the SAME scope. */
export interface Scope {
  /** Register any `() => void` disposer (a `mount`/`effect`/`delegate` return, a listener remover, …). Returns it. */
  add(dispose: () => void): () => void;
  /** `mount()` into `el` and register its disposer in one step. Returns the disposer. */
  mount(el: HTMLElement, render: () => MountResult): () => void;
  /** `effect(fn)` and register its disposer in one step. Returns the disposer. */
  effect(fn: () => void | (() => void)): () => void;
  /** `delegate(...)` and register its disposer in one step. Returns the disposer. */
  delegate<T extends Element = Element>(
    root: HTMLElement,
    type: string,
    selector: string,
    handler: (event: Event, target: T) => void,
    options?: DelegateOptions,
  ): () => void;
  /** Run every registered disposer (best-effort — a throwing one won't strand the rest) and reset. Idempotent. */
  dispose(): void;
}

interface ScopeState {
  scope: Scope;
  disposers: Array<() => void>;
}

// GC-tied cache keyed by element — const + WeakMap, so it is exempt from the
// "no module-level mutable state" rule (like bindings.ts:insertedTextNodes).
const scopes = new WeakMap<Element, ScopeState>();

/**
 * Get (or create) the teardown {@link Scope} for `el`. Repeated calls for the
 * same element return the same scope, so disparate code paths can register into
 * one place. After `dispose()`, a later `disposeScope(el)` starts fresh.
 */
export function disposeScope(el: Element): Scope {
  const existing = scopes.get(el);
  if (existing !== undefined) return existing.scope;

  const disposers: Array<() => void> = [];
  const scope: Scope = {
    add(dispose) {
      disposers.push(dispose);
      return dispose;
    },
    mount(target, render) {
      const dispose = mount(target, render);
      disposers.push(dispose);
      return dispose;
    },
    effect(fn) {
      const dispose = effect(fn);
      disposers.push(dispose);
      return dispose;
    },
    delegate(root, type, selector, handler, options) {
      const dispose = delegate(root, type, selector, handler, options);
      disposers.push(dispose);
      return dispose;
    },
    dispose() {
      scopes.delete(el);
      // splice() empties the array AND makes a second dispose() a no-op.
      for (const d of disposers.splice(0)) {
        try {
          d();
        } catch {
          /* best-effort: a throwing disposer must not strand the rest */
        }
      }
    },
  };
  scopes.set(el, { scope, disposers });
  return scope;
}

/**
 * Dispose every scope within `root` (including `root`'s own), then leave the DOM
 * to you. Call it right before removing a subtree. Finds scopes by walking the
 * subtree against the `WeakMap` — no marker attributes are added to your DOM.
 */
export function disposeSubtree(root: Element): void {
  // Static NodeList snapshot — safe to dispose (which deletes WeakMap entries)
  // while iterating. Root first, then descendants in document order.
  const own = scopes.get(root);
  if (own !== undefined) own.scope.dispose();
  for (const el of root.querySelectorAll('*')) {
    const state = scopes.get(el);
    if (state !== undefined) state.scope.dispose();
  }
}

/**
 * Install a `MutationObserver` on `root` that auto-disposes a node's scope when
 * that node (or an ancestor) is removed from the subtree. One observer covers
 * the whole tree. Returns a disconnect function. Note: `MutationObserver` fires
 * asynchronously, so disposal runs a microtask after the removal.
 */
export function observeRemovals(root: Element): () => void {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node instanceof Element) disposeSubtree(node);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
