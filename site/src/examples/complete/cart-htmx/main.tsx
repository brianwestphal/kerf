// kerf + htmx composition demo.
//
// Real htmx fires `htmx:afterSwap` after each swap; on that event the host
// page finds any kerf-managed root inside the swapped HTML and mounts kerf
// onto it. This file simulates the same composition with a button-triggered
// swap so the demo runs against a static server (no backend required).
//
// Mirrors the worked example in site/src/content/docs/migrating/htmx.md §3.

import { signal, mount, each, delegate, attr, type AttrSpec } from 'kerfjs';

const ACTIONS = { remove: attr('data-action', 'remove') } as const satisfies Record<string, AttrSpec<'data-action'>>;
const ITEM = { id: attr('data-id') } as const;

interface CartItem { id: string; name: string; price: number }

const SHELL_VARIANTS: CartItem[][] = [
  [
    { id: 'a', name: 'Espresso', price: 3 },
    { id: 'b', name: 'Croissant', price: 4 },
    { id: 'c', name: 'Notebook', price: 12 },
  ],
  [
    { id: 'd', name: 'Tea', price: 2 },
    { id: 'e', name: 'Scone', price: 3 },
  ],
];

let variantIndex = 0;
let activeDispose: (() => void) | null = null;

const shell = document.getElementById('cart-shell') as HTMLElement;
const log = document.getElementById('log') as HTMLElement;

function logLine(msg: string): void {
  const t = new Date().toISOString().slice(11, 19);
  log.textContent = `[${t}] ${msg}\n` + log.textContent;
}

function simulateSwap(initial: CartItem[]): void {
  if (activeDispose) {
    activeDispose();
    activeDispose = null;
    logLine('disposed previous kerf mount');
  }
  // Server-rendered shell would arrive as HTML. We inline the same HTML the
  // server would have returned — the inner content is the empty-shell layout
  // that kerf will then hydrate via mount().
  shell.innerHTML = `
    <div data-cart-island data-initial='${JSON.stringify(initial)}'>
      <h2>Cart</h2>
      <ul class="cart-items"></ul>
      <p class="total"></p>
    </div>
  `;
  logLine(`swapped shell with ${initial.length} initial items`);

  // Real htmx: this runs in a `document.body.addEventListener('htmx:afterSwap', ...)` handler.
  const root = shell.querySelector('[data-cart-island]') as HTMLElement;
  const parsed = JSON.parse(root.dataset.initial!) as CartItem[];
  const items = signal<CartItem[]>(parsed);

  const stopMount = mount(root, () => (
    <div data-cart-island>
      <h2>Cart</h2>
      <ul class="cart-items">
        {items.value.length === 0 ? (
          <li><span class="empty">Cart is empty.</span></li>
        ) : (
          each(
            items.value,
            (it) => (
              <li data-key={it.id}>
                <span>{it.name} — ${it.price}</span>
                <button class="remove" {...ACTIONS.remove.attrs} {...ITEM.id(it.id)}>×</button>
              </li>
            ),
            (it) => it.id,
          )
        )}
      </ul>
      <p class="total">Total: ${items.value.reduce((s, it) => s + it.price, 0)}</p>
    </div>
  ));

  const stopDelegate = delegate(root, 'click', ACTIONS.remove.selector, (_e, btn) => {
    const id = (btn as HTMLElement).dataset.id;
    items.value = items.value.filter((it) => it.id !== id);
    logLine(`removed ${id} — ${items.value.length} items left`);
  });

  activeDispose = () => {
    stopMount();
    stopDelegate();
  };
  logLine('kerf mount complete');
}

document.getElementById('load-cart')!.addEventListener('click', () => {
  variantIndex = 0;
  simulateSwap(SHELL_VARIANTS[0]!);
});

document.getElementById('reload-cart')!.addEventListener('click', () => {
  variantIndex = (variantIndex + 1) % SHELL_VARIANTS.length;
  simulateSwap(SHELL_VARIANTS[variantIndex]!);
});
