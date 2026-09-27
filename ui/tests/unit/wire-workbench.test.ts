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
function studio() {
  const root = document.createElement('div');
  document.body.append(root);
  roots.push(root);
  const leftSize = signal(260);
  const drawerSize = signal(180);
  const leftCollapsed = signal(false);
  const presentation = signal<'inline' | 'overlay'>('inline');
  const stopMount = mount(root, () =>
    Workbench({
      id: 'studio',
      label: 'Studio',
      main: raw('<div>editor</div>'),
      leftRail: {
        content: raw('<div>nav</div>'),
        label: 'Navigator',
        size: leftSize.value,
        collapsed: leftCollapsed.value,
        presentation: presentation.value,
        resizable: { min: 200, max: 400 },
      },
      rightRail: { content: raw('<div>inspector</div>'), size: 240 },
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
});
