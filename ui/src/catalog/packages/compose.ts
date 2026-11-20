import type { KerfUiContent } from '../../shared/content/semantic-content.js';
import type {
  CatalogEntry,
  CatalogRelated,
  CatalogSecondaryGroup,
  CatalogSection,
} from '../types.js';

/** Local ids refer to the declaring package. Use an explicit package for an external relationship. */
export type CatalogReference = string | { package: string; id: string };
export type CatalogPreview = () => KerfUiContent;
export interface CatalogPackageEntry extends Omit<CatalogEntry, 'related'> {
  category: string;
  uses?: readonly CatalogReference[];
  loadPreview?: () => Promise<CatalogPreview>;
}
export interface CatalogPackage {
  package: string;
  label: string;
  entries: readonly CatalogPackageEntry[];
  imports?: readonly CatalogPackage[];
}

/** Stable, shareable route id, independent of import order, display labels and categories. */
export function catalogEntryId(packageName: string, id: string): string {
  if (!packageName || packageName.includes(':') || !id)
    throw new Error(
      'Catalog package and entry ids must be nonempty; package names cannot contain a colon',
    );
  return `${packageName}:${id}`;
}

export interface ComposedCatalog {
  groups: readonly (CatalogSecondaryGroup & { id: string })[];
  entries: ReadonlyMap<string, CatalogEntry & { package: string }>;
  /** Loads only the requested preview, sharing in-flight work and retrying failed loads. */
  loadPreview(id: string): Promise<CatalogPreview | undefined>;
}

/** Compose metadata eagerly and leave preview implementations behind explicit loaders. */
export function composeCatalog(root: CatalogPackage): ComposedCatalog {
  const packages = new Map<string, CatalogPackage>();
  const visiting = new Set<string>();
  function visit(manifest: CatalogPackage) {
    const name = manifest.package;
    if (!name || name.includes(':'))
      throw new Error(`Invalid catalog package: "${name}"`);
    if (visiting.has(name))
      throw new Error(
        `Catalog import cycle: ${[...visiting, name].join(' -> ')}`,
      );
    const previous = packages.get(name);
    if (previous === manifest) return;
    if (previous) throw new Error(`Conflicting catalog package: ${name}`);
    packages.set(name, manifest);
    visiting.add(name);
    for (const imported of manifest.imports ?? []) visit(imported);
    visiting.delete(name);
  }
  visit(root);

  const entries = new Map<
    string,
    CatalogEntry & { package: string; related: CatalogRelated[] }
  >();
  const groups: (CatalogSecondaryGroup & { id: string })[] = [];
  const loaders = new Map<
    string,
    NonNullable<CatalogPackageEntry['loadPreview']>
  >();
  for (const manifest of packages.values()) {
    const categories = new Map<string, CatalogEntry[]>();
    for (const {
      id: local,
      category,
      name,
      description,
      tags,
      resources,
      loadPreview,
    } of manifest.entries) {
      const id = catalogEntryId(manifest.package, local);
      if (entries.has(id)) throw new Error(`Duplicate catalog entry: ${id}`);
      const entry = {
        id,
        name,
        description,
        tags,
        resources,
        package: manifest.package,
        related: [],
      };
      entries.set(id, entry);
      if (loadPreview) loaders.set(id, loadPreview);
      const section = categories.get(category) ?? [];
      section.push(entry);
      categories.set(category, section);
    }
    const sections: CatalogSection[] = Array.from(
      categories,
      ([category, entries]) => ({ category, entries }),
    );
    groups.push({
      id: manifest.package,
      label: manifest.label,
      sections,
      collapsible: true,
      expanded: manifest === root,
    });
  }
  for (const manifest of packages.values()) {
    for (const entry of manifest.entries) {
      const source = entries.get(catalogEntryId(manifest.package, entry.id))!;
      const seen = new Set<string>();
      for (const ref of entry.uses ?? []) {
        const id =
          typeof ref === 'string'
            ? catalogEntryId(manifest.package, ref)
            : catalogEntryId(ref.package, ref.id);
        if (seen.has(id)) continue;
        seen.add(id);
        const target = entries.get(id);
        if (!target)
          throw new Error(
            `Missing catalog reference from ${source.id} to ${id}`,
          );
        source.related.push({
          id,
          name: target.name,
          description: target.package,
          group: 'Uses',
        });
        target.related.push({
          id: source.id,
          name: source.name,
          description: manifest.package,
          group: 'Used by',
        });
      }
    }
  }
  const previews = new Map<string, Promise<CatalogPreview>>();
  return {
    groups,
    entries,
    async loadPreview(id) {
      const load = loaders.get(id);
      if (!load) return undefined;
      let pending = previews.get(id);
      if (!pending) {
        pending = Promise.resolve()
          .then(load)
          .catch((error: unknown) => {
            previews.delete(id);
            throw error;
          });
        previews.set(id, pending);
      }
      return pending;
    },
  };
}
