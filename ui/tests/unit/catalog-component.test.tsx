import { raw } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Catalog, CatalogExample, CatalogExampleStack, type CatalogSection } from '../../src/catalog.js';
import { wireCatalog } from '../../src/wire-catalog.js';

const asHtml = (value: unknown) => String(value);

const sections: CatalogSection[] = [
  {
    category: 'Controls',
    entries: [
      { id: 'button', name: 'Button', description: 'A pressable control.' },
      {
        id: 'select',
        name: 'Select',
        description: 'A value list.',
        resources: [{ label: 'Source', href: 'https://example.com/select.ts', detail: 'src/select.ts' }],
        related: [{ id: 'button', name: 'Button', group: 'Used by' }],
      },
    ],
  },
  { category: 'Feedback', entries: [{ id: 'banner', name: 'Banner' }] },
];

describe('Catalog', () => {
  it('renders a category sidebar, a titled stage, and a resources footer', () => {
    const html = asHtml(Catalog({
      brand: { title: 'Acme UI', subtitle: 'Design system', logoUrl: '/logo.svg' },
      sections,
      active: 'select',
      content: raw('<div class="preview">Select preview</div>'),
      theme: 'light',
    }));
    // Shell + brand
    expect(html).toContain('data-component="catalog"');
    expect(html).toContain('data-sidebar-collapsed="false"');
    expect(html).toContain('<h1>Acme UI</h1>');
    expect(html).toContain('kui-catalog__subtitle">Design system');
    expect(html).toContain('src="/logo.svg"');
    // Category groups + items (ListHeader per section, ListItem per entry)
    expect(html).toContain('data-component="list-header"');
    expect(html).toContain('data-action="catalog-select" data-item-id="button"');
    expect(html).toContain('data-action="catalog-select" data-item-id="select"');
    // Active item marked selected
    expect(html).toContain('data-item-id="select" data-has-icon="false" data-multiline="true" aria-current="page"');
    // Detail header shows the active name + description
    expect(html).toContain('<h2>Select</h2>');
    expect(html).toContain('A value list.');
    // Stage renders the app-provided content
    expect(html).toContain('class="preview">Select preview');
    // Footer resource link + related selector
    expect(html).toContain('kui-catalog__resource');
    expect(html).toContain('href="https://example.com/select.ts"');
    expect(html).toContain('data-catalog-related');
    // Theme toggle present (theme set), previews the opposite theme
    expect(html).toContain('data-action="catalog-toggle-theme"');
    expect(html).toContain('Use dark theme');
  });

  it('omits the theme toggle, subtitle, logo, and footer links when not provided', () => {
    const html = asHtml(Catalog({
      brand: { title: 'Bare' },
      sections: [{ category: 'One', entries: [{ id: 'a', name: 'A' }] }],
      active: 'a',
      content: raw('<span>a</span>'),
    }));
    expect(html).not.toContain('catalog-toggle-theme');
    expect(html).not.toContain('kui-catalog__subtitle');
    expect(html).not.toContain('kui-catalog__mark');
    expect(html).not.toContain('kui-catalog__resource"');
    expect(html).not.toContain('data-catalog-related');
  });

  it('shows the expand affordance and reflects collapse state', () => {
    const collapsed = asHtml(Catalog({ brand: { title: 'X' }, sections, active: 'button', content: raw('<b/>'), collapsed: true }));
    expect(collapsed).toContain('data-sidebar-collapsed="true"');
    expect(collapsed).toContain('Expand X catalog');
    const open = asHtml(Catalog({ brand: { title: 'X' }, sections, active: 'button', content: raw('<b/>') }));
    expect(open).not.toContain('Expand X catalog');
    expect(open).toContain('Collapse X catalog');
  });

  it('renders an empty title when the active id is not in any section', () => {
    const html = asHtml(Catalog({ brand: { title: 'X' }, sections, active: 'does-not-exist', content: raw('<b/>') }));
    expect(html).toContain('<h2></h2>');
    expect(html).not.toContain('kui-catalog__description');
    expect(html).not.toContain('kui-catalog__resource"');
  });

  it('places custom header actions, a sidebar footer, and a status slot', () => {
    const html = asHtml(Catalog({
      brand: { title: 'X' },
      sections,
      active: 'button',
      content: raw('<b/>'),
      headerActions: raw('<button data-action="custom">Custom</button>'),
      sidebarFooter: raw('<section class="ecosystem">Ecosystem</section>'),
      status: raw('<output>Ready</output>'),
    }));
    expect(html).toContain('data-action="custom"');
    expect(html).toContain('class="ecosystem">Ecosystem');
    expect(html).toContain('kui-catalog__status"><output>Ready');
  });

  it('renders a collapsible secondary (ecosystem) section group', () => {
    const secondarySections = {
      label: 'Ecosystem',
      collapsible: true,
      expanded: true,
      sections: [{ category: 'Forms', entries: [{ id: 'wa-input', name: 'Input' }] }],
    };
    const open = asHtml(Catalog({ brand: { title: 'X' }, sections, active: 'button', content: raw('<b/>'), secondarySections }));
    expect(open).toContain('kui-catalog__group--secondary');
    expect(open).toContain('data-catalog-secondary');
    expect(open).toContain('kui-catalog__secondary-heading">Forms');
    expect(open).toContain('data-action="catalog-select" data-item-id="wa-input"');
    // The group label is a disclosure toggle when collapsible.
    expect(open).toContain('data-action="catalog-toggle-secondary"');
    // Collapsed hides the entries but keeps the toggle.
    const collapsed = asHtml(Catalog({ brand: { title: 'X' }, sections, active: 'button', content: raw('<b/>'), secondarySections: { ...secondarySections, expanded: false } }));
    expect(collapsed).not.toContain('data-catalog-secondary');
    expect(collapsed).toContain('data-action="catalog-toggle-secondary"');
  });
});

describe('CatalogExample', () => {
  it('renders a labeled, noted example with an alignment inset', () => {
    const html = asHtml(CatalogExample({ label: 'Default', note: 'A note.', align: 'glyph', children: raw('<svg data-icon />') }));
    expect(html).toContain('data-catalog-example');
    expect(html).toContain('data-align="glyph"');
    expect(html).toContain('data-component="list-header"');
    expect(html).toContain('kui-catalog-example__note">A note.');
    expect(html).toContain('<svg data-icon />');
  });

  it('defaults to no inset and omits the note when absent', () => {
    const html = asHtml(CatalogExample({ label: 'Bare', children: raw('<b/>') }));
    expect(html).toContain('data-align="none"');
    expect(html).not.toContain('kui-catalog-example__note');
  });

  it('stacks examples under a labeled region', () => {
    const html = asHtml(CatalogExampleStack({ label: 'Variants', children: raw('<section/>') }));
    expect(html).toContain('data-catalog-example-stack');
    expect(html).toContain('aria-label="Variants"');
    expect(html).toContain('<section/>');
  });
});

describe('wireCatalog', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  function mountShell(html: string): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.append(root);
    return root;
  }

  it('reports sidebar selection and mirrors it into the URL', () => {
    const root = mountShell(asHtml(Catalog({ brand: { title: 'X' }, sections, active: 'button', content: raw('<b/>'), theme: 'light' })));
    const onSelect = vi.fn();
    const stop = wireCatalog(root, { onSelect, urlParam: 'component' });

    root.querySelector<HTMLElement>('[data-item-id="select"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('select');
    expect(new URL(location.href).searchParams.get('component')).toBe('select');
    stop();
  });

  it('reports collapse and theme toggles, and related-entry selection', () => {
    const root = mountShell(asHtml(Catalog({
      brand: { title: 'X' },
      sections,
      active: 'select',
      content: raw('<b/>'),
      theme: 'dark',
    })));
    const onSelect = vi.fn();
    const onToggleSidebar = vi.fn();
    const onToggleTheme = vi.fn();
    const stop = wireCatalog(root, { onSelect, onToggleSidebar, onToggleTheme });

    root.querySelector<HTMLElement>('[data-action="catalog-toggle-sidebar"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    root.querySelector<HTMLElement>('[data-action="catalog-toggle-theme"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);

    // A related-entry selection (change on the footer Select) navigates.
    const select = root.querySelector<HTMLElement>('[data-catalog-related] [data-component="select"]')!;
    (select as HTMLElement & { value: string }).value = 'button';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('button');
    stop();
  });

  it('reports the secondary-group disclosure toggle', () => {
    const root = mountShell(asHtml(Catalog({
      brand: { title: 'X' },
      sections,
      active: 'button',
      content: raw('<b/>'),
      secondarySections: { label: 'Eco', collapsible: true, expanded: false, sections: [] },
    })));
    const onSelect = vi.fn();
    const onToggleSecondary = vi.fn();
    const stop = wireCatalog(root, { onSelect, onToggleSecondary });
    root.querySelector<HTMLElement>('[data-action="catalog-toggle-secondary"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToggleSecondary).toHaveBeenCalledTimes(1);
    stop();
  });

  it('ignores a select trigger with no id and an empty related selection', () => {
    const root = mountShell(
      '<div data-catalog-related><button data-action="catalog-select">no id</button>'
      + '<select data-component="select"><option value="">none</option></select></div>',
    );
    const onSelect = vi.fn();
    const stop = wireCatalog(root, { onSelect });
    root.querySelector<HTMLElement>('[data-action="catalog-select"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const select = root.querySelector<HTMLElement>('[data-component="select"]')!;
    (select as HTMLElement & { value: string }).value = '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
    stop();
  });

  it('stops responding after disposal', () => {
    const root = mountShell(asHtml(Catalog({ brand: { title: 'X' }, sections, active: 'button', content: raw('<b/>') })));
    const onSelect = vi.fn();
    wireCatalog(root, { onSelect })();
    root.querySelector<HTMLElement>('[data-item-id="select"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
