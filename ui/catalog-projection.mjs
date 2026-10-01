import {
  isRepositoryPath,
  validateCatalogExtensionReferences,
} from './scripts/component-catalog-extension-validation.mjs';

const substitute = (template, entry, packageName) =>
  template.replace(/\{(id|name|kind|package)\}/g, (_, field) =>
    field === 'package' ? packageName : entry[field],
  );

/** Project catalog entries into the row shape used by a UX demo. */
export function projectCatalogEntries(entries, options = {}) {
  return entries.map((entry) => {
    const componentSource = options.componentSource?.(entry);
    const designTemplate = options.designTemplate?.(entry);
    return {
      id: entry.id,
      name: entry.name,
      category: options.category?.(entry) ?? entry.category ?? 'Application',
      kind: entry.kind,
      source: options.identity?.(entry) ?? entry.source ?? 'consumer',
      description: entry.purpose,
      ...(entry.recommendation ? { recommendation: entry.recommendation } : {}),
      uses: entry.uses ?? [],
      demoSource: options.demoSource?.(entry) ?? entry.demoSource,
      ...(componentSource ? { componentSource } : {}),
      ...(designTemplate ? { designTemplate } : {}),
      documentation: options.documentation?.(entry) ?? entry.documentation,
    };
  });
}

/** Project a validated consumer extension alongside Kerf's reference catalog. */
export function projectConsumerCatalog(extension, kerfCatalog, options = {}) {
  const failures = validateCatalogExtensionReferences(extension, kerfCatalog);
  if (failures.length) throw new Error(failures.join('\n'));
  const fill = (template, entry) =>
    template ? substitute(template, entry, extension.package) : undefined;
  const rows = projectCatalogEntries(extension.entries, {
    identity: () => 'consumer',
    category: () => options.category ?? 'Application',
    componentSource: (entry) =>
      entry.source ?? fill(options.sourceTemplate, entry),
    demoSource: (entry) =>
      entry.demoSource ??
      fill(options.demoTemplate ?? 'ux-demo/demos/{id}.tsx', entry),
    documentation: (entry) =>
      entry.documentation ?? fill(options.documentationTemplate, entry),
    designTemplate: (entry) => fill(options.designTemplate, entry),
  });
  for (const row of rows) {
    if (!isRepositoryPath(row.demoSource))
      throw new Error(`${row.id} requires a repository-relative demoSource`);
    if (row.componentSource && !isRepositoryPath(row.componentSource))
      throw new Error(`${row.id} has an invalid repository-relative source`);
    if (!row.documentation)
      throw new Error(
        `${row.id} requires documentation or documentationTemplate`,
      );
  }
  return rows;
}
