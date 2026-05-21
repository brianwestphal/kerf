---
title: Coming from vanjs
description: A side-by-side translation of a TodoMVC from vanjs 1.5 to Kerf. Bundle delta, hyperscript → JSX, list reconciliation, and the gotchas a vanjs dev hits first.
---

You're already convinced about signals + small runtime + no virtual DOM — vanjs got you there. The migration to kerf is the *smallest* of the four "coming from" jumps on this site, because the philosophy lines up: signals as the unit of reactivity, no compiler magic, no scheduler. What changes is the *template language* (JSX instead of hyperscript), the *keyed-list story* (a real reconciler instead of manual splicing), and a built-in *event-delegation* primitive.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/).

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `vanjs-core` 1.5 | ~1.6 KB |
| `kerfjs` (incl. signals) | ~11 KB |
| **Delta** | **~9 KB heavier** |

Kerf is bigger. What the extra ~9 KB buys you:

- **A keyed-list reconciler** (`each(items, render, key)`) with LIS-based moves and bulk-parse inserts. vanjs gives you `vanX.list()` but the contract is more limited and the perf profile under reorders is rougher.
- **`morph()` — focus and selection survive re-render** without your code knowing it. In vanjs you write around this; in kerf you forget it's a problem.
- **`delegate()` / `delegateCapture()`** — one listener per event-type on the root, matched by selector, instead of per-node event handlers.
- **JSX with type-checked element/attribute names** instead of hyperscript factory calls that the IDE has fewer hooks into.
- **`SafeHtml` for SSR** — render the same tree on the server and ship the string.

If the only thing you care about is bytes-per-feature, vanjs wins. If you care about "the new-todo input keeps focus through 60-row reorders without me writing focus-saving code," kerf is the cheaper-in-total-developer-time option.

## 2. Mental-model translations

| vanjs | Kerf | Notes |
| --- | --- | --- |
| `van.state(initial)` | `signal(initial)` | Same role, different names. Read with `.val` (vanjs) vs `.value` (kerf). |
| `van.derive(fn)` | `computed(fn)` | Auto-tracked derivation. |
| `van.derive(() => sideEffect())` | `effect(() => sideEffect())` | Same shape; the dedicated `effect` makes intent clearer. |
| `vanX.reactive([...])` | `arraySignal([...])` (from `kerfjs/array-signal`) | Granular collection — emits patch events that drive O(patches) DOM updates. |
| `vanX.replace(arr, fn)` | `arr.replace(newArray)` on an `arraySignal` | Whole-array swap. |
| `van.tags.div({...}, children)` | `<div ...>{children}</div>` (JSX) | Hyperscript → JSX. |
| `van.add(parent, child)` | render the child in your JSX; `mount()` reconciles | No imperative appends — the render function is the source of truth. |
| `onclick: fn` in `van.tags` | `delegate(root, 'click', '[data-action="..."]', fn)` | One delegated listener per action; selector-matched. |
| `vanX.list(container, items, render)` | `each(items, render, (it) => it.id)` in JSX | Same intent, JSX-shaped. |
| Manual focus restoration | nothing — kerf does it | Focus/caret/selection survive morph automatically. |
| `van.hydrate(target, render)` | `mount(target, render)` | Same shape; kerf has no separate "hydrate" path. |

## 3. Side-by-side code

The same TodoMVC, section by section. The vanjs side uses `vanjs-core` 1.5 + `vanjs-ext` for the reactive array; the kerf side matches `site/src/examples/complete/todomvc/main.tsx` line for line.

### 3a. State

```ts
// vanjs
import van from 'vanjs-core';
import * as vanX from 'vanjs-ext';

interface Todo { id: string; text: string; done: boolean }

const items = vanX.reactive(JSON.parse(localStorage.getItem('vanjs-todomvc') ?? '[]') as Todo[]);
const filter = van.state<'all' | 'active' | 'done'>('all');
const editingId = van.state<string | null>(null);

van.derive(() => {
  localStorage.setItem('vanjs-todomvc', JSON.stringify(items));
});

const add = (text: string) => {
  const t = text.trim();
  if (t) items.push({ id: crypto.randomUUID(), text: t, done: false });
};
const toggle = (id: string) => {
  const it = items.find((x) => x.id === id);
  if (it) it.done = !it.done;
};
const remove = (id: string) => vanX.replace(items, (curr) => curr.filter((x) => x.id !== id));
```

```ts
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

const todos = defineStore({
  initial: () => ({ items: load(), filter: 'all' as Filter, editingId: null as string | null }),
  actions: (set, get) => ({
    add: (text: string) => {
      const t = text.trim();
      if (!t) return;
      set({ ...get(), items: [...get().items, { id: crypto.randomUUID(), text: t, done: false }] });
    },
    toggle: (id: string) => set({
      ...get(),
      items: get().items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    }),
    remove: (id: string) => set({ ...get(), items: get().items.filter((it) => it.id !== id) }),
    // ...
  }),
});

effect(() => {
  localStorage.setItem('kerf-todomvc', JSON.stringify(todos.state.value.items));
});
```

What moved: three free-standing signals + an action soup become one `defineStore` with named actions. `vanX.reactive`'s mutate-in-place style (`items.push`, `it.done = !it.done`) becomes immutable `set(...)` with a new array. `van.derive(() => sideEffect)` becomes `effect(() => sideEffect)` — same role, the dedicated name makes intent clearer.

If you want vanjs's granular-array performance characteristics in kerf, swap `defineStore`'s `items` array for an [`arraySignal`](https://github.com/brianwestphal/kerf/blob/main/docs/2-reactivity.md) — `each(items, ..., key)` detects it via brand symbol and applies its patches in O(patches) instead of full snapshot reconciliation. For todo-list-scale lists the snapshot path is plenty fast; reach for `arraySignal` when rows are in the thousands.

### 3b. Render

```ts
// vanjs
const { div, header, h1, input } = van.tags;

const App = () =>
  div({ class: 'todoapp' },
    header(
      h1('todos'),
      input({
        class: 'new-todo',
        placeholder: 'What needs to be done?',
        autofocus: true,
        onkeydown: (e: KeyboardEvent) => {
          if (e.key !== 'Enter') return;
          const el = e.currentTarget as HTMLInputElement;
          add(el.value);
          el.value = '';
        },
      }),
    ),
    // list goes here
  );

van.add(document.getElementById('app')!, App());
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

What moved: `van.tags.div({...}, children)` → JSX `<div>...</div>`. The hyperscript "props as first object, children as variadic args" pattern collapses into HTML-shaped JSX. The IDE now type-checks the tag name and the attribute names against `JSX.IntrinsicElements` — typos that vanjs would happily render as broken HTML become compile-time errors. `van.add(target, App())` becomes `mount(target, () => <App />)` — the render function lives behind a closure so kerf can re-run it when signals change.

### 3c. Keyed list

```ts
// vanjs — using vanX.list for keyed reconciliation
const visible = van.derive(() =>
  items.filter((it) => (filter.val === 'active' ? !it.done : filter.val === 'done' ? it.done : true)),
);

const renderRow = (todo: Todo) =>
  li(
    { class: () => `${todo.done ? 'done' : ''} ${editingId.val === todo.id ? 'editing' : ''}` },
    editingId.val === todo.id
      ? input({ class: 'edit', value: todo.text, autofocus: true })
      : [
          input({ type: 'checkbox', checked: todo.done, onchange: () => toggle(todo.id) }),
          label({ ondblclick: () => (editingId.val = todo.id) }, todo.text),
          button({ class: 'destroy', onclick: () => remove(todo.id) }, '×'),
        ],
  );

const list = ul({ class: 'todo-list' });
vanX.list(list, items, renderRow);
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

What moved: `vanX.list(container, items, renderRow)` → `each(items, render, key)` inside JSX. The kerf form has the list reconciler co-located with the surrounding tree — no separate "create container, then list-bind into it" step. The key function (third arg to `each`) controls the per-row memo cache; the `data-key` on the `<li>` is the DOM-identity key the morph uses to identify rows across renders. vanjs uses one key (the array-element identity); kerf splits them because the memo key sometimes needs to encode mode (`view` vs `edit`) while the DOM-identity key stays stable.

### 3d. Events

```ts
// vanjs — handlers attached per-node, recreated on render
input({ type: 'checkbox', checked: todo.done, onchange: () => toggle(todo.id) })
button({ class: 'destroy', onclick: () => remove(todo.id) }, '×')
label({ ondblclick: () => (editingId.val = todo.id) }, todo.text)
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

What moved: `onclick: fn` / `onchange: fn` / `ondblclick: fn` on every element collapse into a handful of `delegate()` calls at module scope. Per-row event-listener allocation goes away — there's one click listener for the whole list, not 1,000. Non-bubblers (blur, change-as-commit, focus) use `delegateCapture` (Tier 2). vanjs handled non-bubblers transparently because the listener was on the element directly; kerf's listener model is "one listener on the root, matched by selector," which trades two extra lines of code per non-bubbler for substantially less listener memory and zero re-registration on re-render.

## 4. Gotchas

**JSX, not hyperscript.** The biggest visible change. `van.tags.div({...}, children)` → `<div>...</div>`. The IDE type-checks tag/attribute names; typos fail at build time, not at runtime. You need a build step (esbuild / Vite / tsup) — vanjs's "drop a script tag and go" workflow doesn't apply.

**Render returns `SafeHtml`, not DOM nodes.** vanjs's render functions return live DOM nodes you can append. Kerf JSX renders to a structured `SafeHtml` (HTML string + tagged list segments) which `mount()` applies to a live element via the morph. The mental switch: "what does my render function return" is `Node` in vanjs, `SafeHtml` in kerf.

**Don't pass DOM nodes as JSX children.** Because kerf renders to HTML strings, passing a `Node` as a JSX child won't insert it — it'll stringify to `[object HTMLElement]` or worse. If you have a node that must survive the morph (a chart, a canvas, a third-party widget), render an empty `<div data-morph-skip>` placeholder and append the node imperatively after `mount()`.

**`signal.value`, not `.val`.** Tiny but real: vanjs uses `.val`; kerf uses `.value` (matching the `@preact/signals-core` API kerf re-exports). Same semantics — read is tracked, write triggers re-renders.

**Read signals *inside* the render function.** If you read `signal.value` outside the function passed to `mount()`, the read isn't tracked and the render won't re-run when the signal changes. This is the same rule as `effect()` and the same rule vanjs has — but the failure mode looks different because vanjs evaluates lazily and kerf evaluates eagerly.

**`each` requires both a DOM key and a memo key.** vanjs's `vanX.list` takes one key (array-element identity). Kerf splits it: the row's top-level element needs `data-key={item.id}` (the morph's identity key) *and* `each`'s third argument is the memo-cache key function. Without `data-key` you lose focus on insert/delete; without the memo key you re-render unchanged rows.

**`arraySignal` is at a subpath.** If you want vanjs's granular `vanX.reactive` performance characteristics, import `arraySignal` from `kerfjs/array-signal`, not from the main barrel. Apps that don't use it shed ~0.4 KB.

**No imperative DOM appends inside the render function.** vanjs's `van.add(parent, child)` works because vanjs renders eagerly to DOM. In kerf, mutations to the live DOM inside `mount()`'s render function will be clobbered by the next morph. If you need imperative DOM mutation, do it in a `delegate` handler (which fires after the render) or wrap the target in `data-morph-skip` so the morph leaves it alone.

**Event names in JSX are HTML, not vanjs-style.** vanjs's `onclick: fn` works because vanjs sets properties on the DOM node. In kerf, `onClick={fn}` would serialize as `onclick="fn"` and break. Use `delegate()` instead — and don't write event handlers as JSX attributes.

## 5. Perf numbers

Cross-framework perf comparisons are only published from official benchmark runs — clean machine, no background load, results re-generated under controlled conditions. The first official run lands once we have substantial framework changes worth measuring against. Until then: kerf and vanjs are in the same performance cluster on the [krausest js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) keyed scenarios. The shape-level qualitative call: if your app reorders / inserts / removes rows frequently, kerf's LIS-based move pass keeps focus + selection automatically preserved, which vanjs doesn't; if your app's hottest path is "flip one boolean on one row out of 1,000 every keystroke," vanjs's per-row mutation path is faster in isolation, but you're writing your own focus-restoration code to handle the side effects.

[See the full bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
