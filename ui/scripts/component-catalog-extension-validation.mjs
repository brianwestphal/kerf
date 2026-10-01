export function validateCatalogExtensionReferences(extension, kerfCatalog) {
  const failures = [];
  const kerfIds = new Set(kerfCatalog.entries.map(({ id }) => id));
  const extensionIds = new Set(extension.entries.map(({ id }) => id));
  const knownIds = new Set([...kerfIds, ...extensionIds]);

  for (const entry of extension.entries) {
    if (kerfIds.has(entry.id))
      failures.push(`${entry.id} duplicates a Kerf catalog id`);
    for (const dependency of entry.uses ?? []) {
      if (!knownIds.has(dependency))
        failures.push(`${entry.id} uses unknown entry ${dependency}`);
    }
  }

  return failures;
}
