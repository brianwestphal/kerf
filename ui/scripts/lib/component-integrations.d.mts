export interface CatalogComponentIntegration {
  id: string;
  name: string;
  module: string;
  specifier: string;
  browserCondition: boolean;
  cssSpecifier?: string;
  publicExports: string[];
  catalogRoute?: string;
}

export interface ComponentIntegrationSurfaces {
  packageExports: Record<string, unknown>;
  tsupEntries: Set<string>;
  sourceModules: Set<string>;
  styleModules: Set<string>;
  barrelExports: Set<string>;
  styleImports: Set<string>;
  demoIds: Set<string>;
  demoModules: Set<string>;
  signatureSpecifiers: Set<string>;
}

export interface ComponentIntegrationFailure {
  surface: string;
  expected: unknown;
  actual: unknown;
}

export function deriveComponentIntegrations(catalog: {
  entries: Array<Record<string, unknown>>;
}): CatalogComponentIntegration[];
export function validateComponentIntegrations(
  integrations: CatalogComponentIntegration[],
  surfaces: ComponentIntegrationSurfaces,
): ComponentIntegrationFailure[];
export function parseTsupEntries(source: string): Set<string>;
export function parseBarrelExports(source: string): Set<string>;
export function parseStyleImports(source: string): Set<string>;
export function parseDemoIds(source: string): Set<string>;
export function parseSignatureSpecifiers(source: string): Set<string>;
