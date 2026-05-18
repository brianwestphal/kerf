---
title: Coming from Redux
description: Redux is a state-management library, not a UI framework — this page maps reducers, actions, selectors, and middleware onto kerf's signals and defineStore.
---

You use Redux (with React, or Redux Toolkit, or a similar reducer-based library). You're reading this because the boilerplate cost finally exceeds the predictability benefit, or because you're switching framework and want to know what shape your state layer takes in kerf.

**Redux is not a framework — it's a state-management library.** Kerf doesn't have a Redux equivalent that's also Redux-shaped. What it has is a more compact replacement: `signal()` for atomic state, `defineStore({ initial, actions })` for named-state-with-named-actions, `computed()` for derived state, and `effect()` for side effects on state change. This page maps the Redux concepts onto those primitives.

If you're using Redux with React: also read [Coming from React](/kerf/migrating/react/) — most of what changes in your codebase will be the React side, not the Redux side.

## 1. Conceptual mapping

| Redux concept | Kerf equivalent | Notes |
| --- | --- | --- |
| **Store** (single global state tree) | one or more `defineStore({...})` objects | Kerf prefers multiple small stores over one big one. |
| **Action** (`{ type: 'ADD_TODO', payload }`) | a method on a store's `actions` object | Named function calls instead of dispatched objects. |
| **Action creator** (`addTodo(text)` returns `{ type, payload }`) | the action method directly | One layer collapses — the function *is* the dispatched action. |
| **Reducer** (`(state, action) => newState`) | the body of a store action | The action receives `(set, get)` and calls `set({...})` with the next state. |
| **`dispatch(action)`** | `store.actions.actionName(args)` | Direct method call. |
| **Selector** (`(state) => state.foo.bar`) | `computed(() => store.state.value.foo.bar)` | Same idea — derive a value from state, memoized. |
| **`useSelector(fn)`** (react-redux) | read `store.state.value` (or a `computed`) inside the kerf `mount` render fn | Auto-tracked — no hook, no provider. |
| **`createSlice`** (Redux Toolkit) | `defineStore({ initial, actions })` | Same shape, less ceremony. |
| **Thunk** (action that does async work, then dispatches) | a `defineStore` action that's `async` and calls other actions | No special "thunk" middleware needed. |
| **Middleware** (logger, persistence, devtools) | a plain `effect()` that watches the store's state | No middleware chain — write the side effect directly. |
| **`combineReducers`** | multiple `defineStore` calls | Each "slice" is its own store. |
| **`Provider`** | n/a | Stores are module-level singletons; no React context provider tree. |
| **Immutable updates** (`{ ...state, foo: next }`) | same pattern with `set({ ...get(), foo: next })` | The discipline is the same; the API is more compact. |
| **Redux DevTools** | wire your own via an `effect()` that posts state to the devtools extension | No first-party integration; ~20 lines if you want one. |

## 2. Side-by-side translation

A small counter slice in Redux Toolkit vs. kerf. The kerf side runs at [`site/src/examples/complete/counter-store/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/counter-store) — [**▶ Run live**](/kerf/run/counter-store/) — covering all three patterns (sync, async, persistence) in one runnable app.

```ts
// Redux Toolkit (RTK)
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0, lastBumpedAt: null as Date | null },
  reducers: {
    increment: (state) => {
      state.count += 1;
      state.lastBumpedAt = new Date();
    },
    decrement: (state) => {
      state.count -= 1;
      state.lastBumpedAt = new Date();
    },
    reset: (state) => {
      state.count = 0;
      state.lastBumpedAt = null;
    },
  },
});

export const { increment, decrement, reset } = counterSlice.actions;
export const store = configureStore({ reducer: { counter: counterSlice.reducer } });

// React usage:
// const count = useSelector((s) => s.counter.count);
// const dispatch = useDispatch();
// <button onClick={() => dispatch(increment())}>+</button>
```

```ts
// Kerf
import { defineStore } from 'kerfjs';

export const counter = defineStore({
  initial: () => ({ count: 0, lastBumpedAt: null as Date | null }),
  actions: (set, get) => ({
    increment: () => set({ count: get().count + 1, lastBumpedAt: new Date() }),
    decrement: () => set({ count: get().count - 1, lastBumpedAt: new Date() }),
    reset: ()     => set({ count: 0, lastBumpedAt: null }),
  }),
});

// Kerf usage (inside a mount):
// <span>{counter.state.value.count}</span>
// delegate(root, 'click', '[data-action="inc"]', () => counter.actions.increment());
```

What moved:

- `createSlice({...})` → `defineStore({...})`. Same shape — `initialState` → `initial: () => ({...})`, `reducers` → `actions: (set, get) => ({...})`.
- RTK's "you can mutate state directly because Immer's underneath" becomes "you call `set(next)` with the next state object." Slightly more typing; no Immer dependency.
- `useSelector((s) => s.counter.count)` → `counter.state.value.count` inside the render function. No hook, no provider, no `useDispatch`.
- `dispatch(increment())` → `counter.actions.increment()`. Direct call.

## 3. The async case (thunks → async actions)

```ts
// Redux Toolkit thunk
const fetchUser = createAsyncThunk('user/fetch', async (id: string) => {
  const res = await fetch(`/api/users/${id}`);
  return await res.json();
});

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchUser.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchUser.rejected,  (s, a) => { s.loading = false; s.error = a.error.message; });
  },
});
```

```ts
// Kerf
export const user = defineStore({
  initial: () => ({ data: null as User | null, loading: false, error: null as string | null }),
  actions: (set, _get) => ({
    fetch: async (id: string) => {
      set({ data: null, loading: true, error: null });
      try {
        const res = await fetch(`/api/users/${id}`);
        const data = await res.json();
        set({ data, loading: false, error: null });
      } catch (e: unknown) {
        set({ data: null, loading: false, error: e instanceof Error ? e.message : String(e) });
      }
    },
  }),
});
```

What moved: RTK's three-callback thunk pattern (`pending` / `fulfilled` / `rejected`) collapses into one `async` action that calls `set()` at each phase. No `extraReducers`, no `createAsyncThunk` wrapper. The error handling is your own try/catch.

## 4. Middleware → effects

```ts
// Redux logger middleware
const logger: Middleware = (api) => (next) => (action) => {
  console.log('dispatch', action.type, action.payload);
  return next(action);
};
```

```ts
// Kerf — an effect that watches state changes
let prevCount = counter.state.value.count;
effect(() => {
  const next = counter.state.value.count;
  if (next !== prevCount) {
    console.log('counter changed', prevCount, '→', next);
    prevCount = next;
  }
});
```

What moved: Redux middleware sits between dispatch and reducer and runs on every action. Kerf's `effect()` runs whenever a signal it reads changes. If you want a generic logger across all stores, write an `effect()` per store, or build a helper that subscribes to a list of stores.

## 5. Persistence (`redux-persist` → `effect()`)

```ts
// redux-persist
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const persistedReducer = persistReducer({ key: 'root', storage }, rootReducer);
const store = configureStore({ reducer: persistedReducer });
export const persistor = persistStore(store);
```

```ts
// Kerf — one effect per persisted store
effect(() => {
  localStorage.setItem('counter', JSON.stringify(counter.state.value));
});

// On boot, rehydrate by passing the parsed JSON to `initial()`:
const counter = defineStore({
  initial: () => {
    try { return JSON.parse(localStorage.getItem('counter') ?? '') as CounterState; }
    catch { return { count: 0, lastBumpedAt: null }; }
  },
  // ...
});
```

What moved: `redux-persist` is replaced by an `effect()` that writes JSON to `localStorage` on every state change and a rehydration step in the store's `initial()` function. The library does more (`PersistGate`, blacklist/whitelist, transforms) but for most apps the 5-line replacement is enough.

## 6. Gotchas

**No single global state tree.** Redux is opinionated about *one* store. Kerf is the opposite — define as many small stores as makes sense for your app. Co-located stores (per feature, per page) are the kerf idiom.

**No `dispatch`, no action objects, no action types.** Kerf actions are plain method calls. You lose the "every state transition is a serializable action object" property — if you depended on it for replay, devtools time-travel, or cross-tab sync, that's a real loss. For most apps, plain method calls are fine.

**No Immer.** RTK lets you "mutate" state directly because Immer is underneath. Kerf is plain immutable updates — `set({ ...get(), foo: next })`. For deeply nested state, consider co-locating it into smaller stores or accepting the spread.

**No DevTools by default.** Redux DevTools is a real productivity tool. Kerf doesn't ship a first-party integration — wire your own via an `effect()` if you want time-travel.

**`useSelector` becomes auto-tracked reads.** In react-redux, `useSelector` subscribes the component to a specific slice of state. In kerf, *any* read of a signal inside a tracked context (`computed`, `effect`, `mount` render) auto-subscribes. There's no equivalence-check optimization to worry about — the morph applies the minimum diff regardless of whether your selector returned a new reference.

**Multi-store coordination is your problem.** Redux's `combineReducers` keeps cross-slice coordination implicit. Kerf's multi-store approach means cross-store coordination is a `computed()` that reads from both, or an `effect()` that subscribes to both.

## 7. Migration strategy

If you're using Redux with React and migrating to kerf, the order is:

1. Convert each RTK `createSlice` to a `defineStore` (mechanical translation).
2. Replace `useSelector(fn)` reads with direct `store.state.value.field` reads inside the kerf render function.
3. Replace `dispatch(action())` calls with `store.actions.action()` calls.
4. Replace `redux-persist` with an `effect()` per store.
5. Replace thunks with async store actions.

The state-layer migration is mostly mechanical. The React → kerf migration (the other half of the change) is where the substantive work lives — see [Coming from React](/kerf/migrating/react/).

## 8. Perf numbers

Redux is a state library, not a renderer. Performance comparisons apply to the *renderer* paired with each (React + Redux vs kerf + defineStore, say). The renderer comparisons live on the per-framework pages — see [Coming from React](/kerf/migrating/react/) §5.

[See the kerf bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
