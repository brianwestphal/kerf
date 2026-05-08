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

// Persist to localStorage on every items change.
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
      <header>
        <h1>todos</h1>
        <input
          class="new-todo"
          data-new
          placeholder="What needs to be done?"
          autofocus
        />
      </header>
      <ul class="todo-list">
        {each(
          visible,
          (todo) => (
            <li
              data-key={todo.id}
              class={`${todo.done ? 'done' : ''} ${editingId === todo.id ? 'editing' : ''}`}
            >
              {editingId === todo.id ? (
                <input class="edit" data-edit data-id={todo.id} value={todo.text} autofocus />
              ) : (
                <>
                  <input
                    type="checkbox"
                    class="toggle"
                    data-action="toggle"
                    data-id={todo.id}
                    checked={todo.done}
                  />
                  <label data-action="edit" data-id={todo.id}>{todo.text}</label>
                  <button class="destroy" data-action="remove" data-id={todo.id}>×</button>
                </>
              )}
            </li>
          ),
          (todo) => `${todo.id}-${editingId === todo.id ? 'edit' : 'view'}`,
        )}
      </ul>
      <footer class="footer">
        <span class="count">{remaining} item{remaining === 1 ? '' : 's'} left</span>
        <ul class="filters">
          <li><a data-action="filter" data-value="all" class={filter === 'all' ? 'selected' : ''}>All</a></li>
          <li><a data-action="filter" data-value="active" class={filter === 'active' ? 'selected' : ''}>Active</a></li>
          <li><a data-action="filter" data-value="done" class={filter === 'done' ? 'selected' : ''}>Done</a></li>
        </ul>
        <button class="clear-done" data-action="clear-done">Clear completed</button>
      </footer>
    </div>
  );
});

// Tier 1: clicks bubble.
delegate(root, 'click', '[data-action="toggle"]', (_e, el) => {
  todos.actions.toggle((el as HTMLElement).dataset.id!);
});
delegate(root, 'click', '[data-action="remove"]', (_e, el) => {
  todos.actions.remove((el as HTMLElement).dataset.id!);
});
delegate(root, 'click', '[data-action="edit"]', (_e, el) => {
  todos.actions.startEdit((el as HTMLElement).dataset.id!);
});
delegate(root, 'click', '[data-action="filter"]', (_e, el) => {
  todos.actions.setFilter((el as HTMLElement).dataset.value as Filter);
});
delegate(root, 'click', '[data-action="clear-done"]', () => todos.actions.clearDone());

// Enter on the new-todo input.
delegate(root, 'keydown', '[data-new]', (e, el) => {
  const ev = e as KeyboardEvent;
  if (ev.key !== 'Enter') return;
  const input = el as HTMLInputElement;
  todos.actions.add(input.value);
  input.value = '';
});

// Enter / Esc on the edit input.
delegate(root, 'keydown', '[data-edit]', (e, el) => {
  const ev = e as KeyboardEvent;
  const input = el as HTMLInputElement;
  if (ev.key === 'Enter') {
    todos.actions.commitEdit(input.dataset.id!, input.value);
  } else if (ev.key === 'Escape') {
    todos.actions.cancelEdit();
  }
});

// Tier 2: blur is a non-bubbler — must use delegateCapture.
delegateCapture(root, 'blur', '[data-edit]', (_e, el) => {
  const input = el as HTMLInputElement;
  if (todos.state.value.editingId === input.dataset.id) {
    todos.actions.commitEdit(input.dataset.id!, input.value);
  }
});
