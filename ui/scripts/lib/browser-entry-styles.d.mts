export const CSS_FREE_STYLED_SUBPATHS: Map<string, string>;
export function isCssFreeSubpath(subpath: string): boolean;

export interface BrowserEntryOptions {
  sourceRoot?: URL;
}

export function relativeValueDependencies(
  moduleName: string,
  source: string,
): string[];
export function reachableStyles(
  moduleName: string,
  options?: BrowserEntryOptions,
): Promise<string[]>;
export function browserEntrySubpaths(packageJson: {
  exports: Record<string, unknown>;
}): string[];
export function browserWrapperSource(
  moduleName: string,
  options?: BrowserEntryOptions,
): Promise<string>;
export function styledSubpathsMissingBrowser(
  packageJson: { exports: Record<string, unknown> },
  options?: BrowserEntryOptions,
): Promise<Array<{ subpath: string; styles: string[] }>>;
