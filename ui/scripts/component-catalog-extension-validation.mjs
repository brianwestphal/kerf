export function validateCatalogExtensionReferences(extension, kerfCatalog) {
  const failures = [];
  const kerfIds = new Set(kerfCatalog.entries.map(({ id }) => id));
  const extensionIds = new Set(extension.entries.map(({ id }) => id));
  const knownIds = new Set([...kerfIds, ...extensionIds]);
  const seenExtensionIds = new Set();

  for (const entry of extension.entries) {
    if (seenExtensionIds.has(entry.id))
      failures.push(`${entry.id} duplicates a consumer catalog id`);
    seenExtensionIds.add(entry.id);
    if (kerfIds.has(entry.id))
      failures.push(`${entry.id} duplicates a Kerf catalog id`);
    for (const dependency of entry.uses ?? []) {
      if (!knownIds.has(dependency))
        failures.push(`${entry.id} uses unknown entry ${dependency}`);
    }
  }

  return failures;
}

const repositoryPathPattern =
  /^(?!.*(?:^|\/)\.{1,2}(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

export function isRepositoryPath(value) {
  return typeof value === 'string' && repositoryPathPattern.test(value);
}
