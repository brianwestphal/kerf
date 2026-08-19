import { afterEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { bindList } from '../../src/list.js';
import { batch, signal } from '../../src/reactive.js';

interface Item { id: number; label: string }

afterEach(() => {
  document.body.innerHTML = '';
});

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

const texts = (parent: HTMLElement) => Array.from(parent.children).map((c) => c.textContent);

describe('bindList() — keyed reconcile', () => {
  it('renders one row element per item (using the configured tag)', () => {
    const parent = host();
    const items = signal<Item[]>([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label, tag: 'li' });
    expect(parent.children.length).toBe(2);
    expect(parent.firstElementChild?.tagName).toBe('LI');
    expect(texts(parent)).toEqual(['a', 'b']);
    dispose();
  });

  it('appends new rows and removes gone rows (disposing them)', () => {
    const parent = host();
    const items = signal<Item[]>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });

    items.value = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }];
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
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
    const rowB = parent.children[1];

    items.value = [c, b, a]; // reverse
    expect(texts(parent)).toEqual(['c', 'b', 'a']);
    expect(parent.children[1]).toBe(rowB); // B kept its element (moved, not rebuilt)
    dispose();
  });

  it('rebuilds a row when its item OBJECT identity changes at the same key', () => {
    const parent = host();
    const items = signal<Item[]>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
    const first = parent.firstElementChild;

    items.value = [{ id: 1, label: 'A' }]; // same key, new object
    expect(texts(parent)).toEqual(['A']);
    expect(parent.firstElementChild).not.toBe(first); // rebuilt
    dispose();
  });

  it('accepts an arraySignal source and reconciles on its mutations', () => {
    const parent = host();
    const items = arraySignal<Item>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
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
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
    dispose();
    expect(parent.children.length).toBe(0);
    items.value = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }]; // ignored after dispose
    expect(parent.children.length).toBe(0);
  });
});

describe('bindList() — arraySignal granular patch path (KF-478)', () => {
  it('applies insert / move / remove patches, preserving unchanged rows\' element identity', () => {
    const parent = host();
    const items = arraySignal<Item>([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
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
    const items = arraySignal([{ id: 1, on: signal(false) }, { id: 2, on: signal(false) }]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => (i.on.value ? 'on' : 'off'),
    });
    const original = parent.firstElementChild;
    expect(texts(parent)).toEqual(['off', 'off']);

    // Same-ref update (mutate in place) — row NOT rebuilt; content follows the signal.
    items.update(0, (i) => { i.on.value = true; return i; });
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
    const items = arraySignal<Item>([{ id: 1, label: 'a' }, { id: 2, label: 'b' }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
    items.replace([{ id: 3, label: 'c' }, { id: 1, label: 'a' }]);
    expect(texts(parent)).toEqual(['c', 'a']);
    dispose();
  });

  it('applies a batch of patches in order (multi-insert at the same position)', () => {
    const parent = host();
    const items = arraySignal<Item>([{ id: 1, label: 'a' }]);
    const dispose = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
    batch(() => {
      items.push({ id: 2, label: 'b' });
      items.insert(0, { id: 3, label: 'c' });
    });
    expect(texts(parent)).toEqual(['c', 'a', 'b']);
    dispose();
  });

  it('two bindLists sharing one arraySignal both stay correct (one goes granular, the other snapshots)', () => {
    const p1 = host();
    const p2 = host();
    const items = arraySignal<Item>([{ id: 1, label: 'a' }]);
    const d1 = bindList(p1, items, { key: (i) => i.id, render: (i) => i.label });
    const d2 = bindList(p2, items, { key: (i) => i.id, render: (i) => i.label });

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

describe('bindList() — virtualization', () => {
  const withHeight = (el: HTMLElement, h: number) =>
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });

  it('renders only the viewport window and sets padding to keep scrollHeight honest', () => {
    const parent = host();
    withHeight(parent, 100); // viewport shows 5 rows at rowHeight 20
    parent.scrollTop = 0;
    const items = signal<Item[]>(
      Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` })),
    );
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, overscan: 2 },
    });

    // Rows live in an inner sizer so the padding never inflates parent.clientHeight.
    const sizer = parent.firstElementChild as HTMLElement;
    // window: [0, ceil(100/20)+2] = [0, 7] → 7 rows rendered, not 100
    expect(sizer.children.length).toBe(7);
    expect(sizer.firstElementChild?.textContent).toBe('r0');
    expect(sizer.style.paddingTop).toBe('0px');
    expect(sizer.style.paddingBottom).toBe(`${(100 - 7) * 20}px`); // 1860px
    dispose();
  });

  it('shifts the window on scroll (rAF-throttled) and updates padding', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(
      Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` })),
    );
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, overscan: 2 },
    });

    parent.scrollTop = 400; // scroll down 20 rows
    parent.dispatchEvent(new Event('scroll'));
    await new Promise((r) => setTimeout(r, 30)); // let the rAF fire

    const sizer = parent.firstElementChild as HTMLElement;
    // window start = floor(400/20) - 2 = 18
    expect(sizer.firstElementChild?.textContent).toBe('r18');
    expect(sizer.style.paddingTop).toBe(`${18 * 20}px`); // 360px
    dispose();
  });

  it('coalesces rapid scrolls into one rAF and skips a rAF that fires after dispose', async () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(Array.from({ length: 50 }, (_, i) => ({ id: i, label: `r${i}` })));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20 },
    });
    parent.scrollTop = 100;
    parent.dispatchEvent(new Event('scroll')); // schedules a rAF
    parent.dispatchEvent(new Event('scroll')); // coalesced — rafPending is already true
    dispose(); // before the rAF fires
    await new Promise((r) => setTimeout(r, 30)); // the rAF fires but is a no-op (disposed)
    expect(parent.children.length).toBe(0); // the inner sizer (and its rows) were removed
  });

  it('dispose() removes the inner sizer and stops the scroll handler', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(Array.from({ length: 50 }, (_, i) => ({ id: i, label: `r${i}` })));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20 },
    });
    expect((parent.firstElementChild as HTMLElement).style.paddingBottom).not.toBe('');
    dispose();
    expect(parent.children.length).toBe(0); // sizer + rows removed
  });
});

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
