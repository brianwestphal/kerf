// Types for the generator module itself (KF-V5DPD1). `@kerfjs/ui/view`
// re-exports its supported names; the two helpers declared here are
// generator internals that only the package's own tests import directly.
export {
  GENERATOR_VERSION,
  generateView,
  lucideExportName,
  readViewHeader,
  viewModulePath,
} from './index.mjs';

/** Layout printer for generated expressions. */
export function printDoc(doc: unknown, indent?: number): string;

/** A component import as the generated module writes it, relative to `importFrom` when absolute. */
export function moduleSpecifier(specifier: string, importFrom?: string): string;
