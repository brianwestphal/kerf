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
                    {...ACTIONS.toggle.attrs}
                    {...ITEM.id(todo.id)}
                    checked={todo.done}
                  />
                  <label {...ACTIONS.edit.attrs} {...ITEM.id(todo.id)}>{todo.text}</label>
                  <button class="destroy" {...ACTIONS.remove.attrs} {...ITEM.id(todo.id)}>×</button>
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
          <li><a {...ACTIONS.filter.attrs} data-value="all" class={filter === 'all' ? 'selected' : ''}>All</a></li>
          <li><a {...ACTIONS.filter.attrs} data-value="active" class={filter === 'active' ? 'selected' : ''}>Active</a></li>
          <li><a {...ACTIONS.filter.attrs} data-value="done" class={filter === 'done' ? 'selected' : ''}>Done</a></li>
        </ul>
        <button class="clear-done" {...ACTIONS.clearDone.attrs}>Clear completed</button>
      </footer>
    </div>
  );
});

// Page-lifetime registrations: `root` is the TodoMVC mount root, attached
// once at module load and never torn down. The leading `void` is the
// explicit-discard sigil for `kerfjs/require-delegate-disposer` — it signals
// "I know this is page-lifetime and intentionally discarded the disposer"
// instead of leaving the call looking like an accidental discard. For
// transient roots (modals, route views, mount swaps) capture and call the
// disposer — see docs/5-event-delegation.md §5.3.

// Tier 1: clicks bubble.
void delegate(root, 'click', ACTIONS.toggle.selector, (_e, el) => {
  todos.actions.toggle((el as HTMLElement).dataset.id!);
});
void delegate(root, 'click', ACTIONS.remove.selector, (_e, el) => {
  todos.actions.remove((el as HTMLElement).dataset.id!);
});
void delegate(root, 'click', ACTIONS.edit.selector, (_e, el) => {
  todos.actions.startEdit((el as HTMLElement).dataset.id!);
});
void delegate(root, 'click', ACTIONS.filter.selector, (_e, el) => {
  todos.actions.setFilter((el as HTMLElement).dataset.value as Filter);
});
void delegate(root, 'click', ACTIONS.clearDone.selector, () => todos.actions.clearDone());

// Enter on the new-todo input.
void delegate(root, 'keydown', '[data-new]', (e, el) => {
  const ev = e as KeyboardEvent;
  if (ev.key !== 'Enter') return;
  const input = el as HTMLInputElement;
  todos.actions.add(input.value);
  input.value = '';
});

// Enter / Esc on the edit input.
void delegate(root, 'keydown', '[data-edit]', (e, el) => {
  const ev = e as KeyboardEvent;
  const input = el as HTMLInputElement;
  if (ev.key === 'Enter') {
    todos.actions.commitEdit(input.dataset.id!, input.value);
  } else if (ev.key === 'Escape') {
    todos.actions.cancelEdit();
  }
});

// Tier 2: blur is a non-bubbler — must use delegateCapture.
void delegateCapture(root, 'blur', '[data-edit]', (_e, el) => {
  const input = el as HTMLInputElement;
  if (todos.state.value.editingId === input.dataset.id) {
    todos.actions.commitEdit(input.dataset.id!, input.value);
  }
});
