---
title: Coming from Vue
description: A side-by-side translation of a TodoMVC from Vue 3 (Composition API + SFC) to Kerf. Bundle delta, ref/reactive → signals, and the gotchas a Vue dev hits first.
---

You wrote a Vue 3 app. You're reading this because the runtime is bigger than you wanted, or you've decided the SFC compiler is a piece of build infrastructure you'd rather not maintain, or you want to see what fine-grained reactivity looks like without templates. This page translates the same TodoMVC — store, keyed list, persistence, focus survival on the new-todo input — from Vue 3 Composition API to kerf, section by section.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/) and you're looking at the same bytes the snippets below show.

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `vue` 3.x (runtime, no compiler) | ~22 KB |
| `kerfjs` (incl. signals) | ~11 KB |
| **Delta** | **~11 KB lighter** |

Vue's runtime is one of the smaller "full framework" runtimes; the trade you're making isn't primarily bundle. It's the SFC compiler (`vite-plugin-vue` / `@vue/compiler-sfc`), the template DSL, the directive system (`v-if` / `v-for` / `v-model`), and the reactivity-via-proxy model. Kerf is plain JSX, plain functions, fine-grained signals from `@preact/signals-core`, and a `delegate()`-based event model. Same shape of reactivity (read inside a tracked context, write to re-run); different surface.

## 2. Mental-model translations

| Vue 3 | Kerf | Notes |
| --- | --- | --- |
| `ref(initial)` | `signal(initial)` | Read with `s.value`, write with `s.value = ...` — same as Vue's `.value` convention. |
| `reactive({...})` | `defineStore({ initial, actions })` or nested `signal()` | Kerf doesn't have a deep-proxy primitive; either flatten to named signals or wrap the object in a store. |
| `computed(() => ...)` | `computed(() => ...)` | Same name, same idea, auto-tracked deps. |
| `watch(src, fn)` / `watchEffect(fn)` | `effect(fn)` | `effect` is the `watchEffect` equivalent (auto-tracks reads). For explicit-source watching, `effect(() => { src.value; fn(); })`. |
| `<template>` | JSX (HTML strings) | No template DSL — use JSX expressions. `v-if` → `cond ? <a/> : <b/>`. |
| `v-for="item in items" :key="item.id"` | `each(items, render, key)` plus `data-key={item.id}` | Two keys: the DOM-identity attribute (`data-key`) and the row-memoization function (`each`'s third arg). |
| `@click="handler"` | `delegate(root, 'click', '[data-action="..."]', handler)` | One listener at the root, survives every re-render. |
| `v-model="x"` | listener on `'input'` / `'change'` + read from `el.value` | No two-way binding sugar; bind explicitly in your `delegate` handler. |
| `provide` / `inject` | module-level signal or `defineStore` | No component tree to traverse; state is in modules. |
| `<KeepAlive>` | `data-morph-skip` / `data-morph-skip-children` | Mark a host element; the reconciler leaves the subtree alone. |
| SFC `<style scoped>` | plain CSS file + class names | No scoped styles built in — bring your own (CSS modules, BEM, etc.). |
| `defineComponent({ props, setup })` | plain function `(props) => SafeHtml` | No instance, no `setup()` lifecycle, no `props` declaration object. |

## 3. Side-by-side code

The same TodoMVC, section by section. Each kerf block matches `site/src/examples/complete/todomvc/main.tsx` line for line — click **Run live** above to see it running.

### 3a. State

```vue
<!-- Vue 3 SFC -->
<script setup lang="ts">
import { ref, watch } from 'vue';

interface Todo { id: string; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done';

const STORAGE_KEY = 'vue-todomvc';

const items     = ref<Todo[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
const filter    = ref<Filter>('all');
const editingId = ref<string | null>(null);

watch(items, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true });
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

What moved: Vue's three `ref` calls become one `defineStore` (kerf prefers grouping related state behind named actions). Vue's `watch(..., { deep: true })` becomes an `effect()` that reads `todos.state.value.items` — auto-tracked, no `deep` option. The `load()` helper is the same in both.

### 3b. Render

```vue
<!-- Vue 3 template -->
<template>
  <div class="todoapp">
    <header>
      <h1>todos</h1>
      <input
        class="new-todo"
        placeholder="What needs to be done?"
        @keydown.enter="addFromEvent"
        autofocus
      />
    </header>
    <!-- list goes here -->
  </div>
</template>
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

What moved: the SFC `<template>` block becomes a JSX expression inside `mount()`. Vue's `@keydown.enter` event modifier doesn't exist in kerf — the Enter check happens inline in the `delegate` handler in §3d. `class="new-todo"` is identical (kerf uses the HTML attribute name; Vue does too). `mount(root, () => ...)` replaces `createApp(App).mount('#app')`; the function passed to `mount` re-runs whenever any signal it reads changes.

### 3c. Keyed list

```vue
<!-- Vue 3 template -->
<ul class="todo-list">
  <li
    v-for="todo in items.filter((it) => filter === 'active' ? !it.done : filter === 'done' ? it.done : true)"
    :key="todo.id"
    :class="{ done: todo.done, editing: editingId === todo.id }"
  >
    <template v-if="editingId === todo.id">
      <input class="edit" :value="todo.text" autofocus />
    </template>
    <template v-else>
      <input type="checkbox" :checked="todo.done" @change="toggle(todo.id)" />
      <label @dblclick="editingId = todo.id">{{ todo.text }}</label>
      <button @click="remove(todo.id)">×</button>
    </template>
  </li>
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

What moved: `v-for` → `each(items, render, cacheKey)`. Vue's single `:key="todo.id"` becomes two values in kerf — `data-key={todo.id}` on the rendered `<li>` (the morph uses this to identify the row across renders, preserving focus on insert/delete) and the third arg to `each` (a per-row cache key for skipping re-render when the row's memoization-relevant state is unchanged). Vue's `v-if`/`v-else` blocks become a ternary expression in JSX; the `:class` binding becomes a template literal.

Inline `@change`/`@click`/`@dblclick` handlers move to `delegate()` calls in §3d — there are no inline event handlers in kerf JSX.

### 3d. Events

```vue
<!-- Vue 3 — handlers inline on JSX nodes -->
<input type="checkbox" :checked="todo.done" @change="toggle(todo.id)" />
<button @click="remove(todo.id)">×</button>
<label @dblclick="editingId = todo.id">{{ todo.text }}</label>
<input class="new-todo" @keydown.enter="addFromEvent" />
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

What moved: every per-node handler collapses into one `delegate(root, type, selector, fn)` call that survives every re-render. The Enter check (Vue: `@keydown.enter`) is now an explicit early-return in the handler. Blur — which doesn't bubble — uses `delegateCapture` (Tier 2 in kerf's listener model).

### 3e. Focus survival

In Vue: focus survival in a `v-for` works when keys are stable; if you re-sort items or splice the array, the focused `<input>` may end up bound to a different row's DOM node and lose its caret position. Vue's recommended fix is a `ref` + `nextTick(() => el.focus())`.

In kerf: focus + caret position + selection range on the currently-focused input are saved before the morph and restored after. You don't write the code. This is the morph's job, and it stays out of your way. Try it in the [live TodoMVC](/kerf/examples/complete/todomvc/): type into the new-todo while items are added, toggled, deleted, reordered, filtered — your caret never moves.

## 4. Gotchas

**No deep-reactive proxies.** Vue's `reactive({...})` makes every nested property tracked automatically. Kerf doesn't — `signal()` tracks the signal itself, not the value inside it. For nested state, either flatten into named signals (`const userName = signal(''); const userAge = signal(0)`) or wrap the whole object in `defineStore` and update it via actions that call `set({...})`. The latter is the more common shape.

**No template DSL means no `v-model`.** Vue's two-way binding (`v-model="x"`) is two pieces: render `x.value` as the `value` attribute, and write back on `input` / `change`. In kerf you write both halves explicitly — `value={signal.value}` in the JSX, and `delegate(root, 'input', '[data-name="x"]', (e, el) => signal.value = el.value)` in the event setup. More lines, but every wire is visible.

**No SFC = no scoped styles.** `<style scoped>` doesn't exist. Use any CSS strategy you already know (CSS modules, BEM, utility classes, plain global stylesheets). Kerf doesn't ship a styling story.

**`computed` returns a ReadonlySignal, not a getter.** Vue's `computed(() => ...)` returns an object you read with `.value`; same in kerf, but the kerf signal is typed as `ReadonlySignal<T>`. Writing to `.value` is a TypeScript error.

**No `nextTick`.** Vue queues DOM updates and flushes them on `nextTick`. Kerf's `mount()` re-renders synchronously inside the `effect` it wraps — when your handler finishes mutating signals, the morph has already happened. If you need to wait for a render boundary, batch multiple writes with `batch(() => { ... })` so they collapse into one effect run.

**Components are calls, not declarations.** `<MyComponent props />` works in kerf JSX — it calls `MyComponent(props)` and uses the returned JSX — but there's no instance, no `setup`, no lifecycle hooks (`onMounted`, `onBeforeUnmount`). State lives in module scope or in a `defineStore`. Any code you'd put in `onMounted` runs at module load or inside the `mount()` callback's first invocation.

**Directives don't exist.** No `v-if`, no `v-show`, no `v-for`, no `v-model`, no `v-bind`, no `v-on`, no custom directives. Conditional rendering is JSX ternaries; iteration is `each()`; binding is JSX attribute expressions; events are `delegate()`.

## 5. Perf numbers

Cross-framework perf comparisons are only published from official benchmark runs — clean machine, no background load, results re-generated under controlled conditions. On the most recent run, kerf and Vue 3 sit in the same performance cluster on most [krausest js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) keyed scenarios. Vue's compiler-driven update path has a slight edge on `partial update` and `select row`; kerf's runtime-driven path is competitive on `remove row` and `clear`. The deciding factor between the two frameworks is the bundle / template-DSL / SFC-compiler tradeoff in §1–§4, not row-update latency.

[See the full bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
