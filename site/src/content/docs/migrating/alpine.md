---
title: Coming from Alpine
description: A side-by-side translation of a TodoMVC from Alpine 3 to Kerf. Bundle delta, directives → JSX, x-data → store, and the gotchas an Alpine dev hits first.
---

You picked Alpine because you wanted reactivity without a build step and without React's ceremony. Kerf asks for a build step (esbuild / Vite / tsup — anything that handles JSX) but otherwise the bargain is similar: small runtime, ergonomic state, no framework lifecycle. The trade you're making is **JSX instead of directives**. If that sounds bad, the side-by-side below is the place to decide.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/).

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `alpinejs` 3.14 | ~14 KB |
| `kerfjs` 0.5 (incl. signals) | ~6.6 KB |
| **Delta** | **~7 KB lighter** |

But the realistic trade is bigger than the runtime row suggests: Alpine wants no build step, kerf wants one. If your Alpine app is currently `<script src="alpine.js">` + sprinkles of `x-data` on server-rendered HTML, kerf changes the shape of how the page is assembled. Static-site shells (Astro / Hono / 11ty / Rails / Phoenix) + per-island `mount()` is a clean fit; replacing Alpine on a fully server-rendered page is more disruptive.

## 2. Mental-model translations

| Alpine | Kerf | Notes |
| --- | --- | --- |
| `x-data="{ count: 0 }"` (local) | `signal(0)` (module-scoped) | Kerf state lives in the JS module, not on a DOM element. |
| `Alpine.store('todos', { ... })` | `defineStore({ initial, actions })` | Same shape — initial state + named actions. |
| `x-text="todo.text"` | `{todo.text}` in JSX | JSX expressions are the template. |
| `x-html="raw"` | `{raw('<b>...</b>')}` from `kerfjs` | Same intent, escape-by-default; opt in with `raw()`. |
| `x-show="open"` | `{open && <div>...</div>}` | Ternary / `&&` in JSX. There's no separate hide-vs-remove distinction — the element is in the output or it isn't. |
| `x-if="cond"` | `{cond ? <a/> : <b/>}` | Same idea as `x-show`; kerf doesn't have a non-removal "hide" mode. |
| `x-for="todo in items"` | `each(items, (todo) => <li.../>, (todo) => todo.id)` | `each` takes the array, the row renderer, and a key function. |
| `:key="todo.id"` | `data-key={todo.id}` *and* the third arg to `each` | DOM key + memo key. |
| `x-model="input"` | input + `delegate(root, 'input', ...)` | No two-way binding — you wire the read and the write yourself. Three lines instead of one attribute. |
| `@click="toggle(id)"` | `delegate(root, 'click', '[data-action="toggle"]', fn)` | One delegated listener per action. |
| `@click.prevent` | `e.preventDefault()` inside the handler | Modifiers don't exist; do it in JS. |
| `@keydown.enter` | `if (e.key !== 'Enter') return` | Same. |
| `x-init="setup()"` | top-level call or `effect(() => setup())` | No lifecycle — modules run when they import. |
| `x-ref="input"` then `$refs.input` | `el` argument inside the `delegate` handler | You get the matched element; refs by name aren't a kerf concept. |
| `$watch('items', fn)` | `effect(() => { fn(store.state.value.items); })` | Auto-tracked — read the signal inside the effect. |

## 3. Side-by-side code

The same TodoMVC, section by section. The Alpine side is a faithful HTML-first version; the kerf side matches `site/src/examples/complete/todomvc/main.tsx` line for line.

### 3a. State

```html
<!-- Alpine -->
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.store('todos', {
      items: JSON.parse(localStorage.getItem('alpine-todomvc') || '[]'),
      filter: 'all',
      editingId: null,
      add(text) {
        const t = text.trim();
        if (!t) return;
        this.items.push({ id: crypto.randomUUID(), text: t, done: false });
        this.persist();
      },
      toggle(id) {
        const it = this.items.find((x) => x.id === id);
        if (it) it.done = !it.done;
        this.persist();
      },
      remove(id) { this.items = this.items.filter((x) => x.id !== id); this.persist(); },
      persist() { localStorage.setItem('alpine-todomvc', JSON.stringify(this.items)); },
    });
  });
</script>
```

```ts
// Kerf
import { defineStore, mount, each, delegate, delegateCapture, effect } from 'kerfjs';

const todos = defineStore({
  initial: () => ({ items: load(), filter: 'all' as Filter, editingId: null as string | null }),
  actions: (set, get) => ({
    add: (text: string) => {
      const t = text.trim();
      if (!t) return;
      set({ items: [...get().items, { id: crypto.randomUUID(), text: t, done: false }] });
    },
    toggle: (id: string) => set({
      items: get().items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    }),
    remove: (id: string) => set({ items: get().items.filter((it) => it.id !== id) }),
    // ...
  }),
});

effect(() => {
  localStorage.setItem('kerf-todomvc', JSON.stringify(todos.state.value.items));
});
```

What moved: Alpine's mutate-in-place style (`it.done = !it.done`) becomes immutable `set(...)` with a new array. The `persist()` action becomes a top-level `effect()` that auto-tracks `items` and re-runs whenever it changes. Same end result, different idiom: Alpine's reactivity is per-element-proxy mutation; kerf's is signal-value assignment.

### 3b. Render

```html
<!-- Alpine -->
<div class="todoapp" x-data x-init="$store.todos /* trigger registration */">
  <header>
    <h1>todos</h1>
    <input
      class="new-todo"
      placeholder="What needs to be done?"
      @keydown.enter="$store.todos.add($event.target.value); $event.target.value = ''"
      x-init="$el.focus()"
    />
  </header>
  <!-- list goes here -->
</div>
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

What moved: the HTML still looks like HTML — JSX is HTML's superset for control flow. `@keydown.enter` is the one piece that doesn't survive the swap: the handler lives in §3d, not on the input. `x-init="$el.focus()"` becomes the plain `autofocus` HTML attribute (kerf's morph honors it and preserves focus across re-renders without you having to call `.focus()` again).

### 3c. Keyed list

```html
<!-- Alpine -->
<ul class="todo-list">
  <template x-for="todo in $store.todos.visible" :key="todo.id">
    <li
      :class="`${todo.done ? 'done' : ''} ${$store.todos.editingId === todo.id ? 'editing' : ''}`"
    >
      <template x-if="$store.todos.editingId === todo.id">
        <input class="edit" :value="todo.text" x-init="$el.focus()" />
      </template>
      <template x-if="$store.todos.editingId !== todo.id">
        <input type="checkbox" :checked="todo.done" @change="$store.todos.toggle(todo.id)" />
        <label @dblclick="$store.todos.editingId = todo.id" x-text="todo.text"></label>
        <button class="destroy" @click="$store.todos.remove(todo.id)">×</button>
      </template>
    </li>
  </template>
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

What moved: `<template x-for>` → `each(items, render, key)`. The two `<template x-if>` branches collapse into a single JSX ternary — a Fragment groups the three view-mode elements so the `<li>` still has exactly one top-level element per row (kerf's row contract). The `:key` attribute splits into a DOM-identity `data-key` (the morph uses it to identify the row across renders) and a memo key (`each`'s third arg — what kerf uses to decide whether a row can be served from cache vs re-rendered).

### 3d. Events

```html
<!-- Alpine — handlers are on every node, parsed from attribute strings -->
<input type="checkbox" :checked="todo.done" @change="$store.todos.toggle(todo.id)" />
<button @click="$store.todos.remove(todo.id)">×</button>
<label @dblclick="$store.todos.editingId = todo.id"></label>
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

What moved: all per-element `@click` / `@change` / `@dblclick` handlers consolidate into a handful of `delegate()` calls at the bottom of the file. Each one is `(root, eventType, selector, handler)`. Non-bubbling events (blur, focus, change-as-commit) use `delegateCapture()` — kerf's Tier 2 listener. Alpine's `@blur` worked uniformly because Alpine attaches the listener to the host element directly; kerf needs the capture-phase tier because the listener lives on the root.

## 4. Gotchas

**No directive system.** `x-text`, `x-html`, `x-show`, `x-bind`, `x-on`, `x-model`, `x-for`, `x-if`, `x-init`, `x-ref`, `x-effect`, `x-data` — none of these exist. The replacements are all JSX expressions. This is the biggest mental adjustment: the page is built by a JS function, not annotated HTML.

**DOM attributes don't drive reactivity.** Alpine's magic was "set a `:value` attribute, the DOM stays in sync." Kerf renders JSX to HTML strings — there's no live proxy on the element. Reactivity is owned by signals; the DOM is downstream of them.

**No `x-init` lifecycle.** There's no per-element init hook because the framework doesn't own a per-element lifecycle. If you need to run something when a particular thing first renders, call it from the module body or from an `effect()` that depends on a signal that flips true when that thing appears.

**No `$refs` by name.** Alpine's `x-ref="input"` + `$refs.input` pattern doesn't exist. Inside a `delegate` handler you get the matched element as the second argument; outside a handler, query the DOM by selector (the morph is stable enough that selectors land on the elements you expect).

**No `x-model` two-way binding.** Inputs are uncontrolled by default; if you want to read the value, do it in a `delegate('input', ...)` handler. If you want to drive the DOM from state, render `value={signal.value}` in the JSX. The two halves are separate code paths — there's no auto-glue.

**No `Alpine.start()` or `<script defer>` cliffhanger.** Kerf modules run as soon as they're imported. Put the imports + signal definitions + `mount()` call at the top level of `main.tsx` and the app boots when the bundle loads. No event listener for "alpine:init."

**`data-key` is required.** Alpine's `:key` is optional; kerf's `each` requires both `data-key={item.id}` on the row's top-level element *and* a key function as the third argument. Without them you'll see focus drop on insert/delete or stale row HTML on filter changes.

**`<template>` doesn't render in kerf.** Alpine used `<template x-for>` and `<template x-if>` as syntactic carriers that didn't show in the DOM. Kerf JSX renders everything you write — Fragments (`<>...</>`) are the way to group siblings without adding a wrapper element.

## 5. Perf numbers

Alpine isn't in the [krausest js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) — its design ground (HTML-first per-element reactivity) doesn't fit the benchmark's "render 10,000-row list and reorder it" workload, and any number we showed would be an apples-to-oranges comparison.

For kerf's standing in the cluster, here are kerf's krausest numbers vs the closest-in-spirit lightweight frameworks (medians of 3 iterations, ms — lower is better):

| Op | Vue 3.6 | Lit 3.2 | **Kerf 0.5** | vanjs 1.5 |
| --- | --- | --- | --- | --- |
| create 1k | 42.0 | 38.5 | 46.1 | 46.6 |
| partial update | 22.5 | 21.9 | 44.6 | 41.8 |
| swap rows | 23.6 | 28.9 | 22.3 | 23.7 |
| select row | 6.8 | 9.3 | 27.6 | 14.3 |
| remove row | 20.0 | 18.3 | 17.0 | 18.3 |

The shape of the trade: kerf lands in the small-runtime cluster on the bulk ops (create, swap, clear, remove), trades that against Vue / Lit / Solid on the per-row-targeted ops (select-row, partial-update) where their compilers can produce direct mutations.

For Alpine-shaped apps — server-rendered HTML + reactive sprinkles, lists in the dozens not thousands — the krausest numbers are irrelevant. The thing you care about is "does typing into the input feel snappy and does focus survive re-render," which is exactly what the morph optimizes for.

[See the full bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
