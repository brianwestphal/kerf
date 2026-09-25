# Ticket phase timing

Created-to-completed wall time is not implementation time. Repository work can
wait in the queue, move through several verification attempts, spend time in a
push hook or CI, and then wait for an external package or site to propagate.
The `ticket:timing` command writes small structured activity notes to the Hot
Sheet ticket so those phases remain distinguishable without retaining command
output, machine paths, or secrets.

## Phase model

| Phase                | Meaning                                                     |
| -------------------- | ----------------------------------------------------------- |
| `active`             | Claimed implementation or review work                       |
| `local_verification` | A named local test, lint, type, build, or browser gate      |
| `push_hook`          | The comprehensive local gate invoked by `.husky/pre-push`   |
| `ci`                 | A remote workflow or job                                    |
| `publication`        | Registry, release, Pages, CDN, or other propagation waiting |

Queue delay is derived from the ticket's `created_at` timestamp and the first
recorded `active` interval.

## Active time: claim and release through the wrapper

Hot Sheet leases are owned by the external `hotsheet-cli`, which retains no
historical lease intervals and exposes no hook kerf could attach to, so kerf
cannot observe a bare `hotsheet-cli claim` or `release`. Instead, claim and
release **through** `ticket:timing`, which performs the Hot Sheet call and
records the active session around it:

```bash
npm run ticket:timing -- claim KF-ABC123 --worker agent-1   # hotsheet-cli claim + active start
# Work on the ticket.
npm run ticket:timing -- release KF-ABC123 --worker agent-1 # finish every open active session + hotsheet-cli release
```

`claim` runs `hotsheet-cli claim` first and starts timing only if the claim
succeeded (`--gate` defaults to `implementation`). `release` finishes every
open `active` session on the ticket (`--outcome` defaults to `passed`), warns if
there was none, then runs `hotsheet-cli release`. A worker that claims with the
bare CLI records no active time; the lower-level `start`/`finish` pair remains
for sessions that are not tied to a lease:

```bash
session=$(npm run --silent ticket:timing -- start KF-ABC123 --phase active --gate implementation)
npm run ticket:timing -- finish KF-ABC123 --session "$session"
```

## Push hook and local gates

The pre-push hook derives ticket slugs from commits that are actually outgoing
to the named remote and records `root:check` automatically. A tag-only push of
an already-pushed commit therefore records no historical subjects. Set
`KERF_TICKET_TIMING_TICKETS` to a comma- or space-separated list when a push
must be attributed to explicit tickets despite having no outgoing commit (for
example, `KERF_TICKET_TIMING_TICKETS=KF-ABC123 git push origin <tag>`). Time a
local gate while preserving its exit status with `run`:

```bash
npm run ticket:timing -- run KF-ABC123 \
  --phase local_verification --gate ui:check-change -- \
  npm --prefix ui run check:change
```

Every attempt is recorded, not only passes: a non-zero exit records `failed`
with `failure_category: "command_exit"`, and a gate stopped by Ctrl-C or a
termination signal records `interrupted` with `failure_category: "signal"`.
The wrapper forwards `SIGINT`/`SIGTERM`/`SIGHUP` to the gate instead of dying
first, so the note is still written; an interrupted wrapper exits 130 on
`SIGINT` (1 for other signals).

### Per-step check durations

`npm run check` runs `check:core` through `scripts/run-check-steps.mjs`, which
splits the `&&` chain in `package.json` (still its single source of truth),
runs the segments in order with the same stop-at-first-failure semantics, and
prints a step-duration table at the end. The chain may only join commands with
`&&`; the runner refuses `||`, `;`, pipes, or background `&`, which a sequential
split would change. When `KERF_CHECK_STEP_LOG` names a file, the runner writes
each step's low-cardinality identifier (`lint`, `test`, `build`,
`vitest:dist`, `tsc:jsx-typing`, …), duration, and outcome there after every
step. `pre-push` and `run` set it automatically, so their interval records gain
an ordered `"steps": { "<step>": <ms>, … }` map and, on failure, the
`"failed_step"` — including a partial map for a chain that failed or was
interrupted part-way. Only identifiers and milliseconds are stored.

## CI and publication

CI and publication systems cannot write to the computer-local ticket store, so
kerf pulls their timing instead. `import-ci` reads recent workflow runs with
`gh run list --json …` and records one interval per run on every ticket named
in the commits that run covered:

```bash
npm run ticket:timing -- import-ci              # the last 30 runs
npm run ticket:timing -- import-ci --limit 100 --branch main --dry-run
```

- Only completed `push` runs are imported. Workflows named like
  `pages`/`release`/`publish`/`deploy` record `publication`; all others record
  `ci`. The gate is `github:<workflow-slug>`.
- A run's commit range is `previous..head`, where `previous` is the head commit
  of the preceding run of the same workflow on the same branch. The oldest run
  of each group in the fetched window has no known predecessor and is skipped
  (widen `--limit` to include it). Runs whose commits are not available locally
  are skipped with a fetch-and-retry warning.
- A range naming more than 25 tickets is not a coherent push batch (a first
  push of a long history, a force-push) and is skipped rather than recreating
  the fan-out shape described under "Backfill" below.
- `success`/`neutral` record `passed`; `failure`/`timed_out`/`startup_failure`
  record `failed` with that category (`failure` becomes `workflow_failure`);
  `cancelled` records `interrupted`. Skipped or still-running runs are ignored.
- Each record carries the run's numeric `run_id`, and the import skips any
  ticket that already holds that run id, so repeated imports are idempotent.
  (A run recorded by hand with `record`, which carries no `run_id`, is not
  recognized and would be imported once more.)

`gh` must be authenticated for the repository; `KERF_GH_CLI` overrides the
binary. For an interval no workflow reports — a registry or CDN propagation
wait — record its ISO timestamps and a stable gate name by hand. Failures may
include a low-cardinality category; raw output and paths are deliberately
unsupported.

```bash
npm run ticket:timing -- record KF-ABC123 \
  --phase ci --gate github:ci \
  --started-at 2026-09-23T10:00:00Z \
  --finished-at 2026-09-23T10:04:30Z --outcome passed

npm run ticket:timing -- record KF-ABC123 \
  --phase publication --gate npm:propagation \
  --started-at 2026-09-23T10:05:00Z \
  --finished-at 2026-09-23T10:07:00Z --outcome failed \
  --failure-category registry_timeout
```

## Summaries

Use `npm run ticket:timing -- summary KF-ABC123` for a process-review summary,
or add `--json` for structured output. The summary totals duration and attempts
per phase, counts repeated failure categories, and surfaces unfinished or
out-of-order sessions instead of silently folding them into active time.

### Across tickets

`npm run ticket:timing -- summary --all` aggregates every ticket in the store
per phase and gate: run count, median, p90, and maximum duration, outcome counts
(`passed`/`failed`/`interrupted`/`skipped`), and the median and p90 of every
recorded check step. It also reports each phase's per-ticket total (median and
p90 across the tickets that have that phase). Options:

- `--since <iso>` keeps only intervals that started at or after the time, for
  before/after comparisons of the push gate.
- `--store <dir>` names the store directory (the one holding `tickets/`).
  Otherwise the gitignored `.hotsheet2/store` pointer is read from the current
  checkout, then from the main checkout (linked worktrees share its store).
  Ticket files are only read, never written.
- `--json` emits the structured result.

Intervals are deduplicated by identity before any statistic: one push attached
to every ticket in its batch is one `root:check` sample, not one per ticket.
Identity is phase, gate, start, and finish for interval records, and the
session id for start/finish pairs.

### Backfill

The first push after the pre-push hook started recording (2026-09-23T11:33Z)
treated a long stretch of already-published history as outgoing and attached
one ~55 s `root:check` interval to 374 historical tickets. That single push was
374 of the 424 `push_hook` records at the time — noise that swamped every
per-ticket figure. The summary detects the shape instead of rewriting stored
notes: an interval whose identity is attached to **more than 25 tickets** (the
same bound `import-ci` uses for a coherent batch; `--backfill-threshold <n>`
overrides it) is reported as backfill with its ticket count and excluded from
every statistic. `--include-backfill` keeps it, still counted once. The legit
batches seen so far attach one push to at most 10 tickets.

## Skipping a repeated check

Agents commonly run `npm run check` by hand and then push, which used to run the
identical gate a second time inside `.husky/pre-push`. The gate now remembers a
local pass and the hook reuses it only when that is provably the same
verification:

1. `npm run check` runs the guidance-integrity wrapper with `--record-pass`.
   Before the chain starts it deletes any earlier record, so a failed, partial,
   or interrupted run can never leave an older verdict standing. On exit status
   0 with unchanged Hot Sheet guidance, it writes `{ tree, node, passed_at }` to
   `kerf/check-pass.json` inside the repository's git directory (the path
   `git rev-parse --git-path` resolves, which is per worktree), so it is local,
   untracked, and never shared — but only when the
   worktree was clean (no tracked changes and no untracked, non-ignored files)
   both when the run began and when it ended, with the same `HEAD` tree.
2. The hook runs `ticket-timing.mjs pre-push --skip-if-verified`. It skips the
   gate only when every one of these holds: `KERF_FORCE_CHECK` is unset (or
   `0`); a record exists; the worktree is clean; `HEAD`'s tree equals the
   recorded tree; the Node.js version equals the recorded one; and every pushed
   ref resolves to that same tree. Any other state — including a push of a tag
   or branch other than the checked-out commit, a deletion-only push, or an
   unreadable record — runs the gate exactly as before.

Because every Hot Sheet guidance file the integrity guard snapshots is tracked,
a matching tree plus a clean worktree also proves the guidance is byte-for-byte
what the passing run guarded; the guard itself still wraps every run that does
execute. A skip prints why and how to force the gate, and records a
`push_hook`/`root:check` interval with `"outcome":"skipped"` and
`"skip_reason":"tree_already_verified"`. Summaries count skips separately: they
are neither attempts nor failures, and their near-zero duration never dilutes
the gate's timing. Force the full gate for one push with
`KERF_FORCE_CHECK=1 git push`.

## Record format

The note schema is versioned as `KERF_TICKET_TIMING_V1`. Gate and failure names
accept only short lowercase identifiers; command output is never stored. A
telemetry write failure warns but does not block an otherwise valid push.
