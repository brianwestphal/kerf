import { generatedKerfCatalog, generatedWebAwesomeCatalog } from './catalog.generated.js';

export const catalogCategories = ['Foundation', 'Structure', 'Navigation', 'Controls', 'Feedback'] as const;
export type KerfCatalogCategory = typeof catalogCategories[number];

export const webAwesomeCategories = ['Actions', 'Forms', 'Layout', 'Navigation', 'Feedback', 'Media', 'Helpers'] as const;
export type WebAwesomeCategory = typeof webAwesomeCategories[number];
export type CatalogCategory = KerfCatalogCategory | WebAwesomeCategory;

export interface CatalogEntry {
  id: string;
  name: string;
  category: CatalogCategory;
  kind: 'component' | 'composition';
  source: 'kerf' | 'webawesome';
  description: string;
  uses?: readonly string[];
}

export const kerfCatalog = generatedKerfCatalog satisfies readonly CatalogEntry[];
export const webAwesomeCatalog = generatedWebAwesomeCatalog satisfies readonly CatalogEntry[];

export type KerfCatalogId = typeof kerfCatalog[number]['id'];
export type WebAwesomeCatalogId = typeof webAwesomeCatalog[number]['id'];

export const catalog = [...kerfCatalog, ...webAwesomeCatalog] as const satisfies readonly CatalogEntry[];
export type CatalogId = typeof catalog[number]['id'];

export const catalogSections = catalogCategories.map((category) => ({
  category,
  entries: kerfCatalog.filter((entry) => entry.category === category),
}));

export const webAwesomeCatalogSections = webAwesomeCategories.map((category) => ({
  category,
  entries: webAwesomeCatalog.filter((entry) => entry.category === category),
}));

export function findCatalogEntry(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}

export function catalogEntriesUsing(id: string): CatalogEntry[] {
  return catalog.filter((entry) => (entry.uses as readonly string[]).includes(id));
}

export function isCatalogId(value: string | null): value is CatalogId {
  return catalog.some((entry) => entry.id === value);
}
