/**
 * selector() through the real render pipeline: a keyed each() table whose
 * rows bind `class` to a selector-backed computed renders exactly like the
 * plain-computed pattern beside it, across select / delete / clear / re-add,
 * and removing rows releases their selector entries.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { computed, signal } from '../../src/reactive.js';
import { selector } from '../../src/selector.js';
import { setSelector } from '../../src/set-selector.js';

interface Row {
  id: number;
}

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
});

describe('selector() in a mounted keyed list', () => {
  it('renders identically to the plain computed pattern in the same list', () => {
    const rows = arraySignal<Row>([1, 2, 3, 4].map((id) => ({ id })));
    const selectedId = signal<number | null>(null);
    const isSelected = selector(selectedId);
    let renders = 0;
    const dispose = mount(root, () => {
      renders++;
      return jsx('table', {
        children: jsx('tbody', {
          children: each(
            rows.value,
            (r) =>
              jsx('tr', {
                'data-key': r.id,
                class: computed(() =>
                  r.id === selectedId.value ? 'danger' : '',
                ),
                'data-sel': computed(() =>
                  isSelected(r.id).value ? 'danger' : '',
                ),
                children: jsx('td', { children: String(r.id) }),
              }),
            (r) => r.id,
          ),
        }),
      });
    });
    const state = () =>
      Array.from(root.querySelectorAll('tr')).map((tr) => [
        tr.dataset.key,
        tr.getAttribute('class') ?? '',
        tr.getAttribute('data-sel') ?? '',
      ]);
    // A selection is binding-only: it never re-runs the render function.
    const select = (id: number) => {
      const before = renders;
      selectedId.value = id;
      expect(renders).toBe(before);
    };
    const agree = () => {
      for (const [, plain, viaSelector] of state())
        expect(viaSelector).toBe(plain);
    };

    agree();
    select(2);
    agree();
    expect(state().find(([k]) => k === '2')?.[2]).toBe('danger');
    select(3);
    agree();
    rows.remove(2); // delete the selected row
    agree();
    select(1);
    agree();
    rows.replace([]); // clear
    rows.replace([1, 2].map((id) => ({ id }))); // re-add
    agree();
    expect(state().find(([k]) => k === '1')?.[2]).toBe('danger');
    select(2);
    agree();
    dispose();
  });

  it('removing rows releases their entries: no stale writes after a clear', () => {
    const rows = signal<Row[]>([1, 2].map((id) => ({ id })));
    const selectedId = signal(1);
    let sourceReads = 0;
    const counted = computed(() => {
      sourceReads++;
      return selectedId.value;
    });
    const isSelected = selector(counted);
    const keySignals: { value: boolean }[] = [];
    const dispose = mount(root, () =>
      jsx('ul', {
        children: each(
          rows.value,
          (r) => {
            const flag = isSelected(r.id);
            keySignals.push(flag);
            return jsx('li', {
              'data-key': r.id,
              class: computed(() => (flag.value ? 'on' : '')),
            });
          },
          (r) => r.id,
        ),
      }),
    );
    expect(root.querySelector('li.on')?.getAttribute('data-key')).toBe('1');
    rows.value = [];
    sourceReads = 0;
    selectedId.value = 2;
    // Every row is gone, so the selector let go of its source: the write
    // recomputes nothing.
    expect(sourceReads).toBe(0);
    // A key signal still held after its row left reads the current answer
    // (KF-4TXB21).
    expect(keySignals.map((s) => s.value)).toEqual(
      keySignals.map((_, i) => i === 1),
    );
    dispose();
  });
});

describe('setSelector() in a mounted keyed list', () => {
  it('renders identically to the plain Set.has computed, with no render re-run', () => {
    const rows = signal<Row[]>([1, 2, 3, 4, 5].map((id) => ({ id })));
    const checked = signal<ReadonlySet<number>>(new Set());
    const isChecked = setSelector(checked);
    let renders = 0;
    const dispose = mount(root, () => {
      renders++;
      return jsx('ul', {
        children: each(
          rows.value,
          (r) =>
            jsx('li', {
              'data-key': r.id,
              class: computed(() => (checked.value.has(r.id) ? 'on' : '')),
              'data-set': computed(() => (isChecked(r.id).value ? 'on' : '')),
            }),
          (r) => r.id,
        ),
      });
    });
    const agree = () => {
      for (const li of root.querySelectorAll('li'))
        expect(li.getAttribute('data-set') ?? '').toBe(
          li.getAttribute('class') ?? '',
        );
    };
    const write = (ids: number[]) => {
      const before = renders;
      checked.value = new Set(ids);
      expect(renders).toBe(before);
      agree();
    };
    agree();
    write([2, 4]);
    write([4, 5]);
    write([]);
    write([1, 2, 3, 4, 5]);
    rows.value = rows.value.filter((r) => r.id !== 3);
    agree();
    write([3]);
    expect(root.querySelectorAll('li.on')).toHaveLength(0);
    dispose();
  });
});
