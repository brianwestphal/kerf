// KF-0QJ2K3: PagedView's markup (tablist dots, tabpanel pages, inert
// off-screen pages) and wirePagedViews: dot clicks, arrow keys, scroll
// settling, following the controlled page, and disposal.
import { mount, signal } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PagedView,
  type PagedViewPage,
} from '../../src/components/navigation/paged-view/paged-view.js';
import { wirePagedViews } from '../../src/components/navigation/paged-view/wiring/wire-paged-views.js';

const PAGES: PagedViewPage[] = [
  { id: 'today', label: 'Today', content: <p>Charts</p> },
  { id: 'rates', label: 'Token Rate', content: <p>Gauges</p> },
  {
    id: 'triage',
    label: 'Triage',
    content: <button type="button">Open</button>,
  },
];

const WIDTH = 100;

const render = (html: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  document.body.append(host);
  return host;
};

/**
 * Give a view's viewport a scroll position and its pages layout boxes, so the
 * wiring's geometry reads like a 100px-wide snapped pager.
 */
function layOut(view: HTMLElement) {
  const viewport = view.querySelector<HTMLElement>(
    '.kui-paged-view__viewport',
  )!;
  let left = 0;
  Object.defineProperty(viewport, 'scrollLeft', {
    configurable: true,
    get: () => left,
    set: (value: number) => {
      left = value;
    },
  });
  viewport.getBoundingClientRect = () => ({ left: 0, width: WIDTH }) as DOMRect;
  [...viewport.children].forEach((page, index) => {
    (page as HTMLElement).getBoundingClientRect = () =>
      ({ left: index * WIDTH - left, width: WIDTH }) as DOMRect;
  });
  const scrollTo = vi.fn((options: ScrollToOptions) => {
    left = options.left!;
  });
  viewport.scrollTo = scrollTo as unknown as HTMLElement['scrollTo'];
  return { viewport, scrollTo };
}

const flush = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('PagedView', () => {
  it('renders the pages and a tablist of labelled dots', () => {
    const host = render(
      <PagedView id="side" label="Sidebar Pages" pages={PAGES} page="rates" />,
    );
    const view = host.firstElementChild as HTMLElement;
    expect(view.className).toBe('kui-paged-view');
    expect(view.id).toBe('side');
    expect(view.dataset).toMatchObject({
      component: 'paged-view',
      pagedViewId: 'side',
      page: 'rates',
    });

    const pages = [
      ...view.querySelectorAll<HTMLElement>('.kui-paged-view__page'),
    ];
    expect(pages.map((page) => page.id)).toEqual([
      'side-page-today',
      'side-page-rates',
      'side-page-triage',
    ]);
    expect(pages.map((page) => page.getAttribute('role'))).toEqual([
      'tabpanel',
      'tabpanel',
      'tabpanel',
    ]);
    expect(pages.map((page) => page.hasAttribute('inert'))).toEqual([
      true,
      false,
      true,
    ]);
    expect(pages[1]!.getAttribute('aria-labelledby')).toBe('side-dot-rates');
    expect(pages[1]!.textContent).toBe('Gauges');

    const tablist = view.querySelector('[role="tablist"]')!;
    expect(tablist.getAttribute('aria-label')).toBe('Sidebar Pages');
    const dots = [...tablist.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual([
      'Page 1 of 3: Today',
      'Page 2 of 3: Token Rate',
      'Page 3 of 3: Triage',
    ]);
    expect(dots.map((dot) => dot.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(dots.map((dot) => dot.getAttribute('tabindex'))).toEqual([
      '-1',
      '0',
      '-1',
    ]);
    expect(dots[0]!.getAttribute('aria-controls')).toBe('side-page-today');
    expect(dots[0]!.getAttribute('title')).toBe('Today');
    expect(dots[0]!.getAttribute('type')).toBe('button');
  });

  it('shows the first page for an unknown page id', () => {
    const host = render(
      <PagedView id="v" label="Pages" pages={PAGES} page="missing" />,
    );
    const view = host.firstElementChild as HTMLElement;
    expect(view.dataset.page).toBe('today');
    expect(view.querySelector('#v-page-today')!.hasAttribute('inert')).toBe(
      false,
    );
  });

  it('renders one page without dots or tab roles', () => {
    const host = render(
      <PagedView id="v" label="Pages" pages={PAGES.slice(0, 1)} page="today" />,
    );
    expect(host.querySelector('.kui-paged-view__dots')).toBeNull();
    const page = host.querySelector('.kui-paged-view__page')!;
    expect(page.hasAttribute('role')).toBe(false);
    expect(page.hasAttribute('aria-labelledby')).toBe(false);
    expect(page.hasAttribute('inert')).toBe(false);
  });

  it('renders no page for an empty list', () => {
    const host = render(<PagedView id="v" label="Pages" pages={[]} page="" />);
    const view = host.firstElementChild as HTMLElement;
    expect(view.hasAttribute('data-page')).toBe(false);
    expect(view.querySelector('.kui-paged-view__page')).toBeNull();
  });

  it('keeps its own markers over application root attributes', () => {
    const host = render(
      <PagedView
        id="v"
        label="Pages"
        pages={PAGES}
        page="today"
        className="sidebar-pages"
        slot="aside"
        rootAttributes={{ 'data-key': 'k', 'data-page': 'forged' }}
      />,
    );
    const view = host.firstElementChild as HTMLElement;
    expect(view.className).toBe('kui-paged-view sidebar-pages');
    expect(view.getAttribute('slot')).toBe('aside');
    expect(view.dataset.key).toBe('k');
    expect(view.dataset.page).toBe('today');
  });
});

describe('wirePagedViews', () => {
  let host: HTMLElement;
  let view: HTMLElement;
  let viewport: HTMLElement;
  let scrollTo: ReturnType<typeof vi.fn>;
  const onPageChange = vi.fn();
  const page = signal('today');
  let stop: () => void;
  let unmount: () => void;

  beforeEach(() => {
    onPageChange.mockReset();
    page.value = 'today';
    host = document.createElement('div');
    document.body.append(host);
    unmount = mount(host, () => (
      <PagedView id="side" label="Pages" pages={PAGES} page={page.value} />
    ));
    view = host.querySelector<HTMLElement>('.kui-paged-view')!;
    ({ viewport, scrollTo } = layOut(view));
    stop = wirePagedViews(host, {
      onPageChange: (next, id) => {
        onPageChange(next, id);
        page.value = next;
      },
    });
  });

  afterEach(() => {
    stop();
    unmount();
  });

  const dot = (id: string) =>
    view.querySelector<HTMLElement>(`[data-paged-view-dot="${id}"]`)!;
  const key = (
    target: HTMLElement,
    name: string,
    init: KeyboardEventInit = {},
  ) =>
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, ...init }),
    );

  it('starts on the current page without scrolling when already there', () => {
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('starts a view rendered on a later page there without animating', () => {
    stop();
    const other = render(
      <PagedView id="later" label="Pages" pages={PAGES} page="triage" />,
    );
    const laid = layOut(other.firstElementChild as HTMLElement);
    stop = wirePagedViews(other, { onPageChange });
    expect(laid.scrollTo).toHaveBeenCalledWith({
      left: 200,
      behavior: 'instant',
    });
  });

  it('starts a view added after wiring on its page without animating', async () => {
    const added = document.createElement('div');
    added.innerHTML = String(
      <PagedView id="added" label="Pages" pages={PAGES} page="rates" />,
    );
    const laid = layOut(added.firstElementChild as HTMLElement);
    host.append(added);
    // A text node and a non-view element are ignored.
    host.append('text', document.createElement('span'));
    await flush();
    expect(laid.scrollTo).toHaveBeenCalledWith({
      left: 100,
      behavior: 'instant',
    });
  });

  it('reports a dot click and scrolls to the page the app renders', async () => {
    dot('triage').click();
    expect(onPageChange).toHaveBeenCalledWith('triage', 'side');
    expect(view.dataset.page).toBe('triage');
    await flush();
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 200, behavior: 'auto' });
    expect(dot('triage').getAttribute('aria-selected')).toBe('true');
    expect(view.querySelector('#side-page-triage')!.hasAttribute('inert')).toBe(
      false,
    );
    expect(view.querySelector('#side-page-today')!.hasAttribute('inert')).toBe(
      true,
    );
  });

  it('realigns instead of reporting a click on the current page', () => {
    viewport.scrollLeft = 30;
    dot('today').click();
    expect(onPageChange).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'auto' });
  });

  it('moves by arrow keys, Home, and End, clamped at the ends', () => {
    dot('today').focus();
    key(dot('today'), 'ArrowRight');
    expect(onPageChange).toHaveBeenLastCalledWith('rates', 'side');
    expect(document.activeElement).toBe(dot('rates'));
    key(dot('rates'), 'End');
    expect(onPageChange).toHaveBeenLastCalledWith('triage', 'side');
    expect(document.activeElement).toBe(dot('triage'));
    onPageChange.mockClear();
    key(dot('triage'), 'ArrowRight');
    expect(onPageChange).not.toHaveBeenCalled();
    key(dot('triage'), 'ArrowLeft');
    expect(onPageChange).toHaveBeenLastCalledWith('rates', 'side');
    key(dot('rates'), 'Home');
    expect(onPageChange).toHaveBeenLastCalledWith('today', 'side');
    expect(document.activeElement).toBe(dot('today'));
  });

  it('mirrors Left and Right in right-to-left text', () => {
    // On the host: a re-render morphs the view's own attributes back.
    host.style.direction = 'rtl';
    key(dot('today'), 'ArrowLeft');
    expect(onPageChange).toHaveBeenLastCalledWith('rates', 'side');
    key(dot('rates'), 'ArrowRight');
    expect(onPageChange).toHaveBeenLastCalledWith('today', 'side');
  });

  it('ignores other keys and modified arrows', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    dot('today').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    key(dot('today'), 'ArrowRight', { metaKey: true });
    key(dot('today'), 'ArrowRight', { ctrlKey: true });
    key(dot('today'), 'ArrowRight', { altKey: true });
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('reports the page a scroll settles on after a quiet period', () => {
    vi.useFakeTimers();
    viewport.scrollLeft = 96;
    viewport.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(60);
    viewport.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(100);
    expect(onPageChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(onPageChange).toHaveBeenCalledWith('rates', 'side');
  });

  it('reports the page at scrollend at once', () => {
    viewport.scrollLeft = 204;
    viewport.dispatchEvent(new Event('scrollend'));
    expect(onPageChange).toHaveBeenCalledWith('triage', 'side');
  });

  it('reports nothing when a scroll settles on the current page', () => {
    viewport.scrollLeft = 20;
    viewport.dispatchEvent(new Event('scrollend'));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('ignores scrolling elsewhere', () => {
    const page = view.querySelector<HTMLElement>('.kui-paged-view__page')!;
    page.dispatchEvent(new Event('scroll'));
    page.dispatchEvent(new Event('scrollend'));
    const stray = document.createElement('div');
    stray.className = 'kui-paged-view__viewport';
    host.append(stray);
    stray.dispatchEvent(new Event('scrollend'));
    host.dispatchEvent(new Event('scroll'));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('follows a programmatic page change', async () => {
    page.value = 'rates';
    await flush();
    expect(onPageChange).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 100, behavior: 'auto' });
  });

  it('ignores a data-page change outside a view and a view without pages', async () => {
    const other = document.createElement('div');
    other.dataset.page = 'x';
    host.append(other);
    await flush();
    other.dataset.page = 'y';
    const bare = document.createElement('div');
    bare.dataset.component = 'paged-view';
    bare.dataset.page = 'a';
    host.append(bare);
    await flush();
    bare.dataset.page = 'b';
    await flush();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not report a settle while scrolling to a rendered page', async () => {
    page.value = 'triage';
    await flush();
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 200, behavior: 'auto' });
    // An engine cut the animation short on the middle page: resume it.
    viewport.scrollLeft = 100;
    viewport.dispatchEvent(new Event('scrollend'));
    expect(onPageChange).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 200, behavior: 'auto' });
    // Arrived: later settles are a person's choices again.
    viewport.dispatchEvent(new Event('scrollend'));
    viewport.scrollLeft = 100;
    viewport.dispatchEvent(new Event('scrollend'));
    expect(onPageChange).toHaveBeenCalledWith('rates', 'side');
  });

  it("hands the scroll back on a person's own input", async () => {
    page.value = 'triage';
    await flush();
    // Input outside every viewport changes nothing.
    host.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    viewport.scrollLeft = 100;
    viewport.dispatchEvent(new Event('scrollend'));
    expect(onPageChange).not.toHaveBeenCalled();
    view
      .querySelector('.kui-paged-view__page')!
      .dispatchEvent(new Event('wheel', { bubbles: true }));
    viewport.scrollLeft = 0;
    viewport.dispatchEvent(new Event('scrollend'));
    expect(onPageChange).toHaveBeenCalledWith('today', 'side');
  });

  it('stops reporting and clears pending settles once disposed', () => {
    vi.useFakeTimers();
    viewport.scrollLeft = 100;
    viewport.dispatchEvent(new Event('scroll'));
    stop();
    vi.advanceTimersByTime(200);
    dot('rates').click();
    viewport.dispatchEvent(new Event('scrollend'));
    key(dot('today'), 'ArrowRight');
    expect(onPageChange).not.toHaveBeenCalled();
    stop = () => {};
  });
});
