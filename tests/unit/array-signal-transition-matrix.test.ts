/**
 * Unit tests for `arraySignal()` (KF-92) — both the standalone signal API
 * and its integration with `each()` / `mount()` for the granular reconcile
 * path.
 */

import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch,each,mount,signal } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';

describe('arraySignal — reconciler transition matrix (adversarial)', () => {
  let root: HTMLElement;
  let nextId = 1;
  const build = (n: number): { id: number; label: string }[] =>
    Array.from({ length: n }, () => ({ id: nextId++, label: 'l' + nextId }));

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });
  afterEach(() => { document.body.innerHTML = ''; });

  function harness() {
    const rows = arraySignal<{ id: number; label: string }>([]);
    const selectedId = signal(-1);
    mount(root, () => jsx('table', {
      children: jsx('tbody', {
        children: each(
          rows,
          (r) => jsx('tr', {
            'data-key': String(r.id),
            className: r.id === selectedId.value ? 'sel' : '',
            children: jsx('td', { children: r.label }),
          }),
          (r) => r.id === selectedId.value,
        ),
      }),
    }));
    return {
      rows, selectedId,
      ids: () => Array.from(root.querySelectorAll('tr')).map((t) => t.getAttribute('data-key')),
      selIds: () => Array.from(root.querySelectorAll('tr.sel')).map((t) => t.getAttribute('data-key')),
    };
  }

  it('empty-via-remove then insert renders (distinct from replace([]))', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    const cur = t.rows.value.map((r) => r.id);
    batch(() => { for (const id of cur) t.rows.remove(t.rows.value.findIndex((r) => r.id === id)); });
    expect(t.ids().length).toBe(0);
    batch(() => { const a = build(2); for (let i = 0; i < a.length; i++) t.rows.insert(i, a[i]); });
    expect(t.ids().length).toBe(2);
  });

  it('append then select the appended row', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    batch(() => { const a = build(2); const s = t.rows.value.length; for (let i = 0; i < a.length; i++) t.rows.insert(s + i, a[i]); });
    const id = t.rows.value[t.rows.value.length - 1].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('update then select', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    batch(() => t.rows.update(0, (r) => ({ ...r, label: 'X' })));
    const id = t.rows.value[1].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('move (swap) then select', () => {
    const t = harness();
    batch(() => t.rows.replace(build(4)));
    batch(() => { t.rows.move(3, 1); t.rows.move(2, 3); });
    const id = t.rows.value[0].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('select then update the selected row in the same batch (stays selected, label changes)', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    const id = t.rows.value[1].id;
    t.selectedId.value = id;
    batch(() => t.rows.update(1, (r) => ({ ...r, label: 'Y' })));
    expect(t.selIds()).toEqual([String(id)]);
    expect(root.querySelector('tr.sel td')?.textContent).toBe('Y');
  });

  it('remove the currently-selected row leaves no ghost selection', () => {
    const t = harness();
    batch(() => t.rows.replace(build(4)));
    const id = t.rows.value[2].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
    t.rows.remove(2);
    expect(t.selIds()).toEqual([]);
    expect(t.ids().length).toBe(3);
  });

  it('clear → append → clear → append (double empty/refill cycle)', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    batch(() => t.rows.replace([]));
    batch(() => { const a = build(3); for (let i = 0; i < a.length; i++) t.rows.insert(i, a[i]); });
    expect(t.ids().length).toBe(3);
    batch(() => t.rows.replace([]));
    batch(() => { const a = build(2); for (let i = 0; i < a.length; i++) t.rows.insert(i, a[i]); });
    expect(t.ids().length).toBe(2);
  });

  it('insert in the middle then select the inserted row', () => {
    const t = harness();
    batch(() => t.rows.replace(build(3)));
    batch(() => t.rows.insert(1, build(1)[0]));
    const id = t.rows.value[1].id;
    t.selectedId.value = id;
    expect(t.ids().length).toBe(4);
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('push() single then select', () => {
    const t = harness();
    batch(() => t.rows.replace(build(2)));
    t.rows.push(build(1)[0]);
    const id = t.rows.value[2].id;
    t.selectedId.value = id;
    expect(t.ids().length).toBe(3);
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('partial-update-every-other → remove → select', () => {
    const t = harness();
    batch(() => t.rows.replace(build(6)));
    batch(() => { for (let i = 0; i < 6; i += 2) t.rows.update(i, (r) => ({ ...r, label: r.label + '!' })); });
    t.rows.remove(0);
    const id = t.rows.value[2].id;
    t.selectedId.value = id;
    expect(t.selIds()).toEqual([String(id)]);
  });

  it('repeated remove interleaved with select keeps selection working', () => {
    const t = harness();
    batch(() => t.rows.replace(build(20)));
    for (let k = 0; k < 5; k++) {
      t.rows.remove(0);
      const id = t.rows.value[0].id;
      t.selectedId.value = id;
      expect(t.selIds()).toEqual([String(id)]);
    }
    expect(t.ids().length).toBe(15);
  });
});
