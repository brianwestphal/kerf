import { raw } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TabNavigator, type TabNavigatorTab } from '../../src/tab-navigator.js';
import { wireTabNavigator } from '../../src/wire-tab-navigator.js';

const tabs: TabNavigatorTab[] = [
  {
    id: 'home',
    label: 'Home',
    icon: raw('<svg class="i-home"></svg>'),
    content: raw('<div>home</div>'),
  },
  { id: 'search', label: 'Search', content: raw('<div>search</div>') },
];

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TabNavigator markup', () => {
  it('keeps only the active scene in the requested tab order and outline state', () => {
    const focusTabs = tabs.map((tab) => ({
      ...tab,
      tabIndex: 0 as const,
      outlined: true,
    }));
    const render = (active: string) => {
      const host = document.createElement('div');
      host.innerHTML = String(
        TabNavigator({ id: 'app', label: 'Sections', tabs: focusTabs, active }),
      );
      return [...host.querySelectorAll('[data-tab-scaffold-scene]')];
    };
    for (const active of ['home', 'search']) {
      const scenes = render(active);
      expect(scenes).toHaveLength(2);
      for (const scene of scenes) {
        expect(scene.getAttribute('role')).toBe('tabpanel');
        expect(scene.getAttribute('aria-label')).toBe(
          scene.getAttribute('data-tab-scaffold-scene') === 'home'
            ? 'Home'
            : 'Search',
        );
        const selected =
          scene.getAttribute('data-tab-scaffold-scene') === active;
        expect(scene.getAttribute('tabindex')).toBe(selected ? '0' : '-1');
        expect(scene.getAttribute('data-outlined')).toBe(
          selected ? 'true' : null,
        );
      }
    }
  });

  it('marks only opted-in scenes for a deep content inset', () => {
    const html = String(
      TabNavigator({
        id: 'app',
        label: 'Sections',
        tabs: [{ ...tabs[0]!, deepInset: true }, tabs[1]!],
        active: 'home',
      }),
    );
    expect(html).toContain(
      'data-tab-scaffold-scene="home" data-active="true" data-deep-inset="true"',
    );
    expect(html.match(/data-deep-inset=/g)).toHaveLength(1);
  });
  it('marks a scene for sunken scroll painting', () => {
    const html = String(
      TabNavigator({
        id: 'app',
        label: 'Sections',
        tabs: [{ ...tabs[0]!, appearance: 'sunken' }, tabs[1]!],
        active: 'home',
      }),
    );
    expect(html).toContain(
      'data-tab-scaffold-scene="home" data-active="true" data-appearance="sunken"',
    );
  });
  it('defaults to an automatic bar separator and accepts hidden independently of scroll dividers', () => {
    const render = (separator?: 'auto' | 'hidden') => {
      const host = document.createElement('div');
      host.innerHTML = String(
        TabNavigator({
          id: 'app',
          label: 'Sections',
          tabs,
          active: 'home',
          separator,
          chromeDividers: 'always',
        }),
      );
      return host.firstElementChild!;
    };
    expect(render().getAttribute('data-separator')).toBe('auto');
    expect(render('hidden').getAttribute('data-separator')).toBe('hidden');
    expect(render('hidden').getAttribute('data-chrome-dividers')).toBe(
      'always',
    );
  });
  it('renders a scene and a bottom-bar tab per entry, marking the active one', () => {
    const html = String(
      TabNavigator({ id: 'app', label: 'Sections', tabs, active: 'home' }),
    );
    expect(html).toContain('data-component="tab-scaffold"');
    expect(html).toContain('data-tab-scaffold-scene="home" data-active="true"');
    expect(html).toContain(
      'data-tab-scaffold-scene="search" data-active="false"',
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain(
      'data-tab-scaffold-tab="home" aria-selected="true" tabindex="0"',
    );
    expect(html).toContain(
      'data-tab-scaffold-tab="search" aria-selected="false" tabindex="-1"',
    );
  });

  it('renders a tab icon only when provided', () => {
    const html = String(
      TabNavigator({ id: 'app', label: 'Sections', tabs, active: 'search' }),
    );
    expect(html).toContain('kui-tab-scaffold__tab-icon');
    // Exactly one icon (home has one, search does not).
    expect(html.match(/kui-tab-scaffold__tab-icon/g)).toHaveLength(1);
  });

  it('renders no badge and no extra accessible name by default', () => {
    const html = String(
      TabNavigator({ id: 'app', label: 'Sections', tabs, active: 'home' }),
    );
    expect(html).not.toContain('kui-tab-scaffold__tab-badge');
    expect(html).not.toContain('data-has-badge');
    expect(html).not.toContain('aria-label="Home');
  });

  it('renders a decorative danger badge over the icon and folds badgeLabel into the tab name', () => {
    document.body.innerHTML = String(
      TabNavigator({
        id: 'app',
        label: 'Sections',
        active: 'home',
        tabs: [{ ...tabs[0]!, badge: 3, badgeLabel: '3 unread' }, tabs[1]!],
      }),
    );
    const home = document.querySelector('[data-tab-scaffold-tab="home"]')!;
    expect(home.getAttribute('aria-label')).toBe('Home, 3 unread');
    expect(home.getAttribute('data-has-badge')).toBe('true');
    const badge = home.querySelector(
      '.kui-tab-scaffold__tab-icon > .kui-tab-scaffold__tab-badge > [data-component="badge"]',
    )!;
    expect(badge.textContent).toBe('3');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(badge.getAttribute('data-tone')).toBe('danger');
    expect(badge.getAttribute('data-appearance')).toBe('solid');
    expect(badge.getAttribute('data-size')).toBe('compact');
    // The visible label is unchanged.
    expect(
      home.querySelector('.kui-tab-scaffold__tab-label')!.textContent,
    ).toBe('Home');
    const search = document.querySelector('[data-tab-scaffold-tab="search"]')!;
    expect(search.hasAttribute('aria-label')).toBe(false);
    expect(search.querySelector('[data-component="badge"]')).toBeNull();
  });

  it('defaults the accessible badge phrase to the badge text and trims badgeLabel', () => {
    document.body.innerHTML = String(
      TabNavigator({
        id: 'app',
        label: 'Sections',
        active: 'home',
        tabs: [
          { ...tabs[0]!, badge: ' 99+ ', badgeLabel: '   ' },
          { ...tabs[1]!, badge: 'New', badgeLabel: ' new results ' },
        ],
      }),
    );
    const home = document.querySelector('[data-tab-scaffold-tab="home"]')!;
    expect(home.getAttribute('aria-label')).toBe('Home, 99+');
    expect(home.querySelector('[data-component="badge"]')!.textContent).toBe(
      '99+',
    );
    // Without an icon the badge renders in flow before the label.
    const search = document.querySelector('[data-tab-scaffold-tab="search"]')!;
    expect(search.getAttribute('aria-label')).toBe('Search, new results');
    expect(search.firstElementChild!.className).toBe(
      'kui-tab-scaffold__tab-badge',
    );
  });

  it('renders 0 but ignores empty, whitespace-only, and non-finite badges', () => {
    const render = (badge: string | number) =>
      String(
        TabNavigator({
          id: 'app',
          label: 'Sections',
          active: 'home',
          tabs: [{ ...tabs[0]!, badge, badgeLabel: 'ignored' }],
        }),
      );
    expect(render(0)).toContain('aria-label="Home, ignored"');
    for (const badge of ['', '  ', Number.NaN, Number.POSITIVE_INFINITY]) {
      const html = render(badge);
      expect(html).not.toContain('kui-tab-scaffold__tab-badge');
      expect(html).not.toContain('aria-label="Home');
    }
  });

  it('renders the dot badge form over the icon with the required badgeLabel in the tab name', () => {
    document.body.innerHTML = String(
      TabNavigator({
        id: 'app',
        label: 'Sections',
        active: 'search',
        tabs: [
          { ...tabs[0]!, badge: true, badgeLabel: ' New activity ' },
          { ...tabs[1]!, badge: true, badgeLabel: 'New results' },
        ],
      }),
    );
    const home = document.querySelector('[data-tab-scaffold-tab="home"]')!;
    expect(home.getAttribute('aria-label')).toBe('Home, New activity');
    expect(home.getAttribute('data-has-badge')).toBe('true');
    const anchor = home.querySelector(
      '.kui-tab-scaffold__tab-icon > .kui-tab-scaffold__tab-badge',
    )!;
    expect(anchor.getAttribute('data-badge-kind')).toBe('dot');
    const dot = anchor.querySelector('[data-component="badge"]')!;
    expect(dot.getAttribute('data-size')).toBe('dot');
    expect(dot.getAttribute('data-tone')).toBe('danger');
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(dot.textContent).toBe('');
    // Without an icon the dot renders in flow before the label.
    const search = document.querySelector('[data-tab-scaffold-tab="search"]')!;
    expect(search.getAttribute('aria-label')).toBe('Search, New results');
    expect(search.firstElementChild!.getAttribute('data-badge-kind')).toBe(
      'dot',
    );
    // A text badge's anchor is marked as the text kind.
    expect(
      String(
        TabNavigator({
          id: 'app',
          label: 'Sections',
          active: 'home',
          tabs: [{ ...tabs[0]!, badge: 2 }],
        }),
      ),
    ).toContain('data-badge-kind="text"');
  });

  it('keeps the plain tab name for an untyped dot without a usable badgeLabel', () => {
    const html = String(
      TabNavigator({
        id: 'app',
        label: 'Sections',
        active: 'home',
        tabs: [{ ...tabs[0]!, badge: true, badgeLabel: '  ' }],
      }),
    );
    expect(html).toContain('data-badge-kind="dot"');
    expect(html).not.toContain('aria-label="Home');
  });

  it('applies a custom className', () => {
    expect(
      String(
        TabNavigator({
          id: 'app',
          label: 'Sections',
          tabs,
          active: 'home',
          className: 'phone',
        }),
      ),
    ).toContain('kui-tab-scaffold phone');
  });
});

describe('wireTabNavigator', () => {
  it('reports the selected tab id on click', () => {
    document.body.innerHTML = String(
      TabNavigator({ id: 'app', label: 'Sections', tabs, active: 'home' }),
    );
    const onSelect = vi.fn();
    const dispose = wireTabNavigator(document.body, { onSelect });
    document.body
      .querySelector<HTMLButtonElement>('[data-tab-scaffold-tab="search"]')!
      .click();
    expect(onSelect).toHaveBeenCalledWith('search');
    dispose();
    document.body
      .querySelector<HTMLButtonElement>('[data-tab-scaffold-tab="home"]')!
      .click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('returns a no-op disposer when no scaffold is present', () => {
    const root = document.createElement('div');
    expect(() => wireTabNavigator(root, { onSelect: vi.fn() })()).not.toThrow();
  });
});

// KF-C3V8B7: barPresentation="overlay" lays the bar over the scenes once
// wireTabNavigator has measured it.
describe('TabNavigator overlay bar', () => {
  it('marks only an overlay bar presentation on the root', () => {
    const overlay = String(
      TabNavigator({
        id: 'app',
        label: 'Sections',
        tabs,
        active: 'home',
        barPresentation: 'overlay',
      }),
    );
    expect(overlay).toContain('data-bar-presentation="overlay"');
    expect(
      String(
        TabNavigator({
          id: 'app',
          label: 'Sections',
          tabs,
          active: 'home',
          barPresentation: 'docked',
        }),
      ),
    ).not.toContain('data-bar-presentation');
  });

  /** A ResizeObserver whose callback the test drives. */
  function fakeResizeObserver() {
    const observers: Array<{
      callback: ResizeObserverCallback;
      targets: Set<Element>;
    }> = [];
    class FakeResizeObserver {
      private readonly entry: (typeof observers)[number];
      constructor(callback: ResizeObserverCallback) {
        this.entry = { callback, targets: new Set() };
        observers.push(this.entry);
      }
      observe(target: Element) {
        this.entry.targets.add(target);
      }
      unobserve(target: Element) {
        this.entry.targets.delete(target);
      }
      disconnect() {
        this.entry.targets.clear();
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const report = (target: Element, blockSize?: number) => {
      for (const { callback, targets } of observers)
        if (targets.has(target))
          callback(
            [
              {
                target,
                borderBoxSize:
                  blockSize === undefined
                    ? undefined
                    : [{ blockSize, inlineSize: 0 }],
              } as unknown as ResizeObserverEntry,
            ],
            {} as ResizeObserver,
          );
    };
    const observing = (target: Element) =>
      observers.some(({ targets }) => targets.has(target));
    return { report, observing };
  }

  const settle = () => new Promise((done) => globalThis.setTimeout(done, 0));

  function render(barPresentation: 'docked' | 'overlay' = 'overlay') {
    document.body.innerHTML = String(
      TabNavigator({
        id: 'app',
        label: 'Sections',
        tabs,
        active: 'home',
        barPresentation,
      }),
    );
    const section = document.querySelector<HTMLElement>('#app')!;
    const bar = () =>
      section.querySelector<HTMLElement>(':scope > .kui-tab-scaffold__bar')!;
    return { section, bar };
  }

  it('measures the live bar and publishes its border-box size with the gate', async () => {
    const { report, observing } = fakeResizeObserver();
    const { section, bar } = render();
    vi.spyOn(bar(), 'getBoundingClientRect').mockReturnValue({
      height: 60,
    } as DOMRect);
    const dispose = wireTabNavigator(section, { onSelect: vi.fn() });
    expect(section.getAttribute('data-bar-overlay')).toBe('measured');
    expect(
      section.style.getPropertyValue('--_kui-tab-scaffold-bar-block-size'),
    ).toBe('60px');
    // The observer's border-box size wins once it reports.
    report(bar(), 82);
    expect(
      section.style.getPropertyValue('--_kui-tab-scaffold-bar-block-size'),
    ).toBe('82px');
    // Without a border-box size it falls back to the bar's rect.
    report(bar());
    expect(
      section.style.getPropertyValue('--_kui-tab-scaffold-bar-block-size'),
    ).toBe('60px');
    // A re-render that strips the published state gets it back.
    section.removeAttribute('data-bar-overlay');
    section.removeAttribute('style');
    await settle();
    expect(section.getAttribute('data-bar-overlay')).toBe('measured');
    expect(
      section.style.getPropertyValue('--_kui-tab-scaffold-bar-block-size'),
    ).toBe('60px');
    // A replaced bar keeps the last size until it is observed.
    const old = bar();
    const replacement = old.cloneNode(true) as HTMLElement;
    old.replaceWith(replacement);
    await settle();
    expect(observing(old)).toBe(false);
    expect(observing(replacement)).toBe(true);
    report(replacement, 70);
    expect(
      section.style.getPropertyValue('--_kui-tab-scaffold-bar-block-size'),
    ).toBe('70px');
    // Another element resizing does not move the measurement.
    report(section, 999);
    dispose();
    expect(section.hasAttribute('data-bar-overlay')).toBe(false);
    expect(section.hasAttribute('style')).toBe(false);
    expect(observing(replacement)).toBe(false);
  });

  it('switches with the presentation and leaves a docked bar unmeasured', async () => {
    fakeResizeObserver();
    const { section } = render('docked');
    const dispose = wireTabNavigator(section, { onSelect: vi.fn() });
    expect(section.hasAttribute('data-bar-overlay')).toBe(false);
    section.setAttribute('data-bar-presentation', 'overlay');
    await settle();
    expect(section.getAttribute('data-bar-overlay')).toBe('measured');
    section.removeAttribute('data-bar-presentation');
    await settle();
    expect(section.hasAttribute('data-bar-overlay')).toBe(false);
    expect(
      section.style.getPropertyValue('--_kui-tab-scaffold-bar-block-size'),
    ).toBe('');
    dispose();
  });

  // KF-D5CBFH: the bar ends where the active scene's classic scrollbar
  // track begins.
  describe('classic scrollbar beneath the bar', () => {
    const SIZE = '--_kui-tab-scaffold-bar-scrollbar-inline-size';

    /** Give `element` a 15px classic scrollbar in happy-dom. */
    function scrollbar(element: HTMLElement, width = 15) {
      Object.defineProperty(element, 'offsetWidth', {
        configurable: true,
        value: 300,
      });
      Object.defineProperty(element, 'clientWidth', {
        configurable: true,
        value: 300 - width,
      });
    }

    function renderScene(
      content: ReturnType<typeof raw>,
      active: 'home' | 'search' = 'home',
    ) {
      document.body.innerHTML = String(
        TabNavigator({
          id: 'app',
          label: 'Sections',
          active,
          barPresentation: 'overlay',
          tabs: [
            { id: 'home', label: 'Home', content },
            { id: 'search', label: 'Search', content: raw('<div>s</div>') },
          ],
        }),
      );
      const section = document.querySelector<HTMLElement>('#app')!;
      const scene = (id: string) =>
        section.querySelector<HTMLElement>(
          `[data-tab-scaffold-scene="${id}"]`,
        )!;
      return { section, scene };
    }

    it('measures a plain scene, follows the active tab, and clears on dispose', async () => {
      const { report } = fakeResizeObserver();
      const { section, scene } = renderScene(raw('<div>rows</div>'));
      scrollbar(scene('home'));
      const dispose = wireTabNavigator(section, { onSelect: vi.fn() });
      expect(section.style.getPropertyValue(SIZE)).toBe('15px');
      // The search scene has no classic scrollbar.
      scrollbar(scene('search'), 0);
      scene('home').dataset.active = 'false';
      scene('search').dataset.active = 'true';
      await settle();
      expect(section.style.getPropertyValue(SIZE)).toBe('');
      // A scrollbar appearing resizes the scroller's content box.
      scrollbar(scene('search'), 12);
      report(scene('search'));
      expect(section.style.getPropertyValue(SIZE)).toBe('12px');
      dispose();
      expect(section.style.getPropertyValue(SIZE)).toBe('');
    });

    it("measures a sole Pane's content, but not past its footer", async () => {
      fakeResizeObserver();
      const { section, scene } = renderScene(
        raw(
          '<section class="kui-pane" data-component="pane"><div class="kui-pane__content"></div></section>',
        ),
      );
      const pane = scene('home').querySelector('.kui-pane')!;
      scrollbar(pane.querySelector<HTMLElement>('.kui-pane__content')!);
      const dispose = wireTabNavigator(section, { onSelect: vi.fn() });
      expect(section.style.getPropertyValue(SIZE)).toBe('15px');
      const footer = document.createElement('footer');
      footer.className = 'kui-pane__footer';
      pane.append(footer);
      await settle();
      expect(section.style.getPropertyValue(SIZE)).toBe('');
      dispose();
    });

    const stack = (inner: string, bottom = '') =>
      raw(
        `<section data-component="nav-stack" ${bottom}><div data-nav-stack-viewport>${inner}</div></section>`,
      );

    it("measures a sole NavStack's active view, or its sole Pane's content", async () => {
      fakeResizeObserver();
      const { section, scene } = renderScene(
        stack(
          '<div data-nav-active="true"><div>root</div></div><div data-nav-active="true" data-nav-exiting="true"></div>',
        ),
      );
      const view = scene('home').querySelector<HTMLElement>(
        '[data-nav-active="true"]',
      )!;
      scrollbar(view);
      const dispose = wireTabNavigator(section, { onSelect: vi.fn() });
      expect(section.style.getPropertyValue(SIZE)).toBe('15px');
      // A pushed view holding a sole Pane: the Pane's content scrolls.
      const pushed = document.createElement('div');
      pushed.dataset.navActive = 'true';
      pushed.innerHTML =
        '<section class="kui-pane" data-component="pane"><div class="kui-pane__content"></div></section>';
      scrollbar(pushed.querySelector<HTMLElement>('.kui-pane__content')!, 11);
      view.parentElement!.append(pushed);
      await settle();
      expect(section.style.getPropertyValue(SIZE)).toBe('11px');
      // A view holding a nested layout owns its own scroller.
      pushed.innerHTML = '<section data-component="split-view"></section>';
      await settle();
      expect(section.style.getPropertyValue(SIZE)).toBe('');
      // A stack with no active view.
      pushed.remove();
      view.dataset.navActive = 'false';
      await settle();
      expect(section.style.getPropertyValue(SIZE)).toBe('');
      dispose();
    });

    it('leaves a NavStack with a docked bottom toolbar alone, but measures under an overlay one', async () => {
      fakeResizeObserver();
      const { section, scene } = renderScene(
        stack(
          '<div data-nav-active="true"></div>',
          'data-bottom-toolbar-presentation="docked"',
        ),
      );
      const root = scene('home').querySelector<HTMLElement>(
        '[data-component="nav-stack"]',
      )!;
      const bottom = document.createElement('div');
      bottom.setAttribute('data-nav-stack-bottom', '');
      root.append(bottom);
      scrollbar(root.querySelector<HTMLElement>('[data-nav-active]')!);
      const dispose = wireTabNavigator(section, { onSelect: vi.fn() });
      expect(section.style.getPropertyValue(SIZE)).toBe('');
      root.setAttribute('data-bottom-toolbar-presentation', 'overlay');
      await settle();
      expect(section.style.getPropertyValue(SIZE)).toBe('15px');
      dispose();
    });

    it('ignores a scene whose only child is another nested layout, and a missing active scene', async () => {
      fakeResizeObserver();
      const { section, scene } = renderScene(
        raw('<section data-component="workbench"></section>'),
      );
      const dispose = wireTabNavigator(section, { onSelect: vi.fn() });
      expect(section.style.getPropertyValue(SIZE)).toBe('');
      scene('home').dataset.active = 'false';
      await settle();
      expect(section.style.getPropertyValue(SIZE)).toBe('');
      dispose();
    });
  });

  it('measures the bar directly where ResizeObserver is missing', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { section, bar } = render();
    vi.spyOn(bar(), 'getBoundingClientRect').mockReturnValue({
      height: 54,
    } as DOMRect);
    const dispose = wireTabNavigator(section, { onSelect: vi.fn() });
    expect(
      section.style.getPropertyValue('--_kui-tab-scaffold-bar-block-size'),
    ).toBe('54px');
    dispose();
  });
});
