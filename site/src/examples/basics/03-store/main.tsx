import { defineStore, computed, mount, delegate } from 'kerfjs';

const cart = defineStore({
  initial: () => ({
    items: [
      { id: 'a', name: 'Saw',    price: 32 },
      { id: 'b', name: 'Plane',  price: 78 },
      { id: 'c', name: 'Chisel', price: 18 },
    ],
  }),
  actions: (set, get) => ({
    remove: (id: string) => set({ items: get().items.filter((it) => it.id !== id) }),
    clear:  ()           => set({ items: [] }),
  }),
});

const subtotal = computed(() =>
  cart.state.value.items.reduce((s, it) => s + it.price, 0),
);
const fmt = (n: number) => `$${n}`;

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="kerf-stack" style="max-width: 24rem;">
    <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem;">
      {cart.state.value.items.map((it) => (
        <li
          data-key={it.id}
          style="display: flex; align-items: center; gap: 0.75rem;"
        >
          <span style="flex: 1;">{it.name}</span>
          <span class="kerf-mono">{fmt(it.price)}</span>
          <button data-action="remove" data-id={it.id} aria-label={`Remove ${it.name}`}>×</button>
        </li>
      ))}
    </ul>
    <div class="kerf-output" style="display: flex; justify-content: space-between; align-items: center;">
      <strong>Subtotal</strong>
      <strong class="kerf-mono">{fmt(subtotal.value)}</strong>
    </div>
    <div class="kerf-toolbar">
      <button data-action="clear">Clear cart</button>
      <button
        class="kerf-link-button"
        data-action="reset"
        style="margin-left: auto;"
      >
        Reset to initial
      </button>
    </div>
  </div>
));

delegate(root, 'click', '[data-action="remove"]', (_, btn) => {
  cart.actions.remove((btn as HTMLElement).dataset.id!);
});
delegate(root, 'click', '[data-action="clear"]', () => cart.actions.clear());
delegate(root, 'click', '[data-action="reset"]', () => cart.reset());
