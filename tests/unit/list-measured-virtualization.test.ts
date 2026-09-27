import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { bindList, observeRowHeights } from '../../src/list.js';
import { signal } from '../../src/reactive.js';

interface Item {
  id: number;
  label: string;
}

let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame;
let nextFrameId = 1;
const pendingFrames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  nextFrameId = 1;
  pendingFrames.clear();
  globalThis.requestAnimationFrame = (
    callback: FrameRequestCallback,
  ): number => {
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

describe('bindList() — measured-height virtualization ({ estimate } + setHeight, KF-502)', () => {
  const withHeight = (el: HTMLElement, h: number) =>
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: h });
  const hundred = (): Item[] =>
    Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` }));
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
    expect(Array.from(sizer.children).map((c) => c.textContent)).toEqual([
      'r0',
      'r1',
    ]);
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
      virtualize: {
        rowHeight: { estimate: (_, i) => (i === 0 ? 30 : 50) },
        overscan: 0,
      },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    // row0 estimated at 30 → offsets [0,30,80,130,…]; viewport 100 spans 3 rows
    // (a flat estimate of 50 would show only 2), proving the function was used.
    expect(Array.from(sizer.children).map((c) => c.textContent)).toEqual([
      'r0',
      'r1',
      'r2',
    ]);
    expect(sizer.style.paddingBottom).toBe('4850px'); // total 30+99*50=4980 − offsets[3]=130
    dispose();
  });

  it('setHeight updates the row and repaints the window/padding (rAF-batched)', () => {
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
    expect(flushAnimationFrame()).toBe(1);
    // total height 5000 − 50 + 90 = 5040; window now [0, findEnd(100)] → offsets: [0,90,140,...].
    // findEnd(100): first offset ≥ 100 = index 2 (offsets[2]=140). padBottom = 5040 − 140 = 4900.
    expect(sizer.style.paddingBottom).toBe('4900px');

    // Re-measure the SAME key (the delta is computed against the prior report, 90).
    list.setHeight(0, 70);
    expect(flushAnimationFrame()).toBe(1);
    expect(sizer.style.paddingBottom).toBe('4900px'); // total 5020 − offsets[2]=120
    list();
  });

  it('anchor-corrects scrollTop when a row ABOVE the viewport is remeasured', () => {
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
    expect(flushAnimationFrame()).toBe(1);

    // Remeasure row 2 (fully above: its bottom offset 150 ≤ 500) taller by 30.
    list.setHeight(2, 80);
    expect(flushAnimationFrame()).toBe(1);
    expect(parent.scrollTop).toBe(530); // corrected by +30 so on-screen rows don't jump
    list();
  });

  it('does NOT anchor-correct when the remeasured row is at/below the viewport top', () => {
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
    expect(flushAnimationFrame()).toBe(1);

    list.setHeight(12, 80); // offsets[13]=650 > 500 → not above the fold
    expect(flushAnimationFrame()).toBe(1);
    expect(parent.scrollTop).toBe(500); // unchanged
    list();
  });

  it('setHeight is a no-op for the same height, an unknown key, and non-measuring modes', () => {
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
    expect(flushAnimationFrame()).toBe(1);

    list.setHeight(2, 50); // same as the estimate → no change, no anchor shift
    list.setHeight(999, 80); // key not in the list → ignored
    expect(pendingFrames.size).toBe(0);
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
    const before = (parent2.firstElementChild as HTMLElement).style
      .paddingBottom;
    fixed.setHeight(0, 999);
    expect(pendingFrames.size).toBe(0);
    expect((parent2.firstElementChild as HTMLElement).style.paddingBottom).toBe(
      before,
    );
    fixed();
  });

  it('a reported height follows its KEY across a reorder', () => {
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
    expect(flushAnimationFrame()).toBe(1);

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

  it('prunes a reported height when its key leaves the source (no stale reuse on return) — KF-512', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(
      Array.from({ length: 10 }, (_, i) => ({ id: i, label: `r${i}` })),
    );
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(2); // estimate 50, viewport 100 → 2 rows

    // Measure id 0 taller than the viewport → only it fits (proves the report took).
    list.setHeight(0, 120);
    expect(flushAnimationFrame()).toBe(1);
    expect(sizer.children.length).toBe(1);

    // Remove id 0 from the source, then bring a FRESH id 0 back at the front.
    items.value = items.value.filter((i) => i.id !== 0); // id 0 leaves → its height is pruned
    items.value = [{ id: 0, label: 'r0' }, ...items.value];

    // If the stale 120 had survived, id 0 would fill the viewport (1 row). Because
    // it was pruned, id 0 is estimated at 50 again → the window is back to 2 rows.
    expect(sizer.children.length).toBe(2);
    list();
  });

  it('a key that only scrolls out of the WINDOW (still in the source) keeps its measurement — KF-512', () => {
    const parent = host();
    withHeight(parent, 100);
    const items = signal<Item[]>(
      Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` })),
    );
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0 },
    });
    // Measure id 0 at 120 (above the fold once we scroll), then scroll far past it.
    list.setHeight(0, 120);
    expect(flushAnimationFrame()).toBe(1);
    parent.scrollTop = 2000;
    parent.dispatchEvent(new Event('scroll'));
    expect(flushAnimationFrame()).toBe(1);
    // Scroll back to the top: id 0 is still in the source, so its 120 survived —
    // only id 0 fills the 100px viewport (window of 1), not the estimate's 2.
    parent.scrollTop = 0;
    parent.dispatchEvent(new Event('scroll'));
    expect(flushAnimationFrame()).toBe(1);
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(1);
    list();
  });

  describe('pending anchor delta across a pre-frame transition (KF-FJ40AE: stale scrollTop correction)', () => {
    // Every case scrolls to 500 (rows 0..9 above the fold), remeasures row 2
    // (fully above: bottom 150 ≤ 500) taller by 30, then changes state BEFORE
    // the animation frame that would apply the +30 correction runs.
    const setup = () => {
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
      expect(flushAnimationFrame()).toBe(1);
      list.setHeight(2, 80);
      return { parent, items, list };
    };

    it('setHeight(above) → remove that key → flush: no stale correction', () => {
      const { parent, items, list } = setup();
      items.value = items.value.filter((i) => i.id !== 2);
      flushAnimationFrame();
      expect(parent.scrollTop).toBe(500);
      list();
    });

    it('setHeight(above) → move the key below the viewport → flush: no correction', () => {
      const { parent, items, list } = setup();
      const next = items.value.slice();
      const [moved] = next.splice(2, 1);
      next.splice(50, 0, moved);
      items.value = next;
      flushAnimationFrame();
      expect(parent.scrollTop).toBe(500);
      list();
    });

    it('setHeight(above) → reorder that keeps the key above → flush: correction still applies', () => {
      const { parent, items, list } = setup();
      const next = items.value.slice();
      const [moved] = next.splice(2, 1);
      next.splice(0, 0, moved);
      items.value = next;
      flushAnimationFrame();
      expect(parent.scrollTop).toBe(530);
      list();
    });

    it('setHeight(above) → user scrolls further down → flush: correction applies on top of the new position', () => {
      const { parent, list } = setup();
      parent.scrollTop = 800;
      parent.dispatchEvent(new Event('scroll'));
      expect(flushAnimationFrame()).toBe(1);
      expect(parent.scrollTop).toBe(830);
      list();
    });

    it('setHeight(above) → user scrolls up past the row → flush: no correction', () => {
      const { parent, list } = setup();
      parent.scrollTop = 0;
      parent.dispatchEvent(new Event('scroll'));
      expect(flushAnimationFrame()).toBe(1);
      expect(parent.scrollTop).toBe(0);
      list();
    });

    it('setHeight(above) → dispose() → flush: nothing is written', () => {
      const { parent, list } = setup();
      list();
      flushAnimationFrame();
      expect(parent.scrollTop).toBe(500);
    });

    it('two setHeight calls on one key within one frame net out', () => {
      const { parent, list } = setup();
      list.setHeight(2, 50); // back to the estimate → net delta 0
      expect(flushAnimationFrame()).toBe(1);
      expect(parent.scrollTop).toBe(500);
      list.setHeight(2, 80);
      list.setHeight(2, 95); // 50 → 80 → 95 in one frame → net +45
      expect(flushAnimationFrame()).toBe(1);
      expect(parent.scrollTop).toBe(545);
      list();
    });

    it('scrolled deep → the source shrinks below scrollTop: padding is the whole content', () => {
      const { parent, items, list } = setup();
      flushAnimationFrame(); // apply the +30 → 530
      items.value = items.value.slice(0, 5); // 50+50+80+50+50 = 280 < 530
      const sizer = parent.firstElementChild as HTMLElement;
      expect(sizer.children.length).toBe(0);
      expect(sizer.style.paddingTop).toBe('280px');
      expect(sizer.style.paddingBottom).toBe('0px');
      list();
    });

    it('a removed key that returns before the frame is a fresh row (no stale correction)', () => {
      const { parent, items, list } = setup();
      const all = items.value;
      items.value = all.filter((i) => i.id !== 2);
      items.value = all;
      flushAnimationFrame();
      expect(parent.scrollTop).toBe(500);
      list();
    });
  });

  it('transition combination: measured mode + minRows (render-all below, window above)', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = signal<Item[]>(
      Array.from({ length: 4 }, (_, i) => ({ id: i, label: `r${i}` })),
    );
    const list = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
      virtualize: { rowHeight: { estimate: 50 }, overscan: 0, minRows: 10 },
    });
    const sizer = parent.firstElementChild as HTMLElement;
    expect(sizer.children.length).toBe(4); // below minRows → render all
    expect(sizer.style.paddingBottom).toBe('0px');
    list.setHeight(0, 40); // reporting into a render-all measured list must not throw
    expect(flushAnimationFrame()).toBe(1);
    expect(sizer.children.length).toBe(4); // still all rendered

    items.value = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      label: `r${i}`,
    })); // cross threshold
    // Now windowed. id 0's measured 40 carried across the render-all→window
    // transition, so the viewport (100) spans 3 rows (40 + 50 + 50), not 2.
    expect(sizer.children.length).toBe(3);
    list();
  });

  it('transition combination: arraySignal source + virtualize (keyed diff per window)', () => {
    const parent = host();
    withHeight(parent, 100);
    parent.scrollTop = 0;
    const items = arraySignal<Item>(
      Array.from({ length: 50 }, (_, i) => ({ id: i, label: `r${i}` })),
    );
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
  const hundred = (): Item[] =>
    Array.from({ length: 100 }, (_, i) => ({ id: i, label: `r${i}` }));
  class FakeRO {
    static instances: FakeRO[] = [];
    cb: (entries: Array<{ target: Element }>) => void;
    observed = new Set<Element>();
    constructor(cb: (entries: Array<{ target: Element }>) => void) {
      this.cb = cb;
      FakeRO.instances.push(this);
    }
    observe(el: Element): void {
      this.observed.add(el);
    }
    unobserve(el: Element): void {
      this.observed.delete(el);
    }
    disconnect(): void {
      this.observed.clear();
    }
    flush(): void {
      this.cb([...this.observed].map((target) => ({ target })));
    }
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

  it('observes the visible rows and forwards offsetHeight to setHeight', () => {
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
      Object.defineProperty(el, 'offsetHeight', {
        configurable: true,
        value: 120,
      });
    }
    // The helper's ResizeObserver is the LAST FakeRO created — bindList makes its
    // own parent-resize observer first.
    FakeRO.instances.at(-1)!.flush(); // fires → setHeight(key, 120) per row
    expect(flushAnimationFrame()).toBe(1);

    // Now each visible row is 120px, so only ONE fills the 100px viewport — the
    // measurement re-windowed the list.
    expect(sizer.children.length).toBe(1);
    stop();
    list();
  });

  it('re-observes the new window after a scroll shift', () => {
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
    expect(flushAnimationFrame()).toBe(1);

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
    const plain = bindList(parent, items, {
      key: (i) => i.id,
      render: (i) => i.label,
    });
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
