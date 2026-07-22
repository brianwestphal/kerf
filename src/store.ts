/**
 * `defineStore({ initial, actions })` — composable testable stores layered on
 * top of `reactive.ts`'s signals.
 *
 * Three rules:
 * 1. `state` is read-only. Consumers read via `state.value` or subscribe via
 *    `effect()`. They cannot write directly.
 * 2. `actions` is the only mutation surface. All writes go through named
 *    action functions. This is what makes stores testable — assert against
 *    actions, not against arbitrary writes.
 * 3. `reset()` resets to `initial()`. Always defined; tests use it for
 *    setup, lifecycle hooks (route change, sign-out, etc.) use it for
 *    tear-down.
 *
 * A module-level registry tracks every store created via `defineStore()`;
 * `resetAllStores()` walks the registry and calls each `reset()`. Useful for
 * tests + project-switch / logout / route-reset scenarios where every piece
 * of client state should return to its initial shape.
 */

import { maybeWarnNarrowSet, type NarrowSetWarnContext } from './dev-store-warn.js';
import type { ReadonlySignal, Signal } from './reactive.js';
import { signal } from './reactive.js';
import { isDevMode } from './utils/devMode.js';
import { devReadonlyProxy, toRaw } from './utils/devReadonly.js';

export interface Store<TState, TActions> {
  /** Read-only reactive view. Consumers read `state.value` or subscribe via `effect()`. */
  readonly state: ReadonlySignal<TState>;
  /** Named mutators — the only way to change state. */
  readonly actions: TActions;
  /** Reset state to `initial()`. Used by tests and lifecycle hooks. */
  reset(): void;
}

interface DefineStoreSpec<TState, TActions> {
  initial: () => TState;
  actions: (set: (next: TState) => void, get: () => Readonly<TState>) => TActions;
}

const REGISTRY: Array<{ reset: () => void }> = [];

export function defineStore<TState, TActions>(
  spec: DefineStoreSpec<TState, TActions>,
): Store<TState, TActions> {
  const internal: Signal<TState> = signal(spec.initial());
  // KF-212: per-store one-shot dedup for the opt-in narrow-set warning.
  // Default off; consumers opt in via `KERF_DEV_WARN_NARROW_SET=1` in dev.
  // Production behavior is unchanged — `maybeWarnNarrowSet` short-circuits
  // on the env-var read before any per-set work runs.
  const warnCtx: NarrowSetWarnContext = { warned: false };

  // The dev gate is resolved once per store, lazily on first `set()`/`get()`
  // (so a runtime `globalThis.KERF_DEV` override set before mount is honored),
  // then cached — the prod hot path stays a bare boolean read, never a
  // per-call env probe.
  let devGate: boolean | undefined;
  const isDev = (): boolean => (devGate ??= isDevMode());

  const set = (next: TState): void => {
    // In dev, `next` may carry proxies handed back by the `get()` trap (e.g.
    // `set({ ...get(), count: 1 })`). Unwrap them so the internal signal only
    // ever holds a plain object — the narrow-set warning and every consumer
    // read see raw state, never a Proxy. Prod stores the bare reference.
    const raw = isDev() ? toRaw(next) : next;
    maybeWarnNarrowSet(internal.value, raw, warnCtx);
    internal.value = raw;
  };
  // In dev, wrap the reference returned to actions in a deep read-only Proxy so
  // that `get().count = 42` / `get().nested.x = 1` (documented Rule 8
  // violations) throw a `TypeError` instead of silently landing on the
  // underlying state without notifying subscribers. The live state object is
  // never frozen or mutated, so external references to it stay writable.
  // Production returns the bare reference for zero overhead (no proxy).
  const get = (): Readonly<TState> => {
    const v = internal.value;
    if (isDev() && v !== null && typeof v === 'object') {
      return devReadonlyProxy(v as TState & object);
    }
    return v;
  };

  const actions = spec.actions(set, get);

  const store: Store<TState, TActions> = {
    state: internal,
    actions,
    reset() {
      internal.value = spec.initial();
    },
  };

  REGISTRY.push(store);
  return store;
}

/**
 * Reset every store registered via `defineStore()` to its `initial()` value.
 * Used by tests and by application lifecycle hooks (project switch, logout,
 * route reset).
 */
export function resetAllStores(): void {
  for (const s of REGISTRY) s.reset();
}

/**
 * Test helper — clears the registry. Exposed via the `kerfjs/testing` subpath,
 * not the main `kerfjs` entry. Unit tests use it to isolate stores between cases.
 */
export function clearStoreRegistry(): void {
  REGISTRY.length = 0;
}
