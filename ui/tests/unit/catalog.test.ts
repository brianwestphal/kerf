import { describe, expect, it } from 'vitest';

import { catalog, catalogCategories, catalogEntriesUsing, catalogSections, findCatalogEntry, isCatalogId } from '../../ux-demo/catalog.js';

describe('UX catalog metadata', () => {
  it('keeps routes unique and dependency references valid', () => {
    const ids = catalog.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(catalog.every((entry) => entry.name && entry.description && entry.category && entry.kind)).toBe(true);
    expect(catalog.every((entry) => entry.uses?.every((id) => ids.includes(id)) ?? true)).toBe(true);
    expect(isCatalogId('toolbar')).toBe(true);
    expect(isCatalogId('missing')).toBe(false);
    expect(isCatalogId(null)).toBe(false);
  });

  it('groups every route once in the catalog reading order', () => {
    expect(catalogSections.map((section) => section.category)).toEqual(catalogCategories);
    const groupedIds = catalogSections.flatMap((section) => section.entries.map((entry) => entry.id));
    expect(groupedIds).toHaveLength(catalog.length);
    expect(new Set(groupedIds)).toEqual(new Set(catalog.map((entry) => entry.id)));
    expect(catalogSections.every((section) => section.entries.length > 0)).toBe(true);
  });

  it('lists every public visual component plus composition demos', () => {
    expect(catalog.filter((entry) => entry.kind === 'component').map((entry) => entry.name)).toEqual([
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
      'ResizableRegion',
      'Select',
      'StateBanner',
      'EmptyState',
      'LoadingSpinner',
    ]);
    expect(catalog.filter((entry) => entry.kind === 'composition').map((entry) => entry.id)).toEqual(['webawesome-theme', 'headers', 'menu', 'feedback']);
  });

  it('resolves both sides of component relationships', () => {
    expect(findCatalogEntry('empty-state')?.uses).toEqual(['lucide-icon', 'loading-spinner']);
    expect(findCatalogEntry('missing')).toBeUndefined();
    expect(catalogEntriesUsing('loading-spinner').map((entry) => entry.id)).toEqual(['feedback', 'empty-state']);
    expect(catalogEntriesUsing('resize')).toEqual([]);
  });
});
