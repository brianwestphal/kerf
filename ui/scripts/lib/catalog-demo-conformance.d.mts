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
  textFragmentProp: string;
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

export const recipeConformanceRules: Readonly<{
  parseError: string;
  publicImports: string;
  localStylesheet: string;
  inlineStyle: string;
  customStyleClass: string;
}>;

export function recipeClassVocabulary(catalog: {
  entries?: readonly {
    id: string;
    source?: string;
    publicClasses?: readonly string[];
  }[];
}): Set<string>;

export function analyzeRecipeSource(options: {
  route: string;
  filePath: string;
  absoluteFilePath?: string;
  source: string;
  uiRoot: string;
  packageExports?: ReadonlySet<string>;
  allowedClasses?: ReadonlySet<string>;
}): CatalogDemoDiagnostic[];

export function applyCatalogDemoExceptions(
  diagnostics: CatalogDemoDiagnostic[],
  exceptions: CatalogDemoException[],
): CatalogDemoDiagnostic[];
