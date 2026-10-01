export interface CatalogEntryReference {
  id: string;
  uses?: string[];
}

export interface CatalogEntries {
  entries: CatalogEntryReference[];
}

export function validateCatalogExtensionReferences(
  extension: CatalogEntries,
  kerfCatalog: CatalogEntries,
): string[];
