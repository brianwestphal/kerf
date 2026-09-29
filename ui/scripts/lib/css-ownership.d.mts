export type OwnershipRule =
  | 'foreign-class'
  | 'owned-wa-tag'
  | 'foreign-variable'
  | 'context-on-child'
  | 'hook-class';

export interface OwnershipFinding {
  rule: OwnershipRule;
  line: number;
  selector: string;
  reason: string;
  property?: string;
}

export interface OwnershipException {
  file: string;
  rule: OwnershipRule;
  selector?: string;
  property?: string;
  reason: string;
}

export interface SourceFile {
  filename: string;
  source: string;
}

export interface OwnershipModel {
  sheets: Map<string, unknown>;
  namespaceOwners: Map<string, string>;
  dataComponentOwners: Map<string, string>;
  tagOwners: Map<string, Array<{ filename: string; host: boolean }>>;
}

export const packageClassRoots: Map<string, string[]>;
export const tokenNamespaceAliases: Map<string, string[]>;
export const ownershipExceptions: OwnershipException[];

export function ownsClass(rootClass: string, candidate: string): boolean;
export function complexSelectors(selectorList: string): string[][];
export function kuiClasses(selector: string): string[];
export function withoutRelationalArguments(compound: string): string;
export function subjectTypes(compound: string): string[] | null;

export function buildOwnershipModel(input: {
  stylesheets: SourceFile[];
  sources: SourceFile[];
}): OwnershipModel;

export function checkPackageStylesheet(
  model: OwnershipModel,
  filename: string,
  source: string,
): OwnershipFinding[];

export function applyExceptions(
  filename: string,
  findings: OwnershipFinding[],
  exceptions?: OwnershipException[],
): { violations: OwnershipFinding[]; stale: OwnershipException[] };
