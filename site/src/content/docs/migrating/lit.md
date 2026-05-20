---
title: Coming from Lit
description: A side-by-side translation of a TodoMVC from Lit 3 to Kerf. Bundle delta, LitElement → mount, reactive properties → signals, and the gotchas a Lit dev hits first.
---

Lit and kerf land in similar bundle territory (~6 KB each), so this isn't a "size cliff" migration — it's a "what shape do I want my code to be" decision. The Lit way is web components + tagged templates + Shadow DOM. The kerf way is module-scoped signals + JSX + light DOM. The side-by-side below makes the trade concrete.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/).

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `lit` 3.2 (lit-html + lit-element) | ~6 KB |
| `kerfjs` 0.5 (incl. signals) | ~6.5 KB |
| **Delta** | roughly a wash |

You're not migrating for bytes. You're migrating because:

- You're tired of Shadow DOM CSS scoping (or you want it, and want it to be the consumer's choice not the framework's).
- You want JSX with type-checked element/attribute names instead of tagged-template strings the IDE can't fully validate.
- Web components aren't paying for themselves in your codebase — nobody's reusing your `<custom-todo>` outside this app, but every developer pays the closed-shadow-tree debugging cost.

## 2. Mental-model translations

| Lit | Kerf | Notes |
| --- | --- | --- |
| `class App extends LitElement` | plain function returning JSX | No class, no instance, no element registration. |
| `@property() count = 0` | `signal(0)` | Module-scoped, not per-instance. Read with `s.value`, write with `s.value = ...`. |
| `@state() open = false` | `signal(false)` | Same — `@state` was just the "don't expose as attribute" variant. |
| `render() { return html\`...\` }` | `mount(root, () => <...>)` | The function re-runs on every signal change. |
| `html\`<div>${name}</div>\`` | `<div>{name}</div>` (JSX) | Tagged template → JSX. |
| `repeat(items, (it) => it.id, (it) => html\`...\`)` | `each(items, (it) => <.../>, (it) => it.id)` | Same three-arg shape; args reordered. |
| `@click=${fn}` | `delegate(root, 'click', '[data-action="..."]', fn)` | One delegated listener per action. |
| `?disabled=${flag}` | `disabled={flag}` | Boolean attributes work natively in JSX. |
| `.prop=${value}` | `value={value}` | JSX writes properties or attributes — same surface as Lit. |
| `connectedCallback / disconnectedCallback` | `effect()` / its returned unsubscribe | No per-instance lifecycle; effects scope to the module. |
| `:host { ... }` CSS | consumer's stylesheet | Light DOM — bring your own scoping (BEM, CSS modules, scoped CSS). |
| `slot` / `slotchange` | render the children inline | No Shadow DOM, no slots. |
| `customElements.define('x-app', App)` | `mount(document.getElementById('app'), () => ...)` | No registration, no element name. |
| `updated(changedProperties)` | `effect(() => { read sig.value; do thing })` | Read the signals you care about inside an effect. |

## 3. Side-by-side code

The same TodoMVC, section by section. The Lit side uses `LitElement` + tagged-template `html\`...\``; the kerf side matches `site/src/examples/complete/todomvc/main.tsx` line for line.

### 3a. State

```ts
// Lit
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

interface Todo { id: string; text: string; done: boolean }

@customElement('todo-app')
export class TodoApp extends LitElement {
  @state() items: Todo[] = JSON.parse(localStorage.getItem('lit-todomvc') ?? '[]');
  @state() filter: 'all' | 'active' | 'done' = 'all';
  @state() editingId: string | null = null;

  updated() {
    localStorage.setItem('lit-todomvc', JSON.stringify(this.items));
  }
  // ...
}
```

```ts
// Kerf
import { defineStore, mount, each, delegate, delegateCapture, effect } from 'kerfjs';

interface Todo { id: string; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done';

const todos = defineStore({
  initial: () => ({ items: load(), filter: 'all' as Filter, editingId: null as string | null }),
  actions: (set, get) => ({
    add: (text: string) => { /* ... */ },
    toggle: (id: string) => { /* ... */ },
    // ...
  }),
});

effect(() => {
  localStorage.setItem('kerf-todomvc', JSON.stringify(todos.state.value.items));
});
```

What moved: three `@state` properties on the element collapse into one `defineStore`. `updated()` (which fires on every property change) becomes a top-level `effect()` that auto-tracks `items` — note that Lit's `updated()` runs *after* render, on every render, regardless of whether `items` actually changed; kerf's `effect` only re-runs when `items` changes.

### 3b. Render

```ts
// Lit
render() {
  return html`
    <div class="todoapp">
      <header>
        <h1>todos</h1>
        <input
          class="new-todo"
          placeholder="What needs to be done?"
          @keydown=${(e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            const input = e.currentTarget as HTMLInputElement;
            this.items = [...this.items, { id: crypto.randomUUID(), text: input.value, done: false }];
            input.value = '';
          }}
          autofocus
        />
      </header>
      ${this.renderList()}
    </div>
  `;
}
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

What moved: `render()` → the function passed to `mount()`. The handler-on-element pattern (`@keydown=${fn}`) moves out — see §3d. The tagged-template string becomes JSX; if you're using TypeScript, every tag name and attribute is now type-checked against `JSX.IntrinsicElements`, which catches typos that Lit's templates couldn't.

### 3c. Keyed list

```ts
// Lit
private renderList() {
  const visible = this.items.filter((it) =>
    this.filter === 'active' ? !it.done : this.filter === 'done' ? it.done : true,
  );
  return html`
    <ul class="todo-list">
      ${repeat(
        visible,
        (todo) => todo.id,
        (todo) => html`
          <li class="${todo.done ? 'done' : ''} ${this.editingId === todo.id ? 'editing' : ''}">
            ${this.editingId === todo.id
              ? html`<input class="edit" .value=${todo.text} autofocus />`
              : html`
                <input type="checkbox" .checked=${todo.done}
                       @change=${() => this.toggle(todo.id)} />
                <label @dblclick=${() => (this.editingId = todo.id)}>${todo.text}</label>
                <button class="destroy" @click=${() => this.remove(todo.id)}>×</button>
              `}
          </li>
        `,
      )}
    </ul>
  `;
}
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

What moved: `repeat(items, keyFn, renderFn)` → `each(items, renderFn, keyFn)`. Same three arguments, reordered: kerf puts the renderer second because it's the visually-largest argument and reads more naturally that way. The DOM-identity key moves from `repeat`'s `keyFn` argument to the row's `data-key={todo.id}` attribute (the morph uses it to identify the row across renders); kerf's third argument is a *memo* key (sometimes you want it to encode mode, e.g. `view` vs `edit`, so changing modes invalidates the row cache).

Lit's `.checked=${flag}` and `?disabled=${flag}` boolean-attribute / property syntax becomes plain JSX: `checked={flag}`, `disabled={flag}`. The runtime decides per-attribute whether to set a property or an attribute.

### 3d. Events

```ts
// Lit — handlers are inline, captured per render
html`<input type="checkbox" @change=${() => this.toggle(todo.id)} />`
html`<button @click=${() => this.remove(todo.id)}>×</button>`
html`<label @dblclick=${() => (this.editingId = todo.id)}>${todo.text}</label>`
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

What moved: every `@event=${fn}` template binding consolidates into a handful of `delegate()` calls at module scope. They register once and survive every re-render. Blur — which doesn't bubble — uses `delegateCapture` (Tier 2). Lit handled non-bubblers transparently because each listener was attached to the element directly; kerf's listener model is "one listener on the root, matched by selector," which is two more lines for non-bubblers and a lot fewer listener bytes overall.

### 3e. Styling

```ts
// Lit — styles are scoped via Shadow DOM
@customElement('todo-app')
export class TodoApp extends LitElement {
  static styles = css`
    :host { display: block; max-width: 550px; }
    .todoapp { background: white; }
    .todo-list li.done label { text-decoration: line-through; }
  `;
}
```

```css
/* Kerf — bring your own stylesheet, scoped the way you choose */
/* site/src/examples/complete/todomvc/style.css */
.todoapp { display: block; max-width: 550px; background: white; }
.todoapp .todo-list li.done label { text-decoration: line-through; }
```

What moved: `:host { ... }` becomes a wrapper-class selector. `static styles = css\`...\`` becomes a plain stylesheet imported at the entry point. Scoping is the consumer's problem — BEM, CSS modules, scoped CSS via Vite, Tailwind, plain class names. Kerf doesn't have an opinion.

## 4. Gotchas

**No Shadow DOM.** Your styles leak into the page (and the page's styles leak into your component). This is the single biggest mental shift coming from Lit. The fix is the same as for any non-Shadow framework: pick a CSS scoping convention (BEM / CSS modules / scoped styles / utility-class library) and stick to it.

**No slot composition.** Slots are a web-components feature; kerf doesn't have them. Renderable children are passed as function arguments instead — pass the JSX as a parameter and call `{children}` where you want it.

**No element registration.** There's no `customElements.define('x-app', ...)`. Kerf doesn't make components into elements; it puts plain JS modules into existing elements via `mount()`. The corollary: you can't put `<my-todo>` in HTML anywhere on the page and expect it to upgrade — you have to call `mount(target, render)` for each instance.

**Reactive properties were per-instance; signals are module-scoped.** Lit's `@property name = ''` gave you per-element state; signals are shared across every render that imports them. If you genuinely need per-instance state (because the same module is mounted multiple times), pass an `ownSignal = signal(initialFor(target))` to the render function — but consider whether you actually need that.

**`updated()` ran on every render; `effect()` only re-runs when its signals change.** This is usually a feature — fewer redundant runs — but if you had logic in `updated()` that depended on Lit's "fire after every render regardless" semantics, port it to a counter signal you bump manually.

**No `:host` styling.** Whatever a `:host { display: block }` was doing for you, you now do on the mount target directly (`<div id="app" style="display: block">`) or on a wrapper element in your JSX.

**`@click=${fn}` becomes `delegate()`.** Don't try `onClick={fn}` in kerf JSX — that renders as `onclick="fn"` and breaks. Handlers are wired via `delegate(root, type, selector, fn)` at module scope.

**Property vs attribute is automatic.** Lit's `.value=${x}` (property) vs `value=${x}` (attribute) distinction is one place kerf is less explicit: `value={x}` in JSX is decided per-element by kerf's runtime. For `input.value` specifically, kerf does the right thing (sets the property when the input is focused, sets the attribute otherwise). If you need ultra-explicit control, use the `el` argument inside a `delegate` handler.

**Decorators aren't required.** Lit leans on TC39 decorators (`@customElement`, `@property`, `@state`). Kerf doesn't use any. If decorator support was a bandage you were tolerating, this is good news.

## 5. Perf numbers

Cross-framework perf comparisons are only published from official benchmark runs — clean machine, no background load, results re-generated under controlled conditions. On the most recent run committed at [`bench/results.md`](https://github.com/brianwestphal/kerf/blob/main/bench/results.md): Lit 3 and kerf are in the same performance cluster on the [krausest js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) keyed scenarios; Lit edges kerf on create-row and partial-update, kerf edges Lit on select-row, swap-rows, and remove-row. The deciding factor between the two frameworks is the Shadow-DOM / web-components question in §4, not raw row-update latency.

[See the full bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
