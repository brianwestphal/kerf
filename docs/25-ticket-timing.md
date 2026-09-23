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

The pre-push hook derives ticket slugs from outgoing commit subjects and
records `root:check` automatically. Time a local gate while preserving its
exit status with `run`:

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

The note schema is versioned as `KERF_TICKET_TIMING_V1`. Gate and failure names
accept only short lowercase identifiers; command output is never stored. A
telemetry write failure warns but does not block an otherwise valid push.
