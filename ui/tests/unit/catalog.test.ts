import { describe, expect, it } from 'vitest';

import { catalog, catalogCategories, catalogSections, isCatalogId } from '../../ux-demo/catalog.js';

describe('UX catalog metadata', () => {
  it('keeps routes unique and dependency references valid', () => {
    const ids = catalog.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(catalog.every((entry) => entry.name && entry.description && entry.category)).toBe(true);
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
});
