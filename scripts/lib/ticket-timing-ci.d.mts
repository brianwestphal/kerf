export interface GhRun {
  databaseId?: number | string;
  headSha?: string;
  headBranch?: string;
  workflowName?: string;
  event?: string;
  status?: string;
  conclusion?: string;
  createdAt?: string;
  startedAt?: string;
  updatedAt?: string;
}

export interface CiTimingRecord {
  schema_version: 1;
  event: 'interval';
  phase: 'ci' | 'publication';
  gate: string;
  started_at: string;
  finished_at: string;
  outcome: 'passed' | 'failed' | 'interrupted';
  failure_category?: string;
  run_id: string;
}

export const GH_RUN_FIELDS: string[];
export const MAX_TICKETS_PER_RUN: number;
export function ciRecordFromRun(run: GhRun): CiTimingRecord | null;
export function planCiImports(
  runs: GhRun[],
): Array<{ record: CiTimingRecord; head_sha: string; previous_sha: string }>;
export function hasRecordedRun(
  records: Array<Record<string, unknown>>,
  runId: string,
): boolean;
export const IMPORT_OVERLAP_TOLERANCE_MS: number;
export function isAlreadyImported(
  records: Array<Record<string, unknown>>,
  record: Pick<
    CiTimingRecord,
    'phase' | 'gate' | 'started_at' | 'finished_at' | 'run_id'
  >,
  toleranceMs?: number,
): boolean;
