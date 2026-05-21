---
title: Coming from Svelte
description: A side-by-side translation of a TodoMVC from Svelte 5 (runes) to Kerf. Bundle delta, $state/$derived → signals, and the gotchas a Svelte dev hits first.
---

You wrote a Svelte 5 app. You're reading this because you're tired of the compiler being part of your build, or you want a runtime you can read end-to-end in an afternoon, or you've decided you want JSX back. Svelte 5's runes are conceptually close to kerf's signals; this page translates the same TodoMVC — store, keyed list, persistence, focus survival on the new-todo input — from Svelte 5 to kerf, section by section.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/) and you're looking at the same bytes the snippets below show.

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `svelte` 5 runtime (per-app, post-compile) | varies — typically 2–6 KB for a small app, growing with feature surface |
| `kerfjs` (incl. signals) | ~11 KB |
| **Delta** | **kerf is heavier** (Svelte's compiled runtime is typically 2–6 KB for a small app) |

This is the framework comparison where bundle is *not* the decider. Svelte 5's compiler emits a slim runtime per app — most apps land well below kerf's ~11 KB. The trade you're making is the compiler itself, the `.svelte` file format, and the implicit reactivity declarations (`$state`, `$derived`, `$effect`) for a runtime-only library you can read end-to-end. Same fine-grained reactivity model; no build step beyond the JSX one you already have.

## 2. Mental-model translations

| Svelte 5 | Kerf | Notes |
| --- | --- | --- |
| `let count = $state(0)` | `const count = signal(0)` | Read with `count.value`; write with `count.value = ...`. Svelte's compiler hides the `.value`; kerf is explicit. |
| `let doubled = $derived(count * 2)` | `const doubled = computed(() => count.value * 2)` | Same auto-tracking; kerf passes a function explicitly. |
| `$effect(() => { ... })` | `effect(() => { ... })` | Same name, same idea. Kerf's `effect` returns an unsubscribe function. |
| `$props()` | function parameters | Components are plain functions: `(props) => <jsx/>`. |
| `<script>` block | module-level JS / TS | All state and event setup live in module scope. |
| `{#if cond}` / `{:else}` | `cond ? <a/> : <b/>` | JSX ternaries. |
| `{#each items as item (item.id)}` | `each(items, render, key)` plus `data-key={item.id}` | The `(item.id)` keying is the same idea, in two pieces (DOM-identity attr + cache key fn). |
| `on:click={handler}` | `delegate(root, 'click', '[data-action="..."]', handler)` | One listener at the root; survives every re-render. |
| `bind:value={x}` | `value={x.value}` + listener on `'input'` | No two-way binding sugar; bind explicitly. |
| `<style>` block (component-scoped) | plain CSS + class names | No scoped styles built in. |
| Stores (`writable`, `readable`, `derived`) | `defineStore({ initial, actions })` | Kerf stores are richer: named actions, reset, and a `state` signal you read with `.value`. |
| Slots (`<slot />`) | pass JSX as a function argument | No slot DSL; functions take JSX-valued props. |
| `onMount` / `onDestroy` | top-level `effect()` for setup; returned disposer for teardown | No lifecycle hooks. Setup and teardown live in module scope. |

## 3. Side-by-side code

The same TodoMVC, section by section. Each kerf block matches `site/src/examples/complete/todomvc/main.tsx` line for line — click **Run live** above to see it running.

### 3a. State

```svelte
<!-- Svelte 5 -->
<script lang="ts">
  interface Todo { id: string; text: string; done: boolean }
  type Filter = 'all' | 'active' | 'done';

  const STORAGE_KEY = 'svelte-todomvc';

  let items     = $state<Todo[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  let filter    = $state<Filter>('all');
  let editingId = $state<string | null>(null);

  $effect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  });
</script>
```

```tsx
// Kerf
import { defineStore, mount, each, delegate, delegateCapture, effect } from 'kerfjs';

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

What moved: Svelte's three `$state` locals become one `defineStore` (kerf groups related state behind named actions). Svelte's `$effect` becomes kerf's `effect` — same auto-tracked reads. The `load()` helper is the same in both.

### 3b. Render

```svelte
<!-- Svelte 5 -->
<div class="todoapp">
  <header>
    <h1>todos</h1>
    <input
      class="new-todo"
      placeholder="What needs to be done?"
      onkeydown={(e) => {
        if (e.key !== 'Enter') return;
        const input = e.currentTarget;
        items = [...items, { id: crypto.randomUUID(), text: input.value, done: false }];
        input.value = '';
      }}
      autofocus
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

What moved: Svelte's template gains a JSX equivalent; the inline `onkeydown` moves to a `delegate` call in §3d. `mount(root, () => ...)` replaces Svelte's compiled mount call; the function re-runs whenever any signal it reads changes.

### 3c. Keyed list

```svelte
<!-- Svelte 5 -->
<ul class="todo-list">
  {#each items.filter((it) => filter === 'active' ? !it.done : filter === 'done' ? it.done : true) as todo (todo.id)}
    <li class:done={todo.done} class:editing={editingId === todo.id}>
      {#if editingId === todo.id}
        <input class="edit" value={todo.text} autofocus />
      {:else}
        <input type="checkbox" checked={todo.done} onchange={() => toggle(todo.id)} />
        <label ondblclick={() => editingId = todo.id}>{todo.text}</label>
        <button onclick={() => remove(todo.id)}>×</button>
      {/if}
    </li>
  {/each}
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

What moved: `{#each ... as todo (todo.id)}` → `each(items, render, cacheKey)` plus `data-key={todo.id}` on the rendered `<li>`. The Svelte `(todo.id)` keying corresponds to kerf's `data-key` attribute (the morph uses it to identify the row across renders) — kerf adds a second per-row cache key via the third arg to `each` for skipping re-render when the row's memoization-relevant state hasn't changed. `class:done={todo.done}` becomes a template-literal `class={...}`. `{#if}`/`{:else}` becomes a JSX ternary.

### 3d. Events

```svelte
<!-- Svelte 5 — handlers inline on JSX nodes -->
<input type="checkbox" checked={todo.done} onchange={() => toggle(todo.id)} />
<button onclick={() => remove(todo.id)}>×</button>
<label ondblclick={() => editingId = todo.id}>{todo.text}</label>
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

What moved: every per-node handler collapses into one `delegate(root, type, selector, fn)` call that survives every re-render. Blur — which doesn't bubble — uses `delegateCapture` (Tier 2 in kerf's listener model).

### 3e. Focus survival

In Svelte: keyed `{#each ... (id)}` blocks preserve DOM identity, so focus survives reorder. Cross-render focus on a separate element (the new-todo input above the list) usually survives too because Svelte's compiler emits minimal-mutation update code. If you do hit a focus-loss case, the fix is a `bind:this` ref + manual `.focus()` after the update.

In kerf: focus + caret position + selection range on the currently-focused input are saved before the morph and restored after. You don't write the code. Try it in the [live TodoMVC](/kerf/examples/complete/todomvc/): type into the new-todo while items are added, toggled, deleted, reordered, filtered — your caret never moves.

## 4. Gotchas

**`.value` is explicit.** Svelte 5's compiler hides the `.value` access — `count` reads / writes go through the rune's getter / setter under the hood. Kerf is explicit: `count.value` to read, `count.value = ...` to write. This is the single largest mental-syntax shift coming from Svelte.

**No `.svelte` file format means no template DSL.** No `{#if}`, no `{#each}`, no `{:else}`, no `bind:`, no `class:`, no `on:`. Conditional rendering is JSX ternaries; iteration is `each()`; events are `delegate()`. Some of these are wins (JSX expressions are more flexible than `{#if}`/`{:else}` chains; `each()`'s row-memoization is automatic); some are tradeoffs (no `class:active={cond}` sugar — write a template literal instead).

**No scoped CSS.** Svelte's `<style>` block scopes selectors to the component automatically. Kerf doesn't — bring your own CSS strategy (CSS modules, BEM, utility classes, plain global stylesheets).

**No `bind:`.** Svelte's `bind:value={x}` is two pieces under the hood: render `x` as the `value` attribute, and write back on `input`. In kerf you write both halves explicitly — `value={signal.value}` in the JSX, and a `delegate('input', ...)` to write back. More lines; every wire is visible.

**Components are calls, not declarations.** `<MyComponent props />` works in kerf JSX — it calls `MyComponent(props)` and uses the returned JSX — but there's no instance, no `$props()` call, no lifecycle (`onMount` / `onDestroy`). State lives in module scope or in a `defineStore`. Setup/teardown code goes in a top-level `effect()` (with its return value as the teardown).

**Stores look different.** Svelte stores (`writable`, `readable`, `derived`) wrap an object with `.subscribe()` / `.set()` / `.update()`. Kerf's `defineStore({ initial, actions })` is closer to a Redux-style "named state + named actions + reset" shape. The `$store` auto-subscribe sugar doesn't exist — read `store.state.value.field` inside the render fn.

**No `$:` reactive statements.** Svelte's `$: doubled = count * 2` becomes `const doubled = computed(() => count.value * 2)`. Side-effecting `$:` statements become `effect(() => { ... })`.

## 5. Perf numbers

Cross-framework perf comparisons are only published from official benchmark runs — clean machine, no background load, results re-generated under controlled conditions. Svelte isn't currently in the kerf comparison set in `bench/results.md`; on the public krausest leaderboard, Svelte 5 sits at the top of the keyed-cluster, comparable to Solid and ahead of most runtime-only frameworks (including kerf). The deciding factor between the two frameworks is the compiler / template-DSL / runtime-readability tradeoff in §1–§4, not row-update latency. If raw partial-update / select-row throughput is your primary decision driver, Svelte 5 or Solid will outperform kerf on those specific benchmarks.

[See the full bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
