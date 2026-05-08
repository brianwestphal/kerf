---
title: TodoMVC
description: The standard reference app, done well in kerf — store, keyed list, delegated events, localStorage.
---

**[▶ Run live](/kerf/run/todomvc/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc)

The classic TodoMVC, implemented in kerf. ~150 lines. Persists across reloads via `localStorage`. Editing a todo by double-click; **Esc** cancels, **Enter** or blur commits. The new-todo input keeps focus and cursor position even when the list reorders around it.

**What to look at:**

- **One store** holds items, filter, and the in-edit id. All state changes go through named actions.
- **`effect()` round-trips to `localStorage`** — read on startup, write on every state change. No middleware, no plugin.
- **Memo key includes the edit state** — `\`${todo.id}-${editingId === todo.id ? 'edit' : 'view'}\`` — so the row's HTML is recomputed when it flips between view and edit modes, but cached otherwise.
- **`delegateCapture('blur', ...)`** for the edit input commits on blur. `blur` doesn't bubble, so capture-phase is required.
- **Focus survival is automatic** — typing into the new-todo while items are added/toggled never disturbs the cursor.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc)

```tsx
// site/src/examples/complete/todomvc/main.tsx
import { defineStore, mount, each, delegate, delegateCapture, effect } from 'kerfjs';

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
      set({ items: [...get().items, { id: crypto.randomUUID(), text: t, done: false }] });
    },
    toggle: (id: string) => set({
      items: get().items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    }),
    remove: (id: string) => set({ items: get().items.filter((it) => it.id !== id) }),
    clearDone: () => set({ items: get().items.filter((it) => !it.done) }),
    setFilter: (filter: Filter) => set({ filter }),
    startEdit: (id: string) => set({ editingId: id }),
    commitEdit: (id: string, text: string) => {
      const t = text.trim();
      if (!t) {
        set({ items: get().items.filter((it) => it.id !== id), editingId: null });
        return;
      }
      set({
        items: get().items.map((it) => (it.id === id ? { ...it, text: t } : it)),
        editingId: null,
      });
    },
    cancelEdit: () => set({ editingId: null }),
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
      {/* …header / list / footer JSX (full source on GitHub)… */}
    </div>
  );
});

// Tier 1 click delegations:
delegate(root, 'click', '[data-action="toggle"]', (_e, el) => todos.actions.toggle((el as HTMLElement).dataset.id!));
delegate(root, 'click', '[data-action="remove"]', (_e, el) => todos.actions.remove((el as HTMLElement).dataset.id!));
delegate(root, 'click', '[data-action="edit"]',   (_e, el) => todos.actions.startEdit((el as HTMLElement).dataset.id!));
delegate(root, 'click', '[data-action="filter"]', (_e, el) => todos.actions.setFilter((el as HTMLElement).dataset.value as Filter));
delegate(root, 'click', '[data-action="clear-done"]', () => todos.actions.clearDone());

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
