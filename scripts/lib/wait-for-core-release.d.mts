export interface WaitForCoreReleaseOptions {
  version: string;
  isPublished: (version: string) => Promise<boolean>;
  coreRunConclusion: () => Promise<string | null>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  timeoutMs: number;
  intervalMs: number;
  log?: (message: string) => void;
}

export function waitForCoreRelease(
  options: WaitForCoreReleaseOptions,
): Promise<void>;

export interface WorkflowRunSummary {
  status: string;
  conclusion: string | null;
  created_at: string;
}

export function latestRunConclusion(
  runs: readonly WorkflowRunSummary[],
): string | null;
