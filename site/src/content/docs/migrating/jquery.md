---
title: Coming from jQuery
description: jQuery's .on() delegation is the closest mental analogue to kerf's delegate(). A side-by-side translation, plus the patterns that survive and the ones that change.
---

You have a jQuery codebase. You're reading this because you want to modernize without a full React-shaped rewrite, or because the imperative DOM-manipulation style that worked for years is starting to creak under a state model that grew bigger than `$(el).text(value)`. Kerf is the closest modern analogue to jQuery's *philosophy* — direct DOM operations, event delegation as the first-class event model, no virtual layer — with reactive state grafted on. This page makes that comparison concrete.

The kerf side is the exact code shipping at [`site/src/examples/complete/todomvc/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc) — [run it live](/kerf/examples/complete/todomvc/) and you're looking at the same bytes the snippets below show.

## 1. Bundle delta

| | Min + gz, runtime only |
| --- | --- |
| `jquery` 3.x | ~30 KB |
| `kerfjs` (incl. signals) | ~6.5 KB |
| **Delta** | **~23 KB lighter** |

The big win is bundle, but the real story is what you're getting in exchange: a state model. jQuery has none — you write `$(el).text(value)` everywhere and the source of truth is wherever you last wrote it. Kerf has `signal()` and `defineStore()`; the source of truth is the signal, and the DOM mirrors it.

## 2. Mental-model translations

| jQuery | Kerf | Notes |
| --- | --- | --- |
| `$(document).on('click', '.btn', fn)` | `delegate(root, 'click', '.btn', fn)` | Direct analog. Kerf's `delegate()` is the same `closest()`-style delegation as jQuery's `.on()`. |
| `$(target).text(value)` | render via JSX inside `mount(root, () => <div>{value.value}</div>)` | Push the text via a signal; let the morph apply the change. |
| `$(el).html(htmlString)` | `morph(el, htmlString)` | One-shot reconcile against an HTML string. |
| `$(el).addClass('done')` / `removeClass` | `class={done.value ? 'done' : ''}` in the JSX | Class is a function of state; not a thing you toggle imperatively. |
| `$(el).val()` / `.val(next)` | `el.value` (read) / `value={signal.value}` (render) | The DOM API directly for reading; render via JSX for the write side. |
| `$.ajax({...})` | `fetch(...)` | Modern browsers have `fetch` built in. |
| `$(el).find('.x')` | `el.querySelector('.x')` | Same idea, native API. |
| `$(el).data('id')` | `el.dataset.id` | Native. |
| `$(window).on('scroll', fn)` | `window.addEventListener('scroll', fn)` | Outside the mount tree, use native APIs directly — `delegate()` is for inside `mount()`'s root. |
| jQuery animations (`$(el).fadeIn()`) | CSS transitions + a class toggle | Animations live in CSS now; kerf doesn't bundle one. |
| jQuery plugins (`$(el).datepicker()`) | wrap the library subtree in `data-morph-skip` so kerf leaves it alone | The morph won't touch attributes or children of a `data-morph-skip` element. |

## 3. Side-by-side code

The same TodoMVC, section by section.

### 3a. State

```js
// jQuery — state lives in the DOM (the source of truth IS the DOM)
let items = JSON.parse(localStorage.getItem('jq-todomvc') ?? '[]');
let filter = 'all';
let editingId = null;

function persist() { localStorage.setItem('jq-todomvc', JSON.stringify(items)); }
function rerender() { /* manually rebuild $('.todo-list').html(...) from items */ }
```

```tsx
// Kerf — state lives in signals; the DOM is a function of state
import { defineStore, mount, each, delegate, delegateCapture, effect } from 'kerfjs';

const todos = defineStore({
  initial: () => ({ items: load(), filter: 'all', editingId: null as string | null }),
  actions: (set, get) => ({
    add: (text: string) => set({ ...get(), items: [...get().items, { id: crypto.randomUUID(), text, done: false }] }),
    toggle: (id: string) => set({ ...get(), items: get().items.map((t) => t.id === id ? { ...t, done: !t.done } : t) }),
    // ...
  }),
});

effect(() => {
  localStorage.setItem('kerf-todomvc', JSON.stringify(todos.state.value.items));
});
```

What moved: the biggest shift in the whole migration. In jQuery the DOM *is* the source of truth — your `rerender()` function rebuilds the DOM from `items`, and any code that wants to know what's there reads it back out of the DOM (or out of `items` and hopes they're in sync). In kerf the signal is the source of truth; the DOM is a render of the signal. You never write a `rerender()` function — the morph runs automatically when a signal you read changes.

### 3b. Render

```js
// jQuery — write a function that builds the HTML, call it whenever state changes
function rerender() {
  const visible = items.filter((t) =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true
  );
  const html = visible.map((todo) => `
    <li data-id="${todo.id}" class="${todo.done ? 'done' : ''} ${editingId === todo.id ? 'editing' : ''}">
      ${editingId === todo.id
        ? `<input class="edit" value="${escapeHtml(todo.text)}" />`
        : `<input type="checkbox" class="toggle" ${todo.done ? 'checked' : ''} />
           <label>${escapeHtml(todo.text)}</label>
           <button class="destroy">×</button>`
      }
    </li>
  `).join('');
  $('.todo-list').html(html);  // ⚠️ blows away focus, caret, listeners
}
```

```tsx
// Kerf — write JSX; the morph applies the minimum diff
mount(root, () => {
  const { items, filter, editingId } = todos.state.value;
  return (
    <ul class="todo-list">
      {each(
        items.filter(/* ... */),
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
  );
});
```

What moved: `$('.todo-list').html(html)` → `mount(root, () => <ul>...</ul>)`. The jQuery version blows away every DOM node inside `.todo-list` and rebuilds; the kerf version morphs — same DOM nodes survive when their `data-key` matches, focus is preserved, listeners are untouched (because they live on the root, not on the rebuilt nodes).

### 3c. Events

```js
// jQuery — same delegation idea kerf adopts
$('#root').on('click', '[data-action="toggle"]', function () {
  const id = $(this).data('id');
  /* toggle the item with that id, then rerender() */
});
$('#root').on('click', '[data-action="remove"]', function () { /* ... */ });
$('#root').on('keydown', '.new-todo', function (e) {
  if (e.key !== 'Enter') return;
  /* add the item, then rerender() */
});
$('#root').on('blur', '.edit', function () {  // ⚠️ blur doesn't bubble — jQuery's .on('blur') doesn't always work for delegation
  /* commit the edit */
});
```

```tsx
// Kerf
delegate(root, 'click', '[data-action="toggle"]', (_e, el) => {
  todos.actions.toggle((el as HTMLElement).dataset.id!);
});
delegate(root, 'click', '[data-action="remove"]', (_e, el) => {
  todos.actions.remove((el as HTMLElement).dataset.id!);
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

What moved: the delegation shape is identical. `$.on(root, type, selector, fn)` → `delegate(root, type, selector, fn)`. The biggest fix: jQuery silently doesn't handle non-bubbling events like `blur` and `focus` via delegation in all cases; kerf splits these out with `delegateCapture` (Tier 2) so you opt in explicitly. The other big improvement: you stop calling `rerender()` in the handler — the signal write triggers the morph automatically.

### 3d. Focus survival

In jQuery: every `$(el).html(...)` swap destroys the focused input. Preserving focus across a partial-update is your job — save the focused element's ID + caret position, do the swap, find it again, restore the caret. Tedious enough that most jQuery apps don't bother.

In kerf: focus + caret position + selection range on the currently-focused input are saved before the morph and restored after. Automatic.

## 4. Gotchas (the mental shifts)

**Stop calling `rerender()`.** Every signal write triggers the relevant `mount()`'s effect to re-run. Your event handler reads `(el as HTMLElement).dataset.id`, calls `todos.actions.toggle(id)`, and that's it — no `rerender()` call, no manual DOM walk.

**The DOM is not the source of truth anymore.** If you want to know whether a todo is done, you read `todos.state.value.items.find(t => t.id === id)?.done`, not `$(el).hasClass('done')`. The class is a *render* of the state, not the state itself. This is the largest mental shift in the migration.

**`$(el).attr()` is for reading; rendering happens through JSX.** You can still call `el.getAttribute('data-id')` in your event handler to read it; what changes is that you don't *write* attributes by mutating the DOM. You change the signal, and the new attribute appears via the morph.

**No `$.fn` plugins.** Plugins that wrap an element with imperative behavior (datepickers, masked inputs, charts) integrate by giving them a host element marked with `data-morph-skip`, then mounting the library imperatively. The morph won't touch the subtree, so the plugin's DOM stays untouched across re-renders.

**No `$.Deferred` / `$.ajax`.** Use `fetch()` and async/await. The `success` / `error` / `complete` callback model is replaced by the promise chain.

**No animation helpers.** `.fadeIn()` / `.slideDown()` / `.animate()` don't have kerf equivalents. Use CSS transitions: add a class via state, let CSS handle the animation. For complex animations, integrate a library and wrap its DOM in `data-morph-skip`.

**`this` binding changes.** jQuery's `.on('click', selector, function () { ... })` callback has `this` bound to the matched element. Kerf's `delegate(root, 'click', selector, (e, el) => ...)` passes the matched element as the second argument. No `this`-rebinding edge cases.

**JSX (and TypeScript) are now in play.** Kerf's JSX runtime needs `tsconfig.json` `"jsxImportSource": "kerfjs"`. Most jQuery codebases don't have a build step beyond concatenation; adding one is the single largest tooling change in the migration. The benefit (type-checked HTML attributes, autocompletion) is real but it's a real switch.

## 5. Migration strategy: incremental

The good news: kerf's delegation model maps onto jQuery's so directly that you can migrate one section of the page at a time. The recommended path:

1. Pick the smallest interactive island that has its own clear root element.
2. Replace its `$(...).html(...)` rebuild with a `mount(root, () => <jsx/>)` call.
3. Convert its `$(root).on(...)` handlers to `delegate(root, ...)` calls.
4. Move state from "wherever it lives" into a `signal()` or `defineStore`.
5. Wrap any plugin-managed subtree (datepicker, chart) in `data-morph-skip` to protect it.
6. Repeat on the next island.

You don't have to commit to a full rewrite to start. jQuery + kerf coexist on the same page fine — each can manage its own subtree.

## 6. Perf numbers

Performance comparisons between jQuery and kerf don't map onto the krausest benchmark because jQuery's idiomatic perf cost is wholesale-rebuild-then-walk-the-DOM, which scales differently than kerf's morph. In any app where jQuery is the bottleneck, kerf will be faster — not because kerf is intrinsically faster than `addEventListener` (it isn't; they share the same primitives) but because the morph + delegation model touches fewer nodes per update.

[See the kerf bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
