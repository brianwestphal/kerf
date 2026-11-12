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
  const { bar, strip, tabs, end, trailing } = parts(root);
  // The stylesheet's 1px strip padding, which comes out of the room for tabs.
  strip.style.padding = '1px';
  clientWidths.set(strip, stripWidth);
  setBox(bar, 0, 440);
  setBox(strip, 10, stripWidth);
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
        barWidth: 440,
        endFree: 0,
      },
    ]);
    const { bar, strip, tabs, end } = parts(root);
    expect(observed).toContain(bar);
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
      barWidth: 440,
      endFree: 6,
    });
    stop();
  });

  /**
   * KF-3A0DBM: an adjacent strip is only as wide as its tabs, at x=8..208 in
   * a bar 0..`barRight` with 8px padding and gap, the trailing zone at
   * 216..260 and the end zone pinned 120px wide at the far edge.
   */
  function adjacentLayout(root: HTMLElement, barRight: number, rtl = false) {
    const { bar, strip, tabs, end, trailing } = parts(root);
    bar.style.padding = '8px';
    bar.style.columnGap = '8px';
    if (rtl) bar.style.direction = 'rtl';
    const at = (left: number, width: number) =>
      rtl ? barRight - left - width : left;
    clientWidths.set(strip, 200);
    setBox(bar, 0, barRight);
    setBox(strip, at(8, 200), 200);
    tabs.forEach((tab, index) => setBox(tab, at(8 + index * 100, 100), 100));
    if (trailing) setBox(trailing, at(216, 44), 44);
    if (end) setBox(end, at(barRight - 128, 120), 120);
  }

  it('reports the room beside an adjacent strip and refits when only the bar grows (KF-3A0DBM)', () => {
    const root = render({ trailing: true });
    adjacentLayout(root, 600);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    expect(onFitChange.mock.lastCall![0]).toMatchObject({
      free: 0,
      barWidth: 584,
      endFree: 204,
    });

    // The bar grows; no zone resizes, so only the bar's own entry reports.
    const { bar } = parts(root);
    adjacentLayout(root, 800);
    resized!([{ target: bar }]);
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(2);
    expect(onFitChange.mock.lastCall![0]).toMatchObject({
      free: 0,
      barWidth: 784,
      endFree: 404,
    });
    stop();
  });

  it('measures the room beside an adjacent strip in RTL and without an end zone (KF-3A0DBM)', () => {
    const rtl = render({ trailing: true });
    adjacentLayout(rtl, 600, true);
    const without = render({ trailing: true, end: false });
    adjacentLayout(without, 600);
    const fits: TabBarFit[] = [];
    const stops = [rtl, without].map((root) =>
      wireTabBars(root, {
        onReorder: () => {},
        onFitChange: (fit) => fits.push(fit),
      }),
    );
    runFrames();
    expect(
      fits.map(({ endWidth, endFree }) => ({ endWidth, endFree })),
    ).toEqual([
      { endWidth: 120, endFree: 204 },
      // Up to the bar's padding edge: 592 - 260.
      { endWidth: 0, endFree: 332 },
    ]);
    stops.forEach((stop) => stop());
  });

  it('measures from the content edge when no packed zone is rendered (KF-3A0DBM)', () => {
    // Every tab hidden and no trailing zone: the strip collapses to nothing,
    // so the room runs from the bar's start content edge.
    const ltr = render();
    const rtl = render({ end: false });
    for (const [root, direction] of [
      [ltr, 'ltr'],
      [rtl, 'rtl'],
    ] as const) {
      const { bar, end } = parts(root);
      bar.style.padding = '8px';
      bar.style.columnGap = '8px';
      bar.style.direction = direction;
      setBox(bar, 0, 600);
      if (end) setBox(end, 472, 120);
    }
    const fits: TabBarFit[] = [];
    const stops = [ltr, rtl].map((root) =>
      wireTabBars(root, {
        onReorder: () => {},
        onFitChange: (fit) => fits.push(fit),
      }),
    );
    runFrames();
    // 472 - 8 - 8, then the whole 584px content box.
    expect(fits.map(({ endFree }) => endFree)).toEqual([456, 584]);
    stops.forEach((stop) => stop());
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

  it('reports under the new id when a morph renames the same bar (KF-XJPZJ3)', async () => {
    const root = render();
    layout(root, 400, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(1);
    // Same element, same geometry, new identity.
    parts(root).bar.setAttribute('data-tab-bar-id', 'archive');
    await Promise.resolve();
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(2);
    expect((onFitChange.mock.lastCall![0] as TabBarFit).barId).toBe('archive');
    stop();
  });

  it('reports a bar again after it leaves the root and comes back (KF-XJPZJ3)', async () => {
    const root = render();
    layout(root, 400, 100);
    const onFitChange = vi.fn();
    const stop = wireTabBars(root, { onReorder: () => {}, onFitChange });
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(1);
    const { bar } = parts(root);
    const parking = document.createElement('div');
    document.body.append(parking);
    parking.append(bar);
    await Promise.resolve();
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(1);
    root.append(bar);
    await Promise.resolve();
    runFrames();
    expect(onFitChange).toHaveBeenCalledTimes(2);
    expect((onFitChange.mock.lastCall![0] as TabBarFit).barId).toBe('projects');
    parking.remove();
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
