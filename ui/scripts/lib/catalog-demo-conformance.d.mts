export interface CatalogDemoDiagnostic {
  rule: string;
  route: string;
  file: string;
  line: number;
  column: number;
  message: string;
}

export interface CatalogDemoException {
  route: string;
  file: string;
  rules: string[];
  reason: string;
  reviewedIn: string;
}

export const catalogDemoConformanceRules: Readonly<{
  parseError: string;
  publicImports: string;
  localStylesheet: string;
  inlineStyle: string;
  customStyleClass: string;
  focusedHelpers: string;
  focusedMetadata: string;
  rootAttributes: string;
  privateMarkup: string;
  emptyExample: string;
  compositionSkip: string;
  shellOverlay: string;
  shellMode: string;
  exceptionInvalid: string;
  exceptionStale: string;
}>;

export function analyzeCatalogDemoSource(options: {
  route: string;
  kind: 'component' | 'composition';
  filePath: string;
  absoluteFilePath?: string;
  source: string;
  uiRoot: string;
  packageExports?: ReadonlySet<string>;
}): CatalogDemoDiagnostic[];

export function analyzeCatalogShellSource(options: {
  filePath: string;
  source: string;
}): CatalogDemoDiagnostic[];

export function validateCatalogDemoExceptionManifest(
  manifest: unknown,
): CatalogDemoDiagnostic[];

export function applyCatalogDemoExceptions(
  diagnostics: CatalogDemoDiagnostic[],
  exceptions: CatalogDemoException[],
): CatalogDemoDiagnostic[];
