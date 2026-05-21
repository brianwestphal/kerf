---
title: Coming from Solid
description: A side-by-side translation of a TodoMVC from Solid 1.9 to Kerf. Bundle delta, signals → signals, and the honest case for when Solid stays the better answer.
---

You wrote a Solid app. You're reading this because you want signals without the compiler step, or because your toolchain doesn't play well with the Solid plugin, or because you want a runtime small enough to read end-to-end. Solid is kerf's closest philosophical sibling — fine-grained signals, no virtual DOM, JSX as the template language. The differences are real but narrower than with any other framework in this section.

**This page is unusually honest about when Solid is the better answer.** Kerf does not target Solid's compiler-driven update-path performance. On `partial update` and `select row` on the krausest benchmark, Solid is decisively faster than kerf and will remain so. If raw row-update latency on long lists is your primary decision driver, this page exists to talk you *out* of migrating. The reasons to migrate are bundle-and-build, not performance.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/) and you're looking at the same bytes the snippets below show.

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `solid-js` 1.9 | ~4.5 KB |
| `kerfjs` (incl. signals) | ~11 KB |
| **Delta** | **kerf is ~7 KB larger** |

Solid is smaller. The trade you're making in either direction isn't bundle — it's the compiler. Solid relies on `babel-plugin-jsx-dom-expressions` (via `vite-plugin-solid`) to transform JSX into fine-grained reactive DOM operations at build time. Kerf has no such plugin: JSX renders to HTML strings at runtime, and a small reconciler patches the live DOM in place. Same JSX surface for the developer; different machinery underneath.

## 2. Mental-model translations

| Solid | Kerf | Notes |
| --- | --- | --- |
| `createSignal(0)` → `[count, setCount]` | `signal(0)` → `count.value` | Solid's getter/setter pair becomes kerf's `.value` property. |
| `createMemo(() => ...)` | `computed(() => ...)` | Same auto-tracking. |
| `createEffect(() => ...)` | `effect(() => ...)` | Same auto-tracking. Kerf's returns an unsubscribe function. |
| `createResource(fetcher)` | manual: `signal()` + `effect()` + `fetch()` | Kerf doesn't ship a resource primitive. |
| `<For each={items}>{...}</For>` | `each(items, render, key)` plus `data-key={item.id}` | Conceptually the same; kerf splits DOM-identity (the `data-key` attribute) and row-memoization (the third arg to `each`). |
| `<Show when={cond}>` | `cond ? <a/> : <b/>` | JSX ternaries; no `<Show>` component. |
| `onClick={fn}` on the JSX node | `delegate(root, 'click', '[data-action="..."]', fn)` | Solid compiles inline handlers efficiently; kerf takes the delegation route — one listener, many descendants. |
| `createStore({...})` | `defineStore({ initial, actions })` | Solid stores are deep-reactive proxies; kerf stores are flat objects with named actions and `set`/`get`. |
| `onMount(fn)` / `onCleanup(fn)` | top-level `effect()` for setup; returned disposer for teardown | No lifecycle hooks. |
| `createContext` / `useContext` | module-level signal or `defineStore` | No component tree to traverse. |
| Compiler-driven `value={cond ? "a" : "b"}` updates a single attribute | runtime `morph()` walks the tree and patches the diff | Kerf does more work per render; Solid does almost none. |

## 3. Side-by-side code

The same TodoMVC, section by section. Each kerf block matches `site/src/examples/complete/todomvc/main.tsx` line for line — click **Run live** above to see it running.

### 3a. State

```tsx
// Solid
import { createSignal, createEffect } from 'solid-js';

interface Todo { id: string; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done';

const STORAGE_KEY = 'solid-todomvc';

function load(): Todo[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Todo[]; }
  catch { return []; }
}

const [items, setItems]         = createSignal<Todo[]>(load());
const [filter, setFilter]       = createSignal<Filter>('all');
const [editingId, setEditingId] = createSignal<string | null>(null);

createEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items()));
});
```

```tsx
// Kerf
import { defineStore, mount, each, delegate, delegateCapture, effect, attr, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  toggle: attr('data-action', 'toggle'),
  remove: attr('data-action', 'remove'),
  edit:   attr('data-action', 'edit'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;
const ITEM = { id: attr('data-id') } as const;

interface Todo { id: string; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done';

const STORAGE_KEY = 'kerf-todomvc';

function load(): Todo[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Todo[]; }
  catch { return []; }
}

const todos = defineStore({
  initial: () => ({ items: load(), filter: 'all' as Filter, editingId: null as string | null }),
  actions: (set, get) => ({
    add: (text: string) => set({ ...get(), items: [...get().items, { id: crypto.randomUUID(), text, done: false }] }),
    toggle: (id: string) => set({ ...get(), items: get().items.map((t) => t.id === id ? { ...t, done: !t.done } : t) }),
    remove: (id: string) => set({ ...get(), items: get().items.filter((t) => t.id !== id) }),
    // ...
  }),
});

effect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.state.value.items));
});
```

What moved: Solid's three `[get, set]` pairs collapse into one `defineStore`. The most superficial difference: Solid reads with a function call (`items()`) and kerf reads with a property access (`todos.state.value.items`). `createEffect` → `effect` — same auto-tracking, same shape.

### 3b. Render

```tsx
// Solid
return (
  <div class="todoapp">
    <header>
      <h1>todos</h1>
      <input
        class="new-todo"
        placeholder="What needs to be done?"
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          const input = e.currentTarget;
          setItems([...items(), { id: crypto.randomUUID(), text: input.value, done: false }]);
          input.value = '';
        }}
        autofocus
      />
    </header>
    {/* list goes here */}
  </div>
);
```

```tsx
// Kerf
mount(root, () => {
  const { items, filter, editingId } = todos.state.value;
  return (
    <div class="todoapp">
      <header>
        <h1>todos</h1>
        <input class="new-todo" data-new placeholder="What needs to be done?" autofocus />
      </header>
      {/* list goes here */}
    </div>
  );
});
```

What moved: the JSX shape is almost identical. The biggest visible difference: kerf moves the inline `onKeyDown` handler out to a `delegate` call in §3d. Solid's compiler turns inline handlers into efficient event bindings on the rendered DOM nodes; kerf's runtime model is a single listener at the root that dispatches by `data-action` selector.

### 3c. Keyed list

```tsx
// Solid
<ul class="todo-list">
  <For each={items().filter((it) => filter() === 'active' ? !it.done : filter() === 'done' ? it.done : true)}>
    {(todo) => (
      <li
        classList={{ done: todo.done, editing: editingId() === todo.id }}
      >
        <Show
          when={editingId() === todo.id}
          fallback={
            <>
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
              <label onDblClick={() => setEditingId(todo.id)}>{todo.text}</label>
              <button onClick={() => remove(todo.id)}>×</button>
            </>
          }
        >
          <input class="edit" value={todo.text} autofocus />
        </Show>
      </li>
    )}
  </For>
</ul>
```

```tsx
// Kerf
<ul class="todo-list">
  {each(
    items.filter((it) =>
      filter === 'active' ? !it.done : filter === 'done' ? it.done : true,
    ),
    (todo) => (
      <li
        data-key={todo.id}
        class={`${todo.done ? 'done' : ''} ${editingId === todo.id ? 'editing' : ''}`}
      >
        {editingId === todo.id ? (
          <input class="edit" data-edit data-id={todo.id} value={todo.text} autofocus />
        ) : (
          <>
            <input type="checkbox" class="toggle" {...ACTIONS.toggle.attrs} {...ITEM.id(todo.id)} checked={todo.done} />
            <label {...ACTIONS.edit.attrs} {...ITEM.id(todo.id)}>{todo.text}</label>
            <button class="destroy" {...ACTIONS.remove.attrs} {...ITEM.id(todo.id)}>×</button>
          </>
        )}
      </li>
    ),
    (todo) => `${todo.id}-${editingId === todo.id ? 'edit' : 'view'}`,
  )}
</ul>
```

What moved: `<For each={...}>` → `each(items, render, cacheKey)`. `<Show when={...} fallback={...}>` → a JSX ternary. `classList={{ done: todo.done }}` → a template-literal `class={...}`. Solid keys the `<For>` by item identity by default; kerf splits that into the `data-key` attribute (DOM-identity for the morph) and the third arg to `each` (per-row cache key for skipping re-renders when memoization-relevant state is unchanged).

### 3d. Events

```tsx
// Solid — handlers inline, compiler-attached to specific nodes
<input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
<button onClick={() => remove(todo.id)}>×</button>
<label onDblClick={() => setEditingId(todo.id)}>{todo.text}</label>
```

```tsx
// Kerf — handlers register once, at module load, on the root
delegate(root, 'click', ACTIONS.toggle.selector, (_e, el) => {
  todos.actions.toggle((el as HTMLElement).dataset.id!);
});
delegate(root, 'click', ACTIONS.remove.selector, (_e, el) => {
  todos.actions.remove((el as HTMLElement).dataset.id!);
});
delegate(root, 'click', ACTIONS.edit.selector, (_e, el) => {
  todos.actions.startEdit((el as HTMLElement).dataset.id!);
});
delegate(root, 'keydown', '[data-new]', (e, el) => {
  if ((e as KeyboardEvent).key !== 'Enter') return;
  const input = el as HTMLInputElement;
  todos.actions.add(input.value);
  input.value = '';
});

// Tier 2: blur doesn't bubble — capture phase is required.
delegateCapture(root, 'blur', '[data-edit]', (_e, el) => {
  const input = el as HTMLInputElement;
  if (todos.state.value.editingId === input.dataset.id) {
    todos.actions.commitEdit(input.dataset.id!, input.value);
  }
});
```

What moved: Solid's inline event handlers (compiled to direct `addEventListener` calls on the rendered node) become one `delegate()` per event type at the root. The delegation model is a runtime tradeoff — slightly more dispatch cost per event in exchange for handlers that survive every re-render without re-binding.

### 3e. Focus survival

Both frameworks preserve focus across re-renders by default in the common case — Solid because its compiler emits minimal-mutation updates that don't touch the focused element; kerf because the morph's focus-preservation pass saves the focused element's caret position and selection range before the diff and restores it after. The user-visible behavior is the same. The mechanism is different.

## 4. Gotchas (this is the *honest* section)

**Solid is faster on row-updates.** Kerf does not target Solid's compiler-driven update-path performance and will not catch it on the `partial update` and `select row` krausest benchmarks. Kerf's runtime `morph()` walks the tree and patches the diff; Solid's compiled output knows at build time which DOM node corresponds to which signal and patches a single attribute. The architectural ceiling is real. If your app's hot path is "1000-row table where one cell updates per second," Solid is the right answer.

**Reactivity reads look different.** Solid: `count()` (a function call). Kerf: `count.value` (a property access). Both subscribe inside a tracked context (effect / computed / mount render). This is a syntax shift you'll notice every line; it's not a semantic shift.

**No `createStore` deep-reactive proxy.** Solid's `createStore({...})` returns a deep-reactive proxy where `setState('a', 'b', 'c', next)` does fine-grained path-based updates. Kerf's `defineStore` is flat — `set(...)` replaces the whole state object (or you can do `set({ ...get(), field: next })`). For nested state, either flatten into named signals or accept the whole-object replacement model. The granular `arraySignal` from `kerfjs/array-signal` is the equivalent for long lists, but it doesn't generalize to nested non-array state.

**No `<Resource>` / `createResource`.** Async data loading is manual: a `signal()` for the value, an `effect()` for the fetch, and a `signal()` for the loading/error state. Kerf doesn't have an async-resource primitive.

**No `<Portal>`.** Solid ships `<Portal mount={someEl}>` for rendering into a detached DOM target. In kerf, render the portaled content via a separate `mount(targetEl, () => ...)` call.

**Components are calls, not declarations.** `<MyComponent props />` works in kerf JSX — it calls `MyComponent(props)` and uses the returned JSX — but there's no component instance, no `setup()` phase, no lifecycle hooks. Component-shaped functions return JSX, and that's it. Solid's component model is closer to "function that returns JSX," but `onMount` / `onCleanup` / `useContext` give it a soft lifecycle; kerf has none of that.

**Delegation vs inline handlers.** Solid's compiler binds inline event handlers efficiently to the specific DOM node. Kerf's `delegate()` model is one listener per event type at the root, dispatched by `data-action`. This is fine for almost every case but is the opposite end of the spectrum from Solid's "handler attached to the exact element that needs it."

## 5. Perf numbers

Cross-framework perf comparisons are only published from official benchmark runs — clean machine, no background load, results re-generated under controlled conditions. On the most recent run committed at [`bench/results.md`](https://github.com/brianwestphal/kerf/blob/main/bench/results.md), Solid sits ahead of kerf on `partial update`, `select row`, and `create 1k`; kerf is competitive on `remove row`, `clear`, and within typical bench noise on `swap rows`. **This gap is structural** — kerf will not catch Solid on compiler-driven update-path operations.

[See the full bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
