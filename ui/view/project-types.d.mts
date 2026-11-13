import type {
  ViewCatalog,
  ViewDiagnostic,
  ViewDocument,
  ViewType,
} from './index.mjs';

export type CheckedProjectType = ViewType & {
  typescript: NonNullable<ViewType['typescript']>;
};
export interface ProjectTypeAnalysis {
  type?: CheckedProjectType;
  diagnostics: { message: string; start?: number; length?: number }[];
  suggestions: {
    name: string;
    source?: string;
    text: string;
    cursor: number;
  }[];
}
export interface NodeProjectTypeService {
  analyze(request: {
    source: string;
    text: string;
    cursor?: number;
    autoImport?: boolean;
    /** Compute completion suggestions (default true); false skips the costliest step. */
    suggest?: boolean;
    declared?: ViewType;
    catalog?: ViewCatalog;
  }): ProjectTypeAnalysis;
  validateDocument(
    document: ViewDocument,
    catalog: ViewCatalog,
    source: string,
    options?: { resolveView?: (src: string, path: string) => unknown },
  ): { document: ViewDocument; diagnostics: ViewDiagnostic[] };
  dispose(): void;
}
/** Nearest tsconfig root, or the document folder when no config exists. */
export function projectTypeRoot(path: string): string;
/** Node-only service. No compiler code enters the browser entry. */
export function createProjectTypeService(root: string): NodeProjectTypeService;
