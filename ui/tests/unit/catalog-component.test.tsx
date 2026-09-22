import { raw } from 'kerfjs';
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
  wireCatalogGeometryOverlay,
} from '../../src/wire-catalog.js';

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
    expect(html).toContain('<h1>Acme UI</h1>');
    expect(html).toContain('kui-catalog__subtitle">Design system');
    expect(html).toContain('src="/logo.svg"');
    // Category groups + items (ListHeader per section, ListItem per entry)
    expect(html).toContain('data-component="list-header"');
    expect(html).toContain(
      'data-action="catalog-select" data-item-id="button"',
    );
    expect(html).toContain(
      'data-action="catalog-select" data-item-id="select"',
    );
    expect(html).toContain('kui-catalog__tag">Discouraged</span>');
    expect(html).toContain('kui-catalog__tag">Preview</span>');
    // Active item marked selected
    expect(html).toContain(
      'data-item-id="select" data-has-icon="false" data-multiline="true" aria-current="page"',
    );
    // Detail header shows the active name + description
    expect(html).toContain('<h2>Select</h2>');
    expect(html).toContain('A value list.');
    // Stage renders the app-provided content
    expect(html).toContain('class="preview">Select preview');
    // Footer resource link + related popup menu (a wa-dropdown, grouped by `group`)
    expect(html).toContain('kui-catalog__resource');
    expect(html).toContain('href="https://example.com/select.ts"');
    expect(html).toContain('data-catalog-related');
    expect(html).toContain('kui-catalog__related-menu');
    expect(html).toContain('kui-catalog__related-label">Component');
    expect(html).toContain('kui-catalog__related-heading">Used by');
    expect(html).toContain('kui-catalog__related-heading">Uses');
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
    expect(html).not.toContain('kui-catalog__subtitle');
    expect(html).not.toContain('kui-catalog__mark');
    expect(html).not.toContain('kui-catalog__resource"');
    expect(html).not.toContain('data-catalog-related');
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
    expect(collapsed).toContain('Expand X catalog');
    const open = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'button',
        content: raw('<b/>'),
      }),
    );
    expect(open).not.toContain('Expand X catalog');
    expect(open).toContain('Collapse X catalog');
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
    expect(html).toContain('<h2></h2>');
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
    expect(html).toContain('kui-catalog__status"><output>Ready');
  });

  it('renders controlled geometry-overlay hooks without changing the preview', () => {
    const html = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'button',
        content: raw('<button data-component="button">Save</button>'),
        geometryOverlay: false,
      }),
    );
    expect(html).toContain('data-geometry-overlay="false"');
    expect(html).toContain('data-catalog-geometry-overlay');
    expect(html).toContain('data-morph-skip-children');
    expect(html).toContain('data-component="button">Save</button>');
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
    expect(open).toContain('kui-catalog__group--secondary');
    expect(open).toContain('data-catalog-secondary');
    expect(open).toContain('kui-catalog__secondary-heading">Forms');
    expect(open).toContain(
      'data-action="catalog-select" data-item-id="wa-input"',
    );
    // The group label is a disclosure toggle when collapsible.
    expect(open).toContain('data-action="catalog-toggle-secondary"');
    // Collapsed hides the entries but keeps the toggle.
    const collapsed = asHtml(
      Catalog({
        brand: { title: 'X' },
        sections,
        active: 'button',
        content: raw('<b/>'),
        secondarySections: { ...secondarySections, expanded: false },
      }),
    );
    expect(collapsed).not.toContain('data-catalog-secondary');
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
    expect(html).toContain('<h2>Input</h2>');
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
    expect(html).toContain(
      'kui-catalog-example__note" data-catalog-example-note>A note.',
    );
    expect(html).toContain('<svg data-icon />');
  });

  it('defaults to no inset and omits the note when absent', () => {
    const html = asHtml(
      CatalogExample({ label: 'Bare', children: raw('<b/>') }),
    );
    expect(html).toContain('data-align="none"');
    expect(html).not.toContain('kui-catalog-example__note');
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
          'data-catalog-geometry-overlay-skip': '',
        },
        children: raw('<button/>'),
      }),
    );
    expect(example).toContain(
      '<section data-demo="button" data-catalog-geometry-overlay-skip="" class="kui-catalog-example" data-catalog-example data-align="none">',
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

  it('draws transparent bounds and intrinsic margins, reacts to disable, and disposes cleanly', async () => {
    class TestResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    const root = mountShell(
      asHtml(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'button',
          content: raw(
            '<section class="kui-catalog-example" data-catalog-example><header class="kui-list-header" data-catalog-example-label>Example</header><p class="kui-catalog-example__note" data-catalog-example-note>Note</p><button data-component="example" style="--kui-catalog-example-align: 1rem; direction: rtl; margin-right: 20px; background: transparent">Example</button></section><section class="kui-catalog-example" data-catalog-example><header class="kui-list-header" data-catalog-example-label>Header specimen</header></section><section class="kui-catalog-example" data-catalog-example data-catalog-geometry-overlay-skip><button data-component="skipped">Skipped</button></section><section class="kui-catalog-example" data-catalog-example><button data-component="bordered" style="border: solid red; border-width: 1px 2px 3px 4px; border-radius: 6px; background: white">Bordered</button></section><section class="kui-catalog-example" data-catalog-example><button data-component="hidden-border" style="border: 8px hidden red; background: white">Hidden border</button></section><div data-component="outer" style="margin: 4px; background: transparent"><span data-component="inner">Inner</span></div><div data-component="opaque" style="margin: 0; background: rgb(1, 2, 3)">Opaque</div>',
          ),
          geometryOverlay: true,
        }),
      ),
    );
    const canvas = root.querySelector<HTMLElement>('.kui-catalog__canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 10, y: 20, width: 300, height: 200 }),
    );
    for (const specimen of canvas.querySelectorAll<HTMLElement>(
      '[data-component]',
    ))
      vi.spyOn(specimen, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: 30, y: 50, width: 80, height: 40 }),
      );

    const stop = wireCatalogGeometryOverlay(root);
    const layer = root.querySelector<HTMLElement>(
      '[data-catalog-geometry-overlay]',
    )!;
    expect(layer.querySelectorAll('.kui-catalog__geometry-bound')).toHaveLength(
      2,
    );
    expect(
      layer.querySelectorAll('.kui-catalog__geometry-margin'),
    ).toHaveLength(5);
    const border = layer.querySelector<HTMLElement>(
      '.kui-catalog__geometry-border[data-catalog-geometry-specimen="1"]',
    )!;
    expect(border.style.borderTopWidth).toBe('1px');
    expect(border.style.borderRightWidth).toBe('2px');
    expect(border.style.borderBottomWidth).toBe('3px');
    expect(border.style.borderLeftWidth).toBe('4px');
    expect(border.style.borderRadius).toBe('6px');
    expect(
      layer.querySelector(
        '[data-catalog-geometry-specimen="0"][data-catalog-geometry-side="right"]',
      ),
    ).not.toBeNull();

    root
      .querySelector<HTMLElement>('[data-component="bordered"]')!
      .parentElement!.remove();
    await vi.waitFor(() =>
      expect(
        layer.querySelectorAll('.kui-catalog__geometry-border'),
      ).toHaveLength(0),
    );
    document.head.dispatchEvent(new Event('load'));
    await vi.waitFor(() =>
      expect(
        layer.querySelectorAll('.kui-catalog__geometry-bound'),
      ).toHaveLength(2),
    );

    root
      .querySelector<HTMLElement>('[data-component="catalog"]')!
      .setAttribute('data-geometry-overlay', 'false');
    window.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(layer.children).toHaveLength(0));

    root
      .querySelector<HTMLElement>('[data-component="catalog"]')!
      .setAttribute('data-geometry-overlay', 'true');
    window.dispatchEvent(new Event('resize'));
    await vi.waitFor(() =>
      expect(
        layer.querySelectorAll('.kui-catalog__geometry-bound'),
      ).toHaveLength(2),
    );

    window.dispatchEvent(new Event('resize'));
    stop();
    expect(layer.children).toHaveLength(0);

    const catalog = root.querySelector<HTMLElement>(
      '[data-component="catalog"]',
    )!;
    const stopFromCatalog = wireCatalogGeometryOverlay(catalog);
    stopFromCatalog();
    expect(layer.children).toHaveLength(0);
  });

  it('is a no-op when the Catalog did not opt into a geometry layer', () => {
    const root = mountShell('<div>plain content</div>');
    const stop = wireCatalogGeometryOverlay(root);
    expect(stop()).toBeUndefined();
  });

  it('does not require a document head to wire and dispose the overlay', () => {
    class TestResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    const root = mountShell(
      asHtml(
        Catalog({
          brand: { title: 'X' },
          sections,
          active: 'button',
          content: raw('<b/>'),
          geometryOverlay: true,
        }),
      ),
    );
    const head = document.head;
    head.remove();
    try {
      wireCatalogGeometryOverlay(root)();
    } finally {
      document.documentElement.prepend(head);
    }
  });
});
