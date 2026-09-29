import { raw } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppTab } from '../../src/app-tab.js';
import { Pane } from '../../src/pane.js';
import { TabBar } from '../../src/tab-bar.js';
import { Toolbar } from '../../src/toolbar.js';
import { wireScrollDividers } from '../../src/wire-scroll-dividers.js';

/** Scroll geometry happy-dom does not lay out, set per element. */
interface Geometry {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
}

function geometry(element: Element, initial: Partial<Geometry> = {}) {
  const state: Geometry = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 100,
    scrollWidth: 100,
    clientHeight: 100,
    clientWidth: 100,
    ...initial,
  };
  for (const key of Object.keys(state) as (keyof Geometry)[])
    Object.defineProperty(element, key, {
      configurable: true,
      get: () => state[key],
      set: (value: number) => {
        state[key] = value;
      },
    });
  return state;
}

/** Move a scroller and fire the (non-bubbling) scroll event it would fire. */
function scrollTo(element: Element, state: Geometry, next: Partial<Geometry>) {
  Object.assign(state, next);
  element.dispatchEvent(new Event('scroll'));
}

/** A controllable ResizeObserver: tests fire it for the targets they resize. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observed = new Set<Element>();
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
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
  fire(...targets: Element[]) {
    this.callback(
      targets.map((target) => ({ target }) as ResizeObserverEntry),
      this as unknown as ResizeObserver,
    );
  }
}

const body = raw('<p>content</p>');

const settle = () =>
  new Promise((resolve) => globalThis.setTimeout(resolve, 0));

const roots: HTMLElement[] = [];
const originalResizeObserver = window.ResizeObserver;

function mountHtml(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  roots.push(root);
  return root;
}

function pane(options: { header?: boolean; footer?: boolean } = {}) {
  const root = mountHtml(
    String(
      Pane({
        header:
          options.header === false ? undefined : Toolbar({ label: 'Head' }),
        footer:
          options.footer === false ? undefined : Toolbar({ label: 'Foot' }),
        children: body,
      }),
    ),
  );
  const at = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  return {
    root,
    pane: at('.kui-pane'),
    header: root.querySelector<HTMLElement>('.kui-pane__header'),
    footer: root.querySelector<HTMLElement>('.kui-pane__footer'),
    content: at('.kui-pane__content'),
  };
}

const overflow = (element: Element | null) =>
  element?.getAttribute('data-scroll-overflow') ?? null;
const divider = (element: Element | null) =>
  element?.getAttribute('data-scroll-divider') ?? null;

beforeEach(() => {
  FakeResizeObserver.instances = [];
  window.ResizeObserver =
    FakeResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  window.ResizeObserver = originalResizeObserver;
  for (const root of roots.splice(0)) root.remove();
});

describe('scroll-divider components', () => {
  it('Toolbar draws no divider by default and keeps explicit dividerSides', () => {
    expect(String(Toolbar({ label: 'Plain' }))).not.toContain('divider-sides');
    expect(String(Toolbar({ label: 'Lined', dividerSides: 'b' }))).toContain(
      'divider-sides="b"',
    );
  });

  it('Pane renders chromeDividers only when it departs from the scroll default', () => {
    expect(String(Pane({ children: body }))).not.toContain(
      'data-chrome-dividers',
    );
    expect(
      String(Pane({ children: body, chromeDividers: 'scroll' })),
    ).not.toContain('data-chrome-dividers');
    expect(
      String(Pane({ children: body, chromeDividers: 'always' })),
    ).toContain('data-chrome-dividers="always"');
    expect(String(Pane({ children: body, chromeDividers: 'none' }))).toContain(
      'data-chrome-dividers="none"',
    );
    // Application metadata cannot claim the Pane-owned attribute.
    expect(
      String(
        Pane({
          children: body,
          rootAttributes: {
            'data-chrome-dividers': 'always',
          } as unknown as Record<`data-${string}`, string>,
        }),
      ),
    ).not.toContain('data-chrome-dividers');
  });
});

describe('wireScrollDividers — Pane chrome (vertical transition matrix)', () => {
  it('walks fits → overflows → middle → end → start → fits → grows again', () => {
    const { root, header, footer, content } = pane();
    const state = geometry(content, { scrollHeight: 100, clientHeight: 100 });
    const dispose = wireScrollDividers(root);
    const observer = FakeResizeObserver.instances[0]!;

    // Content fits: no divider anywhere.
    expect(overflow(content)).toBeNull();
    expect(divider(header)).toBeNull();
    expect(divider(footer)).toBeNull();
    expect(observer.observed.has(content)).toBe(true);

    // Content grows past the scroller: only the footer divider shows.
    state.scrollHeight = 400;
    observer.fire(content);
    expect(overflow(content)).toBe('b');
    expect(divider(header)).toBeNull();
    expect(divider(footer)).toBe('t');

    // Scrolled into the middle: both.
    scrollTo(content, state, { scrollTop: 150 });
    expect(overflow(content)).toBe('tb');
    expect(divider(header)).toBe('b');
    expect(divider(footer)).toBe('t');

    // At the end: only the header divider.
    scrollTo(content, state, { scrollTop: 300 });
    expect(overflow(content)).toBe('t');
    expect(divider(header)).toBe('b');
    expect(divider(footer)).toBeNull();

    // Back to the start: only the footer divider.
    scrollTo(content, state, { scrollTop: 0 });
    expect(overflow(content)).toBe('b');
    expect(divider(header)).toBeNull();
    expect(divider(footer)).toBe('t');

    // Scrolled to the end, then the content shrinks to fit: nothing.
    scrollTo(content, state, { scrollTop: 300 });
    state.scrollHeight = 100;
    state.scrollTop = 0;
    observer.fire(content.firstElementChild ?? content);
    expect(overflow(content)).toBeNull();
    expect(divider(header)).toBeNull();
    expect(divider(footer)).toBeNull();

    // Empty, then refilled.
    state.scrollHeight = 250;
    observer.fire(content);
    expect(divider(footer)).toBe('t');
    dispose();
  });

  it('treats sub-pixel residue at either edge as that edge', () => {
    const { root, header, footer, content } = pane();
    const state = geometry(content, { scrollHeight: 300, clientHeight: 100 });
    const dispose = wireScrollDividers(root);
    scrollTo(content, state, { scrollTop: 0.5 });
    expect(divider(header)).toBeNull();
    scrollTo(content, state, { scrollTop: 199.5 });
    expect(divider(header)).toBe('b');
    expect(divider(footer)).toBeNull();
    // Overflow of under a pixel is no overflow.
    state.scrollHeight = 100.5;
    state.scrollTop = 0;
    FakeResizeObserver.instances[0]!.fire(content);
    expect(overflow(content)).toBeNull();
    dispose();
  });

  it('pairs a header-only and a footer-only pane, and skips a pane without chrome', () => {
    const top = pane({ footer: false });
    const bottom = pane({ header: false });
    const bare = pane({ header: false, footer: false });
    const topState = geometry(top.content, {
      scrollHeight: 300,
      scrollTop: 50,
    });
    geometry(bottom.content, { scrollHeight: 300 });
    geometry(bare.content, { scrollHeight: 300, scrollTop: 50 });
    const disposers = [top, bottom, bare].map(({ root }) =>
      wireScrollDividers(root),
    );
    expect(divider(top.header)).toBe('b');
    expect(divider(bottom.footer)).toBe('t');
    expect(overflow(bare.content)).toBeNull();
    scrollTo(top.content, topState, { scrollTop: 0 });
    expect(divider(top.header)).toBeNull();
    for (const dispose of disposers) dispose();
  });

  it('wires a root that is itself a pane, and ignores scroll events from elsewhere', () => {
    const { pane: paneRoot, header, content } = pane();
    const state = geometry(content, { scrollHeight: 300 });
    const dispose = wireScrollDividers(paneRoot);
    scrollTo(content, state, { scrollTop: 40 });
    expect(divider(header)).toBe('b');
    // A scroll that changes nothing, and a scroll of an unpaired element,
    // leave the attributes alone.
    scrollTo(content, state, { scrollTop: 41 });
    header!.dispatchEvent(new Event('scroll'));
    expect(divider(header)).toBe('b');
    dispose();
  });
});

describe('wireScrollDividers — horizontal edges', () => {
  function strip(direction?: 'rtl') {
    const root = mountHtml(
      String(
        TabBar({
          id: 'docs',
          label: 'Documents',
          children: [
            AppTab({ id: 'one', name: 'One', selected: true }),
            AppTab({ id: 'two', name: 'Two' }),
          ],
        }),
      ),
    );
    if (direction) root.setAttribute('dir', direction);
    const tabs = root.querySelector<HTMLElement>('[data-kui-tab-list]')!;
    if (direction) tabs.style.direction = direction;
    return { root, tabs };
  }

  it('reports the sides of a TabBar strip whose tabs are scrolled out of view', () => {
    const { root, tabs } = strip();
    const state = geometry(tabs, { scrollWidth: 100, clientWidth: 100 });
    const dispose = wireScrollDividers(root);
    expect(overflow(tabs)).toBeNull();
    state.scrollWidth = 300;
    FakeResizeObserver.instances[0]!.fire(tabs.firstElementChild!);
    expect(overflow(tabs)).toBe('r');
    scrollTo(tabs, state, { scrollLeft: 100 });
    expect(overflow(tabs)).toBe('rl');
    scrollTo(tabs, state, { scrollLeft: 200 });
    expect(overflow(tabs)).toBe('l');
    dispose();
  });

  it('keeps physical sides in a right-to-left strip, whose scrollLeft runs negative', () => {
    const { root, tabs } = strip('rtl');
    const state = geometry(tabs, { scrollWidth: 300, clientWidth: 100 });
    const dispose = wireScrollDividers(root);
    // Scrolled to the start (the right edge): content hidden on the left.
    expect(overflow(tabs)).toBe('l');
    scrollTo(tabs, state, { scrollLeft: -100 });
    expect(overflow(tabs)).toBe('rl');
    scrollTo(tabs, state, { scrollLeft: -200 });
    expect(overflow(tabs)).toBe('r');
    dispose();
  });
});

describe('wireScrollDividers — app-owned targets', () => {
  function arrangement() {
    const root = mountHtml(`
      <header id="top"></header>
      <nav id="left"></nav>
      <div id="scroller"><p>content</p></div>
      <aside id="right"></aside>
      <footer id="bottom"></footer>`);
    const at = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
    return {
      root,
      top: at('top'),
      left: at('left'),
      scroller: at('scroller'),
      right: at('right'),
      bottom: at('bottom'),
    };
  }

  it('shows each named chrome element its facing divider in every scroll state', () => {
    const { root, top, left, scroller, right, bottom } = arrangement();
    const state = geometry(scroller, {
      scrollHeight: 300,
      scrollWidth: 300,
    });
    const dispose = wireScrollDividers(root, {
      targets: [
        {
          scroller: 'scroller',
          top: 'top',
          right: 'right',
          bottom: 'bottom',
          left: 'left',
        },
      ],
    });
    expect([
      divider(top),
      divider(right),
      divider(bottom),
      divider(left),
    ]).toEqual([null, 'l', 't', null]);
    scrollTo(scroller, state, { scrollTop: 100, scrollLeft: 100 });
    expect([
      divider(top),
      divider(right),
      divider(bottom),
      divider(left),
    ]).toEqual(['b', 'l', 't', 'r']);
    scrollTo(scroller, state, { scrollTop: 200, scrollLeft: 200 });
    expect([
      divider(top),
      divider(right),
      divider(bottom),
      divider(left),
    ]).toEqual(['b', null, null, 'r']);
    dispose();
  });

  it('skips a target whose scroller is missing and tolerates missing chrome', () => {
    const { root, top, scroller } = arrangement();
    geometry(scroller, { scrollHeight: 300, scrollTop: 10 });
    const dispose = wireScrollDividers(root, {
      targets: [
        { scroller: 'nowhere', top: 'top' },
        { scroller: 'scroller', top: 'top', bottom: 'missing' },
      ],
    });
    expect(divider(top)).toBe('b');
    dispose();
  });

  it('unions the sides of chrome shared by two scrollers', () => {
    const root = mountHtml(`
      <div id="upper"></div><div id="bar"></div><div id="lower"></div>`);
    const [upper, bar, lower] = ['upper', 'bar', 'lower'].map((id) =>
      root.querySelector<HTMLElement>(`#${id}`)!,
    );
    geometry(upper!, { scrollHeight: 300 });
    geometry(lower!, { scrollHeight: 300, scrollTop: 50 });
    const dispose = wireScrollDividers(root, {
      targets: [
        { scroller: 'upper', bottom: 'bar' },
        { scroller: 'lower', top: 'bar' },
      ],
    });
    expect(divider(bar!)).toBe('tb');
    dispose();
  });

  it("lets one element be a scroller and another scroller's chrome, and a pane content a target scroller", async () => {
    const root = mountHtml(`
      <div id="upper"></div>
      <div id="lower"></div>
      ${String(Pane({ header: Toolbar({ label: 'Head' }), children: body }))}`);
    const upper = root.querySelector<HTMLElement>('#upper')!;
    const lower = root.querySelector<HTMLElement>('#lower')!;
    const content = root.querySelector<HTMLElement>('.kui-pane__content')!;
    const header = root.querySelector<HTMLElement>('.kui-pane__header')!;
    content.id = 'pane-content';
    header.id = 'pane-header';
    geometry(upper, { scrollHeight: 300 });
    geometry(lower, { scrollHeight: 300, scrollTop: 20 });
    geometry(content, { scrollHeight: 300, scrollTop: 20 });
    const dispose = wireScrollDividers(root, {
      targets: [
        { scroller: 'upper', bottom: 'lower' },
        { scroller: 'lower' },
        { scroller: 'pane-content', top: 'pane-header' },
      ],
    });
    expect(overflow(lower)).toBe('tb');
    expect(divider(lower)).toBe('t');
    expect(overflow(content)).toBe('tb');
    expect(divider(header)).toBe('b');

    // The lower scroller stops being chrome: it keeps only its overflow.
    upper.id = 'retired';
    await settle();
    expect(divider(lower)).toBeNull();
    expect(overflow(lower)).toBe('tb');
    expect(overflow(upper)).toBeNull();

    // A resize reported for an element no scroller owns changes nothing.
    FakeResizeObserver.instances[0]!.fire(document.body);
    expect(overflow(lower)).toBe('tb');
    dispose();
  });

  it('follows a re-render that replaces the chrome or moves its id', async () => {
    const { root, top, scroller } = arrangement();
    geometry(scroller, { scrollHeight: 300, scrollTop: 10 });
    const dispose = wireScrollDividers(root, {
      targets: [{ scroller: 'scroller', top: 'top' }],
    });
    expect(divider(top)).toBe('b');

    // The morph replaces the chrome element: the new one is paired.
    const replacement = document.createElement('header');
    replacement.id = 'top';
    top.replaceWith(replacement);
    await settle();
    expect(divider(replacement)).toBe('b');

    // The id moves to another element: the old one loses its attribute.
    replacement.id = 'old-top';
    const next = document.createElement('div');
    next.id = 'top';
    root.prepend(next);
    await settle();
    expect(divider(replacement)).toBeNull();
    expect(divider(next)).toBe('b');
    dispose();
  });
});

describe('wireScrollDividers — lifecycle', () => {
  it('restores attributes a re-render dropped, before paint and without re-measuring', async () => {
    const { root, header, footer, content } = pane();
    const state = geometry(content, { scrollHeight: 300, scrollTop: 50 });
    const dispose = wireScrollDividers(root);
    expect(divider(header)).toBe('b');
    // The morph strips attributes its template does not carry.
    header!.removeAttribute('data-scroll-divider');
    content.removeAttribute('data-scroll-overflow');
    footer!.setAttribute('data-scroll-divider', 'x');
    state.scrollTop = 0; // unobserved: restoring does not re-measure
    await settle();
    expect(divider(header)).toBe('b');
    expect(overflow(content)).toBe('tb');
    expect(divider(footer)).toBe('t');
    dispose();
  });

  it('pairs panes added later and releases panes that leave', async () => {
    const root = mountHtml('<div data-host></div>');
    const dispose = wireScrollDividers(root);
    const observer = FakeResizeObserver.instances[0]!;
    const host = root.querySelector('[data-host]')!;
    host.innerHTML = String(
      Pane({ header: Toolbar({ label: 'Late' }), children: body }),
    );
    const content = host.querySelector<HTMLElement>('.kui-pane__content')!;
    geometry(content, { scrollHeight: 300, scrollTop: 30 });
    await settle();
    const header = host.querySelector('.kui-pane__header');
    expect(divider(header)).toBe('b');
    expect(observer.observed.has(content)).toBe(true);

    host.replaceChildren();
    await settle();
    expect(observer.observed.has(content)).toBe(false);
    expect(observer.observed.size).toBe(0);
    dispose();
  });

  it('disposes idempotently: attributes removed, scroll and observers released', async () => {
    const { root, header, footer, content } = pane();
    const state = geometry(content, { scrollHeight: 300, scrollTop: 50 });
    const dispose = wireScrollDividers(root);
    const observer = FakeResizeObserver.instances[0]!;
    dispose();
    expect(divider(header)).toBeNull();
    expect(divider(footer)).toBeNull();
    expect(overflow(content)).toBeNull();
    expect(observer.observed.size).toBe(0);
    scrollTo(content, state, { scrollTop: 0 });
    observer.fire(content);
    header!.setAttribute('data-scroll-divider', 'b');
    await settle();
    expect(divider(footer)).toBeNull();
    expect(divider(header)).toBe('b');
    dispose();
  });

  it('wires a Document root and works without ResizeObserver or MutationObserver', () => {
    const { header, content } = pane();
    const state = geometry(content, { scrollHeight: 300 });
    window.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    const originalMutationObserver = window.MutationObserver;
    window.MutationObserver = undefined as unknown as typeof MutationObserver;
    try {
      const dispose = wireScrollDividers(document);
      scrollTo(content, state, { scrollTop: 20 });
      expect(divider(header)).toBe('b');
      dispose();
      expect(divider(header)).toBeNull();
    } finally {
      window.MutationObserver = originalMutationObserver;
    }
  });
});
