---
title: Coming from React
description: A side-by-side translation of a TodoMVC from React 19 to Kerf. Bundle delta, hooks → signals, and the gotchas a React dev hits first.
---

You wrote a React app. You're reading this because the bundle is bigger than you wanted, or you want to see what "no virtual DOM" actually feels like, or your AI assistant kept hallucinating hooks. This page translates the same TodoMVC — store, keyed list, persistence, focus survival on the new-todo input — from React 19 to kerf, section by section.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/) and you're looking at the same bytes the snippets below show.

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `react` + `react-dom` 19.2 | ~45 KB |
| `kerfjs` (incl. signals) | ~11 KB |
| **Delta** | **~34 KB lighter** |

The trade you're making: virtual DOM and the hooks scheduler go away. JSX still works (it compiles to HTML strings, not virtual nodes), `signal`/`computed`/`effect` replace `useState`/`useMemo`/`useEffect`, and `each(items, render, key)` replaces `.map(item => <Row key={item.id} ... />)`. There are no components — function calls return JSX directly.

## 2. Mental-model translations

| React | Kerf | Notes |
| --- | --- | --- |
| `useState(initial)` | `signal(initial)` | Module-scoped, not per-component. Read with `s.value`, write with `s.value = ...`. |
| `useMemo(fn, deps)` | `computed(fn)` | Dependencies are auto-tracked — no deps array. |
| `useEffect(fn, deps)` | `effect(fn)` | Auto-tracked. Returns an unsubscribe function instead of taking a cleanup return. |
| `useReducer` / Context | `defineStore({ initial, actions })` | One store, named actions, no provider tree. |
| `useRef` (for focus) | *usually unnecessary* | The morph preserves focus + selection on the input being typed into. |
| `<Component />` | plain function returning JSX | No instances, no `props` object — pass arguments directly. |
| `items.map((it) => <Row key={it.id} ... />)` | `each(items, (it) => <Row ... />, (it) => it.id)` | The third arg is the key function. Listing rows without `each` loses focus on reorder. |
| `onClick={fn}` on the JSX node | `delegate(root, 'click', '[data-action="..."]', fn)` | One listener at the root, matched by selector. Survives re-render. |
| `key` prop | `data-key={item.id}` *and* the third arg to `each` | The DOM attribute keys the morph; the function keys `each`'s per-row memo. |
| `React.memo(Component)` | per-row memoization is automatic in `each` | The render function is skipped when the item identity (+ key) is unchanged. |
| `useEffect(() => cleanup)` | `const stop = effect(fn); stop()` | The return value *is* the cleanup. |
| `Strict Mode` double-invocation | n/a | `mount`'s render function runs once per change. |

## 3. Side-by-side code

The same TodoMVC, section by section. Each kerf block matches `site/src/examples/complete/todomvc/main.tsx` line for line — click **Run live** above to see it running.

### 3a. State

```tsx
// React
import { useState, useEffect } from 'react';

interface Todo { id: string; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done';

const STORAGE_KEY = 'react-todomvc';

function load(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch { return []; }
}

function App() {
  const [items, setItems] = useState<Todo[]>(load);
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);
  // ...
}
```

```tsx
// Kerf
import { defineStore, mount, each, delegate, delegateCapture, effect } from 'kerfjs';

interface Todo { id: string; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done';

const STORAGE_KEY = 'kerf-todomvc';

function load(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch { return []; }
}

const todos = defineStore({
  initial: () => ({ items: load(), filter: 'all' as Filter, editingId: null as string | null }),
  actions: (set, get) => ({
    add: (text: string) => { /* ... */ },
    toggle: (id: string) => { /* ... */ },
    // ...
  }),
});

effect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.state.value.items));
});
```

What moved: React's three `useState` calls collapse into one `defineStore` with three keys. The `useEffect` that writes to `localStorage` becomes a top-level `effect` — no deps array, no component lifecycle. `load()` is the same in both.

### 3b. Render

```tsx
// React
return (
  <div className="todoapp">
    <header>
      <h1>todos</h1>
      <input
        className="new-todo"
        placeholder="What needs to be done?"
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          const input = e.currentTarget;
          setItems([...items, { id: crypto.randomUUID(), text: input.value, done: false }]);
          input.value = '';
        }}
        autoFocus
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

What moved: `className` → `class`, `autoFocus` → `autofocus` (kerf uses the HTML attribute name, not the React DOM property name). The `onKeyDown` inline handler moves out of the JSX — see §3d. `mount(root, () => ...)` replaces React's `createRoot(root).render(<App />)`; the function passed to `mount` re-runs whenever any signal it reads changes, like a component-shaped `useEffect` whose dependencies are auto-tracked.

### 3c. Keyed list

```tsx
// React
<ul className="todo-list">
  {items
    .filter((it) => filter === 'active' ? !it.done : filter === 'done' ? it.done : true)
    .map((todo) => (
      <li
        key={todo.id}
        className={`${todo.done ? 'done' : ''} ${editingId === todo.id ? 'editing' : ''}`}
      >
        {editingId === todo.id ? (
          <input className="edit" defaultValue={todo.text} autoFocus />
        ) : (
          <>
            <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
            <label onDoubleClick={() => setEditingId(todo.id)}>{todo.text}</label>
            <button onClick={() => remove(todo.id)}>×</button>
          </>
        )}
      </li>
    ))}
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
            <input type="checkbox" class="toggle" data-action="toggle" data-id={todo.id} checked={todo.done} />
            <label data-action="edit" data-id={todo.id}>{todo.text}</label>
            <button class="destroy" data-action="remove" data-id={todo.id}>×</button>
          </>
        )}
      </li>
    ),
    (todo) => `${todo.id}-${editingId === todo.id ? 'edit' : 'view'}`,
  )}
</ul>
```

What moved: `items.map` → `each(items, render, key)`. The third argument — the key function — is what `each` uses to memoize each row's HTML output between renders; rows whose key is unchanged are pulled from cache and never re-rendered. The `data-key={todo.id}` on the `<li>` is the *DOM* key the morph uses to identify the row across renders (so insert/delete don't blur the focused element). React's single `key` prop does both jobs; kerf splits them because the row-cache key sometimes needs to encode mode (e.g. `view` vs `edit`) while the DOM-identity key stays stable.

Inline `onChange`/`onClick`/`onDoubleClick` handlers are replaced by `data-action` attributes; the real handler is registered once on the root in §3d.

### 3d. Events

```tsx
// React — handlers are inline on every JSX node, recreated each render
<input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
<button onClick={() => remove(todo.id)}>×</button>
<label onDoubleClick={() => setEditingId(todo.id)}>{todo.text}</label>
// new-todo Enter handler also lives in JSX (see §3b)
```

```tsx
// Kerf — handlers register once, at module load, on the root
delegate(root, 'click', '[data-action="toggle"]', (_e, el) => {
  todos.actions.toggle((el as HTMLElement).dataset.id!);
});
delegate(root, 'click', '[data-action="remove"]', (_e, el) => {
  todos.actions.remove((el as HTMLElement).dataset.id!);
});
delegate(root, 'click', '[data-action="edit"]', (_e, el) => {
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

What moved: every per-node handler collapses into one `delegate(root, type, selector, fn)` call that survives every re-render. Blur — which doesn't bubble — uses `delegateCapture` (Tier 2 in kerf's listener model). React's synthetic event system handled bubblers and non-bubblers uniformly; in kerf you pick the tier explicitly, which is two more lines per non-bubbler and a lot fewer event-system bytes.

### 3e. Focus survival

In React: every keystroke in the new-todo input causes a re-render. The input itself is preserved because it has a stable position in the JSX, but if you're not careful (e.g. the input renders inside a list whose order is changing), focus drops. The common React fix is `useRef` + manual `.focus()` restoration in a `useEffect`.

In kerf: focus + caret position + selection range on the currently-focused input are saved before the morph and restored after. You don't write the code. This is the morph's job, and it stays out of your way. Try it in the [live TodoMVC](/kerf/examples/complete/todomvc/): type into the new-todo while items are added, toggled, deleted, reordered, filtered — your caret never moves.

## 4. Gotchas

**`<MyComponent />` is sugar for a function call, not a component instance.** Writing `<MyComponent props />` works — the JSX runtime calls `MyComponent(props)` and uses the returned JSX — but there's no instance state, no hooks, no lifecycle. The function takes its props and returns JSX; that's it. If you find yourself reaching for `useState` inside a child component, the value goes in a module-level `signal` or a `defineStore` instead. The mental adjustment is from "components own state" to "modules own state, functions render it."

**No closure-capture footgun on event handlers.** React's `useEffect` famously captures stale state unless you list every read in the deps array. `effect()` in kerf auto-tracks; you never list deps. The flip side: `effect()` re-runs the *entire* function whenever any signal it reads changes, so don't pile unrelated work into one `effect`.

**Refs are usually unnecessary.** `useRef` for "I need to focus this element after render" or "I need to read this DOM property" is almost always unneeded — the morph preserves focus, and you can read DOM state in your `delegate` handler from the `el` argument. The exception is integrating a non-kerf library (a chart, an editor) that needs a stable DOM target; in that case wrap its mount point in `data-morph-skip` so the morph leaves the subtree alone.

**`onChange` semantics differ.** React's `onChange` fires on every keystroke (it's actually `input`); kerf uses real DOM events. If you want every-keystroke behavior, listen for `'input'`; if you want commit-on-blur-or-enter, listen for `'change'` (which doesn't bubble — `delegateCapture` it).

**No Strict Mode double-invocation.** React 19's dev-mode double-render of effects catches bugs that come from React's own reconciliation model; kerf doesn't have that reconciliation model, so it doesn't need the double-invocation. Your `effect()` runs once per change.

**`useEffect` cleanup → `effect()` return value.** React expects you to return a cleanup function from `useEffect`. Kerf's `effect()` *returns* an unsubscribe function: `const stop = effect(...); stop()` cancels the subscription. You won't need this for most app code (effects live for the app's lifetime), but if you do, the shape is different.

**Class vs className.** Kerf JSX uses HTML attribute names — `class`, `for`, `tabindex`, `autofocus` — not React's `className`, `htmlFor`, `tabIndex`, `autoFocus`. Same with SVG: `stroke-width`, not `strokeWidth`.

**Event handlers are not JSX props.** `onClick={fn}` on a JSX node will render as `onclick="fn"` and break — it'll either throw at template-compile time or render the handler's source code into the HTML string. Use `delegate(root, 'click', selector, fn)` instead.

## 5. Perf numbers

Cross-framework perf comparisons are only published from official benchmark runs — clean machine, no background load, results re-generated under controlled conditions. On the most recent run committed at [`bench/results.md`](https://github.com/brianwestphal/kerf/blob/main/bench/results.md): kerf and React 19 are broadly competitive on most [krausest js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) keyed row-level operations; kerf is notably faster on swap-rows (23 ms vs React's 147 ms — a known React reconciler regression on that benchmark) and create-10k; React edges kerf on create-1k and partial-update. The deciding factor between the two frameworks is the bundle / ecosystem / training-set tradeoff in §1–§4, not row-update latency. Solid is also a sensible answer if raw performance is your decision driver.

[See the full bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
