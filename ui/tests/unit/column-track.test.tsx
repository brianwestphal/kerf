import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ColumnTrack,
  type ColumnTrackStart,
} from '../../src/components/layout/column-track/column-track.js';
import { wireColumnTracks } from '../../src/components/layout/column-track/wiring/wire-column-tracks.js';
import { px } from '../../src/shared/styles/css-values.js';

describe('ColumnTrack', () => {
  it('renders a scroll track around its columns by default', () => {
    expect(String(ColumnTrack({ children: <section /> }))).toBe(
      '<div class="kui-column-track" data-component="column-track" data-layout="scroll"><div class="kui-column-track__columns"><section></section></div></div>',
    );
  });

  it('opts out of inline edge clearance without changing column insets', () => {
    expect(
      String(ColumnTrack({ children: <section />, inset: 'none' })),
    ).toContain('data-inset="none"');
  });

  it('carries paged layout, sizing, and safe root metadata', () => {
    const html = String(
      ColumnTrack({
        children: <section />,
        layout: 'paged',
        minColumnWidth: px(280),
        peek: px(32),
        id: 'board',
        className: 'tickets',
        slot: 'body',
        rootAttributes: {
          'aria-label': 'Board',
          'data-layout': 'scroll',
        } as unknown as Record<`data-${string}`, string>,
      }),
    );
    expect(html).toContain(
      'aria-label="Board" id="board" class="kui-column-track tickets" data-component="column-track" data-layout="paged" style="--_kui-column-track-min-width:280px;--_kui-column-track-peek:32px" slot="body"',
    );
  });
  it('names the track as a region with ariaLabel, owning its role and name', () => {
    const html = String(
      ColumnTrack({
        children: <section />,
        ariaLabel: 'Board',
        rootAttributes: {
          role: 'group',
          'aria-label': 'Overridden',
          'aria-busy': 'true',
          'data-board': 'tickets',
        },
      }),
    );
    expect(html).toContain(
      'data-board="tickets" aria-busy="true" role="region" aria-label="Board" class="kui-column-track"',
    );
    expect(html).not.toContain('Overridden');
    expect(html).not.toContain('role="group"');
    // Without a name the track keeps rootAttributes' structural metadata.
    expect(
      String(
        ColumnTrack({
          children: <section />,
          ariaLabel: '',
          rootAttributes: { role: 'group', 'aria-label': 'Columns' },
        }),
      ),
    ).toContain('role="group" aria-label="Columns" class="kui-column-track"');
  });
});

describe('ColumnTrack start', () => {
  it('renders start="end" and a named column as data attributes', () => {
    expect(
      String(ColumnTrack({ children: <section />, start: 'end' })),
    ).toContain('data-start="end"');
    const named = String(
      ColumnTrack({ children: <section />, start: { column: 'working' } }),
    );
    expect(named).toContain('data-start-column="working"');
    expect(named).not.toContain('data-start=');
    // The default renders nothing, and rootAttributes cannot fake a start.
    const plain = String(
      ColumnTrack({
        children: <section />,
        start: 'start',
        rootAttributes: {
          'data-start': 'end',
          'data-start-column': 'x',
        } as unknown as Record<`data-${string}`, string>,
      }),
    );
    expect(plain).not.toContain('data-start');
  });
});

// KF-QHJKA4: wireColumnTracks opens a track at its end or a named column,
// holds it there across width changes, and lets go once the person scrolls.
describe('wireColumnTracks', () => {
  class FakeResizeObserver {
    static last: FakeResizeObserver | undefined;
    observed = new Set<Element>();
    constructor(readonly callback: ResizeObserverCallback) {
      FakeResizeObserver.last = this;
    }
    observe(target: Element) {
      this.observed.add(target);
    }
    unobserve(target: Element) {
      this.observed.delete(target);
    }
    disconnect() {
      this.observed.clear();
    }
    fire(target: Element) {
      this.callback(
        [{ target } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
  }
  const original = window.ResizeObserver;
  let host: HTMLElement;
  beforeEach(() => {
    window.ResizeObserver =
      FakeResizeObserver as unknown as typeof ResizeObserver;
    host = document.createElement('div');
    document.body.append(host);
  });
  afterEach(() => {
    window.ResizeObserver = original;
    FakeResizeObserver.last = undefined;
    host.remove();
  });

  const COLUMN = 100;
  /**
   * Lay out a rendered track: `width` visible pixels over columns `COLUMN`
   * wide, with scrollTo clamping like an engine. `rtl` mirrors offsets.
   */
  const layOut = (track: HTMLElement, geometry: { width: number }) => {
    const columns = () =>
      [...track.firstElementChild!.children] as HTMLElement[];
    Object.defineProperty(track, 'clientWidth', {
      configurable: true,
      get: () => geometry.width,
    });
    Object.defineProperty(track, 'scrollWidth', {
      configurable: true,
      get: () => Math.max(columns().length * COLUMN, geometry.width),
    });
    const rtl = () => track.style.direction === 'rtl';
    track.getBoundingClientRect = () =>
      ({ left: 0, right: geometry.width }) as DOMRect;
    const scrollTo = vi.fn((options: ScrollToOptions) => {
      const range = track.scrollWidth - track.clientWidth;
      const left = options.left!;
      track.scrollLeft = rtl()
        ? Math.max(Math.min(left, 0), -range)
        : Math.min(Math.max(left, 0), range);
    });
    track.scrollTo = scrollTo as unknown as HTMLElement['scrollTo'];
    for (const column of columns())
      column.getBoundingClientRect = () => {
        const index = columns().indexOf(column);
        return rtl()
          ? ({
              left: geometry.width - (index + 1) * COLUMN - track.scrollLeft,
              right: geometry.width - index * COLUMN - track.scrollLeft,
            } as DOMRect)
          : ({
              left: index * COLUMN - track.scrollLeft,
              right: (index + 1) * COLUMN - track.scrollLeft,
            } as DOMRect);
      };
    return scrollTo;
  };

  const render = (start: ColumnTrackStart, ids = ['a', 'b', 'c', 'd', 'e']) => {
    host.innerHTML = String(
      ColumnTrack({
        start,
        children: ids.map((id) => <section data-column-id={id} />),
      }),
    );
    return host.querySelector<HTMLElement>('.kui-column-track')!;
  };
  const flush = () => new Promise((resolve) => window.setTimeout(resolve, 0));

  it('opens at the end and returns there on a width change', () => {
    const track = render('end');
    const geometry = { width: 250 };
    const scrollTo = layOut(track, geometry);
    const stop = wireColumnTracks(host);
    expect(scrollTo).toHaveBeenCalledWith({ left: 250, behavior: 'instant' });
    expect(track.scrollLeft).toBe(250);
    geometry.width = 300;
    FakeResizeObserver.last!.fire(track);
    expect(track.scrollLeft).toBe(200);
    // The same width again (a height-only resize) does not scroll.
    scrollTo.mockClear();
    FakeResizeObserver.last!.fire(track);
    expect(scrollTo).not.toHaveBeenCalled();
    stop();
  });

  it('opens on a named column, clamped to the scroll range', () => {
    const track = render({ column: 'b' });
    layOut(track, { width: 250 });
    wireColumnTracks(host)();
    expect(track.scrollLeft).toBe(100);
    const last = render({ column: 'e' });
    layOut(last, { width: 250 });
    wireColumnTracks(host)();
    expect(last.scrollLeft).toBe(250);
  });

  it('mirrors offsets right to left', () => {
    const track = render('end');
    track.style.direction = 'rtl';
    layOut(track, { width: 250 });
    wireColumnTracks(host)();
    expect(track.scrollLeft).toBe(-250);
    const named = render({ column: 'c' });
    named.style.direction = 'rtl';
    layOut(named, { width: 250 });
    wireColumnTracks(host)();
    expect(named.scrollLeft).toBe(-200);
  });

  it('lets go once the person scrolls, until the columns change', async () => {
    const track = render('end');
    const geometry = { width: 250 };
    const scrollTo = layOut(track, geometry);
    const stop = wireColumnTracks(host);
    // A layout-driven scroll with no input keeps the track held.
    track.scrollLeft = 120;
    track.dispatchEvent(new Event('scroll'));
    geometry.width = 260;
    FakeResizeObserver.last!.fire(track);
    expect(track.scrollLeft).toBe(240);
    // An input that does not move the track sideways keeps it held too.
    track.firstElementChild!.firstElementChild!.dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    track.dispatchEvent(new Event('scroll'));
    geometry.width = 250;
    FakeResizeObserver.last!.fire(track);
    expect(track.scrollLeft).toBe(250);
    // The person's own sideways scroll releases it.
    track.dispatchEvent(new Event('wheel', { bubbles: true }));
    track.scrollLeft = 40;
    track.dispatchEvent(new Event('scroll'));
    scrollTo.mockClear();
    geometry.width = 300;
    FakeResizeObserver.last!.fire(track);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(track.scrollLeft).toBe(40);
    // A new column set opens at the end again.
    const columns = track.firstElementChild!;
    const added = document.createElement('section');
    added.dataset.columnId = 'f';
    added.getBoundingClientRect = () => ({ left: 0, right: 0 }) as DOMRect;
    columns.append(added);
    await flush();
    expect(track.scrollLeft).toBe(300);
    stop();
  });

  it('shows a named column once it renders, and ignores re-renders that keep it', async () => {
    const track = render({ column: 'c' }, ['a', 'b']);
    const geometry = { width: 150 };
    const scrollTo = layOut(track, geometry);
    const stop = wireColumnTracks(host);
    expect(scrollTo).not.toHaveBeenCalled();
    const column = document.createElement('section');
    column.dataset.columnId = 'c';
    track.firstElementChild!.append(column);
    layOut(track, geometry);
    await flush();
    expect(track.scrollLeft).toBe(150);
    // An unrelated attribute or text change keeps the column set.
    scrollTo.mockClear();
    track.setAttribute('aria-busy', 'true');
    column.textContent = 'Working';
    await flush();
    expect(scrollTo).not.toHaveBeenCalled();
    stop();
  });

  it('follows tracks added later and forgets removed or default ones', async () => {
    const stop = wireColumnTracks(host);
    const track = render('end');
    layOut(track, { width: 250 });
    await flush();
    expect(track.scrollLeft).toBe(250);
    const observer = FakeResizeObserver.last!;
    expect(observer.observed.has(track)).toBe(true);
    // Back to the default start: no longer anchored.
    delete track.dataset.start;
    await flush();
    track.scrollLeft = 0;
    observer.fire(track);
    expect(track.scrollLeft).toBe(0);
    track.remove();
    await flush();
    expect(observer.observed.has(track)).toBe(false);
    stop();
    expect(observer.observed.size).toBe(0);
  });

  it('wires a track passed as the root, without ResizeObserver', () => {
    window.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    const track = render('end');
    layOut(track, { width: 250 });
    const stop = wireColumnTracks(track);
    expect(track.scrollLeft).toBe(250);
    track.dispatchEvent(new Event('keydown'));
    stop();
  });

  it('ignores events outside an anchored track and tolerates bare markup', () => {
    // A track with no columns element, and a column with no id.
    host.innerHTML =
      '<p></p><div data-component="column-track" data-start="end"></div>' +
      '<div data-component="column-track" data-start-column="x"><div class="kui-column-track__columns"><section></section>text</div></div>';
    const stop = wireColumnTracks(host);
    const paragraph = host.querySelector('p')!;
    paragraph.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    paragraph.dispatchEvent(new Event('scroll'));
    stop();
  });
});
