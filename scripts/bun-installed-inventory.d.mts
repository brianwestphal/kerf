export interface InstalledPackage {
  path: string;
  realPath: string;
  name: string;
  version: string;
  linked: boolean;
}
export interface RuntimePackage {
  name: string;
  version: string;
  path: string;
  realPath: string;
}
export function installedInventory(root: string): {
  packages: InstalledPackage[];
  cycles: string[];
};
export function runtimePackage(
  root: string,
  name: string,
): RuntimePackage | undefined;
export function meets(version: string, wanted: string): boolean;
export function parseExpectation(spec: string): {
  name: string;
  wanted: string;
};
export function recordInventory(
  root: string,
  expectations?: readonly string[],
): {
  kind: 'physical-installed-graph';
  note: string;
  node: string;
  runtime: (RuntimePackage & { expected: string })[];
  cycles: string[];
  packages: InstalledPackage[];
};
