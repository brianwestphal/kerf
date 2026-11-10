export interface ProvisioningAttempt {
  name: string;
  args: string[];
  expectedStatus?: number;
  manifestChangeAllowed?: boolean;
  allowFailure?: boolean;
}
export const provisioningAttempts: ProvisioningAttempt[];
export function packageLocation(from: string, name: string): string | null;
export function installedGraph(site: string): {
  nodes: Array<{
    path: string;
    manifest: Record<string, unknown>;
    edges: Array<{ name: string; range: string; target: string | null }>;
  }>;
  links: Array<{ path: string; target: string }>;
};
export function inputHashes(site: string): Record<string, string | null>;
export function assertInputBoundary(
  before: Record<string, string | null>,
  after: Record<string, string | null>,
  attempt: ProvisioningAttempt,
): void;
export interface ProcessResult {
  status: number | null;
  signal: string | null;
  error: string | null;
  stdout: string;
  stderr: string;
}
export function markdownProbes(site: string): {
  entry: string;
  loader: string;
  resolutions: Array<{
    name: string;
    path: string | null;
    version: string | null;
  }>;
  native: ProcessResult;
  strict: ProcessResult;
};
export function assertMarkdownResults(probes: {
  native: ProcessResult;
  strict: ProcessResult;
}): void;
export function runPureBunProbe(
  source: string,
  evidence: string,
  bun?: string,
): Promise<unknown>;
