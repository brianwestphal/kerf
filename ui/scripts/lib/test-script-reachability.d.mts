export interface TestSelectorOptions {
  playwrightTestDir?: string;
}

export function isTestFile(path: string): boolean;
export function reachableScripts(
  scripts: Record<string, string>,
  roots: string[],
): Set<string>;
export function testSelectors(
  command: string,
  options?: TestSelectorOptions,
): string[];
export function unreachableTestFiles(
  files: string[],
  scripts: Record<string, string>,
  roots: string[],
  options?: TestSelectorOptions,
): string[];
