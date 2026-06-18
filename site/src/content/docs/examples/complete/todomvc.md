---
title: TodoMVC
description: The standard reference app, done well in kerf — store, keyed list, delegated events, localStorage.
---

**[▶ Run live](/kerf/run/todomvc/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc)

[![Animated preview: adding three todos and toggling one complete](/kerf/demos/todomvc.svg)](/kerf/run/todomvc/)

The classic TodoMVC, implemented in kerf. ~150 lines. Persists across reloads via `localStorage`. Editing a todo by double-click; **Esc** cancels, **Enter** or blur commits. The new-todo input keeps focus and cursor position even when the list reorders around it.

**What to look at:**

- **One store** holds items, filter, and the in-edit id. All state changes go through named actions.
- **`attr()` action map** — `ACTIONS.toggle` etc. is defined once; JSX spreads `{...ACTIONS.toggle.attrs}` (rename-safe, no hardcoded attribute name) and the delegate calls pass the pre-escaped `ACTIONS.toggle.selector`. Renaming the action in one place updates JSX + delegate together.
- **`effect()` round-trips to `localStorage`** — read on startup, write on every state change. No middleware, no plugin.
- **Memo key includes the edit state** — `\`${todo.id}-${editingId === todo.id ? 'edit' : 'view'}\`` — so the row's HTML is recomputed when it flips between view and edit modes, but cached otherwise.
- **`delegateCapture('blur', ...)`** for the edit input commits on blur. `blur` doesn't bubble, so capture-phase is required.
- **Focus survival is automatic** — typing into the new-todo while items are added/toggled never disturbs the cursor.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc)

```tsx
// site/src/examples/complete/todomvc/main.tsx
import { defineStore, mount, each, delegate, delegateCapture, effect, attr, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  toggle:    attr('data-action', 'toggle'),
  remove:    attr('data-action', 'remove'),
  edit:      attr('data-action', 'edit'),
  filter:    attr('data-action', 'filter'),
  clearDone: attr('data-action', 'clear-done'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;

const ITEM = { id: attr('data-id') } as const;

interface Todo { id: string; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done';

const STORAGE_KEY = 'kerf-todomvc';

function load(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
}

const todos = defineStore({
  initial: () => ({
    items: load(),
    filter: 'all' as Filter,
    editingId: null as string | null,
  }),
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
    clearDone: () => set({ ...get(), items: get().items.filter((it) => !it.done) }),
    setFilter: (filter: Filter) => set({ ...get(), filter }),
    startEdit: (id: string) => set({ ...get(), editingId: id }),
    commitEdit: (id: string, text: string) => {
      const t = text.trim();
      if (!t) {
        set({ ...get(), items: get().items.filter((it) => it.id !== id), editingId: null });
        return;
      }
      set({
        ...get(),
        items: get().items.map((it) => (it.id === id ? { ...it, text: t } : it)),
        editingId: null,
      });
    },
    cancelEdit: () => set({ ...get(), editingId: null }),
  }),
});

effect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.state.value.items));
});

const root = document.getElementById('app')!;

mount(root, () => {
  const { items, filter, editingId } = todos.state.value;
  const visible = items.filter((it) =>
    filter === 'active' ? !it.done : filter === 'done' ? it.done : true,
  );
  const remaining = items.filter((it) => !it.done).length;

  return (
    <div class="todoapp">
      <ul class="todo-list">
        {each(
          visible,
          (todo) => (
            <li data-key={todo.id} class={editingId === todo.id ? 'editing' : ''}>
              <input type="checkbox" {...ACTIONS.toggle.attrs} {...ITEM.id(todo.id)} checked={todo.done} />
              <label {...ACTIONS.edit.attrs} {...ITEM.id(todo.id)}>{todo.text}</label>
              <button {...ACTIONS.remove.attrs} {...ITEM.id(todo.id)}>×</button>
            </li>
          ),
          (todo) => `${todo.id}-${editingId === todo.id ? 'edit' : 'view'}`,
        )}
      </ul>
      <span>{remaining} left</span>
      <button {...ACTIONS.clearDone.attrs}>Clear completed</button>
    </div>
  );
});

// Tier 1 click delegations — `.selector` is pre-computed and CSS-escaped:
delegate(root, 'click', ACTIONS.toggle.selector, (_e, el) => todos.actions.toggle((el as HTMLElement).dataset.id!));
delegate(root, 'click', ACTIONS.remove.selector, (_e, el) => todos.actions.remove((el as HTMLElement).dataset.id!));
delegate(root, 'click', ACTIONS.edit.selector,   (_e, el) => todos.actions.startEdit((el as HTMLElement).dataset.id!));
delegate(root, 'click', ACTIONS.filter.selector, (_e, el) => todos.actions.setFilter((el as HTMLElement).dataset.value as Filter));
delegate(root, 'click', ACTIONS.clearDone.selector, () => todos.actions.clearDone());

// Enter on the new-todo input.
delegate(root, 'keydown', '[data-new]', (e, el) => {
  if ((e as KeyboardEvent).key !== 'Enter') return;
  const input = el as HTMLInputElement;
  todos.actions.add(input.value);
  input.value = '';
});

// Enter / Esc on the edit input.
delegate(root, 'keydown', '[data-edit]', (e, el) => {
  const ev = e as KeyboardEvent;
  const input = el as HTMLInputElement;
  if (ev.key === 'Enter') todos.actions.commitEdit(input.dataset.id!, input.value);
  else if (ev.key === 'Escape') todos.actions.cancelEdit();
});

// Tier 2 (capture): blur doesn't bubble.
delegateCapture(root, 'blur', '[data-edit]', (_e, el) => {
  const input = el as HTMLInputElement;
  if (todos.state.value.editingId === input.dataset.id) {
    todos.actions.commitEdit(input.dataset.id!, input.value);
  }
});
```
