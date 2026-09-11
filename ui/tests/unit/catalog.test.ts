import { describe, expect, it } from 'vitest';

import { catalog, catalogCategories, catalogEntriesUsing, catalogSections, findCatalogEntry, isCatalogId, kerfCatalog, webAwesomeCatalog, webAwesomeCatalogSections, webAwesomeCategories } from '../../ux-demo/catalog.js';

describe('UX catalog metadata', () => {
  it('keeps routes unique and dependency references valid', () => {
    const ids = catalog.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(catalog.every((entry) => entry.name && entry.description && entry.category && entry.kind && entry.source)).toBe(true);
    expect(catalog.every((entry) => entry.uses?.every((id) => ids.includes(id)) ?? true)).toBe(true);
    expect(isCatalogId('toolbar')).toBe(true);
    expect(isCatalogId('missing')).toBe(false);
    expect(isCatalogId(null)).toBe(false);
  });

  it('groups Kerf and Web Awesome routes once in their respective reading orders', () => {
    expect(catalogSections.map((section) => section.category)).toEqual(catalogCategories);
    expect(webAwesomeCatalogSections.map((section) => section.category)).toEqual(webAwesomeCategories);
    const kerfIds = catalogSections.flatMap((section) => section.entries.map((entry) => entry.id));
    const webAwesomeIds = webAwesomeCatalogSections.flatMap((section) => section.entries.map((entry) => entry.id));
    expect(kerfIds).toHaveLength(kerfCatalog.length);
    expect(webAwesomeIds).toHaveLength(webAwesomeCatalog.length);
    expect(new Set([...kerfIds, ...webAwesomeIds])).toEqual(new Set(catalog.map((entry) => entry.id)));
    expect(catalogSections.every((section) => section.entries.length > 0)).toBe(true);
    expect(webAwesomeCatalogSections.every((section) => section.entries.length > 0)).toBe(true);
  });

  it('lists every public visual component plus composition demos', () => {
    expect(kerfCatalog.filter((entry) => entry.kind === 'component').map((entry) => entry.name)).toEqual([
      'LucideIcon',
      'Toolbar',
      'ToolbarControlGroup',
      'ToolbarText',
      'PageHeader',
      'DialogHeader',
      'ValueTable',
      'MenuHeader',
      'MenuItem',
      'AppTab',
      'TabBar',
      'SegmentedControl',
      'ResizableRegion',
      'Select',
      'StateBanner',
      'EmptyState',
      'LoadingSpinner',
    ]);
    expect(kerfCatalog.filter((entry) => entry.kind === 'composition').map((entry) => entry.id)).toEqual(['webawesome-theme', 'headers', 'menu', 'feedback']);
    expect(webAwesomeCatalog).toHaveLength(70);
    expect(webAwesomeCatalog.every((entry) => entry.source === 'webawesome' && entry.kind === 'component')).toBe(true);
    expect(webAwesomeCatalog.map((entry) => entry.id)).toContain('wa-button');
    expect(webAwesomeCatalog.map((entry) => entry.id)).toContain('wa-resize-observer');
  });

  it('resolves both sides of component relationships', () => {
    expect(findCatalogEntry('empty-state')?.uses).toEqual(['lucide-icon', 'loading-spinner']);
    expect(findCatalogEntry('toolbar-control-group')?.uses).toEqual(['lucide-icon', 'segmented-control']);
    expect(findCatalogEntry('missing')).toBeUndefined();
    expect(catalogEntriesUsing('loading-spinner').map((entry) => entry.id)).toEqual(['feedback', 'empty-state']);
    expect(catalogEntriesUsing('resize')).toEqual([]);
    expect(findCatalogEntry('wa-select')?.uses).toEqual(['wa-icon', 'wa-popup', 'wa-tag', 'wa-option']);
    expect(catalogEntriesUsing('wa-select').map((entry) => entry.id)).toEqual(['webawesome-theme', 'select']);
    expect(catalogEntriesUsing('wa-carousel-item').map((entry) => entry.id)).toEqual(['webawesome-theme', 'wa-carousel']);
    expect(catalogEntriesUsing('segmented-control').map((entry) => entry.id)).toEqual(['toolbar-control-group']);
  });
});
