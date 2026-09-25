import { afterEach, describe, expect, it } from 'vitest';

import { ARRAY_SIGNAL_BRAND, arraySignal } from '../../src/array-signal.js';
import { bindList } from '../../src/list.js';
import { batch, signal } from '../../src/reactive.js';

interface Item {
  id: number;
  label: string;
}

afterEach(() => {
  document.body.innerHTML = '';
});

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const texts = (parent: HTMLElement) =>
  Array.from(parent.children).map((c) => c.textContent);

describe('bindList() — keyed reconcile', () => {
  it('renders one row element per item (using the configured tag)', () => {
    const parent = host();
    const items = signal<Item[]>([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      tag: 'li',
    });
    expect(parent.children.length).toBe(2);
    expect(parent.firstElementChild?.tagName).toBe('LI');
    expect(texts(parent)).toEqual(['a', 'b']);
    dispose();
  });

  it('appends new rows and removes gone rows (disposing them)', () => {
    const parent = host();
    const items = signal<Item[]>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });

    items.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ];
    expect(texts(parent)).toEqual(['a', 'b']);

    items.value = [{ id: 2, label: 'b' }];
    expect(texts(parent)).toEqual(['b']);
    dispose();
  });

  it('reorders by key, preserving the SAME row element (no rebuild)', () => {
    const parent = host();
    const a = { id: 1, label: 'a' };
    const b = { id: 2, label: 'b' };
    const c = { id: 3, label: 'c' };
    const items = signal<Item[]>([a, b, c]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    const rowB = parent.children[1];

    items.value = [c, b, a]; // reverse
    expect(texts(parent)).toEqual(['c', 'b', 'a']);
    expect(parent.children[1]).toBe(rowB); // B kept its element (moved, not rebuilt)
    dispose();
  });

  it('rejects duplicate keys from a plain signal before mutating the DOM', () => {
    const parent = host();
    const a = { id: 1, label: 'a' };
    const b = { id: 2, label: 'b' };
    const items = signal<Item[]>([a, b]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    const originalRows = Array.from(parent.children);

    expect(() => {
      items.value = [a, { id: 1, label: 'duplicate' }];
    }).toThrow(
      'bindList: duplicate key 1 at indices 0 and 1 — every row key must be unique.',
    );
    expect(Array.from(parent.children)).toEqual(originalRows);
    expect(texts(parent)).toEqual(['a', 'b']);

    items.value = [a, b];
    expect(Array.from(parent.children)).toEqual(originalRows);
    dispose();
  });

  it('rejects initial duplicate keys before attaching a virtualized container', () => {
    const parent = host();
    const existing = document.createElement('button');
    parent.appendChild(existing);
    const items = signal<Item[]>([
      { id: 1, label: 'a' },
      { id: 1, label: 'duplicate' },
    ]);

    expect(() =>
      bindList(parent, items, {
        key: (i) => i.id,
        render: (i) => i.label,
        virtualize: { rowHeight: 32 },
      }),
    ).toThrow(
      'bindList: duplicate key 1 at indices 0 and 1 — every row key must be unique.',
    );
    expect(Array.from(parent.childNodes)).toEqual([existing]);
  });

  it('rebuilds a row when its item OBJECT identity changes at the same key', () => {
    const parent = host();
    const items = signal<Item[]>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    const first = parent.firstElementChild;

    items.value = [{ id: 1, label: 'A' }]; // same key, new object
    expect(texts(parent)).toEqual(['A']);
    expect(parent.firstElementChild).not.toBe(first); // rebuilt
    dispose();
  });

  it('accepts an arraySignal source and reconciles on its mutations', () => {
    const parent = host();
    const items = arraySignal<Item>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    expect(texts(parent)).toEqual(['a']);
    items.push({ id: 2, label: 'b' });
    expect(texts(parent)).toEqual(['a', 'b']);
    items.remove(0);
    expect(texts(parent)).toEqual(['b']);
    dispose();
  });

  it('dispose() removes every row and stops reacting', () => {
    const parent = host();
    const items = signal<Item[]>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    dispose();
    expect(parent.children.length).toBe(0);
    items.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ]; // ignored after dispose
    expect(parent.children.length).toBe(0);
  });
});

describe('bindList() — arraySignal granular patch path (KF-478)', () => {
  it('rejects a duplicate-key transition before mutation, then snapshot-recovers before resuming patches', () => {
    const parent = host();
    const a = { id: 1, label: 'a' };
    const b = { id: 2, label: 'b' };
    const items = arraySignal<Item>([a, b]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    const originalRows = Array.from(parent.children);

    expect(() => {
      items.insert(1, { id: 1, label: 'duplicate' });
    }).toThrow(
      'bindList: duplicate key 1 at indices 0 and 1 — every row key must be unique.',
    );
    expect(Array.from(parent.children)).toEqual(originalRows);
    expect(texts(parent)).toEqual(['a', 'b']);

    items.remove(1);
    expect(Array.from(parent.children)).toEqual(originalRows);

    items.push({ id: 3, label: 'c' });
    expect(texts(parent)).toEqual(['a', 'b', 'c']);
    expect(parent.children[0]).toBe(originalRows[0]);
    expect(parent.children[1]).toBe(originalRows[1]);
    dispose();
  });

  it("applies insert / move / remove patches, preserving unchanged rows' element identity", () => {
    const parent = host();
    const items = arraySignal<Item>([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    const rA = parent.children[0];
    const rB = parent.children[1];
    const rC = parent.children[2];

    items.insert(1, { id: 4, label: 'x' }); // a, x, b, c
    expect(texts(parent)).toEqual(['a', 'x', 'b', 'c']);
    expect(parent.children[0]).toBe(rA); // unchanged rows kept their exact nodes
    expect(parent.children[2]).toBe(rB);
    expect(parent.children[3]).toBe(rC);

    items.move(0, 3); // x, b, c, a  (move to the tail)
    expect(texts(parent)).toEqual(['x', 'b', 'c', 'a']);
    expect(parent.children[3]).toBe(rA); // the moved node is the SAME element

    items.move(3, 1); // x, a, b, c  (move to the middle)
    expect(texts(parent)).toEqual(['x', 'a', 'b', 'c']);
    expect(parent.children[1]).toBe(rA);

    items.remove(2); // x, a, c  (b removed)
    expect(texts(parent)).toEqual(['x', 'a', 'c']);
    expect(Array.from(parent.children).includes(rB)).toBe(false);
    dispose();
  });

  it('update with a NEW object identity rebuilds the row; a same-ref update does not', () => {
    const parent = host();
    const items = arraySignal([
      { id: 1, on: signal(false) },
      { id: 2, on: signal(false) },
    ]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => (i.on.value ? 'on' : 'off'),
    });
    const original = parent.firstElementChild;
    expect(texts(parent)).toEqual(['off', 'off']);

    // Same-ref update (mutate in place) — row NOT rebuilt; content follows the signal.
    items.update(0, (i) => {
      i.on.value = true;
      return i;
    });
    expect(parent.firstElementChild).toBe(original);
    expect(texts(parent)).toEqual(['on', 'off']);

    // New-object update at a NON-last index — row rebuilt, re-inserted before its successor.
    items.update(0, () => ({ id: 1, on: signal(false) }));
    expect(parent.firstElementChild).not.toBe(original);
    expect(texts(parent)).toEqual(['off', 'off']);

    // New-object update at the LAST index — rebuilt row appended (no successor).
    const last = parent.children[1];
    items.update(1, () => ({ id: 2, on: signal(true) }));
    expect(parent.children[1]).not.toBe(last);
    expect(texts(parent)).toEqual(['off', 'on']);
    dispose();
  });

  it('a replace() patch falls back to the keyed diff (snapshot)', () => {
    const parent = host();
    const items = arraySignal<Item>([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    items.replace([
      { id: 3, label: 'c' },
      { id: 1, label: 'a' },
    ]);
    expect(texts(parent)).toEqual(['c', 'a']);
    dispose();
  });

  it('applies a batch of patches in order (multi-insert at the same position)', () => {
    const parent = host();
    const items = arraySignal<Item>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    batch(() => {
      items.push({ id: 2, label: 'b' });
      items.insert(0, { id: 3, label: 'c' });
    });
    expect(texts(parent)).toEqual(['c', 'a', 'b']);
    dispose();
  });

  it('snapshot-recovers after an inserted row render throws, then resumes granular patches', () => {
    const parent = host();
    const initial = { id: 1, label: 'a' };
    const items = arraySignal<Item>([initial]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => {
        if (i.label === 'bad') throw new Error('bad row');
        return i.label;
      },
    });
    const initialRow = parent.firstElementChild;

    expect(() => items.push({ id: 2, label: 'bad' })).toThrow('bad row');
    expect(texts(parent)).toEqual(['a']);

    items.update(1, () => ({ id: 2, label: 'b' }));
    expect(texts(parent)).toEqual(['a', 'b']);
    expect(parent.children[0]).toBe(initialRow);

    const repairedRow = parent.children[1];
    items.push({ id: 3, label: 'c' });
    expect(texts(parent)).toEqual(['a', 'b', 'c']);
    expect(parent.children[0]).toBe(initialRow);
    expect(parent.children[1]).toBe(repairedRow);
    dispose();
  });

  it('snapshot-recovers after a later row render fails in a partially applied batch', () => {
    const parent = host();
    const initial = { id: 1, label: 'a' };
    const items = arraySignal<Item>([initial]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => {
        if (i.label === 'bad') throw new Error('bad row');
        return i.label;
      },
    });
    const initialRow = parent.firstElementChild;

    expect(() => {
      batch(() => {
        items.push({ id: 2, label: 'b' });
        items.push({ id: 3, label: 'bad' });
      });
    }).toThrow('bad row');
    expect(texts(parent)).toEqual(['a', 'b']);
    const partiallyAppliedRow = parent.children[1];

    items.update(2, () => ({ id: 3, label: 'c' }));
    expect(texts(parent)).toEqual(['a', 'b', 'c']);
    expect(parent.children[0]).toBe(initialRow);
    expect(parent.children[1]).toBe(partiallyAppliedRow);
    dispose();
  });

  it('two bindLists sharing one arraySignal both stay correct (one goes granular, the other snapshots)', () => {
    const p1 = host();
    const p2 = host();
    const items = arraySignal<Item>([{ id: 1, label: 'a' }]);
    const d1 = bindList(p1, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    const d2 = bindList(p2, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });

    items.push({ id: 2, label: 'b' });
    expect(texts(p1)).toEqual(['a', 'b']);
    expect(texts(p2)).toEqual(['a', 'b']);

    items.remove(0);
    expect(texts(p1)).toEqual(['b']);
    expect(texts(p2)).toEqual(['b']);
    d1();
    d2();
  });
});

describe('bindList() — arraySignal source validation', () => {
  it('rejects a branded source without a patch queue before touching the DOM', () => {
    const parent = host();
    const malformed = {
      [ARRAY_SIGNAL_BRAND]: true,
      value: [{ id: 1, label: 'a' }],
    };
    expect(() =>
      bindList(parent, malformed, { key: (i) => i.id, render: (i) => i.label }),
    ).toThrow(/bindList: source carries the arraySignal brand/);
    expect(parent.childNodes.length).toBe(0);
  });

  it('calls the patch queue with the source as its receiver', () => {
    const parent = host();
    const source = arraySignal<Item>([{ id: 1, label: 'a' }]);
    const consume = source._consumePatches.bind(source);
    const receivers: unknown[] = [];
    source._consumePatches = function (this: unknown) {
      receivers.push(this);
      return consume();
    };
    const dispose = bindList(parent, source, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
    source.push({ id: 2, label: 'b' });
    expect(texts(parent)).toEqual(['a', 'b']);
    expect(receivers.every((receiver) => receiver === source)).toBe(true);
    expect(receivers.length).toBeGreaterThan(0);
    dispose();
  });

  it('ignores the patch queue of a virtualized arraySignal source', () => {
    const parent = host();
    const malformed = {
      [ARRAY_SIGNAL_BRAND]: true,
      value: [{ id: 1, label: 'a' }],
    };
    const dispose = bindList(parent, malformed, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, minRows: 10 },
    });
    expect(parent.textContent).toBe('a');
    dispose();
  });
});

describe('bindList() — initial render failure rolls back', () => {
  const three = (): Item[] => [
    { id: 1, label: 'a' },
    { id: 2, label: 'b' },
    { id: 3, label: 'boom' },
  ];
  const failure = new Error('row render failed');

  it('content mode: disposes the rows it already mounted and rethrows the original error', () => {
    const parent = host();
    const tick = signal(0);
    let renders = 0;
    let thrown: unknown;
    try {
      bindList(parent, signal(three()), {
        key: (i) => i.id,
        render: (i) => {
          if (i.label === 'boom') throw failure;
          renders++;
          return `${i.label}${tick.value}`;
        },
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(failure);
    expect(parent.childNodes.length).toBe(0);
    const before = renders;
    tick.value = 1;
    expect(renders).toBe(before); // no surviving row mount still subscribed
  });

  it('element mode: runs dispose for every row created before the failure', () => {
    const parent = host();
    const disposed: number[] = [];
    expect(() =>
      bindList(parent, signal(three()), {
        key: (i) => i.id,
        render: (i) => {
          if (i.label === 'boom') throw failure;
          const el = document.createElement('li');
          el.textContent = i.label;
          return { el, dispose: () => disposed.push(i.id) };
        },
      }),
    ).toThrow(failure);
    expect(disposed.sort()).toEqual([1, 2]);
    expect(parent.childNodes.length).toBe(0);
  });

  it('keeps non-row siblings when a `before` anchor is in use', () => {
    const parent = host();
    const add = document.createElement('button');
    parent.appendChild(add);
    expect(() =>
      bindList(parent, signal(three()), {
        key: (i) => i.id,
        before: add,
        render: (i) => {
          if (i.label === 'boom') throw failure;
          return i.label;
        },
      }),
    ).toThrow(failure);
    expect(Array.from(parent.childNodes)).toEqual([add]);
  });

  it('virtualized: never attaches the sizer and releases created rows', () => {
    const parent = host();
    Object.defineProperty(parent, 'clientHeight', { value: 100 });
    const disposed: number[] = [];
    expect(() =>
      bindList(parent, signal(three()), {
        key: (i) => i.id,
        virtualize: { rowHeight: 20 },
        render: (i) => {
          if (i.label === 'boom') throw failure;
          return {
            el: document.createElement('div'),
            dispose: () => disposed.push(i.id),
          };
        },
      }),
    ).toThrow(failure);
    expect(parent.childNodes.length).toBe(0);
    expect(disposed.sort()).toEqual([1, 2]);
  });

  it('a retry on the same parent succeeds and stays reactive', () => {
    const parent = host();
    const items = signal(three());
    let fail = true;
    const options = {
      key: (i: Item) => i.id,
      render: (i: Item) => {
        if (fail && i.label === 'boom') throw failure;
        return i.label;
      },
    };
    expect(() => bindList(parent, items, options)).toThrow(failure);
    fail = false;
    const dispose = bindList(parent, items, options);
    expect(texts(parent)).toEqual(['a', 'b', 'boom']);
    items.value = [...items.value, { id: 4, label: 'd' }];
    expect(texts(parent)).toEqual(['a', 'b', 'boom', 'd']);
    dispose();
    expect(parent.childNodes.length).toBe(0);
  });
});

describe('bindList() — per-row reactivity (the each() cannot)', () => {
  it('updates only the row whose signal changed; siblings do not even re-render', () => {
    const parent = host();
    const data = [
      { id: 1, on: signal(false) },
      { id: 2, on: signal(false) },
      { id: 3, on: signal(false) },
    ];
    const renderCalls = new Map<number, number>();
    const items = signal(data);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => {
        renderCalls.set(i.id, (renderCalls.get(i.id) ?? 0) + 1);
        return i.on.value ? 'on' : 'off';
      },
    });
    expect(texts(parent)).toEqual(['off', 'off', 'off']);
    // Content-mode render runs once for the element/content mode probe + once
    // for the mount's first paint = 2 per row at creation.
    expect([...renderCalls.values()]).toEqual([2, 2, 2]);
    const rowEls = Array.from(parent.children);

    data[1].on.value = true; // flip ONLY row 2's signal
    expect(texts(parent)).toEqual(['off', 'on', 'off']);
    // Only row 2's mount re-ran render (+1); rows 1 and 3 were untouched.
    expect(renderCalls.get(1)).toBe(2);
    expect(renderCalls.get(2)).toBe(3);
    expect(renderCalls.get(3)).toBe(2);
    // Every row kept its element (surgical, not rebuilt).
    expect(Array.from(parent.children)).toEqual(rowEls);
    dispose();
  });
});
