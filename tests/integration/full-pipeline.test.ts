/**
 * Integration test — exercises every primitive together against a real DOM.
 *
 * Builds a small "cart" UI: a store with items + total, three independent
 * `mount()` regions (badge / list / footer), event delegation for add /
 * remove / clear, focus survival across re-renders, and reset semantics.
 *
 * If this test passes, the public API surface composes correctly end-to-end.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { delegate } from '../../src/delegate.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed } from '../../src/reactive.js';
import { defineStore, resetAllStores } from '../../src/store.js';
import { clearStoreRegistry } from '../../src/testing.js';

interface CartItem { id: string; name: string; price: number }

function makeCartStore() {
  let nextId = 1;
  return defineStore({
    initial: () => ({ items: [] as CartItem[] }),
    actions: (set, get) => ({
      add: (name: string, price: number) => {
        const id = `item-${nextId++}`;
        set({ items: [...get().items, { id, name, price }] });
      },
      remove: (id: string) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },
      clear: () => set({ items: [] }),
    }),
  });
}

let root: HTMLElement;
let badgeEl: HTMLElement;
let listEl: HTMLElement;
let footerEl: HTMLElement;

beforeEach(() => {
  clearStoreRegistry();

  root = document.createElement('div');
  badgeEl = document.createElement('span');
  badgeEl.id = 'badge';
  listEl = document.createElement('ul');
  listEl.id = 'list';
  footerEl = document.createElement('div');
  footerEl.id = 'footer';

  root.append(badgeEl, listEl, footerEl);
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
  clearStoreRegistry();
});

describe('end-to-end cart', () => {
  it('three independent mount() consumers update in lockstep when the store changes', () => {
    const cart = makeCartStore();
    const total = computed(() =>
      cart.state.value.items.reduce((sum, i) => sum + i.price, 0),
    );

    mount(badgeEl, () => jsx('span', { children: cart.state.value.items.length }));
    mount(listEl, () => jsx('ul', {
      children: cart.state.value.items.map((item) => jsx('li', {
        'data-key': item.id,
        children: `${item.name}|${item.price}`,
      })),
    }));
    mount(footerEl, () => jsx('div', { children: `total:${total.value.toFixed(2)}` }));

    expect(badgeEl.textContent).toBe('0');
    expect(listEl.querySelectorAll('li')).toHaveLength(0);
    expect(footerEl.textContent).toBe('total:0.00');

    cart.actions.add('Coffee', 4.5);
    cart.actions.add('Croissant', 3.25);

    expect(badgeEl.textContent).toBe('2');
    expect(listEl.querySelectorAll('li')).toHaveLength(2);
    expect(footerEl.textContent).toBe('total:7.75');

    cart.actions.remove(cart.state.value.items[0]!.id);

    expect(badgeEl.textContent).toBe('1');
    expect(listEl.querySelectorAll('li')).toHaveLength(1);
    expect(footerEl.textContent).toBe('total:3.25');
  });

  it('event delegation drives store actions correctly', () => {
    const cart = makeCartStore();
    cart.actions.add('Coffee', 4.5);
    cart.actions.add('Croissant', 3.25);

    mount(listEl, () => jsx('ul', {
      children: cart.state.value.items.map((item) => jsx('li', {
        'data-key': item.id,
        children: [
          jsx('span', { className: 'name', children: item.name }),
          jsx('button', { 'data-action': 'remove', 'data-id': item.id, children: 'x' }),
        ],
      })),
    }));

    delegate(listEl, 'click', '[data-action="remove"]', (_e, btn) => {
      const id = (btn as HTMLElement).dataset.id;
      if (id !== undefined) cart.actions.remove(id);
    });

    expect(listEl.querySelectorAll('li')).toHaveLength(2);
    listEl.querySelector<HTMLButtonElement>('[data-action="remove"]')!.click();
    expect(listEl.querySelectorAll('li')).toHaveLength(1);
    listEl.querySelector<HTMLButtonElement>('[data-action="remove"]')!.click();
    expect(listEl.querySelectorAll('li')).toHaveLength(0);
  });

  it('resetAllStores() returns every registered store to initial state', () => {
    const cart = makeCartStore();
    const counter = defineStore({
      initial: () => ({ count: 0 }),
      actions: (set, get) => ({ inc: () => set({ count: get().count + 1 }) }),
    });

    cart.actions.add('Coffee', 4.5);
    counter.actions.inc();
    counter.actions.inc();

    expect(cart.state.value.items).toHaveLength(1);
    expect(counter.state.value.count).toBe(2);

    resetAllStores();

    expect(cart.state.value.items).toHaveLength(0);
    expect(counter.state.value.count).toBe(0);
  });

  it('focus + cursor survives a tick that triggers a parent rerender', () => {
    const cart = makeCartStore();
    cart.actions.add('Coffee', 4.5);

    mount(listEl, () => jsx('ul', {
      children: [
        jsx('li', { children: `count:${cart.state.value.items.length}` }),
        jsx('li', { children: jsx('input', { id: 'q', type: 'text' }) }),
      ],
    }));

    const input = listEl.querySelector<HTMLInputElement>('#q')!;
    input.value = 'partial query';
    input.focus();
    if (typeof input.setSelectionRange === 'function') {
      input.setSelectionRange(7, 7);
    }
    expect(document.activeElement).toBe(input);

    // Trigger a rerender by mutating the store.
    cart.actions.add('Croissant', 3.25);

    const inputAfter = listEl.querySelector<HTMLInputElement>('#q')!;
    expect(inputAfter).toBe(input);
    expect(inputAfter.value).toBe('partial query');
  });
});
