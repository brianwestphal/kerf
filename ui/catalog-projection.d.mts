export interface CatalogProjectionRow {
  id: string;
  name: string;
  category: string;
  kind: string;
  source: string;
  description: string;
  recommendation?: string;
  uses: readonly string[];
  demoSource: string;
  componentSource?: string;
  designTemplate?: string;
  documentation?: string;
}

export interface CatalogProjectionEntry {
  id: string;
  name: string;
  kind: string;
  purpose: string;
  category?: string;
  source?: string;
  demoSource?: string;
  documentation?: string;
  recommendation?: string;
  uses?: string[];
}

export interface CatalogProjectionOptions {
  identity?: (entry: CatalogProjectionEntry) => string;
  category?: (entry: CatalogProjectionEntry) => string;
  componentSource?: (entry: CatalogProjectionEntry) => string | undefined;
  demoSource?: (entry: CatalogProjectionEntry) => string | undefined;
  documentation?: (entry: CatalogProjectionEntry) => string | undefined;
  designTemplate?: (entry: CatalogProjectionEntry) => string | undefined;
}

export interface ConsumerProjectionOptions {
  category?: string;
  sourceTemplate?: string;
  demoTemplate?: string;
  documentationTemplate?: string;
  designTemplate?: string;
}

export function projectCatalogEntries(
  entries: readonly CatalogProjectionEntry[],
  options?: CatalogProjectionOptions,
): CatalogProjectionRow[];

export function projectConsumerCatalog(
  extension: { package: string; entries: CatalogProjectionEntry[] },
  kerfCatalog: { entries: { id: string }[] },
  options?: ConsumerProjectionOptions,
): CatalogProjectionRow[];
