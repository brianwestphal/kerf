---
title: Counter store
description: Redux-style state with defineStore. Sync actions, an async action with loading and error states, and localStorage persistence through an effect.
---

<div class="app-cta">
  <a class="app-cta__run" href="/kerf/run/counter-store/">▶ Run live</a>
  <a class="app-cta__source" href="https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/counter-store" target="_blank" rel="noopener">View source on GitHub</a>
</div>

[![Animated preview: incrementing the counter, decrementing, then an async fetch resolving](/kerf/demos/counter-store.svg)](/kerf/run/counter-store/)

The three state patterns a Redux app reaches for, written with kerf's `defineStore`: a counter with sync actions, a fetch with loading and error states, and persistence across reloads. The [Redux migration guide](/kerf/migrating/redux/) compares each one with its Redux Toolkit equivalent.

**What to look at:**

- **Sync actions.** `increment`, `decrement`, and `reset` are plain functions that call `set()`, the equivalent of a Redux Toolkit slice's reducers. There are no action types or dispatch.
- **An async action with loading and error states.** `fetch` sets `loading`, awaits a mock request, then sets either the data or the error. That is the whole thunk: an `async` function inside `actions`. **Fetch (fails)** exercises the error branch.
- **Persistence through `effect()`.** One effect writes the counter's state to `localStorage` on every change, and the store's `initial` reads it back. That replaces redux-persist. Reload the page and the count survives.
- **Two independent mounts.** The counter and the fetch panel each have their own `mount()`, so a fetch state change never re-renders the counter.
- **Page-lifetime `delegate()` calls.** The listeners sit on `document.body` for the life of the page, so the app discards their disposers with the `void` sigil. Compare the [htmx cart island](/kerf/examples/complete/cart-htmx/), whose transient root captures them.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/counter-store)

```tsx
// site/src/examples/complete/counter-store/main.tsx (excerpt — full source on GitHub)
import {
  attr,
  defineStore,
  delegate,
  effect,
  mount,
  type AttrSpec,
} from "kerfjs";

const ACTIONS = {
  inc: attr("data-action", "inc"),
  reset: attr("data-action", "reset"),
} as const satisfies Record<string, AttrSpec<"data-action">>;

const counter = defineStore({
  initial: loadCounter, // reads localStorage, falls back to { count: 0, … }
  actions: (set, get) => ({
    increment: () =>
      set({ count: get().count + 1, lastBumpedAt: new Date().toISOString() }),
    reset: () => set({ count: 0, lastBumpedAt: null }),
  }),
});

// Persist on every change — the redux-persist equivalent.
effect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counter.state.value));
});

const remote = defineStore({
  initial: (): FetchState => ({ data: null, loading: false, error: null }),
  actions: (set) => ({
    fetch: async (succeed: boolean): Promise<void> => {
      set({ data: null, loading: true, error: null });
      try {
        set({ data: await mockFetch(succeed), loading: false, error: null });
      } catch (e: unknown) {
        set({ data: null, loading: false, error: String(e) });
      }
    },
  }),
});

mount(counterRoot, () => (
  <div data-counter>
    <div class="count">{counter.state.value.count}</div>
    <button {...ACTIONS.inc.attrs}>+1</button>
  </div>
));

// Page-lifetime listener: the `void` sigil marks the discarded disposer.
void delegate(document.body, "click", ACTIONS.inc.selector, () =>
  counter.actions.increment(),
);
```
