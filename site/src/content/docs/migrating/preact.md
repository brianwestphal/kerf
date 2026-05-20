---
title: Coming from Preact
description: A side-by-side translation of a TodoMVC from Preact (signals or hooks) to Kerf. Bundle delta, the React-shape comparison, and the gotchas a Preact dev hits first.
---

You wrote a Preact app. You're reading this because you've already trimmed React down to ~10 KB and want to keep going, or because you want signals without the `@preact/signals` wrapper, or because you want a runtime even smaller. Preact is the closest existing competitor to kerf on bundle size; the differences are narrow but real.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/) and you're looking at the same bytes the snippets below show.

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `preact` 10.x | ~4 KB |
| `preact` + `@preact/signals` | ~6 KB |
| `kerfjs` (incl. signals) | ~6.5 KB |
| **Delta vs Preact** | **kerf is roughly comparable** (with-signals) or ~2 KB larger (without) |

Bundle is not the decider between Preact and kerf. The trade you're making is virtual-DOM vs DOM-morph, hooks vs no-hooks, and components-with-instances vs functions-returning-strings. Both ship `@preact/signals-core` (or its wrappers); kerf re-exports it directly under the `signal` / `computed` / `effect` / `batch` names.

## 2. Mental-model translations

| Preact (hooks) | Kerf | Notes |
| --- | --- | --- |
| `useState(initial)` | `signal(initial)` | Module-scoped, not per-component. |
| `useMemo(fn, deps)` | `computed(fn)` | Auto-tracked. No deps array. |
| `useEffect(fn, deps)` | `effect(fn)` | Auto-tracked. Returns an unsubscribe function instead of taking a cleanup return. |
| `useSignal(0)` (preact/signals) | `signal(0)` | Kerf re-exports `@preact/signals-core` directly; reading `signal.value` is identical. |
| `useComputed(fn)` (preact/signals) | `computed(fn)` | Identical. |
| `useReducer` / Context | `defineStore({ initial, actions })` | One store, named actions, no provider tree. |
| `useRef` (for focus) | *usually unnecessary* | The morph preserves focus + selection on the input being typed into. |
| `<Component />` | plain function returning JSX | No instances, no `props` object. |
| `items.map((it) => <Row key={it.id} ... />)` | `each(items, (it) => <Row ... />, (it) => it.id)` | Third arg is the per-row cache key. |
| `onClick={fn}` | `delegate(root, 'click', '[data-action="..."]', fn)` | One listener at the root, survives every re-render. |
| `class={...}` (Preact accepts both `class` and `className`) | `class={...}` | Kerf also accepts both, but `class` is canonical. |

## 3. Side-by-side code

The Preact + signals shape is the most React-shaped variant; the translation is the simplest in this section. The major shifts are:

```tsx
// Preact + signals
import { signal, computed, effect } from '@preact/signals';
import { render } from 'preact';

const items = signal<Todo[]>(load());
const filter = signal<Filter>('all');

effect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value)));

function App() {
  return (
    <div class="todoapp">
      <ul class="todo-list">
        {items.value
          .filter(/* ... */)
          .map((todo) => (
            <li key={todo.id}>
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
              <label>{todo.text}</label>
              <button onClick={() => remove(todo.id)}>×</button>
            </li>
          ))}
      </ul>
    </div>
  );
}

render(<App />, document.getElementById('root')!);
```

```tsx
// Kerf
import { mount, each, delegate } from 'kerfjs';
import { signal, computed, effect } from 'kerfjs';

const items = signal<Todo[]>(load());
const filter = signal<Filter>('all');

effect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value)));

const root = document.getElementById('root')!;

mount(root, () => (
  <div class="todoapp">
    <ul class="todo-list">
      {each(
        items.value.filter(/* ... */),
        (todo) => (
          <li data-key={todo.id}>
            <input type="checkbox" class="toggle" data-action="toggle" data-id={todo.id} checked={todo.done} />
            <label>{todo.text}</label>
            <button class="destroy" data-action="remove" data-id={todo.id}>×</button>
          </li>
        ),
        (todo) => todo.id,
      )}
    </ul>
  </div>
));

delegate(root, 'click', '[data-action="toggle"]', (_e, el) => toggle((el as HTMLElement).dataset.id!));
delegate(root, 'click', '[data-action="remove"]', (_e, el) => remove((el as HTMLElement).dataset.id!));
```

What moved:

- `render(<App />, root)` → `mount(root, () => <App />)`. `mount` wraps `effect()` and re-runs the render function on signal change; `render` rebuilds via Preact's virtual-DOM diff.
- `items.value.map((todo) => <li key={todo.id} ...>)` → `each(items.value, render, (todo) => todo.id)` plus `data-key={todo.id}` on the rendered `<li>`. Two keys instead of one — DOM-identity and row-memoization.
- Inline `onChange` / `onClick` move to `delegate()` calls. Preact compiles inline handlers to direct `addEventListener` bindings; kerf takes the delegation route.

## 4. Gotchas

**No virtual DOM means no `key`-prop-shaped semantics.** Preact's `key={todo.id}` is the reconciliation identity. Kerf splits that into `data-key={todo.id}` on the rendered element (the DOM-identity the morph uses) and the third arg to `each` (the row-memoization cache key). For most cases, both can be `todo.id` and behavior matches. The split matters when you want the per-row cache to invalidate on extra state — e.g. `(todo) => \`${todo.id}-${editingId === todo.id ? 'edit' : 'view'}\``.

**Inline event handlers don't work.** `onClick={fn}` on a JSX node will render as `onclick="fn"` and break — the JSX → HTML-string runtime can't serialize functions. Use `data-action` + `delegate(root, 'click', '[data-action="..."]', fn)`.

**Components are calls, not declarations.** `<MyComponent props />` works syntactically — kerf's JSX runtime calls `MyComponent(props)` and uses the returned JSX — but there's no instance, no hooks, no lifecycle. State lives in module scope or in a `defineStore`.

**No closure-capture footgun on effects.** Preact's `useEffect` captures stale state unless you list every read in the deps array (or use signals). `effect()` in kerf auto-tracks; you never list deps.

**Refs are usually unnecessary.** Preact's `useRef` for "I need to focus this element after render" or "I need to read this DOM property" is almost always unneeded — the morph preserves focus, and you can read DOM state in your `delegate` handler from the `el` argument.

**No Preact-specific `class` / `className` coexistence concern.** Both Preact and kerf accept either. Pick one in your codebase for consistency; kerf's canonical form is `class`.

## 5. Perf numbers

Cross-framework perf comparisons are only published from official benchmark runs — clean machine, no background load, results re-generated under controlled conditions. On the most recent run committed at [`bench/results.md`](https://github.com/brianwestphal/kerf/blob/main/bench/results.md), kerf and Preact + signals sit in the same performance cluster on most keyed scenarios; Preact is ahead on `partial update`, kerf is ahead on `create 1k` and `select row`, with typical noise elsewhere. The deciding factor between the two frameworks is the virtual-DOM / morph + hooks / no-hooks tradeoff in §1–§4, not row-update latency.

[See the full bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
