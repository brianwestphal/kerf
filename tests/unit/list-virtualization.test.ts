import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import { bindList } from '../../src/list.js';
import { signal } from '../../src/reactive.js';

interface Item { id: number; label: string }

let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame;
let nextFrameId = 1;
const pendingFrames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  nextFrameId = 1;
  pendingFrames.clear();
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = nextFrameId++;
    pendingFrames.set(id, callback);
    return id;
  };
});

afterEach(() => {
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  pendingFrames.clear();
  document.body.innerHTML = '';
});

function flushAnimationFrame(): number {
  const callbacks = [...pendingFrames.values()];
  pendingFrames.clear();
  for (const callback of callbacks) callback(Date.now());
  return callbacks.length;
}

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

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

  it('shifts the window on scroll (rAF-throttled) and updates padding', () => {
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
    expect(flushAnimationFrame()).toBe(1);

    const sizer = parent.firstElementChild as HTMLElement;
    // window start = floor(400/20) - 2 = 18
    expect(sizer.firstElementChild?.textContent).toBe('r18');
    expect(sizer.style.paddingTop).toBe(`${18 * 20}px`); // 360px
    dispose();
  });

  it('coalesces rapid scrolls into one rAF and skips a rAF that fires after dispose', () => {
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
    expect(pendingFrames.size).toBe(1);
    dispose(); // before the rAF fires
    expect(flushAnimationFrame()).toBe(1); // callback runs but is a no-op (disposed)
    expect(pendingFrames.size).toBe(0);
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

  it('binary search lands on an exact row boundary (scrollTop === an offset)', () => {
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
    expect(flushAnimationFrame()).toBe(1);

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

  it('handles an empty list and an over-scroll past the end without crashing', () => {
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
    expect(flushAnimationFrame()).toBe(1);
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
