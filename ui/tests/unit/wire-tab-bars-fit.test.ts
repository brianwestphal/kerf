import { raw } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TabBar } from '../../src/components/navigation/tab-bar/tab-bar.js';
import {
  type TabBarFit,
  wireTabBars,
} from '../../src/components/navigation/tab-bar/wiring/wire-tab-bars.js';
import { TabBarItem } from '../../src/components/navigation/tab-bar-item/tab-bar-item.js';

// KF-XFG3FZ: wireTabBars reports each bar's fit (overflow, free room, and the
// trailing and end zone widths) so an app never measures TabBar's private parts.

type Box = { left: number; width: number };
const boxes = new WeakMap<Element, Box>();
const clientWidths = new WeakMap<Element, number>();

function setBox(element: Element, left: number, width: number) {
  boxes.set(element, { left, width });
}

let frames: FrameRequestCallback[] = [];
const runFrames = () => {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(0));
};

let resized: ((entries: Array<{ target: Element }>) => void) | undefined;
const observed = new Set<Element>();
const unobserved: Element[] = [];
const disconnected = vi.fn();

const roots: HTMLElement[] = [];

function render(
  options: { tabs?: number; end?: boolean; trailing?: boolean } = {},
) {
  const { tabs = 2, end = true, trailing = false } = options;
  const root = document.createElement('div');
  root.innerHTML = String(
    TabBar({
      id: 'projects',
      label: 'Projects',
      end: end ? raw('<button>New project</button>') : undefined,
      trailing: trailing ? raw('<button>Add</button>') : undefined,
      children: Array.from({ length: tabs }, (_, index) =>
        TabBarItem({
          id: `tab-${index}`,
          name: `Tab ${index}`,
          selected: index === 0,
        }),
      ),
    }),
  );
  document.body.append(root);
  roots.push(root);
  return root;
}

function parts(root: HTMLElement) {
  const bar = root.querySelector<HTMLElement>('[data-component="tab-bar"]')!;
  const strip = bar.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
  const tabs = [
    ...strip.querySelectorAll<HTMLElement>(':scope > .kui-tab-bar-item'),
  ];
  return {
    bar,
    strip,
    tabs,
    end: bar.querySelector<HTMLElement>('.kui-tab-bar__end'),
    trailing: bar.querySelector<HTMLElement>('.kui-tab-bar__trailing'),
  };
}

/** Lay out tabs of `tabWidth` from x=10 in a strip whose client width is `stripWidth`. */
function layout(root: HTMLElement, stripWidth: number, tabWidth: number) {
  const { strip, tabs, end, trailing } = parts(root);
  // The stylesheet's 1px strip padding, which comes out of the room for tabs.
  strip.style.padding = '1px';
  clientWidths.set(strip, stripWidth);
  tabs.forEach((tab, index) => setBox(tab, 10 + index * tabWidth, tabWidth));
  if (end) setBox(end, 300, 120);
  if (trailing) setBox(trailing, 250, 44);
}

beforeEach(() => {
  frames = [];
  observed.clear();
  unobserved.length = 0;
  disconnected.mockReset();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    frames = [];
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: (entries: Array<{ target: Element }>) => void) {
        resized = callback;
      }
      observe(element: Element) {
        observed.add(element);
      }
      unobserve(element: Element) {
        unobserved.push(element);
        observed.delete(element);
      }
      disconnect() {
        disconnected();
      }
    },
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const box = boxes.get(this) ?? { left: 0, width: 0 };
      return {
        x: box.left,
        y: 0,
        left: box.left,
        right: box.left + box.width,
        top: 0,
        bottom: box.width ? 40 : 0,
        width: box.width,
        height: box.width ? 40 : 0,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      return clientWidths.get(this) ?? 0;
    },
  );
});

afterEach(() => {
  roots.splice(0).forEach((root) => root.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('wireTabBars onFitChange', () => {
  it('reports each bar once after wiring, on the next frame', () => {
    const root = render();
    layout(root, 400, 100);
    const fits: TabBarFit[] = [];
    const stop = wireTabBars(root, {
      onReorder: () => {},
      onFitChange: (fit) => fits.push(fit),
    });
    expect(fits).toEqual([]);
    runFrames();
    expect(fits).toEqual([
      {
        barId: 'projects',
        overflowing: false,
        stripWidth: 398,
        tabsWidth: 200,
        free: 198,
        trailingWidth: 0,
        endWidth: 120,
      },
    ]);
    const { strip, tabs, end } = parts(root);
    expect(observed).toContain(strip);
    tabs.forEach((tab) => expect(observed).toContain(tab));
    expect(observed).toContain(end);
    stop();
  });

  it('reports overflow on resize and stays quiet while nothing changes', () => {
    const root = render({ trailing: true });
    layout(root, 400, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(1);
    expect(onFitChange.mock.lastCall![0]).toMatchObject({ trailingWidth: 44 });

    const { strip } = parts(root);
    // A resize that rounds to the same values reports nothing.
    resized!([{ target: strip }]);
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(1);

    layout(root, 150, 100);
    resized!([{ target: strip }, { target: strip }]);
    expect(frames).toHaveLength(1);
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(2);
    expect(onFitChange.mock.lastCall![0]).toEqual({
      barId: 'projects',
      overflowing: true,
      stripWidth: 148,
      tabsWidth: 200,
      free: -52,
      trailingWidth: 44,
      endWidth: 120,
    });
    stop();
  });

  it('does not report overflow for subpixel excess', () => {
    const root = render({ tabs: 1, end: false });
    layout(root, 102.2, 100.4);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    expect(onFitChange.mock.lastCall![0]).toMatchObject({
      overflowing: false,
      endWidth: 0,
    });
    stop();
  });

  it('re-measures after a tab is added or removed and observes new tabs', async () => {
    const root = render();
    layout(root, 250, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    expect(onFitChange.mock.lastCall![0]).toMatchObject({
      overflowing: false,
      free: 48,
    });

    const { strip } = parts(root);
    const added = document.createElement('div');
    added.innerHTML = String(TabBarItem({ id: 'tab-2', name: 'Tab 2' }));
    const tab = added.firstElementChild!;
    strip.append(tab);
    setBox(tab, 210, 100);
    await Promise.resolve();
    expect(observed).toContain(tab);
    runFrames();
    expect(onFitChange.mock.lastCall![0]).toMatchObject({
      overflowing: true,
      tabsWidth: 300,
      free: -52,
    });

    tab.remove();
    await Promise.resolve();
    expect(unobserved).toContain(tab);
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(3);
    expect(onFitChange.mock.lastCall![0]).toMatchObject({
      overflowing: false,
      free: 48,
    });
    stop();
  });

  it('reports a swapped end action and an empty strip', async () => {
    const root = render();
    layout(root, 400, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();

    const { end, tabs } = parts(root);
    end!.innerHTML = '<button aria-label="New project">+</button>';
    setBox(end!, 360, 44);
    tabs.forEach((tab) => tab.remove());
    await Promise.resolve();
    runFrames();
    expect(onFitChange.mock.lastCall![0]).toMatchObject({
      tabsWidth: 0,
      free: 398,
      endWidth: 44,
    });
    stop();
  });

  it('ignores hidden tabs and unrelated mutations', async () => {
    const root = render({ tabs: 3 });
    layout(root, 400, 100);
    const { tabs } = parts(root);
    setBox(tabs[2]!, 0, 0);
    const onFitChange = vi.fn();
    const outside = document.createElement('p');
    root.append(outside);
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    expect(onFitChange.mock.lastCall![0]).toMatchObject({ tabsWidth: 200 });
    outside.textContent = 'unrelated';
    outside.append(document.createElement('span'));
    await Promise.resolve();
    expect(frames).toHaveLength(0);
    stop();
  });

  it('skips a bar that leaves the root before its frame or has no strip', () => {
    const root = render();
    layout(root, 400, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    parts(root).bar.remove();
    runFrames();
    expect(onFitChange).not.toHaveBeenCalled();
    stop();

    const stripless = render();
    parts(stripless).strip.remove();
    const stopStripless = wireTabBars(stripless, {
      onReorder: () => {},
      onFitChange,
    });
    runFrames();
    expect(onFitChange).not.toHaveBeenCalled();
    stopStripless();
  });

  it('reports a bar rendered afresh even when its values match', async () => {
    const root = render();
    layout(root, 400, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    const first = onFitChange.mock.lastCall![0] as TabBarFit;
    const html = root.innerHTML;
    root.innerHTML = html;
    layout(root, 400, 100);
    await Promise.resolve();
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(2);
    expect(onFitChange.mock.lastCall![0]).toEqual(first);
    stop();
  });

  it('cancels a pending report and disconnects on dispose', () => {
    const root = render();
    layout(root, 400, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    stop();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(disconnected).toHaveBeenCalled();
    runFrames();
    expect(onFitChange).not.toHaveBeenCalled();
    // A late resize delivery after dispose schedules nothing.
    resized!([{ target: parts(root).strip }]);
    expect(frames).toHaveLength(0);
  });

  it('reports on wiring and mutation without a ResizeObserver', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const root = render();
    layout(root, 250, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(1);
    layout(root, 150, 100);
    parts(root).tabs[1]!.remove();
    await Promise.resolve();
    runFrames();
    expect(onFitChange.mock.lastCall![0]).toMatchObject({
      overflowing: false,
      tabsWidth: 100,
    });
    stop();
  });

  it('measures nothing when no callback is given', () => {
    const root = render();
    const stop = wireTabBars(root, { onReorder: () => {} });
    const strip = parts(root).strip;
    // Without snapping or a fit callback, the tab strip is never observed.
    expect(observed.has(strip)).toBe(false);
    stop();
  });
});
