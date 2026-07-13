/**
 * Unit tests for fine-grained signal bindings (KF-294 spike).
 *
 * The headline property: a signal handed straight into an attribute or text
 * hole updates the live DOM WITHOUT re-running the render function — the coarse
 * mount() effect never subscribed to it. These tests pin that (render is spied
 * and must stay at one call across binding-driven updates), plus SSR/toString
 * snapshot fallback, teardown, and survival across a coarse (morph) re-render.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed, signal } from '../../src/reactive.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
});

describe('fine-grained bindings — text holes', () => {
  it('updates a bound text node without re-running render', () => {
    const count = signal(0);
    const render = vi.fn(() => jsx('div', { id: 'box', children: count }));
    const dispose = mount(root, render);

    const box = root.querySelector('#box') as HTMLElement;
    expect(box.textContent).toBe('0');
    expect(render).toHaveBeenCalledTimes(1);

    count.value = 42;
    expect(box.textContent).toBe('42');
    // The whole point: no re-render, same DOM node.
    expect(render).toHaveBeenCalledTimes(1);
    expect(root.querySelector('#box')).toBe(box);

    dispose();
  });

  it('renders a bound signal among static text siblings', () => {
    const name = signal('world');
    const dispose = mount(root, () =>
      jsx('p', { id: 'p', children: ['hi, ', name, '!'] }),
    );
    const p = root.querySelector('#p') as HTMLElement;
    expect(p.textContent).toBe('hi, world!');
    name.value = 'kerf';
    expect(p.textContent).toBe('hi, kerf!');
    dispose();
  });

  it('a computed text hole tracks its dependencies fine-grained', () => {
    const n = signal(2);
    const doubled = computed(() => n.value * 2);
    const render = vi.fn(() => jsx('span', { id: 's', children: doubled }));
    const dispose = mount(root, render);
    expect((root.querySelector('#s') as HTMLElement).textContent).toBe('4');
    n.value = 5;
    expect((root.querySelector('#s') as HTMLElement).textContent).toBe('10');
    expect(render).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('nullish / boolean bound text renders nothing', () => {
    const v = signal<unknown>(null);
    const dispose = mount(root, () => jsx('div', { id: 'd', children: v }));
    const d = root.querySelector('#d') as HTMLElement;
    expect(d.textContent).toBe('');
    v.value = true;
    expect(d.textContent).toBe('');
    v.value = 'now';
    expect(d.textContent).toBe('now');
    dispose();
  });
});

describe('fine-grained bindings — attribute holes', () => {
  it('updates a bound class without re-running render', () => {
    const cls = signal('danger');
    const render = vi.fn(() =>
      jsx('div', { id: 'row', class: cls, children: 'x' }),
    );
    const dispose = mount(root, render);

    const rowEl = root.querySelector('#row') as HTMLElement;
    expect(rowEl.getAttribute('class')).toBe('danger');
    expect(render).toHaveBeenCalledTimes(1);

    cls.value = '';
    expect(rowEl.getAttribute('class')).toBe('');
    cls.value = 'active';
    expect(rowEl.getAttribute('class')).toBe('active');
    expect(render).toHaveBeenCalledTimes(1);
    expect(root.querySelector('#row')).toBe(rowEl);

    dispose();
  });

  it('keeps the marker attribute but not the bound attribute name in JSX', () => {
    const cls = signal('a');
    const dispose = mount(root, () => jsx('div', { id: 'm', class: cls }));
    const el = root.querySelector('#m') as HTMLElement;
    // The element carries the binding marker and the resolved class.
    expect(el.hasAttribute('data-kfb')).toBe(true);
    expect(el.getAttribute('class')).toBe('a');
    dispose();
  });

  it('boolean / nullish bound attributes toggle presence', () => {
    const disabled = signal<unknown>(true);
    const dispose = mount(root, () =>
      jsx('button', { id: 'b', disabled, children: 'ok' }),
    );
    const b = root.querySelector('#b') as HTMLElement;
    expect(b.hasAttribute('disabled')).toBe(true);
    disabled.value = false;
    expect(b.hasAttribute('disabled')).toBe(false);
    disabled.value = null;
    expect(b.hasAttribute('disabled')).toBe(false);
    disabled.value = true;
    expect(b.hasAttribute('disabled')).toBe(true);
    dispose();
  });

  it('mixes static and bound attributes on one element', () => {
    const cls = signal('sel');
    const dispose = mount(root, () =>
      jsx('div', { id: 'x', 'data-role': 'row', class: cls }),
    );
    const el = root.querySelector('#x') as HTMLElement;
    expect(el.getAttribute('data-role')).toBe('row');
    expect(el.getAttribute('class')).toBe('sel');
    cls.value = 'sel active';
    expect(el.getAttribute('class')).toBe('sel active');
    dispose();
  });
});

describe('fine-grained bindings — SSR / toString fallback', () => {
  it('snapshots a signal text child to its current value with no marker', () => {
    const s = signal('hello');
    const html = jsx('div', { children: s }).toString();
    expect(html).toBe('<div>hello</div>');
    expect(html).not.toContain('kfb');
  });

  it('snapshots a signal attribute to its current value with no marker', () => {
    const s = signal('warn');
    const html = jsx('div', { class: s, children: 'x' }).toString();
    expect(html).toBe('<div class="warn">x</div>');
    expect(html).not.toContain('data-kfb');
  });

  it('escapes a snapshotted text value', () => {
    const s = signal('<script>');
    expect(jsx('div', { children: s }).toString()).toBe('<div>&lt;script&gt;</div>');
  });

  it('snapshots a nullish / boolean signal text child to empty', () => {
    expect(jsx('div', { children: signal(null) }).toString()).toBe('<div></div>');
    expect(jsx('div', { children: signal(true) }).toString()).toBe('<div></div>');
  });
});

describe('fine-grained bindings — inside each() rows (the select-row win)', () => {
  interface Row { id: number }

  // Build a keyed table whose rows carry a fine-grained `class` binding driven
  // by an external `selectedId` — the krausest select-row shape.
  function mountTable(rows: { value: Row[] }, selectedId: { value: number | null }) {
    const render = vi.fn(() =>
      jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows.value,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: computed(() => (r.id === selectedId.value ? 'danger' : '')),
                children: jsx('td', { children: String(r.id) }),
              }),
            (r) => r.id,
          ),
        }),
      }),
    );
    const dispose = mount(root, render);
    return { render, dispose };
  }

  const classOf = (id: number) =>
    (root.querySelector(`tr[data-key="${id}"]`) as HTMLElement).getAttribute('class');

  it('selects a row without re-running render or reconciling the list', () => {
    const rows = signal<Row[]>([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const selectedId = signal<number | null>(null);
    const { render, dispose } = mountTable(rows, selectedId);

    expect(root.querySelectorAll('tr')).toHaveLength(3);
    expect(classOf(1)).toBe('');
    expect(render).toHaveBeenCalledTimes(1);

    const row2 = root.querySelector('tr[data-key="2"]') as HTMLElement;
    selectedId.value = 2;
    expect(classOf(2)).toBe('danger');
    // The whole point: no render re-run, and the node identity is preserved.
    expect(render).toHaveBeenCalledTimes(1);
    expect(root.querySelector('tr[data-key="2"]')).toBe(row2);

    // Move the selection: old row clears, new row highlights — still no render.
    selectedId.value = 3;
    expect(classOf(2)).toBe('');
    expect(classOf(3)).toBe('danger');
    expect(render).toHaveBeenCalledTimes(1);

    dispose();
  });

  it('binds a fresh row appended after first render', () => {
    const rows = signal<Row[]>([{ id: 1 }, { id: 2 }]);
    const selectedId = signal<number | null>(null);
    const { render, dispose } = mountTable(rows, selectedId);

    // Append (new array, existing refs reused) → render re-runs, row 3 is fresh.
    rows.value = [...rows.value, { id: 3 }];
    expect(render).toHaveBeenCalledTimes(2);
    expect(root.querySelectorAll('tr')).toHaveLength(3);

    // The appended row's binding is live.
    selectedId.value = 3;
    expect(classOf(3)).toBe('danger');
    // Selecting doesn't re-render (still 2 render calls from the append).
    expect(render).toHaveBeenCalledTimes(2);
    dispose();
  });

  it('adversarial: create → select → remove selected → select another', () => {
    const r1 = { id: 1 };
    const r2 = { id: 2 };
    const r3 = { id: 3 };
    const rows = signal<Row[]>([r1, r2, r3]);
    const selectedId = signal<number | null>(null);
    const { dispose } = mountTable(rows, selectedId);

    selectedId.value = 2;
    expect(classOf(2)).toBe('danger');

    // Remove the selected row.
    rows.value = [r1, r3];
    expect(root.querySelectorAll('tr')).toHaveLength(2);
    expect(root.querySelector('tr[data-key="2"]')).toBeNull();

    // Select a surviving row — its binding still works after the structural op.
    selectedId.value = 3;
    expect(classOf(3)).toBe('danger');
    expect(classOf(1)).toBe('');
    dispose();
  });

  it('adversarial: clear → repopulate → select rebinds fresh rows', () => {
    const rows = signal<Row[]>([{ id: 1 }, { id: 2 }]);
    const selectedId = signal<number | null>(null);
    const { dispose } = mountTable(rows, selectedId);

    selectedId.value = 1;
    expect(classOf(1)).toBe('danger');

    rows.value = []; // clear
    expect(root.querySelectorAll('tr')).toHaveLength(0);

    rows.value = [{ id: 10 }, { id: 11 }]; // repopulate with fresh refs
    expect(root.querySelectorAll('tr')).toHaveLength(2);

    selectedId.value = 11;
    expect(classOf(11)).toBe('danger');
    expect(classOf(10)).toBe('');
    dispose();
  });

  it('binds text holes inside rows fine-grained', () => {
    const tick = signal(0);
    const rows = signal<Row[]>([{ id: 1 }, { id: 2 }]);
    const render = vi.fn(() =>
      jsx('ul', {
        children: each(
          rows.value,
          (r) =>
            jsx('li', {
              'data-key': r.id,
              children: computed(() => `${r.id}:${tick.value}`),
            }),
          (r) => r.id,
        ),
      }),
    );
    const dispose = mount(root, render);
    expect((root.querySelector('li[data-key="1"]') as HTMLElement).textContent).toBe('1:0');
    tick.value = 5;
    expect((root.querySelector('li[data-key="1"]') as HTMLElement).textContent).toBe('1:5');
    expect((root.querySelector('li[data-key="2"]') as HTMLElement).textContent).toBe('2:5');
    expect(render).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('tears down row bindings on unmount (no update to detached rows)', () => {
    const rows = signal<Row[]>([{ id: 1 }]);
    const selectedId = signal<number | null>(null);
    const { dispose } = mountTable(rows, selectedId);
    const row1 = root.querySelector('tr[data-key="1"]') as HTMLElement;
    dispose();
    selectedId.value = 1;
    // Effect torn down → detached node must not update.
    expect(row1.getAttribute('class')).toBe('');
  });
});

describe('fine-grained bindings — lifecycle', () => {
  it('stops updating after dispose', () => {
    const s = signal('a');
    const dispose = mount(root, () => jsx('div', { id: 'd', children: s }));
    const d = root.querySelector('#d') as HTMLElement;
    expect(d.textContent).toBe('a');
    dispose();
    s.value = 'b';
    // Detached + effect torn down: the old node must not update.
    expect(d.textContent).toBe('a');
  });

  it('survives a coarse re-render that rebuilds the surrounds', () => {
    // `show` drives a structural change (morph runs); `label` is a bound hole.
    const show = signal(true);
    const label = signal('one');
    const render = vi.fn(() =>
      jsx('div', {
        id: 'wrap',
        children: show.value
          ? jsx('span', { id: 's', class: label, children: label })
          : jsx('span', { id: 's', class: label, children: label, 'data-alt': 'y' }),
      }),
    );
    const dispose = mount(root, render);

    let s = root.querySelector('#s') as HTMLElement;
    expect(s.textContent).toBe('one');
    expect(s.getAttribute('class')).toBe('one');

    // Coarse re-render: `show` flip changes the surrounds → morph runs.
    show.value = false;
    expect(render).toHaveBeenCalledTimes(2);
    s = root.querySelector('#s') as HTMLElement;
    // Bound attr + text re-applied against the post-morph DOM.
    expect(s.textContent).toBe('one');
    expect(s.getAttribute('class')).toBe('one');

    // And the binding is still live after the re-wire.
    label.value = 'two';
    expect(s.textContent).toBe('two');
    expect(s.getAttribute('class')).toBe('two');
    expect(render).toHaveBeenCalledTimes(2);

    dispose();
  });
});
