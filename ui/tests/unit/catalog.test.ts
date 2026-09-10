import { describe, expect, it } from 'vitest';

import { catalog, isCatalogId } from '../../ux-demo/catalog.js';

describe('UX catalog metadata', () => {
  it('keeps routes unique and dependency references valid', () => {
    const ids = catalog.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(catalog.every((entry) => entry.name && entry.description && entry.category)).toBe(true);
    expect(isCatalogId('toolbar')).toBe(true);
    expect(isCatalogId('missing')).toBe(false);
    expect(isCatalogId(null)).toBe(false);
  });
});
