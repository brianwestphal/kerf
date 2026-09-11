/**
 * Unit tests for fine-grained signal bindings (KF-294 spike).
 *
 * The headline property: a signal handed straight into an attribute or text
 * hole updates the live DOM WITHOUT re-running the render function — the coarse
 * mount() effect never subscribed to it. These tests pin that (render is spied
 * and must stay at one call across binding-driven updates), plus SSR/toString
 * snapshot fallback, teardown, and survival across a coarse (morph) re-render.
 */

import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed,signal } from '../../src/reactive.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
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

  it('binds multiple attr holes on a row root (comma-joined marker)', () => {
    const cls = signal('a');
    const role = signal('row');
    const rows = signal<Row[]>([{ id: 1 }]);
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(rows.value, (r) =>
          jsx('li', { 'data-key': r.id, class: cls, 'data-role': role, children: 'x' }),
          (r) => r.id),
      }),
    );
    const li = root.querySelector('li[data-key="1"]') as HTMLElement;
    expect(li.getAttribute('class')).toBe('a');
    expect(li.getAttribute('data-role')).toBe('row');
    cls.value = 'b';
    role.value = 'listitem';
    expect(li.getAttribute('class')).toBe('b');
    expect(li.getAttribute('data-role')).toBe('listitem');
    dispose();
  });

  it('binds an attr hole on a row DESCENDANT (root carries no binding)', () => {
    const tdCls = signal('c1');
    const rows = signal<Row[]>([{ id: 1 }]);
    const dispose = mount(root, () =>
      jsx('table', { children: jsx('tbody', { children:
        each(rows.value, (r) =>
          jsx('tr', { 'data-key': r.id, children: jsx('td', { class: tdCls, children: 'x' }) }),
          (r) => r.id),
      }) }),
    );
    const td = root.querySelector('tr[data-key="1"] td') as HTMLElement;
    expect(td.getAttribute('class')).toBe('c1');
    tdCls.value = 'c2';
    expect(td.getAttribute('class')).toBe('c2');
    dispose();
  });

  it('binds root AND descendant attr holes on the same row', () => {
    const trCls = signal('t1');
    const tdCls = signal('d1');
    const rows = signal<Row[]>([{ id: 1 }]);
    const dispose = mount(root, () =>
      jsx('table', { children: jsx('tbody', { children:
        each(rows.value, (r) =>
          jsx('tr', { 'data-key': r.id, class: trCls,
            children: jsx('td', { class: tdCls, children: 'x' }) }),
          (r) => r.id),
      }) }),
    );
    const tr = root.querySelector('tr[data-key="1"]') as HTMLElement;
    const td = tr.querySelector('td') as HTMLElement;
    expect(tr.getAttribute('class')).toBe('t1');
    expect(td.getAttribute('class')).toBe('d1');
    trCls.value = 't2';
    tdCls.value = 'd2';
    expect(tr.getAttribute('class')).toBe('t2');
    expect(td.getAttribute('class')).toBe('d2');
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

describe('fine-grained bindings — inside arraySignal (granular) rows', () => {
  interface Row { id: number; label: string }

  function mountArrayTable(rows: ReturnType<typeof arraySignal<Row>>, selectedId: { value: number | null }) {
    const render = vi.fn(() =>
      jsx('table', { children: jsx('tbody', { children:
        each(
          rows,
          (r) => jsx('tr', {
            'data-key': r.id,
            class: computed(() => (r.id === selectedId.value ? 'danger' : '')),
            children: jsx('td', { children: r.label }),
          }),
          (r) => r.id,
        ),
      }) }),
    );
    return { render, dispose: mount(root, render) };
  }
  const classOf = (id: number) =>
    (root.querySelector(`tr[data-key="${id}"]`) as HTMLElement).getAttribute('class');

  it('selects a row (first render goes through the snapshot path)', () => {
    const rows = arraySignal<Row>([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const selectedId = signal<number | null>(null);
    const { render, dispose } = mountArrayTable(rows, selectedId);
    selectedId.value = 2;
    expect(classOf(2)).toBe('danger');
    expect(render).toHaveBeenCalledTimes(1);   // selection did not re-render
    dispose();
  });

  it('wires a row appended via a granular insert patch', () => {
    const rows = arraySignal<Row>([{ id: 1, label: 'a' }]);
    const selectedId = signal<number | null>(null);
    const { dispose } = mountArrayTable(rows, selectedId);
    rows.push({ id: 2, label: 'b' });              // granular insert
    expect(root.querySelectorAll('tr')).toHaveLength(2);
    selectedId.value = 2;                          // the fresh row's binding is live
    expect(classOf(2)).toBe('danger');
    dispose();
  });

  it('preserves a bound class across a granular label update', () => {
    const rows = arraySignal<Row>([{ id: 1, label: 'a' }]);
    const selectedId = signal<number | null>(null);
    const { dispose } = mountArrayTable(rows, selectedId);
    selectedId.value = 1;
    expect(classOf(1)).toBe('danger');
    rows.update(0, (r) => ({ ...r, label: 'a!' }));   // granular text update
    expect((root.querySelector('tr[data-key="1"] td') as HTMLElement).textContent).toBe('a!');
    expect(classOf(1)).toBe('danger');                // binding survived the update
    dispose();
  });

  it('disposes a bound row removed via a granular remove patch', () => {
    const rows = arraySignal<Row>([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const selectedId = signal<number | null>(null);
    const { dispose } = mountArrayTable(rows, selectedId);
    const row1 = root.querySelector('tr[data-key="1"]') as HTMLElement;
    rows.remove(0);                                // granular remove of id 1
    expect(root.querySelector('tr[data-key="1"]')).toBeNull();
    selectedId.value = 1;                          // detached node must not update
    expect(row1.getAttribute('class')).toBe('');
    dispose();
  });

  it('keeps bindings across a granular move (swap)', () => {
    const rows = arraySignal<Row>([
      { id: 1, label: 'a' }, { id: 2, label: 'b' }, { id: 3, label: 'c' },
    ]);
    const selectedId = signal<number | null>(null);
    const { dispose } = mountArrayTable(rows, selectedId);
    selectedId.value = 1;
    rows.move(0, 2);                               // move id 1 to the end
    // Row 1's node moved but its binding effect is intact.
    expect(classOf(1)).toBe('danger');
    selectedId.value = 3;
    expect(classOf(1)).toBe('');
    expect(classOf(3)).toBe('danger');
    dispose();
  });
});
