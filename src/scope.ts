/**
 * `kerfjs/scope` — group disposers with or without a DOM owner.
 *
 * kerf hands out disposers (`mount()` / `effect()` / `delegate()` all return
 * `() => void`), but nothing scopes them to a subtree's lifetime — so an
 * append-heavy app (a feed, a list of cards) leaks detached-but-subscribed
 * effects, listeners, and observers. Every such app hand-rolls the same
 * `WeakMap<Element, disposers[]>` swept on removal. This subpath blesses it.
 *
 *   import { createScope, disposeScope, disposeSubtree, observeRemovals } from 'kerfjs/scope';
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
 * Use `createScope()` for a reusable group spanning several event targets.
 * Its `signal` also removes native listeners when the group is disposed.
 *
 * No module-level mutable state: element scopes live in a `WeakMap` (GC-tied),
 * standalone scopes use closure-local state, and `disposeSubtree` walks the DOM.
 */
import { delegate, type DelegateOptions } from './delegate.js';
import { mount, type MountResult } from './mount.js';
import { effect } from './reactive.js';

/** A reusable disposer group with no DOM owner. */
export interface DisposerScope {
  /** Register a disposer in the current generation and return it. */
  add(dispose: () => void): () => void;
  /** Run the current generation newest first, then abort its signal. */
  dispose(): void;
  /** Signal for native listeners in the current generation. */
  readonly signal: AbortSignal;
  /** Number of registered disposers in the current generation. */
  readonly size: number;
}

/**
 * Create an element-free scope for listeners and other disposers spanning
 * several targets. After disposal, the same scope accepts a new generation.
 */
export function createScope(): DisposerScope {
  let disposers: Array<() => void> = [];
  let controller = new AbortController();
  let active = true;
  let disposing = false;
  return {
    add(dispose) {
      disposers.push(dispose);
      active = true;
      return dispose;
    },
    get signal() {
      active = true;
      return controller.signal;
    },
    get size() {
      return disposers.length;
    },
    dispose() {
      if (!active || disposing) return;
      active = false;
      disposing = true;
      const pending = disposers;
      const oldController = controller;
      disposers = [];
      controller = new AbortController();
      try {
        for (let index = pending.length - 1; index >= 0; index--)
          runBestEffort(pending[index]);
      } finally {
        oldController.abort();
        disposing = false;
      }
    },
  };
}

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
  /**
   * Run every registered disposer (best-effort — a throwing one won't strand the
   * rest). Idempotent. The handle is then dead: a later `add` / `mount` /
   * `effect` / `delegate` on it (including one made by a disposer while this
   * runs) tears down at once — `add(fn)` calls `fn` immediately — so nothing
   * leaks into a scope that will never run again. `disposeScope(el)` hands out
   * a fresh scope.
   */
  dispose(): void;
}

interface ScopeState {
  scope: Scope;
  disposers: Array<() => void>;
}

// GC-tied cache keyed by element — const + WeakMap, so it is exempt from the
// "no module-level mutable state" rule (like bindings.ts:insertedTextNodes).
const scopes = new WeakMap<Element, ScopeState>();

/** Run a disposer; a throwing one must not strand the rest. */
function runBestEffort(dispose: () => void): void {
  try {
    dispose();
  } catch {
    /* best-effort */
  }
}

/**
 * Get (or create) the teardown {@link Scope} for `el`. Repeated calls for the
 * same element return the same scope, so disparate code paths can register into
 * one place. After `dispose()`, a later `disposeScope(el)` starts fresh, and
 * registrations on the old (disposed) handle tear down immediately.
 */
export function disposeScope(el: Element): Scope {
  const existing = scopes.get(el);
  if (existing !== undefined) return existing.scope;

  const disposers: Array<() => void> = [];
  // Once disposed (including DURING dispose(), from a disposer), the handle is
  // dead: a registration tears down at once instead of landing in an orphaned
  // array nothing will ever run — a leak (KF-DFGD1R).
  let disposed = false;
  const register = (dispose: () => void): (() => void) => {
    if (disposed) runBestEffort(dispose);
    else disposers.push(dispose);
    return dispose;
  };
  const scope: Scope = {
    add: register,
    mount: (target, render) => register(mount(target, render)),
    effect: (fn) => register(effect(fn)),
    delegate: (root, type, selector, handler, options) =>
      register(delegate(root, type, selector, handler, options)),
    dispose() {
      if (disposed) return;
      disposed = true;
      scopes.delete(el);
      for (const d of disposers.splice(0)) runBestEffort(d);
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
 * that node (or an ancestor) is permanently removed from the subtree. A node
 * moved or reordered within `root` remains live. One observer covers the whole
 * tree. Returns a disconnect function. Note: `MutationObserver` fires
 * asynchronously, so final containment and disposal run after the mutation.
 */
export function observeRemovals(root: Element): () => void {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node instanceof Element && !root.contains(node))
          disposeSubtree(node);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
