import { afterEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { batch } from '../../src/index.js';
import { bindList } from '../../src/list.js';
import {
  type BindListSpec,
  type BMutation,
  runBindListCase,
} from './fuzz/bindlist.js';

interface Item {
  id: number;
  label: string;
}

afterEach(() => {
  document.body.innerHTML = '';
});

function harness(initial: Item[]) {
  const parent = document.createElement('ul');
  document.body.appendChild(parent);
  const items = arraySignal(initial);
  const dispose = bindList(parent, items, {
    key: (item) => item.id,
    render: (item) => item.label,
    tag: 'li',
  });
  return { parent, items, dispose };
}

function expectWholeState(parent: HTMLElement, items: readonly Item[]): void {
  expect(Array.from(parent.children, (row) => row.textContent)).toEqual(
    items.map((item) => item.label),
  );
}

describe('bindList() — adversarial transition matrix', () => {
  const base: BindListSpec = {
    source: 'granular',
    ids: ['a', 'b', 'c'],
    mode: 'content',
    rowSig: false,
    before: false,
    virtualize: null,
    twin: false,
  };
  const holds = (spec: BindListSpec, mutations: BMutation[]) =>
    expect(runBindListCase(spec, mutations)).toBeNull();

  it('row throw latches recovery, then dispose stops the pending source notification', () => {
    holds(base, [
      { k: 'replace', ids: ['x', 'y', 'z'], badAt: 1 },
      { k: 'dispose' },
      { k: 'cure', via: 'patch' },
      { k: 'insert', at: 0, id: 'new' },
    ]);
  });

  it('virtualized deep scroll survives empty and refill without stale measured heights', () => {
    holds(
      {
        ...base,
        virtualize: {
          model: 'measured',
          minRows: null,
          overscan: 1,
          viewport: 40,
          estimateFn: false,
        },
      },
      [
        { k: 'height', at: 2, px: 60 },
        { k: 'scroll', top: 500 },
        { k: 'replace', ids: [] },
        { k: 'replace', ids: ['x', 'y', 'z'] },
        { k: 'scroll', top: 0 },
      ],
    );
  });

  it('measured height, same-key replace, and scroll in one frame stay coherent', () => {
    holds(
      {
        ...base,
        virtualize: {
          model: 'measured',
          minRows: null,
          overscan: 0,
          viewport: 40,
          estimateFn: true,
        },
      },
      [
        // The runner flushes rAF after each top-level mutation. Keep all
        // three changes in one batch so the scheduled frame sees them together.
        {
          k: 'batch',
          ms: [
            { k: 'height', at: 0, px: 50 },
            { k: 'replace', ids: ['a', 'b', 'c'] },
            { k: 'scroll', top: 25 },
          ],
        },
      ],
    );
  });

  it('element-mode key change, duplicate rejection, and cure restore the row map', () => {
    holds({ ...base, mode: 'element' }, [
      { k: 'rekey', at: 0, id: 'x' },
      { k: 'rekey', at: 2, id: 'x' },
      { k: 'cure', via: 'patch' },
      { k: 'insert', at: 1, id: 'fresh' },
    ]);
  });

  it('two lists on one arraySignal recover independently after one row throws', () => {
    holds({ ...base, twin: true }, [
      { k: 'update', at: 1, t: 'poison', bad: true },
      { k: 'cure', via: 'patch' },
      { k: 'move', from: 0, to: 2 },
    ]);
  });

  it('remove-last → refill → update rebuilds from empty and keeps tracking patches', () => {
    const t = harness([{ id: 1, label: 'a' }]);
    const oldA = t.parent.firstElementChild;

    t.items.remove(0);
    expectWholeState(t.parent, t.items.value);
    expect(t.parent.children).toHaveLength(0);

    t.items.push({ id: 2, label: 'b' });
    expectWholeState(t.parent, t.items.value);
    const rowB = t.parent.firstElementChild;
    expect(rowB).not.toBe(oldA);

    t.items.update(0, (item) => ({ ...item, label: 'B' }));
    expectWholeState(t.parent, t.items.value);
    expect(t.parent.firstElementChild).not.toBe(rowB);
    t.dispose();
  });

  it('granular operations → replace snapshot → granular update/move/remove stay coherent', () => {
    const a = { id: 1, label: 'a' };
    const b = { id: 2, label: 'b' };
    const c = { id: 3, label: 'c' };
    const x = { id: 4, label: 'x' };
    const d = { id: 5, label: 'd' };
    const t = harness([a, b, c]);
    const [rowA, rowB, rowC] = Array.from(t.parent.children);

    t.items.insert(1, x);
    t.items.move(3, 0);
    expectWholeState(t.parent, t.items.value);
    expect(t.parent.children[0]).toBe(rowC);
    expect(t.parent.children[1]).toBe(rowA);
    expect(t.parent.children[3]).toBe(rowB);

    t.items.replace([b, c, d]);
    expectWholeState(t.parent, t.items.value);
    expect(t.parent.children[0]).toBe(rowB);
    expect(t.parent.children[1]).toBe(rowC);
    const rowD = t.parent.children[2];

    t.items.update(1, (item) => ({ ...item, label: 'C' }));
    expectWholeState(t.parent, t.items.value);
    const updatedC = t.parent.children[1];
    expect(updatedC).not.toBe(rowC);
    expect(t.parent.children[0]).toBe(rowB);
    expect(t.parent.children[2]).toBe(rowD);

    t.items.move(2, 0);
    t.items.remove(1);
    expectWholeState(t.parent, t.items.value);
    expect(Array.from(t.parent.children)).toEqual([rowD, updatedC]);
    expect(rowB.isConnected).toBe(false);
    t.dispose();
  });

  it('mixed batched insert/move/update/remove preserves only surviving row identities', () => {
    const a = { id: 1, label: 'a' };
    const b = { id: 2, label: 'b' };
    const c = { id: 3, label: 'c' };
    const d = { id: 4, label: 'd' };
    const t = harness([a, b, c, d]);
    const [rowA, rowB, rowC, rowD] = Array.from(t.parent.children);

    batch(() => {
      t.items.insert(1, { id: 5, label: 'x' });
      t.items.move(4, 0);
      t.items.update(3, (item) => ({ ...item, label: 'B' }));
      t.items.remove(1);
    });

    expectWholeState(t.parent, t.items.value);
    expect(t.parent.children[0]).toBe(rowD);
    expect(t.parent.children[3]).toBe(rowC);
    expect(t.parent.children[2]).not.toBe(rowB);
    expect(rowA.isConnected).toBe(false);
    expect(rowB.isConnected).toBe(false);
    t.dispose();
  });
});
