export function parseArguments(argv: readonly string[]): {
  command: 'generate' | 'check' | 'diff';
  documents: string[];
  options: {
    target: 'ts' | 'js';
    declarationsOnly: boolean;
    props: string[];
    composition: string[];
    /** Discover catalogs from .kerf-ui-profile.json (default true). */
    profile: boolean;
  };
};
export function run(argv: readonly string[]): { code: number; output: string };
/** Prop and composition catalog paths a document's profile layers declare (beyond @kerfjs/ui). */
export function profileCatalogPaths(documentPath: string): {
  props: string[];
  composition: string[];
};
