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
recorded `active` interval. Hot Sheet does not yet retain historical lease
intervals, so workers start and finish active timing explicitly:

```bash
session=$(npm run --silent ticket:timing -- start KF-ABC123 --phase active --gate implementation)
# Work on the ticket.
npm run ticket:timing -- finish KF-ABC123 --session "$session"
```

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

CI and publication systems cannot write to the computer-local ticket store.
After observing one of those intervals, record its ISO timestamps and a stable
gate name. Failures may include a low-cardinality category; raw output and
paths are deliberately unsupported.

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

Use `npm run ticket:timing -- summary KF-ABC123` for a process-review summary,
or add `--json` for structured output. The summary totals duration and attempts
per phase, counts repeated failure categories, and surfaces unfinished or
out-of-order sessions instead of silently folding them into active time.

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
