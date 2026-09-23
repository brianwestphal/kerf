export type CatalogQualifiedKey = `${string}:${string}`;
export type CatalogCardinality = {
  min: number;
  max: number | 'unbounded';
};
export type CatalogDiagnostic = {
  id: `KUI-C${number}`;
  severity: 'error' | 'warning';
  when: string;
  message: string;
};
export type CatalogCssValueProp = {
  path: string;
  grammar:
    | 'length'
    | 'size'
    | 'flex'
    | 'color'
    | 'declarations'
    | 'media-query'
    | 'pixels';
  helpers: string[];
  nonStandaloneHelpers?: string[];
  shorthands: string[];
  canonicalShorthands: string[];
  exceptionalShorthands: string[];
  rawPolicy: 'forbid' | 'allow' | 'unsafe-only';
  unsafeHelper?: string;
  examples: string[];
};
export interface CatalogCompositionEntryV2 {
  key: CatalogQualifiedKey;
  package: string;
  id: string;
  name: string;
  kind: 'component' | 'composition' | 'recipe';
  purpose?: string;
  publicExports?: Array<{ name: string; subpath: string }>;
  sourceLinks?: string[];
  source: string;
  parents: { mode: 'any' | 'root' | 'listed'; entries: CatalogQualifiedKey[] };
  contexts: string[];
  zones: Array<{
    id: string;
    /** Static JSX binding when this zone is supplied by a public prop. */
    jsx?: { prop: string };
    accepts: string[];
    cardinality: CatalogCardinality;
    exclusiveWith: string[];
  }>;
  children: {
    mode: 'any' | 'none' | 'listed';
    concepts: string[];
    requiredConcepts: string[];
  };
  state: Array<{
    id: string;
    owner: 'application' | 'controlled' | 'component';
    required: boolean;
  }>;
  wiring: { required: boolean; helpers: string[]; obligations: string[] };
  responsive: {
    owner: 'application' | 'component' | 'shared' | 'not-applicable';
    behaviors: string[];
  };
  layout: {
    roles: string[];
    geometry: Record<
      'margin' | 'border' | 'padding',
      'self' | 'parent' | 'child' | 'none' | 'conditional' | 'composed'
    > & { notes?: string[] };
  };
  accessibility: { obligations: string[] };
  boundaries: {
    rootClass: string | null;
    publicClasses: string[];
    publicTokens: string[];
    publicParts?: string[];
  };
  cssValueProps?: CatalogCssValueProp[];
  diagnostics: CatalogDiagnostic[];
  provenance: { selection: string; composition: string };
}
export interface ComponentCatalogV2 {
  $schema?: string;
  schemaVersion: 2;
  package: string;
  compatibility: { v1Catalog: string; identity: 'package:id' };
  entries: CatalogCompositionEntryV2[];
}
