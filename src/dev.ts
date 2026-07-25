/**
 * `kerfjs/dev` — the development diagnostics bundle.
 *
 * Importing this module installs kerf's dev-only behavior: the whole
 * `KERF_DEV_WARN_*` warning family, the structural list invariants, the
 * read-only store snapshot, and the throw-on-dangerous-URL screen. Importing
 * nothing leaves every hook slot `undefined` and kerf runs in production shape.
 *
 * Put the import behind YOUR environment's dev flag, in YOUR code. That
 * condition folds to `false` in your production build, so the whole statement
 * is eliminated and this chunk is never emitted or fetched:
 *
 * ```js
 * if (import.meta.env.DEV) await import('kerfjs/dev');                    // Vite
 * if (process.env.NODE_ENV !== 'production') await import('kerfjs/dev');  // webpack / Node
 * ```
 *
 * No-build / CDN consumers import it unconditionally from their dev page and
 * simply leave it out of the production page — there is no bundler to fold the
 * condition, and nothing for kerf to detect.
 *
 * ## Install ordering
 *
 * Every hook except one is read at CALL time (render, reconcile, `set()`,
 * `delegate()`), so installing any time before your first `mount()` is enough.
 *
 * The exception is `signalFactory`: `signal()` picks its constructor when the
 * signal is CREATED. Static imports are hoisted above a top-level
 * `await import()`, so module-scope signals in imported modules are created
 * before this module runs and the untracked-signal warning will not see them.
 * To cover those, make the dev import the first STATIC import of a dev-only
 * entry file, or load your app through a dynamic import after this one.
 *
 * Installation decides whether the diagnostics are PRESENT; each individual
 * warner still reads its own `KERF_DEV_WARN_*` env var to decide whether it is
 * switched ON. That keeps the existing opt-in contract intact.
 *
 * @see docs/11-dev-warnings.md
 */

import { type Signal, signal as coreSignal } from '@preact/signals-core';

import { isOptedIn as staleBindingOptedIn, maybeWarnStaleBinding } from './dev-binding-warn.js';
import {
  enterEffect,
  exitEffect,
  isDevWarnDelegateInEffectEnabled,
  warnIfInsideEffect,
} from './dev-delegate-warn.js';
import { maybeWarnDuplicateCacheKeys, maybeWarnEachInMorphSkip } from './dev-each-warn.js';
import { type DevHooks, installDevHooks } from './dev-hooks.js';
import { listInvariantsEnabled, maybeCheckListInvariants } from './dev-invariants.js';
import { isOptedInStaleIndex, maybeWarnStaleIndex } from './dev-list-index-warn.js';
import { maybeWarnListIdShift } from './dev-list-key-warn.js';
import { maybeWarnListRebind } from './dev-list-rebind-warn.js';
import { installListenerRebuildWarn } from './dev-listener-warn.js';
import { maybeWarnParserRepair } from './dev-parser-repair-warn.js';
import { maybeWarnValueOnlyRerender } from './dev-rerender-warn.js';
import { maybeWarnMissingRowKey } from './dev-row-key-warn.js';
import { DevSignal, isDevWarnUntrackedEnabled } from './dev-signal.js';
import { maybeWarnNarrowSet } from './dev-store-warn.js';
import { devReadonlyProxy, toRaw } from './utils/devReadonly.js';

export { clearDevHooks, type DevHooks, devHooks, installDevHooks } from './dev-hooks.js';

/**
 * The standard bundle of hooks this entry installs. Exported so kerf's own
 * suites can drop back to the production shape (`clearDevHooks()`) and restore
 * afterwards — re-importing this module would not re-run the install, since
 * module evaluation happens once.
 */
export const DEV_HOOKS: DevHooks = {
  // --- reactive ---------------------------------------------------------
  signalFactory: <T>(value: T): Signal<T> => (
    isDevWarnUntrackedEnabled() ? new DevSignal<T>(value) : coreSignal<T>(value)
  ),
  wrapEffect: (fn) => {
    // Resolved once per `effect()` call, matching the pre-hook behavior: an
    // effect created while the warning is off is never wrapped.
    if (!isDevWarnDelegateInEffectEnabled()) return fn;
    return () => {
      enterEffect();
      try {
        return fn();
      } finally {
        exitEffect();
      }
    };
  },

  // --- delegate ---------------------------------------------------------
  delegateInEffect: warnIfInsideEffect,

  // --- store ------------------------------------------------------------
  narrowSet: maybeWarnNarrowSet,
  storeReadonly: devReadonlyProxy,
  storeToRaw: toRaw,

  // --- mount ------------------------------------------------------------
  listenerRebuild: installListenerRebuildWarn,
  listIdShift: maybeWarnListIdShift,
  parserRepair: maybeWarnParserRepair,
  staleBindingEnabled: staleBindingOptedIn,
  staleBinding: maybeWarnStaleBinding,
  listInvariantsEnabled,
  listInvariants: maybeCheckListInvariants,
  valueOnlyRerender: maybeWarnValueOnlyRerender,
  listRebind: maybeWarnListRebind,
  eachInMorphSkip: maybeWarnEachInMorphSkip,
  missingRowKey: maybeWarnMissingRowKey,

  // --- each -------------------------------------------------------------
  staleIndexEnabled: isOptedInStaleIndex,
  staleIndex: maybeWarnStaleIndex,
  duplicateCacheKeys: maybeWarnDuplicateCacheKeys,

  // --- urlScreen --------------------------------------------------------
  urlScreenThrow: (message: string) => {
    throw new Error(message);
  },
};

installDevHooks(DEV_HOOKS);
