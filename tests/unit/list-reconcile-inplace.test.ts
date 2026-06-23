/**
 * Unit tests for the snapshot reconciler's in-place content-update fast path
 * (`list-reconcile-inplace.ts`). Driven through the public API — a plain-array
 * `each()` inside a `mount()` whose rows re-render via a separate signal +
 * `cacheKey`, which routes through the snapshot path with the same refs in the
 * same order. Observes that changed rows update IN PLACE (DOM node identity
 * preserved) instead of being node-replaced, except on a top-level tag change
 * where `replaceChild` is the correct fallback.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { batch, each, mount, signal } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';

interface ParseSpy {
  count: number;
  restore: () => void;
}

function spyTemplateInnerHTML(): ParseSpy {
  const tplProto = Object.getPrototypeOf(document.createElement('template'));
  const origDescriptor = Object.getOwnPropertyDescriptor(tplProto, 'innerHTML')
    ?? Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML')!;
  const spy: ParseSpy = {
    count: 0,
    restore: () => Object.defineProperty(tplProto, 'innerHTML', origDescriptor),
  };
  Object.defineProperty(tplProto, 'innerHTML', {
    configurable: true,
    get: origDescriptor.get,
    set(value: string) {
      spy.count += 1;
      origDescriptor.set!.call(this, value);
    },
  });
  return spy;
}

describe('snapshot in-place content-update fast path', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('class flip (attribute-only) updates in place — node identity preserved, no parse', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const selected = signal<number>(-1);
    mount(root, () => jsx('table', {
      children: jsx('tbody', {
        children: each(
          items,
          (it: { id: number }) => jsx('tr', {
            'data-key': String(it.id),
            class: it.id === selected.value ? 'danger' : '',
            children: jsx('td', { children: String(it.id) }),
          }),
          (it: { id: number }) => it.id === selected.value,
        ),
      }),
    }));
    const tr1 = root.querySelectorAll('tr')[0];
    const tr2 = root.querySelectorAll('tr')[1];
    expect(tr1.getAttribute('class')).toBe('');

    const spy = spyTemplateInnerHTML();
    try {
      selected.value = 1;
    } finally {
      spy.restore();
    }

    // Same DOM nodes (in-place), class applied, and no parse happened.
    expect(root.querySelectorAll('tr')[0]).toBe(tr1);
    expect(root.querySelectorAll('tr')[1]).toBe(tr2);
    expect(tr1.getAttribute('class')).toBe('danger');
    expect(spy.count).toBe(0);
  });

  it('text-content change updates in place — node identity preserved', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const label = signal<string>('a');
    mount(root, () => jsx('table', {
      children: jsx('tbody', {
        children: each(
          items,
          (it: { id: number }) => jsx('tr', {
            'data-key': String(it.id),
            children: jsx('td', { children: it.id === 1 ? label.value : 'x' }),
          }),
          (it: { id: number }) => (it.id === 1 ? label.value : 'x'),
        ),
      }),
    }));
    const tr1 = root.querySelectorAll('tr')[0];
    const td1 = tr1.querySelector('td')!;
    expect(td1.textContent).toBe('a');

    label.value = 'bb';

    expect(root.querySelectorAll('tr')[0]).toBe(tr1);
    expect(tr1.querySelector('td')).toBe(td1);
    expect(td1.textContent).toBe('bb');
  });

  it('structural change (same top-level tag) morphs in place — node identity preserved', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const expanded = signal<boolean>(false);
    mount(root, () => jsx('table', {
      children: jsx('tbody', {
        children: each(
          items,
          (it: { id: number }) => jsx('tr', {
            'data-key': String(it.id),
            children: it.id === 1 && expanded.value
              ? [jsx('td', { children: 'a' }), jsx('td', { children: 'b' })]
              : jsx('td', { children: 'a' }),
          }),
          (it: { id: number }) => (it.id === 1 ? expanded.value : false),
        ),
      }),
    }));
    const tr1 = root.querySelectorAll('tr')[0];
    expect(tr1.querySelectorAll('td').length).toBe(1);

    expanded.value = true;

    // Same <tr> node, but morphed to gain a second <td>.
    expect(root.querySelectorAll('tr')[0]).toBe(tr1);
    expect(tr1.querySelectorAll('td').length).toBe(2);
  });

  it('top-level tag change falls back to replaceChild — new node, content correct', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const asSpan = signal<boolean>(false);
    mount(root, () => jsx('ul', {
      children: each(
        items,
        (it: { id: number }) => (it.id === 1 && asSpan.value
          ? jsx('span', { 'data-key': String(it.id), children: 'changed' })
          : jsx('li', { 'data-key': String(it.id), children: String(it.id) })),
        (it: { id: number }) => (it.id === 1 ? asSpan.value : false),
      ),
    }));
    const firstRow = root.querySelector('ul')!.children[0];
    expect(firstRow.tagName).toBe('LI');

    asSpan.value = true;

    const newFirst = root.querySelector('ul')!.children[0];
    expect(newFirst).not.toBe(firstRow);   // replaced, not morphed
    expect(newFirst.tagName).toBe('SPAN');
    expect(newFirst.textContent).toBe('changed');
  });

  it('no-content-change re-render keeps every node (all rows unchanged branch)', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const tick = signal<number>(0);
    mount(root, () => {
      void tick.value;  // re-render trigger that does NOT change any row
      return jsx('tbody', {
        children: each(items, (it: { id: number }) => jsx('tr', {
          'data-key': String(it.id),
          children: jsx('td', { children: String(it.id) }),
        })),
      });
    });
    const tr1 = root.querySelectorAll('tr')[0];
    const tr2 = root.querySelectorAll('tr')[1];

    tick.value = 1;

    expect(root.querySelectorAll('tr')[0]).toBe(tr1);
    expect(root.querySelectorAll('tr')[1]).toBe(tr2);
  });

  it('does NOT fire when a row is removed (length change → main path)', () => {
    const list = signal<{ id: number }[]>([{ id: 1 }, { id: 2 }, { id: 3 }]);
    mount(root, () => jsx('tbody', {
      children: each(list.value, (it: { id: number }) => jsx('tr', {
        'data-key': String(it.id),
        children: jsx('td', { children: String(it.id) }),
      })),
    }));
    expect(root.querySelectorAll('tr').length).toBe(3);

    list.value = [list.value[0], list.value[2]];  // drop the middle row

    const ids = Array.from(root.querySelectorAll('tr')).map((tr) => tr.getAttribute('data-key'));
    expect(ids).toEqual(['1', '3']);
  });

  it('does NOT fire when rows reorder (same refs, different order → main path)', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const list = signal<{ id: number }[]>([a, b]);
    mount(root, () => jsx('tbody', {
      children: each(list.value, (it: { id: number }) => jsx('tr', {
        'data-key': String(it.id),
        children: jsx('td', { children: String(it.id) }),
      })),
    }));
    expect(Array.from(root.querySelectorAll('tr')).map((t) => t.getAttribute('data-key')))
      .toEqual(['1', '2']);

    list.value = [b, a];  // swap order, same refs

    expect(Array.from(root.querySelectorAll('tr')).map((t) => t.getAttribute('data-key')))
      .toEqual(['2', '1']);
  });

  it('does NOT fire on first populate of an empty list (n === 0 guard)', () => {
    const list = signal<{ id: number }[]>([]);
    mount(root, () => jsx('tbody', {
      children: each(list.value, (it: { id: number }) => jsx('tr', {
        'data-key': String(it.id),
        children: jsx('td', { children: String(it.id) }),
      })),
    }));
    expect(root.querySelectorAll('tr').length).toBe(0);

    list.value = [{ id: 1 }, { id: 2 }];

    expect(root.querySelectorAll('tr').length).toBe(2);
  });

  it('does NOT fire when clearing a populated list (new length 0 → main path)', () => {
    const list = signal<{ id: number }[]>([{ id: 1 }, { id: 2 }]);
    mount(root, () => jsx('ul', {
      children: each(list.value, (it: { id: number }) => jsx('li', {
        'data-key': String(it.id),
        children: String(it.id),
      })),
    }));
    expect(root.querySelectorAll('li').length).toBe(2);

    list.value = [];  // new segment is empty → n === 0 guard → main path clears

    expect(root.querySelectorAll('li').length).toBe(0);
  });

  it('a row that both moves AND changes content takes the main (replace) path', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const list = signal<{ id: number }[]>([a, b]);
    const on = signal<boolean>(false);
    mount(root, () => jsx('ul', {
      children: each(
        list.value,
        (it: { id: number }) => jsx('li', {
          'data-key': String(it.id),
          class: it.id === 2 && on.value ? 'on' : '',
          children: String(it.id),
        }),
        (it: { id: number }) => (it.id === 2 ? on.value : false),
      ),
    }));
    const liB = Array.from(root.querySelectorAll('li')).find((l) => l.getAttribute('data-key') === '2')!;
    expect(liB.getAttribute('class')).toBe('');

    // In one reconcile: reorder (refs differ by position → fast path bails) AND
    // change row 2's content (→ classify's same-ref/changed-html replace branch).
    batch(() => {
      list.value = [b, a];
      on.value = true;
    });

    const order = Array.from(root.querySelectorAll('li')).map((l) => l.getAttribute('data-key'));
    expect(order).toEqual(['2', '1']);
    const liBafter = Array.from(root.querySelectorAll('li')).find((l) => l.getAttribute('data-key') === '2')!;
    expect(liBafter.getAttribute('class')).toBe('on');
  });

  it('throws the row-contract error if an update yields two top-level elements', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const broken = signal<boolean>(false);
    expect(() => {
      mount(root, () => jsx('tbody', {
        children: each(
          items,
          (it: { id: number }): string => (it.id === 1 && broken.value
            // Two top-level elements for one row, with a structural shape the
            // attribute/text fast paths can't take — forces parseSingleRow.
            ? '<tr><td>a</td></tr><tr><td>b</td></tr>'
            : jsx('tr', { 'data-key': String(it.id), children: jsx('td', { children: String(it.id) }) }).toString()),
          (it: { id: number }) => (it.id === 1 ? broken.value : false),
        ),
      }));
      broken.value = true;
    }).toThrow();
  });
});
