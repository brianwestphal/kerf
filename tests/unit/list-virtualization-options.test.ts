import { afterEach,beforeEach,describe,expect,it } from 'vitest';

import { bindList,observeRowHeights } from '../../src/list.js';
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

const texts = (parent: HTMLElement) => Array.from(parent.children).map((c) => c.textContent);

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
    it('re-windows when the parent resizes — a 0-height-at-mount list fills in once laid out', () => {
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
      expect(flushAnimationFrame()).toBe(1);
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

  it('setHeight is a no-op in this mode (intrinsic size unchanged, no anchor correction)', () => {
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
    expect(pendingFrames.size).toBe(0);
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

  it('installs no scroll listener: a scroll does not window rows out', () => {
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
    expect(pendingFrames.size).toBe(0);
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
