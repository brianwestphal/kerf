import { raw } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TabScaffold, type TabScaffoldTab } from '../../src/tab-scaffold.js';
import { wireTabScaffold } from '../../src/wire-tab-scaffold.js';

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
