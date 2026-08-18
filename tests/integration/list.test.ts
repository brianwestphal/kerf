/**
 * Integration: `kerfjs/list` composed with delegate + signals — the externally
 * driven selectable list bindList exists for. Clicking a row updates a shared
 * `selectedId` signal; each row's render reads it, so the selection class tracks
 * the click without re-rendering the whole list from scratch. Structural change
 * (removing the selected row) reconciles by key.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { delegate } from '../../src/delegate.js';
import { jsx } from '../../src/jsx-runtime.js';
import { bindList } from '../../src/list.js';
import { signal } from '../../src/reactive.js';

interface Item { id: number; label: string }

afterEach(() => {
  document.body.innerHTML = '';
});

describe('list — full pipeline', () => {
  it('a selectable list tracks a shared selectedId signal, and reconciles a structural change', () => {
    const parent = document.createElement('ul');
    document.body.appendChild(parent);

    const selectedId = signal<number | null>(null);
    const items = signal<Item[]>([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ]);

    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      tag: 'li',
      render: (i) =>
        jsx('span', {
          class: selectedId.value === i.id ? 'sel' : '',
          'data-id': String(i.id),
          children: i.label,
        }),
    });

    delegate(parent, 'click', 'li', (_e, li) => {
      const span = li.querySelector('[data-id]');
      if (span !== null) selectedId.value = Number(span.getAttribute('data-id'));
    });

    // Click row B → only B carries the selection class.
    (parent.children[1] as HTMLElement).click();
    expect(parent.querySelectorAll('.sel').length).toBe(1);
    expect(parent.querySelector('.sel')?.textContent).toBe('b');

    // Click row C → the selection moves; still exactly one selected.
    (parent.children[2] as HTMLElement).click();
    expect(parent.querySelectorAll('.sel').length).toBe(1);
    expect(parent.querySelector('.sel')?.textContent).toBe('c');

    // Remove the selected row structurally — bindList reconciles by key.
    items.value = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
    expect(Array.from(parent.children).map((c) => c.textContent)).toEqual(['a', 'b']);
    expect(parent.querySelectorAll('.sel').length).toBe(0);

    dispose();
    expect(parent.children.length).toBe(0);
  });
});
