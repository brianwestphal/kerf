export interface Execution {
  status: number | null;
  signal: string | null;
  error: string | null;
  stderr: string;
}
export function bundledManifestEvidence(folder: string): {
  manifest: Record<string, unknown>;
  sha256: string;
  bundles: {
    name: string;
    declared: string | null;
    present: boolean;
    manifest: Record<string, unknown> | null;
    sha256: string | null;
  }[];
};
export function assertResolutionOutcome(
  execution: Execution,
  bundled404: boolean,
): void;
export function assertCanonicalInputs(
  before: Record<string, string>,
  after: Record<string, string>,
): void;
export function runBundledResolutionProbe(
  source: string,
  evidence: string,
  bun?: string,
): Promise<unknown>;
