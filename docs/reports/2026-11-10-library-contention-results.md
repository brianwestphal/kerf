# Same-runner Library results and measurement boundary (KF-1XBJDT)

[Diagnostic run 42804701776](https://github.com/brianwestphal/kerf/actions/runs/42804701776) completed all twelve predeclared cells. Every test passed, all timing/row/identity evidence is complete, and every measured three-worker click overlaps actual competing Library tests. The same-VM comparison demonstrates workload sensitivity with tracing on and off. It does **not** reproduce or fully explain the canonical WebKit maxima of 1250 ms at cc06 or 1001 ms in the following cohort.

Candidate source is exactly `cc06dcc779c596f0bd1e012adc91504886275bb8`; workflow/controller source is `55952e2434d4cf564a6de6b2838142e77922208a`. Every VM uses Node 22.23.4, npm 10.9.9, Playwright 1.64.1 and four available CPUs. Chromium uses AMD EPYC 7763; Firefox and WebKit each use a separate AMD EPYC 9V45 VM. Comparisons below are within one engine's VM, not between engines or previous hosted cohorts.

| Engine   | Workers | Trace | Task maximum | Visible-frame maximum | Outcome / overlap     |
| -------- | ------: | ----- | -----------: | --------------------: | --------------------- |
| Chromium |       1 | on    |     351.3 ms |              351.8 ms | Pass / isolated       |
| Chromium |       3 | on    |     690.4 ms |              690.9 ms | Pass / all four valid |
| Chromium |       3 | off   |     635.0 ms |              635.7 ms | Pass / all four valid |
| Chromium |       1 | off   |     349.2 ms |              349.7 ms | Pass / isolated       |
| Firefox  |       1 | on    |       241 ms |                407 ms | Pass / isolated       |
| Firefox  |       3 | on    |       571 ms |                571 ms | Pass / all four valid |
| Firefox  |       3 | off   |       406 ms |                544 ms | Pass / all four valid |
| Firefox  |       1 | off   |       223 ms |                284 ms | Pass / isolated       |
| WebKit   |       1 | on    |       356 ms |                447 ms | Pass / isolated       |
| WebKit   |       3 | on    |       567 ms |                703 ms | Pass / all four valid |
| WebKit   |       3 | off   |       715 ms |                755 ms | Pass / all four valid |
| WebKit   |       1 | off   |       365 ms |                369 ms | Pass / isolated       |

All twelve exit statuses are zero, with no signal, timeout, evidence error, feature failure or unavailable cell. Chromium is version 156.0.8078.4/build1248, Firefox 157.0/build1555 and WebKit 27.2/build2370. All six candidate manifest/lock hashes, original spec/controller hashes, reversible instrumentation, raw sample/JSON-reporter intervals and all three uploaded ZIP digests were independently rechecked. The matching [JSON](2026-11-10-library-contention-results.json) retains every raw task/frame sample, actual overlap, status, CPU/load/pressure snapshots, exact source/toolchain and artifact hashes. Complete unmodified artifacts remain attached to the ticket.

## Interpretation limits

The concurrent cells run the actual Library and parameter specs, with overlap proven from absolute click and test intervals rather than setup timing. The measured click overlaps happen to involve Library tests; this is not proof of parameter compiler activity during those clicks. The four conditions run in a fixed order with one run per condition. Temporal drift, cache state and scheduler variance are not eliminated. WebKit's trace-off concurrent cell is slower than its trace-on cell, so tracing alone is not an established cause. No cross-CPU speedup ratio or new product improvement is claimed.

The earlier macOS smoke's independent grid-name assertion failure is retained in the protocol evidence and backlog follow-up `KF-6CTMSV`; it did not occur in these Linux cells. No failed result was discarded or retried.

## Controlled benchmark phase

Canonical npm CI keeps its complete three-worker functional phase across all four shards and all three engines. Only `library-performance.spec.ts` is excluded using the committed one-line `editor/tests/library-performance.exclude` manifest, whose entry is relative to Playwright's test directory. Actual Playwright 1.64.1 has no `--ignore` option; the verified supported option is `--test-list-invert`.

The unchanged performance spec then runs once with one worker and zero retries, after the functional phase in each engine's existing shard-3 job. Its two 1000 ms limits, real clicks, exact 25-row mutations, unrelated-branch identity and raw metrics remain unchanged. It also runs after a functional assertion failure, while that failure keeps the job failed. Separate functional/performance output directories preserve failure evidence across the second invocation; every performance outcome retains its complete artifact. The generated Bun qualification workflow mirrors the exact phase structure.

This controls measurement workload rather than claiming another product speedup or retrying a failed benchmark. Live Playwright discovery proves each engine retains all 903 original tests exactly once: functional shards 226/226/225/225 (902 unique tests) plus the one standalone benchmark. The editor-owned discovery gate runs after editor dependencies are installed; root-only workflow/parity fixtures require only root dependencies. All 16 root workflow/generator tests and three editor discovery tests pass, alongside scoped lint, strict root/editor types, formatting, inventory and generator synchronization. Covering clean-tree gates and canonical CI on this method change remain required before ticket completion.
