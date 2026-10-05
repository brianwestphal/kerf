import { raw } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TabScaffold,
  type TabScaffoldTab,
} from '../../src/components/navigation/tab-scaffold/tab-scaffold.js';
import { wireTabScaffold } from '../../src/components/navigation/tab-scaffold/wiring/wire-tab-scaffold.js';

const tabs: TabScaffoldTab[] = [
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
});

describe('TabScaffold markup', () => {
  it('marks only opted-in scenes for a deep content inset', () => {
    const html = String(
      TabScaffold({
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
      TabScaffold({
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
  it('renders a scene and a bottom-bar tab per entry, marking the active one', () => {
    const html = String(
      TabScaffold({ id: 'app', label: 'Sections', tabs, active: 'home' }),
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
      TabScaffold({ id: 'app', label: 'Sections', tabs, active: 'search' }),
    );
    expect(html).toContain('kui-tab-scaffold__tab-icon');
    // Exactly one icon (home has one, search does not).
    expect(html.match(/kui-tab-scaffold__tab-icon/g)).toHaveLength(1);
  });

  it('renders no badge and no extra accessible name by default', () => {
    const html = String(
      TabScaffold({ id: 'app', label: 'Sections', tabs, active: 'home' }),
    );
    expect(html).not.toContain('kui-tab-scaffold__tab-badge');
    expect(html).not.toContain('data-has-badge');
    expect(html).not.toContain('aria-label="Home');
  });

  it('renders a decorative danger badge over the icon and folds badgeLabel into the tab name', () => {
    document.body.innerHTML = String(
      TabScaffold({
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
      TabScaffold({
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
        TabScaffold({
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
      TabScaffold({
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
        TabScaffold({
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
      TabScaffold({
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
        TabScaffold({
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

describe('wireTabScaffold', () => {
  it('reports the selected tab id on click', () => {
    document.body.innerHTML = String(
      TabScaffold({ id: 'app', label: 'Sections', tabs, active: 'home' }),
    );
    const onSelect = vi.fn();
    const dispose = wireTabScaffold(document.body, { onSelect });
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
    expect(() => wireTabScaffold(root, { onSelect: vi.fn() })()).not.toThrow();
  });
});
