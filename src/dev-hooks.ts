/**
 * The dev-hook registry — kerf's single seam between production code and the
 * opt-in development diagnostics.
 *
 * ## Why this exists
 *
 * kerf used to INFER whether it was running in development, by reading
 * `globalThis.process?.env?.NODE_ENV` through `utils/devMode.ts`. That
 * inference cannot be made correct, and it was wrong in the most common case:
 * bundlers substitute the BARE `process.env.NODE_ENV` token and never create a
 * `globalThis.process` object for browser targets, so the read returned
 * `undefined` and `undefined !== 'production'` resolved to DEVELOPMENT inside
 * production browser bundles.
 *
 * It also could not be fixed by rewriting the expression. Only the
 * *production* answer can be made static: `X && false` folds to a constant for
 * any side-effect-free `X`, while `X && true` does not. So any form that a
 * bundler can eliminate is also a form that treats "no `process` binding" as
 * production — which silently disables every warning in the no-build/CDN path
 * and in browser dev bundles.
 *
 * The fix is to stop guessing. Every environment already has a correct,
 * statically-foldable dev flag; what none of them offers is a way to hand that
 * flag to a *library*. So the consumer writes the conditional, in their own
 * code, with their own flag:
 *
 * ```js
 * if (import.meta.env.DEV) await import('kerfjs/dev');   // Vite
 * if (process.env.NODE_ENV !== 'production') await import('kerfjs/dev');
 * ```
 *
 * Because that condition folds to `false` in the consumer's production build,
 * the entire statement is eliminated and the dev chunk is never emitted or
 * fetched. Installation IS the development signal — there is nothing left to
 * detect, and no environment kerf can be wrong about.
 *
 * ## The contract
 *
 * Core modules never import a `dev-*` module. They read a nullable slot off
 * `devHooks` and call through it:
 *
 * ```ts
 * devHooks.listRebind?.(id, marker.parentElement as Element);
 * ```
 *
 * When nothing is installed every slot is `undefined`, so the cost is one
 * property read per call site and the `dev-*` modules are unreachable from the
 * main entry — which is what lets a bundler drop them. This is why the gate
 * lives at the CALL SITE rather than inside each warner: an unconditional call
 * into a self-gating warner keeps the module reachable no matter how the gate
 * is written, so no amount of dead-code elimination can reclaim it.
 *
 * Slots ending in `Enabled` are predicates rather than warnings. They exist for
 * the handful of call sites that must decide whether to do *expensive
 * preparatory work* — capturing the previous render's binding list, allocating
 * a per-render `Map` — before there is anything to warn about. Core must check
 * those before paying the cost, exactly as it checked the old `isOptedIn()`
 * exports.
 *
 * Each warner keeps its own internal opt-in check (the `KERF_DEV_WARN_*` env
 * reads). Installation decides whether the diagnostics are *present*; the
 * individual warner still decides whether it is *switched on*.
 *
 * @see docs/11-dev-warnings.md
 */

import type { Binding } from './bindings.js';
import type { ListBinding } from './list-binding.js';
import type { Signal } from './reactive.js';

/** Per-mount / per-store one-shot dedup flag, owned by the caller in core. */
export interface WarnOnceContext {
  warned: boolean;
}

export interface DevHooks {
  // --- reactive.ts -------------------------------------------------------
  /**
   * Replaces `signal()`'s constructor so writes to never-subscribed signals can
   * warn. Resolved at signal-CREATION time, so signals created before the dev
   * entry is installed stay plain — see `signalsCreatedBeforeInstall`.
   */
  signalFactory?: <T>(value: T) => Signal<T>;
  /**
   * Wraps an `effect()` body so `delegate()` can detect that it is running
   * inside one. Returns the body to actually run.
   */
  wrapEffect?: (fn: () => void | (() => void)) => () => void | (() => void);

  // --- delegate.ts -------------------------------------------------------
  delegateInEffect?: (fn: 'delegate' | 'delegateCapture') => void;

  // --- store.ts ----------------------------------------------------------
  narrowSet?: (prev: unknown, next: unknown, ctx: WarnOnceContext) => void;
  /** Deep read-only proxy for the `get()` snapshot, so stray writes throw. */
  storeReadonly?: <T extends object>(state: T) => T;
  /** Unwraps a proxy handed back through `set({ ...get() })`. */
  storeToRaw?: <T>(next: T) => T;

  // --- mount.ts ----------------------------------------------------------
  listenerRebuild?: (rootEl: Element) => MutationObserver | null;
  listIdShift?: (id: string) => void;
  parserRepair?: (html: string) => void;
  staleBindingEnabled?: () => boolean;
  staleBinding?: (prevWired: readonly Binding[], current: readonly Binding[]) => void;
  listInvariantsEnabled?: () => boolean;
  listInvariants?: (
    rootEl: Element,
    bindings: ReadonlyMap<string, ListBinding>,
    expectedCounts?: ReadonlyMap<string, number>,
  ) => void;
  valueOnlyRerender?: (prevHtml: string, nextHtml: string, ctx: WarnOnceContext) => void;
  listRebind?: (id: string, liveParent: Element) => void;
  eachInMorphSkip?: (id: string, liveParent: Element, rootEl: Element) => void;
  missingRowKey?: (
    rowEl: Element,
    rowHtml: string,
    binding: { warnedMissingKey?: boolean },
  ) => void;

  // --- each.ts -----------------------------------------------------------
  staleIndexEnabled?: () => boolean;
  staleIndex?: (id: string) => void;
  duplicateCacheKeys?: (id: string, segItems: readonly { cacheKey: unknown }[]) => void;

  // --- utils/urlScreen.ts ------------------------------------------------
  /**
   * When installed, a screened URL throws instead of warning-and-dropping.
   * A slot rather than a boolean so the check stays uniform with the rest.
   */
  urlScreenThrow?: (message: string) => never;
}

/**
 * The live slot table. Mutable by design — this is the fourth sanctioned
 * module-level mutable location (Design rule 5), and like `store.ts:REGISTRY`
 * it depends on there being exactly ONE copy at runtime. `tsup`'s
 * `splitting: true` guarantees that: shared modules are promoted into a single
 * chunk that both the main entry and the `kerfjs/dev` entry import.
 */
export const devHooks: DevHooks = {};

/**
 * Install (or extend) the dev hooks. Called by the `kerfjs/dev` entry; not part
 * of the public API surface.
 *
 * Merges rather than replaces, so a consumer can install the standard bundle
 * and then override a single slot in a test.
 */
export function installDevHooks(hooks: DevHooks): void {
  Object.assign(devHooks, hooks);
}

/**
 * Remove every installed hook. Exists for test isolation — a suite that asserts
 * the not-installed (production-shaped) path needs to get back to a clean slate
 * without reloading modules.
 */
export function clearDevHooks(): void {
  for (const key of Object.keys(devHooks)) {
    delete (devHooks as Record<string, unknown>)[key];
  }
}
