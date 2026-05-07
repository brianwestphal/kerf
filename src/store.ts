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

import type { ReadonlySignal, Signal } from './reactive.js';
import { signal } from './reactive.js';

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
  actions: (set: (next: TState) => void, get: () => TState) => TActions;
}

const REGISTRY: Array<{ reset: () => void }> = [];

export function defineStore<TState, TActions>(
  spec: DefineStoreSpec<TState, TActions>,
): Store<TState, TActions> {
  const internal: Signal<TState> = signal(spec.initial());

  const set = (next: TState): void => {
    internal.value = next;
  };
  const get = (): TState => internal.value;

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
 * Test helper — clears the registry. Production code should never call this;
 * unit tests use it to isolate stores between cases.
 */
export function _clearStoreRegistryForTesting(): void {
  REGISTRY.length = 0;
}
