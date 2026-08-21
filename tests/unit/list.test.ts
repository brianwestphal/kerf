import { afterEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { bindList, observeRowHeights } from '../../src/list.js';
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

describe('bindList() — variable-height virtualization (declared heights, KF-501)', () => {
  const withHeight = (el: HTMLElement, h: number) =>
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });

  // Alternating 20 / 40 px rows → offsets [0,20,60,80,120,140,180,200,240,260,300].
  const altHeight = (_: Item, i: number): number => (i % 2 === 0 ? 20 : 40);
  const tenItems = (): Item[] => Array.from({ length: 10 }, (_, i) => ({ id: i, label: `r${i}` }));

  it('windows via the prefix sum: correct visible slice, padding, and per-row heights', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(tenItems());
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: altHeight, overscan: 0 },
    });

    const sizer = parent.firstElementChild as HTMLElement;
    // scrollTop 0, viewport 100 → start 0, end = first offset >= 100 = index 4.
    expect(Array.from(sizer.children).map((c) => c.textContent)).toEqual(['r0', 'r1', 'r2', 'r3']);
    expect(sizer.style.paddingTop).toBe('0px');
    expect(sizer.style.paddingBottom).toBe('180px'); // 300 total − offsets[4]=120
    // Each row is sized to its DECLARED height, not clamped to a constant.
    const heights = Array.from(sizer.children).map((c) => (c as HTMLElement).style.height);
    expect(heights).toEqual(['20px', '40px', '20px', '40px']);
    dispose();
  });

  it('binary search lands on an exact row boundary (scrollTop === an offset)', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(tenItems());
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: altHeight, overscan: 0 },
    });

    parent.scrollTop = 60; // exactly offsets[2]
    parent.dispatchEvent(new Event('scroll'));
    await new Promise((r) => setTimeout(r, 30));

    const sizer = parent.firstElementChild as HTMLElement;
    // start = greatest offset <= 60 = index 2; end = first offset >= 160 = index 6.
    expect(Array.from(sizer.children).map((c) => c.textContent)).toEqual(['r2', 'r3', 'r4', 'r5']);
    expect(sizer.style.paddingTop).toBe('60px'); // offsets[2]
    expect(sizer.style.paddingBottom).toBe('120px'); // 300 − offsets[6]=180
    dispose();
  });

  it('overscan widens the window symmetrically', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(tenItems());
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: altHeight, overscan: 1 },
    });

    const sizer = parent.firstElementChild as HTMLElement;
    // base window [0,4) → with overscan 1: start max(0,0-1)=0, end min(10,4+1)=5.
    expect(Array.from(sizer.children).map((c) => c.textContent)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);
    expect(sizer.style.paddingBottom).toBe('160px'); // 300 − offsets[5]=140
    dispose();
  });

  it('rebuilds the prefix sum when the source array changes', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(tenItems());
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: altHeight, overscan: 0 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.style.paddingBottom).toBe('180px'); // 300 total − 120

    // Drop the last four rows → 6 items, heights [20,40,20,40,20,40], total 180.
    items.value = items.value.slice(0, 6);
    // window [0,4) unchanged; padBottom = 180 − offsets[4](=120) = 60.
    expect(sizer.style.paddingBottom).toBe('60px');
    dispose();
  });

  it('receives (item, index) and prices each row from its own index', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const seen: Array<[number, number]> = [];
    const items = signal<Item[]>(tenItems());
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: {
        rowHeight: (item, index) => {
          seen.push([item.id, index]);
          return 20;
        },
        overscan: 0,
      },
    });
    // Every id was measured at its own index.
    expect(seen).toContainEqual([0, 0]);
    expect(seen).toContainEqual([9, 9]);
    expect(seen.every(([id, idx]) => id === idx)).toBe(true);
    dispose();
  });

  it('handles an empty list and an over-scroll past the end without crashing', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>([]);
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: altHeight, overscan: 0 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(0);
    expect(sizer.style.paddingTop).toBe('0px');
    expect(sizer.style.paddingBottom).toBe('0px');

    // Refill, then scroll far past the content height (browsers clamp, but be safe).
    items.value = tenItems();
    parent.scrollTop = 10_000;
    parent.dispatchEvent(new Event('scroll'));
    await new Promise((r) => setTimeout(r, 30));
    expect(sizer.children.length).toBe(0); // window is empty past the end
    expect(sizer.style.paddingTop).toBe('300px'); // all content is above
    expect(sizer.style.paddingBottom).toBe('0px');
    dispose();
  });

  it('the number fast path still works alongside the declared-height path (no offsets built)', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` })));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, overscan: 2 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(7); // ceil(100/20)+2
    expect((sizer.firstElementChild as HTMLElement).style.height).toBe('20px');
    expect(sizer.style.paddingBottom).toBe(`${(100 - 7) * 20}px`);
    dispose();
  });
});

describe('bindList() — measured-height virtualization ({ estimate } + setHeight, KF-502)', () => {
  const withHeight = (el: HTMLElement, h: number) =>
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });
  const hundred = (): Item[] => Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` }));
  const raf = () => new Promise((r) => setTimeout(r, 30));

  it('sizes rows by the estimate until a real height is reported', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(hundred());
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    // estimate 50, viewport 100 → 2 rows; total height 100*50 = 5000.
    expect(Array.from(sizer.children).map((c) => c.textContent)).toEqual(['r0', 'r1']);
    // Measured rows are NOT force-sized (they must take their natural height so
    // the real offsetHeight can be read); the model drives the padding instead.
    expect((sizer.firstElementChild as HTMLElement).style.height).toBe('');
    expect(sizer.style.paddingBottom).toBe('4900px'); // 5000 − offsets[2]=100
    dispose();
  });

  it('accepts a function estimate (item, index)', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(hundred());
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: (_, i) => (i === 0 ? 30 : 50) }, overscan: 0 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    // row0 estimated at 30 → offsets [0,30,80,130,…]; viewport 100 spans 3 rows
    // (a flat estimate of 50 would show only 2), proving the function was used.
    expect(Array.from(sizer.children).map((c) => c.textContent)).toEqual(['r0', 'r1', 'r2']);
    expect(sizer.style.paddingBottom).toBe('4850px'); // total 30+99*50=4980 − offsets[3]=130
    dispose();
  });

  it('setHeight updates the row and repaints the window/padding (rAF-batched)', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(hundred());
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    const sizer = parent.firstElementChild as HTMLElement;

    list.setHeight(0, 90); // row 0 is on-screen; taller than the estimate
    await raf();
    // total height 5000 − 50 + 90 = 5040; window now [0, findEnd(100)] → offsets: [0,90,140,...].
    // findEnd(100): first offset ≥ 100 = index 2 (offsets[2]=140). padBottom = 5040 − 140 = 4900.
    expect(sizer.style.paddingBottom).toBe('4900px');

    // Re-measure the SAME key (the delta is computed against the prior report, 90).
    list.setHeight(0, 70);
    await raf();
    expect(sizer.style.paddingBottom).toBe('4900px'); // total 5020 − offsets[2]=120
    list();
  });

  it('anchor-corrects scrollTop when a row ABOVE the viewport is remeasured', async () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(hundred());
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    parent.scrollTop = 500; // rows 0..9 (offsets 0..500) are above the fold
    parent.dispatchEvent(new Event('scroll'));
    await raf();

    // Remeasure row 2 (fully above: its bottom offset 150 ≤ 500) taller by 30.
    list.setHeight(2, 80);
    await raf();
    expect(parent.scrollTop).toBe(530); // corrected by +30 so on-screen rows don't jump
    list();
  });

  it('does NOT anchor-correct when the remeasured row is at/below the viewport top', async () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(hundred());
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    parent.scrollTop = 500;
    parent.dispatchEvent(new Event('scroll'));
    await raf();

    list.setHeight(12, 80); // offsets[13]=650 > 500 → not above the fold
    await raf();
    expect(parent.scrollTop).toBe(500); // unchanged
    list();
  });

  it('setHeight is a no-op for the same height, an unknown key, and non-measuring modes', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 500;
    const items = signal<Item[]>(hundred());
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    parent.dispatchEvent(new Event('scroll'));
    await raf();

    list.setHeight(2, 50); // same as the estimate → no change, no anchor shift
    list.setHeight(999, 80); // key not in the list → ignored
    await raf();
    expect(parent.scrollTop).toBe(500);
    list();

    // A fixed-height list: setHeight does nothing.
    const parent2 = host();
    withHeight(parent2, 100);
    const items2 = signal<Item[]>(hundred());
    const fixed = bindList(parent2, items2, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20 },
    });
    const before = (parent2.firstElementChild as HTMLElement).style.paddingBottom;
    fixed.setHeight(0, 999);
    await raf();
    expect((parent2.firstElementChild as HTMLElement).style.paddingBottom).toBe(before);
    fixed();
  });

  it('a reported height follows its KEY across a reorder', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(hundred());
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    list.setHeight(0, 90);
    await raf();

    // Move item id 0 to index 5; its measured 90 must travel with the key.
    const next = items.value.slice();
    const [moved] = next.splice(0, 1);
    next.splice(5, 0, moved);
    items.value = next;
    // New order at the top is r1 (still estimate 50).
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.firstElementChild?.textContent).toBe('r1');
    // Total height still reflects id 0 at 90 (one 90 + ninety-nine 50s = 5040).
    // At scrollTop 0 the window is [0, findEnd(100)=2); padBottom = 5040 − offsets[2](=100) = 4940.
    expect(sizer.style.paddingBottom).toBe('4940px');
    list();
  });

  it('prunes a reported height when its key leaves the source (no stale reuse on return) — KF-512', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(Array.from({ length: 10 }, (_, i) => ({ id: i, label: `r${i}` })));
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(2); // estimate 50, viewport 100 → 2 rows

    // Measure id 0 taller than the viewport → only it fits (proves the report took).
    list.setHeight(0, 120);
    await raf();
    expect(sizer.children.length).toBe(1);

    // Remove id 0 from the source, then bring a FRESH id 0 back at the front.
    items.value = items.value.filter((i) => i.id !== 0); // id 0 leaves → its height is pruned
    items.value = [{ id: 0, label: 'r0' }, ...items.value];

    // If the stale 120 had survived, id 0 would fill the viewport (1 row). Because
    // it was pruned, id 0 is estimated at 50 again → the window is back to 2 rows.
    expect(sizer.children.length).toBe(2);
    list();
  });

  it('a key that only scrolls out of the WINDOW (still in the source) keeps its measurement — KF-512', async () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` })));
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    // Measure id 0 at 120 (above the fold once we scroll), then scroll far past it.
    list.setHeight(0, 120);
    await raf();
    parent.scrollTop = 2000;
    parent.dispatchEvent(new Event('scroll'));
    await raf();
    // Scroll back to the top: id 0 is still in the source, so its 120 survived —
    // only id 0 fills the 100px viewport (window of 1), not the estimate's 2.
    parent.scrollTop = 0;
    parent.dispatchEvent(new Event('scroll'));
    await raf();
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(1);
    list();
  });

  it('transition combination: measured mode + minRows (render-all below, window above)', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(Array.from({ length: 4 }, (_, i) => ({ id: i, label: `r${i}` })));
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0, minRows: 10 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(4); // below minRows → render all
    expect(sizer.style.paddingBottom).toBe('0px');
    list.setHeight(0, 40); // reporting into a render-all measured list must not throw
    await raf();
    expect(sizer.children.length).toBe(4); // still all rendered

    items.value = Array.from({ length: 25 }, (_, i) => ({ id: i, label: `r${i}` })); // cross threshold
    // Now windowed. id 0's measured 40 carried across the render-all→window
    // transition, so the viewport (100) spans 3 rows (40 + 50 + 50), not 2.
    expect(sizer.children.length).toBe(3);
    list();
  });

  it('transition combination: arraySignal source + virtualize (keyed diff per window)', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = arraySignal<Item>(Array.from({ length: 50 }, (_, i) => ({ id: i, label: `r${i}` })));
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, overscan: 0 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(5); // 100/20
    items.insert(0, { id: 999, label: 'new' }); // arraySignal mutation under virtualization
    expect(sizer.firstElementChild?.textContent).toBe('new');
    items.remove(0);
    expect(sizer.firstElementChild?.textContent).toBe('r0');
    list();
  });
});

describe('bindList() — observeRowHeights (ResizeObserver helper, KF-502)', () => {
  const withHeight = (el: HTMLElement, h: number) =>
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });
  const hundred = (): Item[] => Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` }));
  const raf = () => new Promise((r) => setTimeout(r, 30));

  class FakeRO {
    static instances: FakeRO[] = [];
    cb: (entries: Array<{ target: Element }>) => void;
    observed = new Set<Element>();
    constructor(cb: (entries: Array<{ target: Element }>) => void) {
      this.cb = cb;
      FakeRO.instances.push(this);
    }
    observe(el: Element): void { this.observed.add(el); }
    unobserve(el: Element): void { this.observed.delete(el); }
    disconnect(): void { this.observed.clear(); }
    flush(): void { this.cb([...this.observed].map((target) => ({ target }))); }
  }

  let originalRO: typeof globalThis.ResizeObserver | undefined;
  afterEach(() => {
    FakeRO.instances.length = 0;
    if (originalRO !== undefined) globalThis.ResizeObserver = originalRO;
    originalRO = undefined;
  });
  const installFakeRO = () => {
    originalRO = globalThis.ResizeObserver;
    (globalThis as { ResizeObserver: unknown }).ResizeObserver = FakeRO;
  };

  it('observes the visible rows and forwards offsetHeight to setHeight', async () => {
    installFakeRO();
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(hundred());
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    const stop = observeRowHeights(list);

    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(2); // estimate 50, viewport 100 → 2 rows
    // Give the two visible rows a real (measured) height taller than the estimate.
    for (const el of Array.from(sizer.children)) {
      Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 120 });
    }
    // The helper's ResizeObserver is the LAST FakeRO created — bindList makes its
    // own parent-resize observer first.
    FakeRO.instances.at(-1)!.flush(); // fires → setHeight(key, 120) per row
    await raf();

    // Now each visible row is 120px, so only ONE fills the 100px viewport — the
    // measurement re-windowed the list.
    expect(sizer.children.length).toBe(1);
    stop();
    list();
  });

  it('re-observes the new window after a scroll shift', async () => {
    installFakeRO();
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(hundred());
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    const stop = observeRowHeights(list);
    const ro = FakeRO.instances.at(-1)!; // helper observer (bindList makes the parent one first)
    const firstWindow = new Set(ro.observed);

    parent.scrollTop = 1000; // shift the window
    parent.dispatchEvent(new Event('scroll'));
    await raf();

    // After the render, the helper re-observed a different set of row elements.
    expect(ro.observed.size).toBeGreaterThan(0);
    const shifted = [...ro.observed].some((el) => !firstWindow.has(el));
    expect(shifted).toBe(true);
    stop();
    list();
  });

  it('the disposer disconnects the observer', () => {
    installFakeRO();
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(hundred());
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 } },
    });
    const stop = observeRowHeights(list);
    const ro = FakeRO.instances.at(-1)!; // helper observer (bindList makes the parent one first)
    expect(ro.observed.size).toBeGreaterThan(0);
    stop();
    expect(ro.observed.size).toBe(0);
    list();
  });

  it('is a no-op for a non-virtualized handle and when ResizeObserver is unavailable', () => {
    // Non-virtualized handle → no internals registered.
    const parent = host();
    const items = signal<Item[]>(hundred());
    const plain = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
    expect(() => observeRowHeights(plain)()).not.toThrow();
    plain();

    // Virtualized, but ResizeObserver unavailable.
    const saved = globalThis.ResizeObserver;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined;
    try {
      const parent2 = host();
      withHeight(parent2, 100);
      const items2 = signal<Item[]>(hundred());
      const list = bindList(parent2, items2, {
        key: (i) => i.id,
        render: (i) => i.label,
        virtualize: { rowHeight: { estimate: 50 } },
      });
      expect(() => observeRowHeights(list)()).not.toThrow();
      list();
    } finally {
      globalThis.ResizeObserver = saved;
    }
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

describe('bindList() — virtualize minRows / container / resize (KF-503)', () => {
  const withHeight = (el: HTMLElement, h: number) =>
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });
  const n = (count: number): Item[] => Array.from({ length: count }, (_, i) => ({ id: i, label: `r${i}` }));

  it('minRows: renders ALL rows (no windowing, zero padding) while below the threshold', () => {
    const parent = host();
    withHeight(parent, 100); // would show ~5 rows at 20px if it windowed
    const items = signal<Item[]>(n(8));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, overscan: 0, minRows: 20 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(8); // ALL 8, not a 5-row window
    expect(sizer.style.paddingTop).toBe('0px');
    expect(sizer.style.paddingBottom).toBe('0px');
    // Still one structure: the inner container exists just like the windowed path.
    expect((sizer.firstElementChild as HTMLElement).style.height).toBe('20px');
    dispose();
  });

  it('minRows: windows once the list reaches the threshold, and reverts below it', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(n(3));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, overscan: 0, minRows: 5 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(3); // below threshold → all

    items.value = n(50); // cross the threshold → window
    expect(sizer.children.length).toBe(5); // ceil(100/20)+0
    expect(sizer.style.paddingBottom).toBe(`${(50 - 5) * 20}px`);

    items.value = n(4); // back below → all again, zero padding
    expect(sizer.children.length).toBe(4);
    expect(sizer.style.paddingBottom).toBe('0px');
    dispose();
  });

  it('minRows render-all also sizes declared variable-height rows', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(4));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: (_, i) => (i % 2 === 0 ? 20 : 40), overscan: 0, minRows: 10 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(4);
    expect(Array.from(sizer.children).map((c) => (c as HTMLElement).style.height))
      .toEqual(['20px', '40px', '20px', '40px']);
    dispose();
  });

  it('containerClass / containerId are applied to the inner container, exposed as handle.container', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(50));
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, containerClass: 'rows', containerId: 'ticket-rows' },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.className).toBe('rows');
    expect(sizer.id).toBe('ticket-rows');
    expect(list.container).toBe(sizer);
    list();
  });

  it('handle.container is undefined for a non-virtualized list', () => {
    const parent = host();
    const items = signal<Item[]>(n(3));
    const list = bindList(parent, items, { key: (i) => i.id, render: (i) => i.label });
    expect(list.container).toBeUndefined();
    list();
  });

  describe('parent ResizeObserver', () => {
    class FakeRO {
      static instances: FakeRO[] = [];
      cb: () => void;
      observed = new Set<Element>();
      constructor(cb: () => void) { this.cb = cb; FakeRO.instances.push(this); }
      observe(el: Element): void { this.observed.add(el); }
      unobserve(el: Element): void { this.observed.delete(el); }
      disconnect(): void { this.observed.clear(); }
      flush(): void { this.cb(); }
    }
    let originalRO: typeof globalThis.ResizeObserver | undefined;
    afterEach(() => {
      FakeRO.instances.length = 0;
      if (originalRO !== undefined) globalThis.ResizeObserver = originalRO;
      originalRO = undefined;
    });
    const install = () => {
      originalRO = globalThis.ResizeObserver;
      (globalThis as { ResizeObserver: unknown }).ResizeObserver = FakeRO;
    };
    const raf = () => new Promise((r) => setTimeout(r, 30));

    it('re-windows when the parent resizes — a 0-height-at-mount list fills in once laid out', async () => {
      install();
      const parent = host();
      withHeight(parent, 0); // not laid out yet at mount
      parent.scrollTop = 0;
      const items = signal<Item[]>(n(100));
      const dispose = bindList(parent, items, {
        key: (i) => i.id,
        render: (i) => i.label,
        virtualize: { rowHeight: 20, overscan: 2 },
      });
      const sizer = parent.firstElementChild as HTMLElement;
      // clientHeight 0 → only overscan rows render.
      expect(sizer.children.length).toBe(2);

      // Layout settles: the parent gains height and the ResizeObserver fires.
      Object.defineProperty(parent, 'clientHeight', { configurable: true, value: 100 });
      FakeRO.instances[0].flush(); // the parent-resize observer (bindList's only RO here)
      await raf();
      expect(sizer.children.length).toBe(7); // ceil(100/20)+2
      dispose();
    });

    it('dispose disconnects the parent ResizeObserver', () => {
      install();
      const parent = host();
      withHeight(parent, 100);
      const items = signal<Item[]>(n(50));
      const dispose = bindList(parent, items, {
        key: (i) => i.id,
        render: (i) => i.label,
        virtualize: { rowHeight: 20 },
      });
      const ro = FakeRO.instances[0];
      expect(ro.observed.has(parent)).toBe(true);
      dispose();
      expect(ro.observed.size).toBe(0);
    });
  });
});

describe('bindList() — content-visibility virtualization mode (KF-525)', () => {
  const withHeight = (el: HTMLElement, h: number) =>
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });
  const n = (count: number): Item[] => Array.from({ length: count }, (_, i) => ({ id: i, label: `r${i}` }));
  const sizerOf = (parent: HTMLElement) => parent.firstElementChild as HTMLElement;
  const cv = (el: Element) => (el as HTMLElement).style.contentVisibility;
  const intrinsic = (el: Element) => (el as HTMLElement).style.containIntrinsicSize;

  it('renders EVERY row into the inner container and sets the two CSS props per row (no padding)', () => {
    const parent = host();
    withHeight(parent, 100); // would window to ~5 rows in window mode — but CV renders all
    const items = signal<Item[]>(n(100));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    expect(sizer.children.length).toBe(100); // ALL rows, not a window
    expect(texts(sizer)[0]).toBe('r0');
    expect(texts(sizer)[99]).toBe('r99');
    for (const row of sizer.children) {
      expect(cv(row)).toBe('auto');
      expect(intrinsic(row)).toBe('0 20px'); // fixed rowHeight → placeholder
    }
    // No windowing → no padding, and rows are NOT force-sized (natural height).
    expect(sizer.style.paddingTop).toBe('');
    expect(sizer.style.paddingBottom).toBe('');
    expect((sizer.firstElementChild as HTMLElement).style.height).toBe('');
    dispose();
  });

  it('declared (item, index) => number heights become per-row contain-intrinsic-size', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(4));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: (_, i) => (i % 2 === 0 ? 20 : 40), mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    expect(Array.from(sizer.children).map(intrinsic))
      .toEqual(['0 20px', '0 40px', '0 20px', '0 40px']);
    dispose();
  });

  it('{ estimate } (number and function) supplies the intrinsic size; no measurement', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(3));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: (_, i) => (i === 1 ? 90 : 60) }, mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    expect(Array.from(sizer.children).map(intrinsic)).toEqual(['0 60px', '0 90px', '0 60px']);
    dispose();
  });

  it('a number estimate also supplies the intrinsic size', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(3));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 64 }, mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    expect(Array.from(sizer.children).map(intrinsic)).toEqual(['0 64px', '0 64px', '0 64px']);
    dispose();
  });

  it('setHeight is a no-op in this mode (intrinsic size unchanged, no anchor correction)', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(n(5));
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    list.setHeight(2, 200); // would move offsets in measured window mode
    await new Promise((r) => setTimeout(r, 30));
    // Every row keeps the estimate-derived placeholder; scrollTop is untouched.
    expect(Array.from(sizer.children).map(intrinsic)).toEqual(Array(5).fill('0 50px'));
    expect(parent.scrollTop).toBe(0);
    list();
  });

  it('observeRowHeights is a clean no-op (registers no ResizeObserver) in this mode', () => {
    const created: unknown[] = [];
    const originalRO = globalThis.ResizeObserver;
    class FakeRO {
      constructor(cb: () => void) { created.push(cb); }
      observe(): void { /* noop */ }
      unobserve(): void { /* noop */ }
      disconnect(): void { /* noop */ }
    }
    (globalThis as { ResizeObserver: unknown }).ResizeObserver = FakeRO;
    try {
      const parent = host();
      withHeight(parent, 100);
      const items = signal<Item[]>(n(5));
      const list = bindList(parent, items, {
        key: (i) => i.id,
        render: (i) => i.label,
        virtualize: { rowHeight: { estimate: 50 }, mode: 'content-visibility' },
      });
      const stop = observeRowHeights(list);
      expect(typeof stop).toBe('function');
      expect(created.length).toBe(0); // no RO created — neither parent-resize nor observer
      stop();
      list();
    } finally {
      (globalThis as { ResizeObserver: unknown }).ResizeObserver = originalRO;
    }
  });

  it('installs no scroll listener: a scroll does not window rows out', async () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(n(100));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    parent.scrollTop = 1000;
    parent.dispatchEvent(new Event('scroll'));
    await new Promise((r) => setTimeout(r, 30));
    expect(sizer.children.length).toBe(100); // still every row — scroll changed nothing
    dispose();
  });

  it('ignores minRows (renders all + CSS regardless of the threshold)', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(3));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      // minRows below the length would window in 'window' mode; CV ignores it.
      virtualize: { rowHeight: 20, minRows: 2, mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    expect(sizer.children.length).toBe(3);
    expect(cv(sizer.firstElementChild as Element)).toBe('auto');
    expect(sizer.style.paddingBottom).toBe('');
    dispose();
  });

  it('exposes handle.container + honors containerClass / containerId', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(10));
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, mode: 'content-visibility', containerClass: 'rows', containerId: 'cv-rows' },
    });
    const sizer = sizerOf(parent);
    expect(list.container).toBe(sizer);
    expect(sizer.className).toBe('rows');
    expect(sizer.id).toBe('cv-rows');
    list();
  });

  it('reacts to source changes: new rows get the CSS props, removed rows go', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(3));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    expect(sizer.children.length).toBe(3);

    items.value = n(6); // grow
    expect(sizer.children.length).toBe(6);
    for (const row of sizer.children) {
      expect(cv(row)).toBe('auto');
      expect(intrinsic(row)).toBe('0 20px');
    }

    items.value = n(2); // shrink
    expect(sizer.children.length).toBe(2);
    dispose();
  });

  it('sets the CSS props on element-mode rows too (kerf owns virtualization sizing)', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(3));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => {
        const el = document.createElement('article');
        el.textContent = i.label;
        return el;
      },
      virtualize: { rowHeight: 30, mode: 'content-visibility' },
    });
    const sizer = sizerOf(parent);
    expect(sizer.firstElementChild?.tagName).toBe('ARTICLE');
    for (const row of sizer.children) {
      expect(cv(row)).toBe('auto');
      expect(intrinsic(row)).toBe('0 30px');
    }
    dispose();
  });

  it("mode: 'window' (and the default) still windows and sets no content-visibility", () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(n(100));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, overscan: 2, mode: 'window' },
    });
    const sizer = sizerOf(parent);
    expect(sizer.children.length).toBe(7); // windowed, not all 100
    expect(cv(sizer.firstElementChild as Element)).toBe(''); // no content-visibility in window mode
    expect(sizer.style.paddingBottom).toBe(`${(100 - 7) * 20}px`);
    dispose();
  });

  it('dispose removes the inner container and its rows', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(n(20));
    const dispose = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: 20, mode: 'content-visibility' },
    });
    expect(parent.children.length).toBe(1);
    dispose();
    expect(parent.children.length).toBe(0);
  });
});
