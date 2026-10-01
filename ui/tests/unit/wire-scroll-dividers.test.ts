import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { raw } from 'kerfjs';
import postcss from 'postcss';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppTab } from '../../src/app-tab.js';
import { NavStack } from '../../src/nav-stack.js';
import { Pane } from '../../src/pane.js';
import { SplitView } from '../../src/split-view.js';
import { TabBar } from '../../src/tab-bar.js';
import { TabScaffold } from '../../src/tab-scaffold.js';
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

  it('Pane defaults to scroll for plain chrome and always for sunken chrome', () => {
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
    expect(String(Pane({ children: body, appearance: 'sunken' }))).toContain(
      'data-chrome-dividers="always"',
    );
    expect(
      String(
        Pane({
          children: body,
          appearance: 'sunken',
          chromeDividers: 'scroll',
        }),
      ),
    ).not.toContain('data-chrome-dividers');
    expect(
      String(
        Pane({ children: body, appearance: 'sunken', chromeDividers: 'none' }),
      ),
    ).toContain('data-chrome-dividers="none"');
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

describe('NavStack and TabScaffold chromeDividers', () => {
  const stack = (chromeDividers?: 'scroll' | 'always' | 'none') =>
    String(
      NavStack({
        id: 'stack',
        label: 'Stack',
        views: [{ key: 'root', title: 'Root', content: body }],
        bottomToolbar: Toolbar({ label: 'Actions' }),
        chromeDividers,
      }),
    );
  const scaffold = (chromeDividers?: 'scroll' | 'always' | 'none') =>
    String(
      TabScaffold({
        id: 'tabs',
        label: 'Sections',
        active: 'a',
        tabs: [{ id: 'a', label: 'A', content: body }],
        chromeDividers,
      }),
    );

  it('renders the attribute on the layout root only when it departs from the scroll default', () => {
    for (const render of [stack, scaffold]) {
      expect(render()).not.toContain('data-chrome-dividers');
      expect(render('scroll')).not.toContain('data-chrome-dividers');
      expect(render('always')).toContain('data-chrome-dividers="always"');
      expect(render('none')).toContain('data-chrome-dividers="none"');
      expect(render('always').match(/data-chrome-dividers/g)).toHaveLength(1);
    }
    expect(stack('always')).toMatch(
      /<section class="kui-nav-stack"[^>]*data-chrome-dividers="always"/,
    );
    expect(scaffold('none')).toMatch(
      /<section class="kui-tab-scaffold"[^>]*data-chrome-dividers="none"/,
    );
  });

  it("leaves the top Toolbar's own dividerSides alone", () => {
    for (const chromeDividers of ['always', 'none'] as const) {
      const html = String(
        NavStack({
          id: 'stack',
          label: 'Stack',
          views: [{ key: 'root', title: 'Root', content: body }],
          chromeDividers,
        }),
      );
      expect(html).not.toContain('divider-sides');
    }
    expect(
      String(
        NavStack({
          id: 'stack',
          label: 'Stack',
          views: [{ key: 'root', title: 'Root', content: body }],
          toolbarConfig: { dividerSides: 'b' },
          chromeDividers: 'none',
        }),
      ),
    ).toContain('divider-sides="b"');
  });

  it('SplitView forwards compactStack.chromeDividers to its compact NavStack', () => {
    const html = String(
      SplitView({
        id: 'split',
        label: 'Mail',
        list: body,
        detail: body,
        compact: true,
        listTitle: 'Inbox',
        detailTitle: 'Message',
        compactStack: { chromeDividers: 'always' },
      }),
    );
    expect(html).toMatch(
      /<section class="kui-nav-stack"[^>]*data-chrome-dividers="always"/,
    );
  });

  it('draws the scroll state only without the attribute, and always without the wiring', async () => {
    const drawing = async (file: string, marker: RegExp) => {
      const path = resolve(import.meta.dirname, `../../src/${file}`);
      const css = postcss.parse(await readFile(path, 'utf8'), { from: path });
      const selectors: string[] = [];
      css.walkRules((rule) => {
        for (const selector of rule.selectors)
          if (marker.test(selector))
            selectors.push(selector.replace(/\s+/g, ' '));
      });
      return selectors;
    };
    // Every selector that draws a layout chrome divider is gated on the
    // layout root's chromeDividers: the scroll state only for the default,
    // `always` unconditionally, and never for `none`.
    expect(
      await drawing(
        'nav-stack.css',
        /data-scroll-divider|data-chrome-dividers/,
      ),
    ).toEqual([
      '.kui-nav-stack:not([data-chrome-dividers]) > .kui-nav-stack__chrome[data-scroll-divider*="b"]::after',
      '.kui-nav-stack[data-chrome-dividers="always"] > .kui-nav-stack__chrome::after',
      '.kui-nav-stack:not([data-chrome-dividers]) > .kui-nav-stack__bottom[data-scroll-divider*="t"]',
      '.kui-nav-stack[data-chrome-dividers="always"] > .kui-nav-stack__bottom',
    ]);
    expect(
      await drawing(
        'tab-scaffold.css',
        /data-scroll-divider|data-chrome-dividers/,
      ),
    ).toEqual([
      '.kui-tab-scaffold:not([data-chrome-dividers]) > .kui-tab-scaffold__bar[data-scroll-divider*="t"]',
      '.kui-tab-scaffold[data-chrome-dividers="always"] > .kui-tab-scaffold__bar',
    ]);
  });

  it('still reports scroll state under none, which the layout does not draw', () => {
    const root = document.createElement('div');
    document.body.append(root);
    roots.push(root);
    root.innerHTML = stack('none');
    const view = root.querySelector<HTMLElement>('.kui-nav-stack__view')!;
    geometry(view, { scrollHeight: 300, clientHeight: 100, scrollTop: 50 });
    const dispose = wireScrollDividers(root);
    expect(
      root
        .querySelector('.kui-nav-stack__chrome')!
        .getAttribute('data-scroll-divider'),
    ).toBe('b');
    expect(
      root
        .querySelector('.kui-nav-stack__bottom')!
        .getAttribute('data-scroll-divider'),
    ).toBe('t');
    dispose();
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

function navStack(
  views: { key: string; content?: ReturnType<typeof raw> }[],
  options: { bottom?: boolean; hideToolbar?: boolean } = {},
) {
  return String(
    NavStack({
      id: `stack-${String(roots.length)}`,
      label: 'Stack',
      views: views.map(({ key, content }) => ({
        key,
        title: key,
        content: content ?? body,
      })),
      bottomToolbar:
        options.bottom === false ? undefined : Toolbar({ label: 'Bottom' }),
      hideToolbar: options.hideToolbar,
    }),
  );
}

function stackParts(root: ParentNode) {
  const stack = root.querySelector<HTMLElement>('.kui-nav-stack')!;
  return {
    stack,
    chrome: stack.querySelector<HTMLElement>(':scope > .kui-nav-stack__chrome'),
    bottom: stack.querySelector<HTMLElement>(':scope > .kui-nav-stack__bottom'),
    view: (key: string) =>
      stack.querySelector<HTMLElement>(`[data-nav-key="${key}"]`)!,
  };
}

/** What NavStack re-renders on push/pop: the shown view moves by attribute. */
function activate(views: HTMLElement[], active: HTMLElement) {
  for (const view of views)
    view.setAttribute('data-nav-active', String(view === active));
}

describe('wireScrollDividers — NavStack chrome around the active view', () => {
  it('walks fits → overflows → middle → end → start → fits for the top chrome and bottom toolbar', () => {
    const root = mountHtml(navStack([{ key: 'home' }]));
    const { chrome, bottom, view } = stackParts(root);
    const scroller = view('home');
    const state = geometry(scroller);
    const dispose = wireScrollDividers(root);
    const observer = FakeResizeObserver.instances[0]!;

    expect(observer.observed.has(scroller)).toBe(true);
    expect(overflow(scroller)).toBeNull();
    expect(divider(chrome)).toBeNull();
    expect(divider(bottom)).toBeNull();

    state.scrollHeight = 500;
    observer.fire(scroller);
    expect(overflow(scroller)).toBe('b');
    expect(divider(chrome)).toBeNull();
    expect(divider(bottom)).toBe('t');

    scrollTo(scroller, state, { scrollTop: 200 });
    expect(divider(chrome)).toBe('b');
    expect(divider(bottom)).toBe('t');

    scrollTo(scroller, state, { scrollTop: 400 });
    expect(divider(chrome)).toBe('b');
    expect(divider(bottom)).toBeNull();

    scrollTo(scroller, state, { scrollTop: 0 });
    expect(divider(chrome)).toBeNull();
    expect(divider(bottom)).toBe('t');

    state.scrollHeight = 100;
    observer.fire(scroller.firstElementChild ?? scroller);
    expect(overflow(scroller)).toBeNull();
    expect(divider(chrome)).toBeNull();
    expect(divider(bottom)).toBeNull();
    dispose();
  });

  it('swaps the scroller on push and pop, ignoring a view sliding out', async () => {
    const root = mountHtml(navStack([{ key: 'list' }, { key: 'detail' }]));
    const { stack, chrome, bottom, view } = stackParts(root);
    const list = view('list');
    const detail = view('detail');
    const listState = geometry(list, { scrollHeight: 600, scrollTop: 250 });
    const detailState = geometry(detail, { scrollHeight: 100 });
    const dispose = wireScrollDividers(root);

    // The pushed detail fits even though the list beneath it is scrolled.
    expect(overflow(list)).toBeNull();
    expect(overflow(detail)).toBeNull();
    expect(divider(chrome)).toBeNull();
    expect(divider(bottom)).toBeNull();

    // Pop: the detail slides out (re-inserted, exiting) over the list.
    activate([list, detail], list);
    detail.setAttribute('data-nav-exiting', 'true');
    await settle();
    expect(overflow(list)).toBe('tb');
    expect(overflow(detail)).toBeNull();
    expect(divider(chrome)).toBe('b');
    expect(divider(bottom)).toBe('t');
    detail.remove();
    await settle();
    expect(divider(chrome)).toBe('b');

    // Scroll state follows the list while it is shown…
    scrollTo(list, listState, { scrollTop: 500 });
    expect(divider(bottom)).toBeNull();

    // …and push a long detail over it: the chrome keys on the detail now.
    detailState.scrollHeight = 300;
    detail.removeAttribute('data-nav-exiting');
    stack.querySelector('.kui-nav-stack__viewport')!.append(detail);
    activate([list, detail], detail);
    await settle();
    expect(overflow(list)).toBeNull();
    expect(overflow(detail)).toBe('b');
    expect(divider(chrome)).toBeNull();
    expect(divider(bottom)).toBe('t');
    scrollTo(list, listState, { scrollTop: 0 }); // hidden view: no effect
    expect(divider(bottom)).toBe('t');
    dispose();
  });

  it('keys on a sole Pane content where the Pane has no chrome on that edge', () => {
    const root = mountHtml(
      navStack([
        {
          key: 'pane',
          content: raw(
            String(Pane({ header: Toolbar({ label: 'Own' }), children: body })),
          ),
        },
      ]),
    );
    const { chrome, bottom, view } = stackParts(root);
    const scroller = view('pane');
    geometry(scroller);
    const content = root.querySelector<HTMLElement>('.kui-pane__content')!;
    const paneHeader = root.querySelector<HTMLElement>('.kui-pane__header')!;
    const state = geometry(content, { scrollHeight: 500 });
    const dispose = wireScrollDividers(root);

    // The Pane's header meets its content, so it draws that line; the stack's
    // bottom toolbar meets the Pane's content directly.
    scrollTo(content, state, { scrollTop: 100 });
    expect(divider(paneHeader)).toBe('b');
    expect(divider(chrome)).toBeNull();
    expect(divider(bottom)).toBe('t');
    scrollTo(content, state, { scrollTop: 400 });
    expect(divider(bottom)).toBeNull();
    dispose();
  });

  it('pairs a Pane without chrome on both edges, and pairs nothing without chrome', () => {
    const root = mountHtml(
      navStack([
        { key: 'bare', content: raw(String(Pane({ children: body }))) },
      ]),
    );
    const { chrome, bottom } = stackParts(root);
    const content = root.querySelector<HTMLElement>('.kui-pane__content')!;
    const state = geometry(content, { scrollHeight: 500, scrollTop: 100 });
    const dispose = wireScrollDividers(root);
    expect(divider(chrome)).toBe('b');
    expect(divider(bottom)).toBe('t');
    scrollTo(content, state, { scrollTop: 0 });
    expect(divider(chrome)).toBeNull();
    dispose();

    const bare = mountHtml(
      navStack([{ key: 'plain' }], { bottom: false, hideToolbar: true }),
    );
    const plain = stackParts(bare).view('plain');
    geometry(plain, { scrollHeight: 500, scrollTop: 100 });
    const disposeBare = wireScrollDividers(bare);
    expect(overflow(plain)).toBeNull();
    disposeBare();
  });

  it('leaves a cross-fading chrome copy alone', async () => {
    const root = mountHtml(navStack([{ key: 'home' }]));
    const { stack, chrome, view } = stackParts(root);
    geometry(view('home'), { scrollHeight: 500, scrollTop: 100 });
    const dispose = wireScrollDividers(root);
    const copy = chrome!.cloneNode(true) as HTMLElement;
    copy.dataset.navChromeCopy = '';
    copy.removeAttribute('data-scroll-divider');
    stack.append(copy);
    await settle();
    expect(divider(chrome)).toBe('b');
    expect(divider(copy)).toBeNull();
    dispose();
  });
});

describe('wireScrollDividers — TabScaffold bar over the active scene', () => {
  function scaffold(content: (id: string) => string) {
    const root = mountHtml(
      String(
        TabScaffold({
          id: `tabs-${String(roots.length)}`,
          label: 'Sections',
          active: 'one',
          tabs: ['one', 'two'].map((id) => ({
            id,
            label: id,
            content: raw(content(id)),
          })),
        }),
      ),
    );
    const scene = (id: string) =>
      root.querySelector<HTMLElement>(`[data-tab-scaffold-scene="${id}"]`)!;
    return {
      root,
      bar: root.querySelector<HTMLElement>('.kui-tab-scaffold__bar'),
      scene,
      select(id: string) {
        for (const other of ['one', 'two'])
          scene(other).setAttribute('data-active', String(other === id));
      },
    };
  }

  it('walks the bar through fits → middle → end → fits and follows the selected scene', async () => {
    const { root, bar, scene, select } = scaffold(() => '<p>scene</p>');
    const one = geometry(scene('one'), { scrollHeight: 500 });
    const two = geometry(scene('two'));
    const dispose = wireScrollDividers(root);
    const observer = FakeResizeObserver.instances[0]!;

    expect(divider(bar)).toBe('t');
    scrollTo(scene('one'), one, { scrollTop: 200 });
    expect(divider(bar)).toBe('t');
    scrollTo(scene('one'), one, { scrollTop: 400 });
    expect(divider(bar)).toBeNull();

    // The second tab fits; switching back restores the first tab's state.
    select('two');
    await settle();
    expect(overflow(scene('one'))).toBeNull();
    expect(divider(bar)).toBeNull();
    two.scrollHeight = 300;
    observer.fire(scene('two'));
    expect(divider(bar)).toBe('t');
    select('one');
    await settle();
    expect(overflow(scene('one'))).toBe('t');
    expect(divider(bar)).toBeNull();
    dispose();
    expect(overflow(scene('one'))).toBeNull();
  });

  it('keys on the active view of a nested NavStack, and stops at its bottom toolbar', async () => {
    const nested = scaffold((id) =>
      navStack([{ key: `${id}-home` }], { bottom: false }),
    );
    const view = nested.root.querySelector<HTMLElement>(
      '[data-nav-key="one-home"]',
    )!;
    geometry(nested.scene('one'));
    const state = geometry(view, { scrollHeight: 500, scrollTop: 100 });
    const dispose = wireScrollDividers(nested.root);
    const chrome = nested.root.querySelector('.kui-nav-stack__chrome');
    expect(divider(nested.bar)).toBe('t');
    expect(divider(chrome)).toBe('b');
    scrollTo(view, state, { scrollTop: 400 });
    expect(divider(nested.bar)).toBeNull();
    dispose();

    const withBottom = scaffold((id) => navStack([{ key: `${id}-home` }]));
    const inner = withBottom.root.querySelector<HTMLElement>(
      '[data-nav-key="one-home"]',
    )!;
    geometry(inner, { scrollHeight: 500, scrollTop: 100 });
    const disposeBottom = wireScrollDividers(withBottom.root);
    expect(divider(withBottom.bar)).toBeNull();
    expect(
      divider(withBottom.root.querySelector('.kui-nav-stack__bottom')),
    ).toBe('t');
    disposeBottom();
  });

  it('keys an outer NavStack chrome on a nested TabScaffold scene, but not its bar edge', () => {
    const inner = String(
      TabScaffold({
        id: 'inner-tabs',
        label: 'Inner',
        active: 'a',
        tabs: [{ id: 'a', label: 'A', content: body }],
      }),
    );
    const root = mountHtml(navStack([{ key: 'outer', content: raw(inner) }]));
    const { chrome, bottom } = stackParts(root);
    const scene = root.querySelector<HTMLElement>('.kui-tab-scaffold__scene')!;
    geometry(scene, { scrollHeight: 500, scrollTop: 100 });
    const dispose = wireScrollDividers(root);
    expect(divider(chrome)).toBe('b');
    expect(divider(bottom)).toBeNull();
    expect(divider(root.querySelector('.kui-tab-scaffold__bar'))).toBe('t');
    dispose();
  });
});
