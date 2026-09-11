import { afterEach,describe,expect,it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { bindList } from '../../src/list.js';
import { signal } from '../../src/reactive.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('bindList() — element mode (render returns the row element)', () => {
  it('uses the returned HTMLElement as the row (app owns tag / class / data-attrs)', () => {
    const parent = host();
    const items = signal([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      tag: 'div', // ignored in element mode
      render: (i) => {
        const li = document.createElement('li');
        li.className = 'ticket-row';
        li.dataset.id = String(i.id);
        li.textContent = i.label;
        return li;
      },
    });
    const rows = Array.from(parent.children) as HTMLElement[];
    expect(rows.map((r) => r.tagName)).toEqual(['LI', 'LI']); // app's tag, not the default div
    expect(rows[0].className).toBe('ticket-row');
    expect(rows[0].dataset.id).toBe('1');
    expect(rows.map((r) => r.textContent)).toEqual(['a', 'b']);
    dispose();
  });

  it('{ el, dispose } runs the caller teardown on removal and on final dispose', () => {
    const parent = host();
    const torn: number[] = [];
    const one = { id: 1 };
    const two = { id: 2 };
    const items = signal([one, two]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => {
        const el = document.createElement('div');
        el.dataset.id = String(i.id);
        return { el, dispose: () => torn.push(i.id) };
      },
    });
    items.value = [two]; // remove id 1 (keep the SAME `two` object → no rebuild)
    expect(torn).toEqual([1]); // caller dispose ran for the removed row
    dispose();
    expect(torn).toEqual([1, 2]); // and for the survivor on teardown
  });

  it('keyed reorder reuses the SAME element (no rebuild)', () => {
    const parent = host();
    const a = { id: 1 };
    const b = { id: 2 };
    const items = signal([a, b]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => {
        const el = document.createElement('div');
        el.dataset.id = String(i.id);
        return el;
      },
    });
    const first = parent.querySelector('[data-id="1"]');
    items.value = [b, a]; // reorder
    expect(parent.querySelector('[data-id="1"]')).toBe(first); // same element, moved
    expect(Array.from(parent.children).map((c) => (c as HTMLElement).dataset.id)).toEqual(['2', '1']);
    dispose();
  });

  it('reuses the SAME element when the item object changes at the same key — no dispose, refreshed via update()', () => {
    const parent = host();
    const torn: number[] = [];
    const items = signal([{ id: 1, v: 'x' }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => {
        const el = document.createElement('div');
        el.textContent = i.v;
        return { el, update: (next) => { el.textContent = next.v; }, dispose: () => torn.push(i.id) };
      },
    });
    const first = parent.querySelector('div');
    items.value = [{ id: 1, v: 'y' }]; // SAME key, NEW object → reuse (keyed list), not rebuild
    expect(torn).toEqual([]); // NOT disposed — the element is reused
    expect(parent.querySelector('div')).toBe(first); // SAME element
    expect(parent.textContent).toBe('y'); // content refreshed via update()
    dispose();
    expect(torn).toEqual([1]); // disposed only on final teardown
  });

  it('KF-492 repro: FRESH item objects each update still reuse rows by key (append + remove)', () => {
    const parent = host();
    const disposed: number[] = [];
    const src = signal([{ id: 1 }, { id: 2 }]);
    const dispose = bindList(parent, src, {
      key: (r) => r.id,
      render: (r) => {
        const el = document.createElement('div');
        el.dataset.id = String(r.id);
        return { el, dispose: () => disposed.push(r.id) };
      },
    });
    const node1 = parent.children[0];
    const node2 = parent.children[1];

    // (A) append id 3 with FRESH {id:1},{id:2} objects — rows 1 & 2 must be reused.
    src.value = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(parent.children[0]).toBe(node1); // reused, not a new node
    expect(parent.children[1]).toBe(node2);
    expect(disposed).toEqual([]); // nothing disposed on an append

    // (B) remove ONLY id 2 (fresh {id:1},{id:3}) — only id 2 disposes; 1 & 3 survive.
    const node3 = parent.children[2];
    src.value = [{ id: 1 }, { id: 3 }];
    expect(disposed).toEqual([2]);
    expect(parent.children[0]).toBe(node1); // survivors kept their elements
    expect(parent.children[1]).toBe(node3);
    dispose();
    expect(disposed).toEqual([2, 1, 3]);
  });

  it('KF-492 repro: reorder with FRESH objects moves existing elements (no rebuild)', () => {
    const parent = host();
    const disposed: number[] = [];
    const src = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const dispose = bindList(parent, src, {
      key: (r) => r.id,
      render: (r) => {
        const el = document.createElement('div');
        el.dataset.id = String(r.id);
        return { el, dispose: () => disposed.push(r.id) };
      },
    });
    const n1 = parent.querySelector('[data-id="1"]');
    const n3 = parent.querySelector('[data-id="3"]');

    src.value = [{ id: 3 }, { id: 2 }, { id: 1 }]; // reverse, fresh objects
    expect(Array.from(parent.children).map((c) => (c as HTMLElement).dataset.id)).toEqual(['3', '2', '1']);
    expect(parent.querySelector('[data-id="1"]')).toBe(n1); // same elements, moved
    expect(parent.querySelector('[data-id="3"]')).toBe(n3);
    expect(disposed).toEqual([]); // a reorder rebuilds nothing
    dispose();
  });

  it('element mode via the arraySignal granular update patch reuses the element + calls update()', () => {
    const parent = host();
    const disposed: number[] = [];
    const items = arraySignal([{ id: 1, v: 'a' }]);
    const dispose = bindList(parent, items, {
      key: (r) => r.id,
      render: (r) => {
        const el = document.createElement('div');
        el.textContent = r.v;
        return { el, update: (n) => { el.textContent = n.v; }, dispose: () => disposed.push(r.id) };
      },
    });
    const node = parent.querySelector('div');
    items.update(0, () => ({ id: 1, v: 'b' })); // new object, same key → granular update patch
    expect(parent.querySelector('div')).toBe(node); // reused
    expect(parent.textContent).toBe('b'); // refreshed via update()
    expect(disposed).toEqual([]); // not disposed
    dispose();
  });

  it('element mode: a granular update that CHANGES the key re-keys the row map (reuse survives a later snapshot)', () => {
    const parent = host();
    const disposed: number[] = [];
    const items = arraySignal([{ id: 1, v: 'a' }]);
    const dispose = bindList(parent, items, {
      key: (r) => r.id,
      render: (r) => {
        const el = document.createElement('div');
        el.dataset.id = String(r.id);
        return {
          el,
          update: (n) => { el.dataset.id = String(n.id); },
          dispose: () => disposed.push(r.id),
        };
      },
    });
    const node = parent.querySelector('[data-id="1"]');
    items.update(0, () => ({ id: 9, v: 'z' })); // update CHANGES the key 1 → 9 (must re-key the map)
    expect(parent.querySelector('[data-id="9"]')).toBe(node); // same element, refreshed

    // A snapshot fallback keyed by 9 must FIND the re-keyed row and reuse it — if
    // the map still held the old key 1, syncRows would dispose it + build a new node.
    items.replace([{ id: 9, v: 'z2' }]);
    expect(parent.querySelector('[data-id="9"]')).toBe(node); // same element ⇒ re-key worked
    expect(disposed).toEqual([]); // nothing disposed/rebuilt through the update + snapshot
    dispose();
  });

  it('a list may mix element rows and content rows', () => {
    const parent = host();
    const items = signal<Array<{ id: number; kind: 'el' | 'content' }>>([
      { id: 1, kind: 'el' },
      { id: 2, kind: 'content' },
    ]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      tag: 'p',
      render: (i) => {
        if (i.kind === 'el') {
          const el = document.createElement('section');
          el.textContent = 'E';
          return el;
        }
        return 'C';
      },
    });
    const rows = Array.from(parent.children) as HTMLElement[];
    expect(rows[0].tagName).toBe('SECTION'); // element mode
    expect(rows[0].textContent).toBe('E');
    expect(rows[1].tagName).toBe('P'); // content mode — the default tag
    expect(rows[1].textContent).toBe('C');
    dispose();
  });

  it('{ el } without a dispose is fine (no teardown to run)', () => {
    const parent = host();
    const one = { id: 1 };
    const items = signal([one]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => ({ el: Object.assign(document.createElement('div'), { textContent: `r${i.id}` }) }),
    });
    expect(parent.textContent).toBe('r1');
    items.value = []; // remove — no caller dispose, must not throw
    expect(parent.children.length).toBe(0);
    dispose();
  });

  it('element mode + virtualization sizes each returned element to rowHeight', () => {
    const parent = host();
    Object.defineProperty(parent, 'clientHeight', { configurable: true, value: 100 }); // 5 rows at rowHeight 20
    parent.scrollTop = 0;
    const items = signal(Array.from({ length: 30 }, (_, i) => ({ id: i })));
    const dispose = bindList(parent, items, {
      virtualize: { rowHeight: 20, overscan: 1 },
      key: (i) => i.id,
      render: (i) => {
        const el = document.createElement('div');
        el.dataset.id = String(i.id);
        return el;
      },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    const firstRow = sizer.querySelector('[data-id="0"]') as HTMLElement;
    expect(firstRow.style.height).toBe('20px'); // bindList sized the caller's element
    dispose();
  });

  it('element rows work through the arraySignal granular patch path (insert/remove)', () => {
    const parent = host();
    const items = arraySignal([{ id: 1 }, { id: 2 }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => {
        const el = document.createElement('a');
        el.dataset.id = String(i.id);
        return el;
      },
    });
    items.insert(1, { id: 3 }); // granular insert
    expect(Array.from(parent.children).map((c) => (c as HTMLElement).dataset.id)).toEqual(['1', '3', '2']);
    items.remove(0); // granular remove
    expect(Array.from(parent.children).map((c) => (c as HTMLElement).dataset.id)).toEqual(['3', '2']);
    dispose();
  });
});

describe('bindList() — before (rows sharing a parent with trailing controls)', () => {
  const idsOf = (parent: HTMLElement) =>
    Array.from(parent.children).map((c) => (c as HTMLElement).dataset.id ?? (c as HTMLElement).className.toUpperCase());
  const elRow = (i: { id: number }) => {
    const el = document.createElement('div');
    el.dataset.id = String(i.id);
    return el;
  };

  it('keeps rows before a trailing sibling across append / remove / reorder', () => {
    const parent = host();
    const addBtn = document.createElement('button');
    addBtn.className = 'add';
    parent.appendChild(addBtn); // trailing control — NOT a row

    const items = signal([{ id: 1 }, { id: 2 }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: elRow, before: () => addBtn });
    expect(idsOf(parent)).toEqual(['1', '2', 'ADD']); // rows before the button

    items.value = [{ id: 1 }, { id: 2 }, { id: 3 }]; // append → new row before the button, not after
    expect(idsOf(parent)).toEqual(['1', '2', '3', 'ADD']);

    items.value = [{ id: 2 }, { id: 3 }]; // remove 1
    expect(idsOf(parent)).toEqual(['2', '3', 'ADD']);

    items.value = [{ id: 3 }, { id: 2 }]; // reorder
    expect(idsOf(parent)).toEqual(['3', '2', 'ADD']);

    dispose();
    expect(parent.querySelector('.add')).not.toBeNull(); // the trailing control survives dispose
  });

  it('accepts a Node directly (not just a getter)', () => {
    const parent = host();
    const tail = document.createElement('span');
    tail.className = 'tail';
    parent.appendChild(tail);
    const items = signal([{ id: 1 }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: elRow, before: tail });
    items.value = [{ id: 1 }, { id: 2 }];
    expect(idsOf(parent)).toEqual(['1', '2', 'TAIL']);
    dispose();
  });

  it('the arraySignal granular path inserts before the anchor too (end + front inserts)', () => {
    const parent = host();
    const addBtn = document.createElement('button');
    addBtn.className = 'add';
    parent.appendChild(addBtn);
    const items = arraySignal([{ id: 1 }, { id: 2 }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: elRow, before: () => addBtn });

    items.push({ id: 3 }); // granular insert at the END → before the button
    expect(idsOf(parent)).toEqual(['1', '2', '3', 'ADD']);
    items.insert(0, { id: 0 }); // granular insert at the FRONT
    expect(idsOf(parent)).toEqual(['0', '1', '2', '3', 'ADD']);
    dispose();
  });

  it('content mode respects before as well', () => {
    const parent = host();
    const tail = document.createElement('button');
    tail.className = 'tail';
    parent.appendChild(tail);
    const items = signal([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label, // content mode
      tag: 'span',
      before: () => tail,
    });
    items.value = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
    const texts = Array.from(parent.children).map((c) => c.textContent);
    expect(texts).toEqual(['a', 'b', '']); // the trailing button (empty text) stays last
    expect((parent.lastElementChild as HTMLElement).className).toBe('tail');
    dispose();
  });

  it('a before() returning null falls back to appending at the end', () => {
    const parent = host();
    const items = signal([{ id: 1 }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: elRow, before: () => null });
    items.value = [{ id: 1 }, { id: 2 }];
    expect(idsOf(parent)).toEqual(['1', '2']);
    dispose();
  });
});
