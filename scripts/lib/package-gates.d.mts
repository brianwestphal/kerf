export interface PackageGate {
  name: string;
  dir: string;
  args: string[];
  triggers: string[];
}

export interface CiRun {
  status?: string;
  conclusion?: string;
  headSha?: string;
  url?: string;
}

export const PACKAGE_GATES: PackageGate[];

export function selectPackageGates(
  changedPaths: readonly string[] | null,
  gates?: readonly PackageGate[],
): PackageGate[];

export function ciStatusWarning(runs: readonly CiRun[]): string | null;
