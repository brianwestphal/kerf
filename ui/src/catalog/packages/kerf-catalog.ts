import { catalogResources } from '../resources/catalog-resources.js';
import {
  generatedKerfCatalog,
  generatedWebAwesomeCatalog,
} from './catalog.generated.js';
import type { CatalogPackage, CatalogPackageEntry } from './compose.js';

const kerf = '@kerfjs/ui';
const webAwesome = '@awesome.me/webawesome';
const donorIds = new Set<string>(
  generatedWebAwesomeCatalog.map(({ id }) => id),
);
const target = (path: string) => ({
  href: 'https://github.com/brianwestphal/kerf/blob/main/' + path,
  detail: path,
});

type Row = (
  typeof generatedKerfCatalog | typeof generatedWebAwesomeCatalog
)[number];
function manifestEntry(row: Row): CatalogPackageEntry {
  const donor = row.source === 'webawesome';
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    tags:
      donor && row.recommendation !== 'supported'
        ? ['Discouraged']
        : row.kind === 'composition'
          ? ['Composition']
          : undefined,
    uses: row.uses.map((id) => ({
      package: donorIds.has(id) ? webAwesome : kerf,
      id,
    })),
    resources: catalogResources({
      demoSource: target(row.demoSource),
      guidance: target(row.documentation),
      componentSource:
        'componentSource' in row ? target(row.componentSource) : undefined,
      designTemplate:
        'designTemplate' in row ? target(row.designTemplate) : undefined,
      guidanceKind: donor ? 'integrationGuidance' : 'guidance',
    }),
  };
}

/** The shipped Kerf UI catalog, including its curated Web Awesome integration catalog. */
export const kerfCatalogPackage: CatalogPackage = {
  package: kerf,
  label: 'Kerf UI',
  entries: generatedKerfCatalog.map(manifestEntry),
  imports: [
    {
      package: webAwesome,
      label: 'Web Awesome',
      entries: generatedWebAwesomeCatalog.map(manifestEntry),
    },
  ],
};
