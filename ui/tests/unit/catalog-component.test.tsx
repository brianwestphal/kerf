import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { raw, signal } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Catalog,
  CatalogExample,
  CatalogExampleStack,
  type CatalogSection,
} from '../../src/catalog.js';
import {
  revealCatalogEntry,
  wireCatalog,
} from '../../src/catalog/wiring/wire-catalog.js';

const asHtml = (value: unknown) => String(value);

const sections: CatalogSection[] = [
  {
    category: 'Controls',
    entries: [
      {
        id: 'button',
        name: 'Button',
        description: 'A pressable control.',
        tags: ['Discouraged', 'Preview'],
      },
      {
        id: 'select',
        name: 'Select',
        description: 'A value list.',
        resources: [
          {
            label: 'Source',
            href: 'https://example.com/select.ts',
            detail: 'src/select.ts',
          },
        ],
        related: [
          { id: 'button', name: 'Button', group: 'Used by' },
          { id: 'banner', name: 'Banner', group: 'Uses' },
        ],
      },
    ],
  },
  { category: 'Feedback', entries: [{ id: 'banner', name: 'Banner' }] },
];

describe('Catalog', () => {
  it('renders a category sidebar, a titled stage, and a resources footer', () => {
    const html = asHtml(
      Catalog({
        brand: {
          title: 'Acme UI',
          subtitle: 'Design system',
          logoUrl: '/logo.svg',
        },
        sections,
        active: 'select',
        content: raw('<div class="preview">Select preview</div>'),
        theme: 'light',
      }),
    );
    // Shell + brand
    expect(html).toContain('data-component="catalog"');
    expect(html).toContain('data-sidebar-collapsed="false"');
    // The shell is a Workbench whose left rail holds the navigation.
    expect(html).toContain('data-component="workbench"');
    expect(html).toContain('id="kui-catalog-left-rail"');
    const host = document.createElement('div');
    host.innerHTML = html;
    const mainPane = host.querySelector(
      '.kui-workbench__main [data-component="pane"]',
    );
    expect(mainPane?.getAttribute('data-appearance')).toBe('sunken');
    expect(mainPane?.hasAttribute('data-deep-inset')).toBe(false);
    expect(
      mainPane?.querySelector(
        ':scope > .kui-pane__content > .kui-catalog__stage',
      ),
    ).not.toBeNull();
    expect(html).toContain(
      '<nav aria-label="Acme UI components" data-catalog-sidebar>',
    );
    expect(html).toContain(
      'data-component="toolbar-text" data-size="large" role="heading" aria-level="1"><span class="kui-toolbar-text__text">Acme UI</span>',
    );
    expect(html).toContain(
      'data-component="text" data-tone="quiet" data-size="compact"',
    );
    expect(html).toContain('Design system</span>');
    expect(html).toContain('data-content="avatar"');
    expect(html).toContain(
      '--kui-toolbar-avatar-image:url(&quot;/logo.svg&quot;)',
    );
    // Category groups + items (ListHeader per section, ListItem per entry)
    expect(html).toContain('data-component="list-header"');
    expect(html).toContain(
      'data-action="catalog-select" data-item-id="button"',
    );
    expect(html).toContain(
      'data-action="catalog-select" data-item-id="select"',
    );
    expect(html).toContain(
      'class="kui-list-item__status">Discouraged · Preview</span>',
    );
    // Active item marked selected
    expect(html).toContain(
      'data-item-id="select" data-has-icon="false" data-has-description="false" data-multiline="true" data-icon-align="first-line" data-density="standard" data-divider="none" aria-current="page"',
    );
    // Detail header shows the active name + description
    expect(html).toContain(
      'data-component="toolbar-text" data-size="xlarge" role="heading" aria-level="2"><span class="kui-toolbar-text__text">Select</span>',
    );
    expect(html).toContain('A value list.');
    // Stage renders the app-provided content
    expect(html).toContain('class="preview">Select preview');
    expect(html).toContain('data-background-style="checkerboard"');
    // Footer resource link + related popup menu (a wa-dropdown, grouped by `group`)
    expect(html).toContain('data-component="toolbar-action-link"');
    expect(html).toContain('data-overflow="wrap"');
    expect(html).toContain('href="https://example.com/select.ts"');
    expect(html).toContain('data-catalog-related');
    expect(html).toContain('data-menu-inset="compact"');
    expect(html).toContain(
      'data-responsive="stack" data-responsive-at="narrow"',
    );
    expect(html).toContain('<span>Components</span>');
    // Group headings are the Select's group titles, not slotted h3s.
    expect(html).toContain(
      '<div class="kui-popup-menu__heading">Used by</div>',
    );
    expect(html).toContain('<div class="kui-popup-menu__heading">Uses</div>');
    expect(html).toContain('<wa-divider></wa-divider>');
    expect(html).toContain(
      'data-action="catalog-select" data-item-id="banner"',
    );
    // Theme toggle present (theme set), previews the opposite theme
    expect(html).toContain('data-action="catalog-toggle-theme"');
    expect(html).toContain('Use dark theme');
  });

  it('omits the theme toggle, subtitle, logo, and footer links when not provided', () => {
    const html = asHtml(
      Catalog({
        brand: { title: 'Bare' },
        sections: [{ category: 'One', entries: [{ id: 'a', name: 'A' }] }],
        active: 'a',
        content: raw('<span>a</span>'),
      }),
    );
    expect(html).not.toContain('catalog-toggle-theme');
    expect(html).not.toContain('data-tone="quiet" data-size="compact"');
    expect(html).not.toContain('--kui-toolbar-avatar-image');
    expect(html).not.toContain('kui-catalog__resource"');
    expect(html).not.toContain('data-catalog-related');
  });

  it('places filtered consumer metadata on the catalog-owned preview stage', () => {
    const html = asHtml(
      Catalog({
        brand: { title: 'Metadata' },
        sections: [{ category: 'One', entries: [{ id: 'a', name: 'A' }] }],
        active: 'a',
        content: raw('<span>a</span>'),
        stageRootAttributes: {
          'data-demo-mode': 'component',
          'data-review-state': 'ready',
        },
      }),
    );
    expect(html).toContain(
      'data-demo-mode="component" data-review-state="ready" class="kui-catalog__stage" data-catalog-stage',
    );
  });

  it('renders each selected preview background without allowing metadata to override it', () => {
    for (const backgroundStyle of [
      'vertical-stripes',
      'layout-guide',
      'surface',
      'sunken',
    ] as const) {
      const html = asHtml(
        Catalog({
          brand: { title: 'Backgrounds' },
          sections,
          active: 'button',
          content: raw('<span>Preview</span>'),
          backgroundStyle,
          stageRootAttributes: {
            'data-background-style': 'checkerboard',
          } as unknown as Record<`data-${string}`, string>,
        }),
      );
      const host = document.createElement('div');
      host.innerHTML = html;
      expect(
        host
          .querySelector('[data-catalog-stage]')
          ?.getAttribute('data-background-style'),
      ).toBe(backgroundStyle);
    }
  });

  it('shows the expand affordance and reflects collapse state', () => {
    const collapsed = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'button',
        content: raw('<b/>'),
        collapsed: true,
      }),
    );
    expect(collapsed).toContain('data-sidebar-collapsed="true"');
    // The Workbench moves the sidebar's standard toggle into the entry toolbar.
    expect(collapsed).toContain('aria-label="Show X catalog"');
    expect(collapsed).toContain('data-action="catalog-toggle-sidebar"');
    const open = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'button',
        content: raw('<b/>'),
      }),
    );
    expect(open).not.toContain('Show X catalog');
    expect(open).toContain('aria-label="Hide X catalog"');
  });

  it('renders an empty title when the active id is not in any section', () => {
    const html = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'does-not-exist',
        content: raw('<b/>'),
      }),
    );
    expect(html).toContain(
      'data-component="toolbar-text" data-size="xlarge" role="heading" aria-level="2"><span class="kui-toolbar-text__text"></span>',
    );
    expect(html).not.toContain('kui-catalog__description');
    expect(html).not.toContain('kui-catalog__resource"');
  });

  it('places custom header actions, a sidebar footer, and a status slot', () => {
    const html = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'button',
        content: raw('<b/>'),
        headerActions: raw('<button data-action="custom">Custom</button>'),
        sidebarFooter: raw('<section class="ecosystem">Ecosystem</section>'),
        status: raw('<output>Ready</output>'),
      }),
    );
    expect(html).toContain('data-action="custom"');
    expect(html).toContain('class="ecosystem">Ecosystem');
    // The status slot sits in a text-inset Row above the resource toolbar.
    expect(html).toMatch(
      /data-component="row"[^>]*data-text-insets="trl"[^>]*><output>Ready/,
    );
  });

  it('renders a collapsible secondary (ecosystem) section group', () => {
    const secondarySections = {
      label: 'Ecosystem',
      collapsible: true,
      expanded: true,
      sections: [
        { category: 'Forms', entries: [{ id: 'wa-input', name: 'Input' }] },
      ],
    };
    const open = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'button',
        content: raw('<b/>'),
        secondarySections,
      }),
    );
    // A top-divided List; each nested section opens with a ListHeader.
    expect(open).toMatch(/data-component="list"[^>]*divider-sides="t"/);
    expect(open).toContain('data-catalog-secondary');
    expect(open).toMatch(/data-component="list-header"[\s\S]*Forms/);
    expect(open).toContain(
      'data-action="catalog-select" data-item-id="wa-input"',
    );
    // The group label is a disclosure toggle when collapsible.
    expect(open).toContain('data-action="catalog-toggle-secondary"');
    // Collapsed keeps its entries in the DOM so the shared filter can search them.
    const collapsed = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'button',
        content: raw('<b/>'),
        secondarySections: { ...secondarySections, expanded: false },
      }),
    );
    expect(collapsed).toContain('data-catalog-secondary-collapsed="true"');
    expect(collapsed).toContain('data-action="catalog-toggle-secondary"');
  });

  it('finds an active entry inside the secondary group for the detail header', () => {
    const secondarySections = {
      label: 'Ecosystem',
      sections: [
        {
          category: 'Forms',
          entries: [
            { id: 'wa-input', name: 'Input', description: 'A form field.' },
          ],
        },
      ],
    };
    const html = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'wa-input',
        content: raw('<b/>'),
        secondarySections,
      }),
    );
    expect(html).toContain(
      'data-component="toolbar-text" data-size="xlarge" role="heading" aria-level="2"><span class="kui-toolbar-text__text">Input</span>',
    );
    expect(html).toContain('A form field.');
  });
});

describe('CatalogExample', () => {
  it('renders a labeled, noted example with an alignment inset', () => {
    const html = asHtml(
      CatalogExample({
        label: 'Default',
        note: 'A note.',
        align: 'glyph',
        children: raw('<svg data-icon />'),
      }),
    );
    expect(html).toContain('data-catalog-example');
    expect(html).toContain('data-align="glyph"');
    expect(html).toContain('data-component="list-header"');
    expect(html).toContain('data-catalog-example-label');
    expect(html).toContain('data-width="content"');
    // The note is ListInsetText + quiet compact Text.
    expect(html).toMatch(
      /data-catalog-example-note[^>]*class="kui-list-inset-text kui-catalog-example__note"[\s\S]*data-tone="quiet" data-size="compact"[^>]*>A note\./,
    );
    expect(html).toContain('<svg data-icon />');
    expect(html).not.toContain('kui-catalog-example__specimen');
  });

  it('defaults to no inset and omits the note when absent', () => {
    const html = asHtml(
      CatalogExample({ label: 'Bare', children: raw('<b/>') }),
    );
    expect(html).toContain('data-align="none"');
    expect(html).not.toContain('kui-catalog-example__note');
  });

  it('renders catalog-owned viewport constraints and compact guidance', () => {
    const html = asHtml(
      CatalogExample({
        label: 'Layout',
        viewport: {
          layout: 'grid',
          width: 'wide',
          height: 'reduced',
          minHeight: 'short',
          frame: 'dashed',
          surface: 'lowered',
          overflow: 'auto-x',
          responsive: 'roomy-only',
          shadow: true,
          tokens: { '--kui-pane-width': '18rem' },
        },
        compactFallback: 'Open this specimen on a wider viewport.',
        children: raw('<div data-layout-specimen />'),
      }),
    );
    expect(html).toContain('class="kui-catalog-example__viewport"');
    expect(html).toContain('data-layout="grid"');
    expect(html).toContain('data-width="wide"');
    expect(html).toContain('data-height="reduced"');
    expect(html).toContain('data-min-height="short"');
    expect(html).toContain('data-frame="dashed"');
    expect(html).toContain('data-surface="lowered"');
    expect(html).toContain('data-overflow="auto-x"');
    expect(html).toContain('data-responsive="roomy-only"');
    expect(html).toContain('data-shadow="true"');
    expect(html).not.toContain('data-fill-children');
    expect(html).toContain('style="--kui-pane-width:18rem"');
    expect(html).toMatch(
      /class="kui-text kui-catalog-example__compact-fallback"[^>]*>Open this specimen on a wider viewport\./,
    );
  });

  it('offers an application-sized specimen frame taller than the component heights', () => {
    expect(
      asHtml(
        CatalogExample({
          viewport: { width: 'full', height: 'app' },
          children: raw('<div data-app-specimen />'),
        }),
      ),
    ).toContain('data-height="app"');
    const css = readFileSync(
      resolve(
        import.meta.dirname,
        '../../src/catalog/components/catalog-example.css',
      ),
      'utf8',
    );
    const heights = Object.fromEntries(
      [
        ...css.matchAll(
          /\[data-height="([a-z]+)"\] \{\s*height: remify\((\d+)px\);/g,
        ),
      ].map(([, name, px]) => [name, Number(px)]),
    );
    expect(heights.app).toBe(592);
    expect(heights.app).toBeGreaterThan(
      Math.max(
        heights.short!,
        heights.reduced!,
        heights.medium!,
        heights.tall!,
      ),
    );
  });

  it('omits the label ListHeader for a bare specimen', () => {
    const html = asHtml(
      CatalogExample({ children: raw('<b data-specimen />') }),
    );
    expect(html).toContain('data-catalog-example');
    expect(html).not.toContain('data-component="list-header"');
    expect(html).toContain('<b data-specimen />');
  });

  it('stacks examples under a labeled region', () => {
    const html = asHtml(
      CatalogExampleStack({ label: 'Variants', children: raw('<section/>') }),
    );
    expect(html).toContain('data-catalog-example-stack');
    expect(html).toContain('<section');
    expect(html).toContain('aria-label="Variants"');
    expect(html).toContain('<section/>');
  });

  it('places safe authoring metadata on the intended example roots', () => {
    const example = asHtml(
      CatalogExample({
        rootAttributes: {
          'data-demo': 'button',
          'data-review': 'ready',
        },
        children: raw('<button/>'),
      }),
    );
    expect(example).toContain(
      '<section data-demo="button" data-review="ready" class="kui-catalog-example" data-catalog-example data-align="none">',
    );

    const stack = asHtml(
      CatalogExampleStack({
        rootAttributes: { 'data-demo': 'buttons' },
        children: raw('<section/>'),
      }),
    );
    expect(stack).toContain(
      '<section data-demo="buttons" class="kui-catalog-example-stack" data-catalog-example-stack>',
    );
  });

  it('filters structurally widened attributes and preserves helper-owned semantics', () => {
    const exampleAttributes = {
      'data-demo': 'safe',
      'DATA-ALIGN': 'glyph',
      'Data-Catalog-Example': 'unsafe',
      'Data-Catalog-Example-Stack': 'unsafe',
      'Data-Catalog-Example-Label': 'unsafe',
      'Data-Catalog-Example-Note': 'unsafe',
      role: 'presentation',
    } as Record<string, string>;
    const example = asHtml(
      CatalogExample({
        align: 'inline-control',
        rootAttributes: exampleAttributes,
        children: raw('<button/>'),
      }),
    );
    expect(example).toContain('data-demo="safe"');
    expect(example).toContain('data-catalog-example');
    expect(example).toContain('data-align="inline-control"');
    expect(example).not.toContain('unsafe');
    expect(example).not.toContain('role="presentation"');
    expect(example.match(/data-align=/g)).toHaveLength(1);

    const stackAttributes = {
      'data-demo': 'safe-stack',
      'Data-Catalog-Example-Stack': 'unsafe',
      'Data-Catalog-Example': 'unsafe',
      'Data-Align': 'glyph',
      class: 'unsafe-class',
    } as Record<string, string>;
    const stack = asHtml(
      CatalogExampleStack({
        rootAttributes: stackAttributes,
        children: raw('<section/>'),
      }),
    );
    expect(stack).toContain('data-demo="safe-stack"');
    expect(stack).toContain('data-catalog-example-stack');
    expect(stack).not.toContain('unsafe');
    expect(stack.match(/data-catalog-example-stack/g)).toHaveLength(1);
  });

  it('rejects protected structural metadata at the typed boundary', () => {
    CatalogExample({
      // @ts-expect-error CatalogExample owns its structural marker.
      rootAttributes: { 'data-catalog-example': 'unsafe' },
    });
    CatalogExample({
      // @ts-expect-error CatalogExample owns its alignment marker.
      rootAttributes: { 'data-align': 'glyph' },
    });
    CatalogExampleStack({
      // @ts-expect-error CatalogExampleStack owns its structural marker.
      rootAttributes: { 'data-catalog-example-stack': 'unsafe' },
    });
  });
});

describe('wireCatalog', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mountShell(html: string): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.append(root);
    return root;
  }

  it('filters entry and heading names across groups, then restores the query after a rerender', async () => {
    const props = {
      brand: { title: 'Acme' },
      sections,
      active: 'button',
      content: raw('<b/>'),
      secondarySections: {
        label: 'Ecosystem',
        collapsible: true,
        expanded: false,
        sections: [
          { category: 'Forms', entries: [{ id: 'wa-input', name: 'Input' }] },
        ],
      },
    };
    const root = mountShell(String(Catalog(props)));
    const dispose = wireCatalog(root, { onSelect: () => {} });
    const input = () =>
      root.querySelector<HTMLElement>('[data-catalog-filter]')!;
    const clear = () =>
      root.querySelector<HTMLElement>('[data-action="catalog-clear-filter"]')!;
    const visible = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>('[data-catalog-entry-name]'),
      )
        .filter((entry) => !entry.hidden)
        .map((entry) => entry.dataset.catalogEntryName);
    const type = (value: string) => {
      input().textContent = value;
      input().dispatchEvent(new Event('input', { bubbles: true }));
    };
    type('bUt');
    expect(visible()).toEqual(['Button']);
    expect(
      root.querySelector('[data-catalog-section="Feedback"]'),
    ).toHaveProperty('hidden', true);
    type('controls');
    expect(visible()).toEqual(['Button', 'Select']);
    type('ecosystem');
    expect(visible()).toEqual(['Input']);
    expect(root.querySelector('[data-catalog-secondary-group]')).toHaveProperty(
      'hidden',
      false,
    );
    expect(
      root
        .querySelector('[data-catalog-secondary-group] [aria-expanded]')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(
      root
        .querySelector(
          '[data-catalog-secondary-group] [data-component="disclosure-arrow"]',
        )
        ?.getAttribute('data-open'),
    ).toBe('true');
    type('nothing');
    expect(visible()).toEqual([]);
    expect(clear().style.display).toBe('');
    expect(
      root
        .querySelector('[data-catalog-filter-empty]')
        ?.getAttribute('data-visible'),
    ).toBe('true');
    clear().click();
    expect(input().textContent).toBe('');
    expect(clear().style.display).toBe('none');
    expect(visible()).toEqual(['Button', 'Select', 'Banner', 'Input']);
    type('nothing');
    root.innerHTML = String(Catalog(props));
    await vi.waitFor(() => expect(input().textContent).toBe('nothing'));
    expect(visible()).toEqual([]);
    const field = () =>
      root.querySelector<HTMLElement>('[data-component="token-search-field"]')!;
    field().dataset.placeholderVisible = 'true';
    await vi.waitFor(() =>
      expect(field().dataset.placeholderVisible).toBe('false'),
    );
    expect(input().textContent).toBe('nothing');
    type('');
    expect(field().dataset.placeholderVisible).toBe('true');
    expect(visible()).toEqual(['Button', 'Select', 'Banner', 'Input']);
    expect(
      root
        .querySelector('[data-catalog-secondary-collapsed]')
        ?.getAttribute('data-catalog-secondary-collapsed'),
    ).toBe('true');
    expect(
      root
        .querySelector(
          '[data-catalog-secondary-group] [data-component="disclosure-arrow"]',
        )
        ?.getAttribute('data-open'),
    ).toBe('false');
    expect(
      root
        .querySelector('[data-catalog-filter-empty]')
        ?.getAttribute('data-visible'),
    ).toBe('false');
    const unrelated = document.createElement('input');
    root.append(unrelated);
    unrelated.dispatchEvent(new Event('input', { bubbles: true }));
    unrelated.click();
    root.innerHTML = String(Catalog(props));
    await Promise.resolve();
    expect(input().textContent).toBe('');
    dispose();
  });

  it('filters an always-open secondary group without a disclosure control', () => {
    const root = mountShell(
      String(
        Catalog({
          brand: { title: 'Other package' },
          sections: [],
          active: 'item',
          content: raw('<b/>'),
          secondarySections: {
            label: 'More',
            sections: [
              {
                category: 'Utilities',
                entries: [{ id: 'item', name: 'Item' }],
              },
            ],
          },
        }),
      ),
    );
    const dispose = wireCatalog(root, { onSelect: () => {} });
    const input = root.querySelector<HTMLElement>('[data-catalog-filter]')!;
    input.textContent = 'item';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelector('[data-item-id="item"]')).toHaveProperty(
      'hidden',
      false,
    );
    expect(root.querySelector('[data-catalog-secondary-group]')).toHaveProperty(
      'hidden',
      false,
    );
    dispose();
  });

  function stubAnimationFrames(): {
    run: (id: number) => void;
    cancel: ReturnType<typeof vi.fn>;
  } {
    let nextId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = ++nextId;
      frames.set(id, callback);
      return id;
    });
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((id) => frames.delete(id));
    return {
      run: (id) => {
        const callback = frames.get(id);
        frames.delete(id);
        callback?.(0);
      },
      cancel,
    };
  }

  it('wires the sidebar like a Workbench rail and closes its open overlay on a selection', () => {
    const collapsed = signal(false);
    const root = mountShell(
      String(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'button',
          content: raw('<b/>'),
          collapsed: collapsed.value,
        }),
      ),
    );
    const rail = root.querySelector<HTMLElement>('#kui-catalog-left-rail')!;
    const real = window.getComputedStyle.bind(window);
    let overlaid = false;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const style = real(element);
      if (element !== rail) return style;
      return new Proxy(style, {
        get: (target, property) =>
          property === 'position'
            ? overlaid
              ? 'absolute'
              : 'relative'
            : Reflect.get(target, property),
      });
    });
    const selected: string[] = [];
    const dispose = wireCatalog(root, {
      onSelect: (id) => selected.push(id),
      collapsed,
    });
    const select = () =>
      root.querySelector<HTMLElement>('[data-item-id="select"]')!.click();
    // Inline, choosing an entry leaves the sidebar open.
    select();
    expect(selected).toEqual(['select']);
    expect(collapsed.value).toBe(false);
    // As an open overlay, choosing an entry closes it.
    overlaid = true;
    select();
    expect(collapsed.value).toBe(true);
    // Already closed, nothing more to do.
    select();
    expect(collapsed.value).toBe(true);
    dispose();
  });

  it('passes the header and footer placement through to its Workbench', () => {
    const pinned = String(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'select',
        content: raw('<b/>'),
        status: raw('<output>Ready</output>'),
      }),
    );
    expect(pinned).toContain('class="kui-pane__footer');
    // Pinned by default, but the entry pane lets its chrome scroll with the
    // preview when it is short, so large text never squeezes the preview out.
    expect(pinned).toContain('data-chrome-placement="auto"');
    const scrolling = String(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'select',
        content: raw('<b/>'),
        status: raw('<output>Ready</output>'),
        headerPlacement: 'scroll',
        footerPlacement: 'scroll',
      }),
    );
    // The entry pane's header and footer chrome join its scrolling content.
    const host = document.createElement('div');
    host.innerHTML = scrolling;
    const pane = host.querySelector(
      '#kui-catalog > .kui-workbench__center > [data-workbench-main] > [data-component="pane"]',
    )!;
    expect(pane.querySelector(':scope > .kui-pane__header')).toBeNull();
    expect(pane.querySelector(':scope > .kui-pane__footer')).toBeNull();
    expect(
      pane.querySelector(':scope > .kui-pane__content output'),
    ).not.toBeNull();
  });

  it('forwards sidebar and toolbar configuration to its Workbench', () => {
    const host = document.createElement('div');
    const render = (props: Partial<Parameters<typeof Catalog>[0]>) => {
      host.innerHTML = String(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'select',
          content: raw('<b/>'),
          ...props,
        }),
      );
      return {
        rail: host.querySelector<HTMLElement>('#kui-catalog-left-rail')!,
        toolbar: (label: string) =>
          host.querySelector<HTMLElement>(
            `[data-component="toolbar"][aria-label="${label}"]`,
          )!,
      };
    };

    // Defaults: a fixed 288px rail with no separator handle, a wrapping entry
    // toolbar, divider-free toolbars (the panes draw scroll dividers), and a
    // footer toolbar that stacks when narrow.
    const defaults = render({});
    expect(defaults.rail.getAttribute('style')).toContain('288px');
    expect(defaults.rail.querySelector('[role="separator"]')).toBeNull();
    expect(defaults.rail.dataset.responsiveOverlayAt).toBe('narrow');
    expect(defaults.rail.dataset.compactOverlay).toBe('inset');
    expect(
      defaults.toolbar('X catalog header').hasAttribute('divider-sides'),
    ).toBe(false);
    expect(defaults.toolbar('Select header').dataset.responsive).toBe('wrap');
    const footer = defaults.toolbar('Select resources');
    expect(footer.hasAttribute('divider-sides')).toBe(false);
    expect(footer.dataset.responsive).toBe('stack');
    expect(footer.dataset.responsiveAt).toBe('narrow');

    const configured = render({
      sidebar: {
        size: 320,
        resizable: { min: 200, max: 400 },
        responsiveOverlayAt: 'compact',
        compactOverlay: 'full',
        collapseMotion: 'none',
        toolbar: { dividerSides: 'b' },
      },
      mainToolbar: { responsive: 'stack', dividerSides: 't' },
      footerToolbar: {
        dividerSides: 't',
        responsive: 'none',
        responsiveAt: 'compact',
        centerAlign: 'stretch',
        safeAreaEdges: ['block-end'],
      },
    });
    expect(configured.rail.getAttribute('style')).toContain('320px');
    const handle = configured.rail.querySelector('[role="separator"]')!;
    expect(handle.getAttribute('aria-valuemin')).toBe('200');
    expect(handle.getAttribute('aria-valuemax')).toBe('400');
    expect(handle.getAttribute('aria-valuenow')).toBe('320');
    expect(configured.rail.dataset.responsiveOverlayAt).toBe('compact');
    expect(configured.rail.dataset.compactOverlay).toBe('full');
    expect(configured.rail.dataset.collapseMotion).toBe('none');
    // The Catalog keeps its own labels whatever the configuration says.
    const sidebarToolbar = configured.toolbar('X catalog header');
    expect(sidebarToolbar.getAttribute('divider-sides')).toBe('b');
    const main = configured.toolbar('Select header');
    expect(main.dataset.responsive).toBe('stack');
    expect(main.getAttribute('divider-sides')).toBe('t');
    const configuredFooter = configured.toolbar('Select resources');
    expect(configuredFooter.getAttribute('divider-sides')).toBe('t');
    expect(configuredFooter.dataset.responsive).toBe('none');
    expect(configuredFooter.dataset.responsiveAt).toBe('compact');
    expect(configuredFooter.dataset.centerAlign).toBe('stretch');
    expect(configuredFooter.dataset.safeAreaBlockEnd).toBe('true');

    // An explicitly undefined policy keeps the Catalog's default.
    const undefinedPolicy = render({
      mainToolbar: { responsive: undefined },
      footerToolbar: { responsive: undefined },
    });
    expect(undefinedPolicy.toolbar('Select header').dataset.responsive).toBe(
      'wrap',
    );
    expect(undefinedPolicy.toolbar('Select resources').dataset.responsive).toBe(
      'stack',
    );
  });

  it('writes sidebar resizes to the app-owned size signal', () => {
    const size = signal(300);
    const storage = new Map<string, string>();
    const root = mountShell(
      String(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'button',
          content: raw('<b/>'),
          sidebar: { resizable: true, size: size.value },
        }),
      ),
    );
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    const dispose = wireCatalog(root, {
      onSelect: () => {},
      sidebarSize: size,
      sidebarStorageKey: 'catalog-sidebar',
    });
    const handle = root.querySelector<HTMLElement>(
      '#kui-catalog-left-rail [role="separator"]',
    )!;
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(size.value).toBe(316);
    expect(storage.get('catalog-sidebar')).toBe('316');
    dispose();
  });

  it('reveals an exact sidebar id after render without moving focus', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const frames = stubAnimationFrames();
    const root = mountShell(
      '<button autofocus>Focus owner</button><button data-item-id="entry">Other</button><button data-item-id="entry&quot;]">Target</button>',
    );
    const target = root.querySelectorAll<HTMLElement>('[data-item-id]')[1]!;
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    const focusOwner = root.querySelector<HTMLElement>('[autofocus]')!;
    focusOwner.focus();

    revealCatalogEntry(root, 'entry"]', {
      block: 'center',
      inline: 'end',
      behavior: 'smooth',
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
    frames.run(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      inline: 'end',
      behavior: 'smooth',
    });
    expect(document.activeElement).toBe(focusOwner);
  });

  it('honors the compact media guard and permits an explicit all-size reveal', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
    const frames = stubAnimationFrames();
    const root = mountShell('<button data-item-id="button">Button</button>');
    const item = root.querySelector<HTMLElement>('[data-item-id]')!;
    const scrollIntoView = vi.fn();
    item.scrollIntoView = scrollIntoView;

    const cancelSuppressedReveal = revealCatalogEntry(root, 'button');
    cancelSuppressedReveal();
    frames.run(1);
    expect(scrollIntoView).not.toHaveBeenCalled();

    revealCatalogEntry(root, 'button', { media: false });
    frames.run(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'auto',
    });
  });

  it('reports sidebar selection and mirrors it into the URL', () => {
    const root = mountShell(
      asHtml(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'button',
          content: raw('<b/>'),
          theme: 'light',
        }),
      ),
    );
    const onSelect = vi.fn();
    const stop = wireCatalog(root, { onSelect, urlParam: 'component' });

    root
      .querySelector<HTMLElement>('[data-item-id="select"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('select');
    expect(new URL(location.href).searchParams.get('component')).toBe('select');
    stop();
  });

  it('cancels stale and disposed selection reveals during rapid changes', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const frames = stubAnimationFrames();
    const root = mountShell(
      asHtml(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'button',
          content: raw('<b/>'),
        }),
      ),
    );
    const stop = wireCatalog(root, {
      onSelect: vi.fn(),
      revealSelection: true,
    });

    root
      .querySelector<HTMLElement>('[data-item-id="select"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    root
      .querySelector<HTMLElement>('[data-item-id="button"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(frames.cancel).toHaveBeenCalledWith(1);

    stop();
    expect(frames.cancel).toHaveBeenLastCalledWith(2);
  });

  it('reports collapse and theme toggles, and related-entry selection', () => {
    const root = mountShell(
      asHtml(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'select',
          content: raw('<b/>'),
          theme: 'dark',
        }),
      ),
    );
    const onSelect = vi.fn();
    const onToggleSidebar = vi.fn();
    const onToggleTheme = vi.fn();
    const stop = wireCatalog(root, {
      onSelect,
      onToggleSidebar,
      onToggleTheme,
    });

    root
      .querySelector<HTMLElement>('[data-action="catalog-toggle-sidebar"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    root
      .querySelector<HTMLElement>('[data-action="catalog-toggle-theme"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);

    // Choosing an item from the footer related-entries popup menu navigates.
    root
      .querySelector<HTMLElement>(
        '[data-catalog-related] [data-item-id="button"]',
      )!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('button');
    stop();
  });

  it('reports the secondary-group disclosure toggle', () => {
    const root = mountShell(
      asHtml(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'button',
          content: raw('<b/>'),
          secondarySections: {
            label: 'Eco',
            collapsible: true,
            expanded: false,
            sections: [],
          },
        }),
      ),
    );
    const onSelect = vi.fn();
    const onToggleSecondary = vi.fn();
    const stop = wireCatalog(root, { onSelect, onToggleSecondary });
    root
      .querySelector<HTMLElement>('[data-action="catalog-toggle-secondary"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToggleSecondary).toHaveBeenCalledTimes(1);
    stop();
  });

  it('ignores a related-menu item with no id', () => {
    const root = mountShell(
      '<div data-catalog-related><wa-dropdown-item data-action="catalog-select">no id</wa-dropdown-item></div>',
    );
    const onSelect = vi.fn();
    const stop = wireCatalog(root, { onSelect });
    root
      .querySelector<HTMLElement>('[data-action="catalog-select"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
    stop();
  });

  it('stops responding after disposal', () => {
    const root = mountShell(
      asHtml(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'button',
          content: raw('<b/>'),
        }),
      ),
    );
    const onSelect = vi.fn();
    wireCatalog(root, { onSelect })();
    root
      .querySelector<HTMLElement>('[data-item-id="select"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
