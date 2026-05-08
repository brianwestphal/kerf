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

const subtotal = computed(() => cart.state.value.items.reduce((s, it) => s + it.price, 0));

const root = document.getElementById('app')!;

mount(root, () => (
  <div>
    <ul style="padding-left: 1.25rem; line-height: 1.8;">
      {cart.state.value.items.map((it) => (
        <li data-key={it.id}>
          {it.name} — ${it.price}
          <button data-action="remove" data-id={it.id} style="margin-left: 0.5rem;">×</button>
        </li>
      ))}
    </ul>
    <p><strong>Subtotal: ${subtotal.value}</strong></p>
    <button data-action="clear">Clear cart</button>
    <button data-action="reset" style="margin-left: 0.5rem;">Reset to initial</button>
  </div>
));

delegate(root, 'click', '[data-action="remove"]', (_, btn) => {
  cart.actions.remove((btn as HTMLElement).dataset.id!);
});
delegate(root, 'click', '[data-action="clear"]', () => cart.actions.clear());
delegate(root, 'click', '[data-action="reset"]', () => cart.reset());
