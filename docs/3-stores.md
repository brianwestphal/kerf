# 3. Stores

A store is a thin convention layered on top of [§2 signals](2-reactivity.md). It earns its keep when:

- Multiple consumers read the same state.
- Mutations are non-trivial (multi-step, validating, derived).
- The state survives across navigation / route changes / sign-out and needs an explicit `reset()` hook.

The factory:

```ts
import { defineStore } from 'kerf';

const counter = defineStore({
  initial: () => ({ count: 0 }),
  actions: (set, get) => ({
    inc: () => set({ count: get().count + 1 }),
    dec: () => set({ count: get().count - 1 }),
  }),
});
```

## 3.1 Three rules

1. **`state` is read-only.** Consumers read via `state.value` or subscribe via `effect()`. They cannot write directly.
2. **`actions` is the only mutation surface.** All writes go through named action functions; tests assert against actions, not against arbitrary writes.
3. **`reset()` resets to `initial()`.** Always defined. Tests use it for setup; lifecycle hooks (route change, sign-out) use it for tear-down.

## 3.2 Reading state

```ts
counter.state.value.count;     // direct read (not auto-tracked unless inside an effect/computed)
```

Inside an `effect()` or a `mount()` render fn, `state.value` reads ARE tracked — that's how `mount` knows to re-render when actions mutate the store.

## 3.3 Calling actions

```ts
counter.actions.inc();         // → state.value === { count: 1 }
counter.actions.dec();         // → state.value === { count: 0 }
```

Actions are plain methods — call them from event handlers, async flows, anywhere.

## 3.4 Resetting

```ts
counter.reset();               // back to { count: 0 }
```

Per-store reset is useful in tests. There's also a global hook:

```ts
import { resetAllStores } from 'kerf';

resetAllStores();              // resets EVERY store created via defineStore()
```

Use cases:
- Test setup: `beforeEach(() => resetAllStores())`.
- App lifecycle: project switch / sign-out / route reset where every piece of state should return to its initial shape.

The registry is module-level. Every `defineStore({...})` call appends to it. There's no opt-out — if you don't want a store to participate, don't put it in `defineStore()`; use a raw signal instead.

## 3.5 Multi-step actions

Actions are just functions. Anything goes:

```ts
const cart = defineStore({
  initial: () => ({ items: [] as Item[], pending: false }),
  actions: (set, get) => ({
    async checkout() {
      set({ ...get(), pending: true });
      try {
        await api.submit(get().items);
        set({ items: [], pending: false });
      } catch {
        set({ ...get(), pending: false });
      }
    },
  }),
});
```

If you want the writes inside `checkout()` to be a single notification to subscribers, wrap them in `batch()`:

```ts
import { batch } from 'kerf';

actions: (set, get) => ({
  pay() {
    batch(() => {
      set({ ...get(), step: 'paying' });
      set({ ...get(), receipt: makeReceipt() });
      set({ ...get(), step: 'done' });
    });
    // → consumers re-run once, seeing the final state.
  },
}),
```

## 3.6 Derived state via `computed()`

A store doesn't need a `derived` field built into it; derive via `computed()` next to the store:

```ts
import { computed } from 'kerf';

export const cartTotal = computed(() =>
  cart.state.value.items.reduce((sum, i) => sum + i.price, 0),
);
```

`cartTotal.value` is auto-tracked exactly like a raw signal. The computed re-runs when (and only when) the items array changes.

## 3.7 The `Store<TState, TActions>` type

```ts
import type { Store } from 'kerf';

function makeWidget(store: Store<{ open: boolean }, { toggle(): void }>) {
  // ...
}
```

Useful when you pass a store as an argument or store it on a class.
