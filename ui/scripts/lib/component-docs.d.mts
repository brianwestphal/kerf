export const COMPONENT_DOCS_DIR: string;
export const COMPONENT_DOCS_INDEX: string;

export function headingSlug(heading: string): string;

export function signatureModules(markdown: string): Set<string>;

export function renderComponentDocs(input: {
  catalog: { package: string; entries: unknown[] };
  composition: { entries: unknown[] };
  publicApiSignatures: string;
}): Promise<Map<string, string>>;

export function diffComponentDocs(
  expected: Map<string, string>,
  current: Map<string, string>,
): string[];
