// Pure planning for `ticket:timing import-ci`: turn `gh run list --json`
// rows into CI/publication timing records attributed to the tickets named in
// the commits each run covers. IO (gh, git, Hot Sheet) stays in the CLI.

export const GH_RUN_FIELDS = [
  'databaseId',
  'headSha',
  'headBranch',
  'workflowName',
  'event',
  'status',
  'conclusion',
  'createdAt',
  'startedAt',
  'updatedAt',
];

// A run covering more tickets than this is not a coherent push batch (a first
// push of a long history, a force-push, a rebased branch); importing it would
// recreate the attach-one-interval-to-hundreds-of-tickets backfill shape.
export const MAX_TICKETS_PER_RUN = 25;

const SHA = /^[0-9a-f]{7,64}$/;
const PUBLICATION_WORKFLOW = /pages|release|publish|deploy/i;

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

const OUTCOMES = {
  success: { outcome: 'passed' },
  neutral: { outcome: 'passed' },
  failure: { outcome: 'failed', failure_category: 'workflow_failure' },
  timed_out: { outcome: 'failed', failure_category: 'timed_out' },
  startup_failure: { outcome: 'failed', failure_category: 'startup_failure' },
  cancelled: { outcome: 'interrupted', failure_category: 'cancelled' },
};

/** The timing record for one completed run, or null when there is none. */
export function ciRecordFromRun(run) {
  if (run?.status !== 'completed') return null;
  const result = OUTCOMES[run.conclusion];
  const name = slug(String(run.workflowName ?? ''));
  const started = Date.parse(run.startedAt ?? run.createdAt);
  const finished = Date.parse(run.updatedAt);
  if (
    !result ||
    !name ||
    !Number.isFinite(started) ||
    !Number.isFinite(finished)
  )
    return null;
  if (finished < started) return null;
  return {
    schema_version: 1,
    event: 'interval',
    phase: PUBLICATION_WORKFLOW.test(run.workflowName) ? 'publication' : 'ci',
    gate: `github:${name}`,
    started_at: new Date(started).toISOString(),
    finished_at: new Date(finished).toISOString(),
    ...result,
    run_id: String(run.databaseId),
  };
}

/**
 * Pair each completed push run with the previous run of the same workflow on
 * the same branch, so its commit range is `previous_sha..head_sha`. The oldest
 * run of each group has no known predecessor and is left for a later import
 * with a wider `--limit` rather than guessed at.
 */
export function planCiImports(runs) {
  const groups = new Map();
  for (const run of runs) {
    if (run?.event !== 'push' || !SHA.test(run.headSha ?? '')) continue;
    if (!/^\d+$/.test(String(run.databaseId ?? ''))) continue;
    const key = `${run.workflowName}\u0000${run.headBranch}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  const plans = [];
  for (const group of groups.values()) {
    group.sort(
      (a, b) =>
        Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
        Number(a.databaseId) - Number(b.databaseId),
    );
    for (let index = 1; index < group.length; index += 1) {
      const record = ciRecordFromRun(group[index]);
      if (!record) continue;
      plans.push({
        record,
        head_sha: group[index].headSha,
        previous_sha: group[index - 1].headSha,
      });
    }
  }
  return plans.sort((a, b) =>
    a.record.started_at.localeCompare(b.record.started_at),
  );
}

/** Whether `records` already hold this run's interval (import idempotency). */
export function hasRecordedRun(records, runId) {
  return records.some(
    (record) => record.event === 'interval' && record.run_id === runId,
  );
}
