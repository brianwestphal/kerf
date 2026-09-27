import { mount, raw, signal } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { classifyViewport, type DeviceClass } from '../../src/device-class.js';
import { ResizableRegion } from '../../src/resizable-region.js';
import {
  wireWorkbench,
  type WorkbenchStorage,
} from '../../src/wire-workbench.js';
import { Workbench } from '../../src/workbench.js';

const roots: HTMLElement[] = [];
const disposers: Array<() => void> = [];

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  for (const root of roots.splice(0)) root.remove();
  globalThis.localStorage?.clear();
});

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: WorkbenchStorage & { data: Map<string, string> } = {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
  return storage;
}

/** A mounted, app-controlled resizable Workbench. */
function studio({
  mainMinSize,
  mainMinHeight,
}: { mainMinSize?: number; mainMinHeight?: number } = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  roots.push(root);
  const leftSize = signal(260);
  const drawerSize = signal(180);
  const leftCollapsed = signal(false);
  const presentation = signal<'inline' | 'overlay'>('inline');
  const rightPresentation = signal<'inline' | 'overlay'>('inline');
  const stopMount = mount(root, () =>
    Workbench({
      id: 'studio',
      label: 'Studio',
      main: raw('<div>editor</div>'),
      mainMinSize,
      mainMinHeight,
      leftRail: {
        content: raw('<div>nav</div>'),
        label: 'Navigator',
        size: leftSize.value,
        collapsed: leftCollapsed.value,
        presentation: presentation.value,
        resizable: { min: 200, max: 400 },
      },
      rightRail: {
        content: raw('<div>inspector</div>'),
        size: 240,
        presentation: rightPresentation.value,
      },
      bottomDrawer: {
        content: raw('<div>console</div>'),
        label: 'Console',
        size: drawerSize.value,
        resizable: true,
      },
    }),
  );
  disposers.push(stopMount);
  const handle = (selector: string) =>
    root.querySelector<HTMLElement>(`${selector} > [data-kui-resize-handle]`)!;
  return {
    root,
    leftSize,
    drawerSize,
    leftCollapsed,
    presentation,
    rightPresentation,
    left: () => handle('[data-workbench-rail="left"]'),
    drawer: () => handle('[data-workbench-drawer]'),
  };
}

const key = (target: HTMLElement, name: string, shiftKey = false) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true }),
  );

describe('wireWorkbench', () => {
  it('commits keyboard resizes to the app-owned size signals, clamped to the limits', () => {
    const app = studio();
    const onResize = vi.fn();
    disposers.push(
      wireWorkbench(app.root, {
        id: 'studio',
        panels: {
          leftRail: { size: app.leftSize },
          bottomDrawer: { size: app.drawerSize },
        },
        storage: memoryStorage(),
        onResize,
      }),
    );

    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(276);
    expect(onResize).toHaveBeenLastCalledWith({
      panel: 'leftRail',
      size: 276,
      source: 'keyboard',
    });
    expect(app.left().getAttribute('aria-valuenow')).toBe('276');
    key(app.left(), 'ArrowLeft', true);
    expect(app.leftSize.value).toBe(212);
    key(app.left(), 'ArrowLeft', true);
    expect(app.leftSize.value).toBe(200);
    key(app.left(), 'End');
    expect(app.leftSize.value).toBe(400);
    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(400);
    key(app.left(), 'Home');
    expect(app.leftSize.value).toBe(200);

    // The drawer's separator is its top edge: ArrowUp grows it.
    key(app.drawer(), 'ArrowUp');
    expect(app.drawerSize.value).toBe(196);
    expect(onResize).toHaveBeenLastCalledWith({
      panel: 'bottomDrawer',
      size: 196,
      source: 'keyboard',
    });
    key(app.drawer(), 'ArrowDown', true);
    expect(app.drawerSize.value).toBe(132);
  });

  it('commits pointer drags, applying the live size before the commit', () => {
    const app = studio();
    disposers.push(
      wireWorkbench(app.root, {
        id: 'studio',
        panels: { leftRail: { size: app.leftSize } },
        storage: memoryStorage(),
      }),
    );
    const handle = app.left();
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        pointerId: 1,
        clientX: 100,
        bubbles: true,
      }),
    );
    const rail = handle.parentElement!;
    expect(rail.dataset.resizing).toBe('true');
    handle.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 1000,
        bubbles: true,
      }),
    );
    expect(rail.style.getPropertyValue('--kui-resizable-region-size')).toBe(
      '400px',
    );
    expect(app.leftSize.value).toBe(260);
    handle.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 1, bubbles: true }),
    );
    expect(app.leftSize.value).toBe(400);
    expect(rail.dataset.resizing).toBeUndefined();
  });

  it('keeps the size across collapse and ignores a collapsed or non-inline panel', () => {
    const app = studio();
    disposers.push(
      wireWorkbench(app.root, {
        id: 'studio',
        panels: { leftRail: { size: app.leftSize } },
        storage: memoryStorage(),
      }),
    );
    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(276);

    app.leftCollapsed.value = true;
    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(276);
    const rail = app.left().parentElement!;
    expect(rail.dataset.collapsed).toBe('true');
    expect(rail.style.getPropertyValue('--kui-resizable-region-size')).toBe(
      '276px',
    );

    // Expanding restores the last size; resizing resumes from it.
    app.leftCollapsed.value = false;
    expect(
      app
        .left()
        .parentElement!.style.getPropertyValue('--kui-resizable-region-size'),
    ).toBe('276px');
    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(292);

    app.presentation.value = 'overlay';
    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(292);
  });

  it('suspends resizing while the device class is compact', () => {
    const app = studio();
    const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
    disposers.push(
      wireWorkbench(app.root, {
        id: 'studio',
        panels: { leftRail: { size: app.leftSize } },
        deviceClass: device,
        storage: memoryStorage(),
      }),
    );
    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(260);
    device.value = classifyViewport(1440, 'landscape');
    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(276);
    device.value = classifyViewport(375, 'portrait');
    key(app.left(), 'ArrowRight');
    expect(app.leftSize.value).toBe(276);
  });

  it('loads and saves sizes through the persistence hook', () => {
    const storage = memoryStorage({
      'studio.left': '333',
      'studio.drawer': 'not a size',
    });
    const app = studio();
    disposers.push(
      wireWorkbench(app.root, {
        id: 'studio',
        panels: {
          leftRail: { size: app.leftSize, storageKey: 'studio.left' },
          bottomDrawer: { size: app.drawerSize, storageKey: 'studio.drawer' },
        },
        storage,
      }),
    );
    expect(app.leftSize.value).toBe(333);
    expect(app.drawerSize.value).toBe(180);
    expect(app.left().getAttribute('aria-valuenow')).toBe('333');
    expect(storage.data.get('studio.drawer')).toBe('180');
    key(app.left(), 'ArrowLeft');
    expect(storage.data.get('studio.left')).toBe('317');
  });

  it('defaults to localStorage and survives a storage that throws on access', () => {
    const app = studio();
    globalThis.localStorage.setItem('studio.left', '300');
    disposers.push(
      wireWorkbench(app.root, {
        id: 'studio',
        panels: { leftRail: { size: app.leftSize, storageKey: 'studio.left' } },
      }),
    );
    expect(app.leftSize.value).toBe(300);
    key(app.left(), 'ArrowRight');
    expect(globalThis.localStorage.getItem('studio.left')).toBe('316');

    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    )!;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      },
    });
    try {
      const other = studio();
      disposers.push(
        wireWorkbench(other.root, {
          id: 'studio',
          panels: {
            leftRail: { size: other.leftSize, storageKey: 'studio.left' },
          },
        }),
      );
      expect(other.leftSize.value).toBe(260);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    }
  });

  it('drives only its own panels, never a ResizableRegion or another Workbench', () => {
    const app = studio();
    const region = document.createElement('div');
    region.innerHTML = String(
      ResizableRegion({
        id: 'studio-left-rail',
        label: 'Look-alike',
        size: 200,
        min: 100,
        max: 300,
        children: 'x' as never,
      }),
    );
    app.root.append(region);
    const onResize = vi.fn();
    const stop = wireWorkbench(app.root, {
      id: 'other',
      panels: { leftRail: { size: signal(200) } },
      storage: memoryStorage(),
      onResize,
    });
    key(app.left(), 'ArrowRight');
    key(region.querySelector<HTMLElement>('[data-kui-resize-handle]')!, 'End');
    expect(onResize).not.toHaveBeenCalled();
    expect(app.leftSize.value).toBe(260);
    stop();

    // Disposal stops the wiring; an empty panel map wires nothing.
    const size = signal(260);
    const dispose = wireWorkbench(app.root, {
      id: 'studio',
      panels: { leftRail: { size } },
      storage: memoryStorage(),
    });
    dispose();
    dispose();
    key(app.left(), 'ArrowRight');
    expect(size.value).toBe(260);
    wireWorkbench(app.root, { id: 'studio', panels: {} })();
    wireWorkbench(app.root, {
      id: 'studio',
      panels: { rightRail: undefined },
    })();
  });

  it('ignores non-positive stored sizes and a missing default store', () => {
    const app = studio();
    const storage = memoryStorage({ 'studio.left': '0' });
    disposers.push(
      wireWorkbench(app.root, {
        id: 'studio',
        panels: { leftRail: { size: app.leftSize, storageKey: 'studio.left' } },
        storage,
      }),
    );
    expect(app.leftSize.value).toBe(260);
    expect(storage.data.get('studio.left')).toBe('260');

    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    );
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    });
    try {
      const other = studio();
      disposers.push(
        wireWorkbench(other.root, {
          id: 'studio',
          panels: {
            leftRail: { size: other.leftSize, storageKey: 'studio.left' },
          },
        }),
      );
      key(other.left(), 'ArrowRight');
      expect(other.leftSize.value).toBe(276);
    } finally {
      if (descriptor)
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      else delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });

  describe('work-area minimum', () => {
    /**
     * A layout model for happy-dom, which has none: the Workbench is `width`
     * px wide, an expanded rail shows its size (a fixed rail its rail-width
     * token) plus nothing for safe areas, and an overlay rail is out of flow.
     * `leftShown` caps the width the left rail shows, as a container that
     * squeezes it does. The Workbench and its work-area column are `height` px
     * tall, and an expanded drawer shows its size.
     */
    function layout(
      width: number,
      {
        contentBoxBorder = 0,
        leftShown = Number.POSITIVE_INFINITY,
        height = 900,
      }: {
        contentBoxBorder?: number;
        leftShown?: number;
        height?: number;
      } = {},
    ) {
      vi.restoreAllMocks();
      const size = (element: HTMLElement) =>
        element.dataset.collapsed === 'true'
          ? 0
          : Number.parseFloat(
              element.style.getPropertyValue('--kui-resizable-region-size') ||
                element.style.getPropertyValue('--kui-workbench-rail-width') ||
                element.style.getPropertyValue('--kui-workbench-drawer-height'),
            );
      vi.spyOn(
        HTMLElement.prototype,
        'getBoundingClientRect',
      ).mockImplementation(function (this: HTMLElement) {
        if (this.matches('.kui-workbench__drawer'))
          return new DOMRect(0, 0, 0, size(this));
        const w = this.matches('[data-component="workbench"]')
          ? width
          : this.matches('.kui-workbench__rail--left')
            ? Math.min(size(this), leftShown)
            : this.matches('.kui-workbench__rail')
              ? size(this)
              : 0;
        const tall = this.matches(
          '[data-component="workbench"], .kui-workbench__center',
        );
        return new DOMRect(0, 0, w, tall ? height : 100);
      });
      const real = globalThis.getComputedStyle;
      vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(
        (element: Element) => {
          const style = real(element);
          if (!(element instanceof HTMLElement)) return style;
          if (element.matches('.kui-workbench__drawer'))
            return {
              boxSizing: contentBoxBorder ? 'content-box' : 'border-box',
              flexBasis: `${size(element)}px`,
              borderBlockStartWidth: `${contentBoxBorder}px`,
              borderBlockEndWidth: '',
            } as CSSStyleDeclaration;
          if (!element.matches('.kui-workbench__rail')) return style;
          return {
            boxSizing: contentBoxBorder ? 'content-box' : 'border-box',
            flexBasis: `${size(element)}px`,
            position:
              element.dataset.presentation === 'overlay'
                ? 'absolute'
                : 'static',
            borderInlineStartWidth: '0px',
            borderInlineEndWidth: element.matches('.kui-workbench__rail--left')
              ? `${contentBoxBorder}px`
              : '',
          } as CSSStyleDeclaration;
        },
      );
    }

    afterEach(() => vi.restoreAllMocks());

    it('stops a rail where the work area would drop below its minimum', () => {
      layout(840);
      const app = studio();
      disposers.push(
        wireWorkbench(app.root, {
          id: 'studio',
          panels: {
            leftRail: { size: app.leftSize },
            bottomDrawer: { size: app.drawerSize },
          },
          storage: memoryStorage(),
        }),
      );
      // 840 − 320 (work area) − 240 (the fixed right rail) leaves 280.
      key(app.left(), 'End');
      expect(app.leftSize.value).toBe(280);
      expect(app.left().getAttribute('aria-valuemax')).toBe('280');
      key(app.left(), 'ArrowRight');
      expect(app.leftSize.value).toBe(280);
      key(app.left(), 'ArrowLeft', true);
      expect(app.leftSize.value).toBe(216);

      // A rail out of flow leaves its room to the others.
      app.rightPresentation.value = 'overlay';
      key(app.left(), 'End');
      expect(app.leftSize.value).toBe(400);

      // The vertical drawer never gives way to the work area's width.
      key(app.drawer(), 'End');
      expect(app.drawerSize.value).toBe(480);
    });

    it('stops the drawer where the work area would drop below its minimum height', () => {
      layout(840, { height: 500 });
      const app = studio();
      disposers.push(
        wireWorkbench(app.root, {
          id: 'studio',
          panels: { bottomDrawer: { size: app.drawerSize } },
          storage: memoryStorage(),
        }),
      );
      // 500 − 120 (the default work-area height) leaves 380.
      key(app.drawer(), 'End');
      expect(app.drawerSize.value).toBe(380);
      expect(app.drawer().getAttribute('aria-valuemax')).toBe('380');
      key(app.drawer(), 'ArrowUp');
      expect(app.drawerSize.value).toBe(380);
      key(app.drawer(), 'ArrowDown', true);
      expect(app.drawerSize.value).toBe(316);

      // A column too short for the drawer's minimum pins its separator, which
      // then commits nothing: the remembered size is not rewritten to 120.
      layout(840, { height: 200 });
      key(app.drawer(), 'End');
      expect(app.drawerSize.value).toBe(316);
    });

    it('honors a custom minimum height, 0 to turn it off, and a content-box drawer border', () => {
      layout(840, { height: 500 });
      const custom = studio({ mainMinHeight: 300 });
      disposers.push(
        wireWorkbench(custom.root, {
          id: 'studio',
          panels: { bottomDrawer: { size: custom.drawerSize } },
          storage: memoryStorage(),
        }),
      );
      key(custom.drawer(), 'End');
      expect(custom.drawerSize.value).toBe(200);
      disposers.splice(0).forEach((dispose) => dispose());
      custom.root.remove();

      const off = studio({ mainMinHeight: 0 });
      disposers.push(
        wireWorkbench(off.root, {
          id: 'studio',
          panels: { bottomDrawer: { size: off.drawerSize } },
          storage: memoryStorage(),
        }),
      );
      key(off.drawer(), 'End');
      expect(off.drawerSize.value).toBe(480);
      disposers.splice(0).forEach((dispose) => dispose());
      off.root.remove();

      layout(840, { height: 500, contentBoxBorder: 1 });
      const bordered = studio();
      disposers.push(
        wireWorkbench(bordered.root, {
          id: 'studio',
          panels: { bottomDrawer: { size: bordered.drawerSize } },
          storage: memoryStorage(),
        }),
      );
      key(bordered.drawer(), 'End');
      expect(bordered.drawerSize.value).toBe(379);
    });

    it('commits nothing from a separator whose reachable range is pinned at its minimum', () => {
      layout(700);
      const app = studio();
      disposers.push(
        wireWorkbench(app.root, {
          id: 'studio',
          panels: { leftRail: { size: app.leftSize } },
          storage: memoryStorage(),
        }),
      );
      // 700 − 320 − 240 leaves 140, below the 200 px minimum, so the range
      // collapses to 200 and no key can move the rail: the remembered 260
      // survives for when there is room again.
      for (const name of ['ArrowRight', 'ArrowLeft', 'End', 'Home'])
        key(app.left(), name);
      expect(app.leftSize.value).toBe(260);
      layout(1200);
      key(app.left(), 'ArrowRight');
      expect(app.leftSize.value).toBe(276);
    });

    it('reports the width a rail squeezed below its minimum shows, pinned there', () => {
      layout(700, { leftShown: 172 });
      const app = studio();
      disposers.push(
        wireWorkbench(app.root, {
          id: 'studio',
          panels: { leftRail: { size: app.leftSize } },
          storage: memoryStorage(),
        }),
      );
      const left = app.left();
      const range = () => [
        left.getAttribute('aria-valuemin'),
        left.getAttribute('aria-valuenow'),
        left.getAttribute('aria-valuemax'),
      ];
      // The rail shows 172 px of its 200 px minimum: the separator reports
      // that width, inside a range pinned to it, since it cannot move a track
      // the container holds there.
      left.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(range()).toEqual(['172', '172', '172']);
      expect(app.leftSize.value).toBe(260);

      // The pinned separator commits nothing: a key press never rewrites the
      // remembered 260 with the minimum.
      key(left, 'ArrowLeft');
      expect(app.leftSize.value).toBe(260);
      expect(range()).toEqual(['172', '172', '172']);
      key(left, 'Home');
      key(left, 'End');
      expect(app.leftSize.value).toBe(260);

      // Room to show the minimum again restores the configured range.
      layout(700);
      left.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(range()).toEqual(['200', '200', '200']);
      layout(1200);
      key(left, 'End');
      expect(app.leftSize.value).toBe(400);
      expect(range()).toEqual(['200', '400', '400']);
    });

    it('honors a custom minimum, 0 to turn it off, and a Workbench without layout', () => {
      layout(840);
      const custom = studio({ mainMinSize: 360 });
      disposers.push(
        wireWorkbench(custom.root, {
          id: 'studio',
          panels: { leftRail: { size: custom.leftSize } },
          storage: memoryStorage(),
        }),
      );
      key(custom.left(), 'End');
      expect(custom.leftSize.value).toBe(240);
      disposers.splice(0).forEach((dispose) => dispose());
      custom.root.remove();

      const off = studio({ mainMinSize: 0 });
      disposers.push(
        wireWorkbench(off.root, {
          id: 'studio',
          panels: { leftRail: { size: off.leftSize } },
          storage: memoryStorage(),
        }),
      );
      key(off.left(), 'End');
      expect(off.leftSize.value).toBe(400);
      disposers.splice(0).forEach((dispose) => dispose());
      off.root.remove();

      layout(0);
      const unlaid = studio();
      disposers.push(
        wireWorkbench(unlaid.root, {
          id: 'studio',
          panels: { leftRail: { size: unlaid.leftSize } },
          storage: memoryStorage(),
        }),
      );
      key(unlaid.left(), 'End');
      expect(unlaid.leftSize.value).toBe(400);
    });

    it('counts a content-box rail border as part of its track', () => {
      layout(840, { contentBoxBorder: 1 });
      const app = studio();
      disposers.push(
        wireWorkbench(app.root, {
          id: 'studio',
          panels: { leftRail: { size: app.leftSize } },
          storage: memoryStorage(),
        }),
      );
      key(app.left(), 'End');
      expect(app.leftSize.value).toBe(279);
    });
  });
});
