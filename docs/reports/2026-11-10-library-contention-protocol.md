# Same-runner Library performance protocol (KF-1XBJDT)

The cc06 canonical cohort failed only WebKit editor shard 3's Library task budget: 1216/1250/1033/1122 ms in run 42800239178, job 129775694339. Firefox and Chromium shard 3 passed. The earlier local native-layout reduction does not establish this Linux cohort's cause.

`.github/workflows/library-contention-diagnostic.yml` is a separate manually dispatched experiment. It changes neither canonical CI nor the older reusable isolated-performance workflow. Each browser gets its own Ubuntu 24.04 VM, with all four cells executed sequentially on that same VM and exact target source:

| Order | Workers | Trace | Workload                                          |
| ----- | ------: | ----- | ------------------------------------------------- |
| 1     |       1 | on    | Original Library performance spec                 |
| 2     |       3 | on    | Performance plus real Library and parameter specs |
| 3     |       3 | off   | Identical three-spec workload                     |
| 4     |       1 | off   | Original Library performance spec                 |

All three browser engines remain included, with exact Node 22.23.4, npm 10.9.9 and editor Playwright 1.64.1. Retries are always zero. Every cell runs regardless of previous assertion failures; after an infrastructure abort/timeout, remaining cells are explicitly marked unavailable because stale child servers cannot be assumed clean. The disposable runner is then discarded; the controller exits nonzero after all cells if any cell fails or has incomplete evidence. These are predeclared experimental conditions, not conditional retries or a replacement passing gate.

The candidate's actions, pacing, both 1000 ms assertions, row-count/identity checks and original metrics remain byte-preserved. A reversible manual-only instrumentation line adds `startedAt: performance.timeOrigin + start` to each sample, using the already captured start. Original/instrumented source, hashes, forward diff and inverse patch are retained, and the original is restored on exit. Separate harness and candidate checkouts record their exact source identities; canonical manifests/locks are hashed and checked unchanged.

Raw output retains each exit status/signal/error, full Playwright JSON/logs/test-results, every disclosure sample and assertion outcome, actual browser version/executable, source/controller hashes, tool versions, CPU models/parallelism/load/cumulative CPU times and Linux CPU-pressure snapshots before/after each cell. Absolute sample intervals are compared with actual JSON-reporter test intervals. A three-worker cell is rejected as incomplete unless every measured click overlaps at least one competing Library/parameter test. That proves concurrent test activity, not continuous CPU consumption by that test.

This four-cell protocol has one run per condition. It can expose workload/trace sensitivity on the same hardware, but cannot exclude temporal drift or every scheduler effect. No cross-VM timing ratio, new API, containment policy, threshold change, or canonical scheduling change follows automatically. The results must be reviewed before choosing any further product or benchmark-design action.

Dispatch with the exact failing candidate SHA `cc06dcc779c596f0bd1e012adc91504886275bb8`. The diagnostic workflow/harness revision is recorded separately. Linux execution is complete; see [the exact-source results](2026-11-10-library-contention-results.md). Local controller/unit verification alone does not establish Linux causation.

## Local controller verification

The isolated exact-cc06 Firefox smoke run executes all four cells. All performance task/frame budgets and row/identity assertions pass; every measured three-worker click overlaps real Library tests. Both three-worker cells retain an independent existing macOS failure in the grid-name truncation assertion (`scrollWidth == clientWidth == 92` for DisclosureArrow), so the controller correctly returns failure after recording every cell rather than masking it. Follow-up `KF-6CTMSV` is explicitly Backlog/no Up Next. No owned editor ports remain, and the candidate spec is restored clean. This smoke run predates the final stricter overlap/abort hardening, whose focused tests additionally reject partially overlapping evidence and classify aborted later cells as unavailable.
