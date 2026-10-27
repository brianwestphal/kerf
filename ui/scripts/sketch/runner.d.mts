export interface SketchJobStatus {
  runId: string;
  state: string;
  cleanupComplete: boolean;
  result?: unknown;
  error?: string;
  processId?: number;
  jobDirectory: string;
}

export type SketchInvoker = (
  tool: string,
  args: string[],
  options: { timeout: number; maxBuffer?: number },
) => Promise<unknown>;

export interface SketchJobOptions {
  task: string;
  parameters?: Record<string, unknown>;
  /** Keep the shared default for native jobs; override for isolated fake tests. */
  stateDirectory?: string;
  timeoutMs?: number;
  cleanupTimeoutMs?: number;
  pollMs?: number;
  signal?: AbortSignal;
  tool?: string;
  invoke?: SketchInvoker;
}

export const defaultStateDirectory: string;
export function runSketchJob(
  options: SketchJobOptions,
): Promise<SketchJobStatus>;
export function recoverSketchJob(
  options?: Pick<SketchJobOptions, 'stateDirectory' | 'tool' | 'invoke'>,
): Promise<{ state: string; jobDirectory?: string }>;
