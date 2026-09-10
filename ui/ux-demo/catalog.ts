export const catalogCategories = ['Structure', 'Navigation', 'Controls', 'Feedback'] as const;
export type CatalogCategory = typeof catalogCategories[number];

export interface CatalogEntry {
  id: string;
  name: string;
  category: CatalogCategory;
  description: string;
  uses?: readonly string[];
}

export const catalog = [
  { id: 'toolbar', name: 'Toolbar family', category: 'Structure', description: 'Leading, centered, and trailing toolbar composition.' },
  { id: 'menu', name: 'Menu family', category: 'Navigation', description: 'Navigation rows and section headers with explicit state.' },
  { id: 'tabs', name: 'App tabs', category: 'Navigation', description: 'Roving-tabindex-ready tabs with optional close affordances.' },
  { id: 'headers', name: 'Headers and values', category: 'Structure', description: 'Page, dialog, and definition-list hierarchy.' },
  { id: 'resize', name: 'Resizable region', category: 'Controls', description: 'Pointer and keyboard-operable split region.' },
  { id: 'select', name: 'Select', category: 'Controls', description: 'Web Awesome select adapter with grouped choices.' },
  { id: 'feedback', name: 'Feedback states', category: 'Feedback', description: 'Banners, empty states, and labeled progress.', uses: ['loading-spinner'] },
] as const satisfies readonly CatalogEntry[];

export type CatalogId = typeof catalog[number]['id'];

export const catalogSections = catalogCategories.map((category) => ({
  category,
  entries: catalog.filter((entry) => entry.category === category),
}));

export function isCatalogId(value: string | null): value is CatalogId {
  return catalog.some((entry) => entry.id === value);
}
