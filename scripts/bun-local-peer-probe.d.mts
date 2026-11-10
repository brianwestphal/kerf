export interface FileEvidence {
  exists: boolean;
  sha256?: string;
  bytes?: string;
}
export interface PeerSnapshot {
  path: string;
  exists: boolean;
  realpath: string | null;
  symlink: boolean | null;
  manifest: FileEvidence;
  declaration: FileEvidence;
}
export function fileEvidence(path: string): FileEvidence;
export function peerEvidence(
  root: string,
  consumer?: string,
  name?: string,
): {
  source: PeerSnapshot;
  installed: PeerSnapshot;
  ancestor: PeerSnapshot;
};
export function resolvePeerTypes(
  root: string,
  typescript: typeof import('typescript'),
  consumer?: string,
  name?: string,
): {
  compiler: string;
  path: string;
  packageId: unknown;
  declaration: FileEvidence;
} | null;
export function minimalPeerCase(
  root: string,
  installer: string,
  binary: string,
  env: Record<string, string | undefined>,
  initialDist?: boolean,
  protocol?: string,
): unknown;
export function runLocalPeerProbe(
  source: string,
  evidence: string,
  bun?: string,
): Promise<unknown>;
