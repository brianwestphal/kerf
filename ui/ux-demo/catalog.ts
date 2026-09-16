import { generatedKerfCatalog, generatedWebAwesomeCatalog } from './catalog.generated.js';

export const catalogCategories = ['Foundation', 'Structure', 'Navigation', 'Controls', 'Feedback', 'Recipes'] as const;
export type KerfCatalogCategory = typeof catalogCategories[number];

export const webAwesomeCategories = ['Actions', 'Forms', 'Layout', 'Navigation', 'Feedback', 'Media', 'Helpers'] as const;
export type WebAwesomeCategory = typeof webAwesomeCategories[number];
export type CatalogCategory = KerfCatalogCategory | WebAwesomeCategory;

export interface CatalogEntry {
  id: string;
  name: string;
  category: CatalogCategory;
  kind: 'component' | 'composition' | 'recipe';
  source: 'kerf' | 'webawesome';
  description: string;
  uses?: readonly string[];
  demoSource: string;
  componentSource?: string;
  documentation: string;
}

export const catalogRepositoryBlobUrl = 'https://github.com/brianwestphal/kerf/blob/main/';

export function catalogRepositoryHref(path: string): string {
  return `${catalogRepositoryBlobUrl}${path}`;
}

export const kerfCatalog = generatedKerfCatalog satisfies readonly CatalogEntry[];
export const webAwesomeCatalog = generatedWebAwesomeCatalog satisfies readonly CatalogEntry[];
export const recipeCatalog = kerfCatalog.filter((entry) => entry.kind === 'recipe');

export type KerfCatalogId = typeof kerfCatalog[number]['id'];
export type WebAwesomeCatalogId = typeof webAwesomeCatalog[number]['id'];

export const catalog = [...kerfCatalog.filter((entry) => entry.kind !== 'recipe'), ...webAwesomeCatalog, ...recipeCatalog] as const satisfies readonly CatalogEntry[];
export type CatalogId = typeof catalog[number]['id'];

// Within each sidebar section, list the single-component demos first and the
// composition demos last — components are the building blocks, compositions show
// how they combine (KF-0M719X). Stable so each kind keeps its authored order.
const sectionKindRank = (entry: CatalogEntry): number => (entry.kind === 'component' ? 0 : 1);
export const catalogSections = catalogCategories.map((category) => ({
  category,
  entries: kerfCatalog
    .filter((entry) => entry.category === category)
    .sort((left, right) => sectionKindRank(left) - sectionKindRank(right)),
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
