import {
  generatedKerfCatalog,
  generatedWebAwesomeCatalog,
} from './catalog.generated.js';

export const catalogCategories = [
  'Foundation',
  'Structure',
  'Navigation',
  'Controls',
  'Feedback',
  'Recipes',
] as const;
export type KerfCatalogCategory = (typeof catalogCategories)[number];

export const webAwesomeCategories = [
  'Actions',
  'Forms',
  'Layout',
  'Navigation',
  'Feedback',
  'Media',
  'Helpers',
] as const;
export type WebAwesomeCategory = (typeof webAwesomeCategories)[number];
export type CatalogCategory = KerfCatalogCategory | WebAwesomeCategory;

export interface CatalogEntry {
  id: string;
  name: string;
  category: CatalogCategory;
  kind: 'component' | 'composition' | 'recipe';
  source: 'kerf' | 'webawesome';
  description: string;
  recommendation?:
    'supported' | 'conditional' | 'exceptional' | 'underlying' | 'avoid';
  uses?: readonly string[];
  demoSource: string;
  componentSource?: string;
  designTemplate?: string;
  documentation: string;
}

export const catalogRepositoryBlobUrl =
  'https://github.com/brianwestphal/kerf/blob/main/';

export function catalogRepositoryHref(path: string): string {
  return `${catalogRepositoryBlobUrl}${path}`;
}

export const kerfCatalog =
  generatedKerfCatalog satisfies readonly CatalogEntry[];
export const webAwesomeCatalog =
  generatedWebAwesomeCatalog satisfies readonly CatalogEntry[];
export const recipeCatalog = kerfCatalog.filter(
  (entry) => entry.kind === 'recipe',
);

export type KerfCatalogId = (typeof kerfCatalog)[number]['id'];
export type WebAwesomeCatalogId = (typeof webAwesomeCatalog)[number]['id'];

export const catalog = [
  ...kerfCatalog.filter((entry) => entry.kind !== 'recipe'),
  ...webAwesomeCatalog,
  ...recipeCatalog,
] as const satisfies readonly CatalogEntry[];
export type CatalogId = (typeof catalog)[number]['id'];

// Functional sections and their entries are authored in product-importance order.
// Within each section, list the single-component demos first and composition
// demos last; the stable sort preserves that authored importance order (with
// alphabetical source order as the tie-breaker). Recipes occupy the final section.
const sectionKindRank = (entry: CatalogEntry): number =>
  entry.kind === 'component' ? 0 : 1;
export const catalogSections = catalogCategories.map((category) => ({
  category,
  entries: kerfCatalog
    .filter((entry) => entry.category === category)
    .sort((left, right) => sectionKindRank(left) - sectionKindRank(right)),
}));

export const webAwesomeCatalogSections = webAwesomeCategories.map(
  (category) => ({
    category,
    entries: webAwesomeCatalog.filter((entry) => entry.category === category),
  }),
);

/** Popup is the one conditional low-level primitive the overlap policy encourages when useful. */
export function isDiscouragedWebAwesome(entry: CatalogEntry): boolean {
  return (
    entry.source === 'webawesome' &&
    entry.recommendation !== 'supported' &&
    entry.id !== 'wa-popup'
  );
}

export function findCatalogEntry(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}

export function catalogEntriesUsing(id: string): CatalogEntry[] {
  return catalog.filter((entry) =>
    (entry.uses as readonly string[]).includes(id),
  );
}

export function isCatalogId(value: string | null): value is CatalogId {
  return catalog.some((entry) => entry.id === value);
}
