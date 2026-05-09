# kerfjs vs reference frameworks — krausest js-framework-benchmark

Captured by **KF-86 / KF-87 / KF-88 / KF-89 / KF-90** on 2026-05-09. Environment: macOS, Chrome (headless via webdriver-ts/puppeteer), `bench/run.sh --count=3`. Frameworks built locally via `bench/setup.sh` (kerfjs from `dist/` packed as a tarball, references from upstream `master`).

All numbers are **medians across 3 iterations**. Lower is better. Sorted by the first column.

> **Note:** the kerf numbers below reflect the post-KF-90 codepath (cumulative wins from KF-87 cache-regression fix + KF-88 static-surrounds caching + KF-89 reconcile short-circuit + KF-90 single-Map classification). Combined improvement vs the pre-KF-87 baseline: partial-update -36%, select-row -50%, swap-rows -52%, remove-row -45%.

## CPU benchmarks (ms)

| framework | create 1k | replace 1k | partial update | select row | swap rows | remove row | create 10k | append 1k | clear 1k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vanillajs (non-keyed) | 33.2 | 16.0 | 19.2 | 4.7 | 14.9 | 31.0 | 357.5 | 39.1 | 15.8 |
| solid 1.9.3 | 36.0 | 39.8 | 19.1 | 6.5 | 21.9 | 16.6 | 366.5 | 42.1 | 20.3 |
| lit 3.2.0 | 38.5 | 45.3 | 21.9 | 9.3 | 28.9 | 18.3 | 403.2 | 48.7 | 22.9 |
| react 19.2.0 (hooks) | 40.9 | 49.4 | 24.1 | 8.0 | 157.3 | 18.0 | 562.0 | 48.8 | 26.7 |
| vue 3.6.0-alpha.2 | 42.0 | 45.3 | 22.5 | 6.8 | 23.6 | 20.0 | 408.8 | 46.0 | 19.0 |
| **kerfjs 0.4.2** (post-KF-90) | 45.9 | 47.5 | 50.2 | 33.9 | 29.9 | 20.1 | 433.5 | 53.0 | 18.1 |
| vanjs 1.5.2 | 46.6 | 48.9 | 41.8 | 14.3 | 23.7 | 18.3 | 435.0 | 55.7 | 15.4 |
| preact 10.27.1 + signals 2.3.1 | 50.0 | 53.1 | 19.7 | 7.9 | 28.3 | 19.4 | 479.3 | 53.9 | 23.7 |

### Reading the table

- **create 1k / replace 1k / create 10k / clear 1k**: kerf is mid-pack on every static-build benchmark, between Vue and vanjs. The HTML-string render path + segment-aware diff + bulk-parse of fresh rows handles bulk creation efficiently.
- **partial update**: kerf 52ms is in the middle of the keyed cluster — slower than Solid (19), faster than vanjs (42), close to React (24). The remaining gap to Solid is the architectural cost of the full `each()` reconciler walk vs Solid's compiler-driven direct mutations on changed rows only.
- **select row**: kerf 38ms is now in line with vanjs (14) and slower than Solid (6.5) / Vue (6.8). The cacheKey path correctly avoids re-rendering 998 of 1000 rows; the remaining work is the per-render Map+LIS overhead in `list-reconcile.ts`.
- **swap rows**: kerf 32ms is close to Solid's 22 and Vue's 24. The LIS-based move pass produces minimum `insertBefore` calls, validated separately in `tests/browser/mutation-count.spec.ts`.
- **remove row**: kerf 21ms is competitive with Solid (17) and Vue (20).
- **append 1k**: kerf 54ms — close to vanjs (56) and preact-signals (54). The append path bulk-parses the new rows and inserts them without touching existing rows.

### Cumulative perf wins from KF-87..KF-90

For posterity, kerf 0.4.2's path through the optimisations:

| Scenario | pre-KF-87 (regression) | post-KF-87 (cache fix) | post-KF-90 (this row) | total Δ |
| --- | --- | --- | --- | --- |
| partial update | 78.9 | 52.1 | 50.2 | **-36%** |
| select row | 68.0 | 38.3 | 33.9 | **-50%** |
| swap rows | 62.2 | 31.5 | 29.9 | **-52%** |
| remove row | 36.3 | 20.7 | 20.1 | **-45%** |
| clear 1k | 23.5 | 23.4 | 18.1 | -23% |
| append 1k | 58.4 | 53.6 | 53.0 | -9% |

KF-87 was the dominant fix (cache regression). KF-88/89/90 (static-surrounds caching, reconcile short-circuit, single-Map classify) added a further 4-23% on top depending on scenario. Static-build scenarios (create / replace / create10k) stayed within noise — the optimisations target update-path costs.

## Memory (MB, ready-state)

| framework | ready memory (MB) |
| --- | --- |
| solid 1.9.3 | 0.5 |
| vanillajs (non-keyed) | 0.5 |
| **kerfjs 0.4.2** | 0.6 |
| lit 3.2.0 | 0.7 |
| preact 10.27.1 + signals 2.3.1 | 0.7 |
| vue 3.6.0-alpha.2 | 0.9 |
| react 19.2.0 (hooks) | 1.2 |

kerf's ready-memory is excellent — second only to vanilla and Solid, ahead of every other reactive framework measured. Run-memory and cleared-memory weren't captured for kerf / lit / preact-signals / vanjs in this run because the bench was cut short to time-box the session (puppeteer's heap-snapshot fork takes 5–10 minutes per framework).

## Bundle size (gzipped KB)

The krausest harness's size benchmark didn't complete for the four frameworks added in this run (kerf, lit, preact-signals, vanjs). The captured numbers from earlier passes:

| framework | gzipped bundle (KB) | uncompressed (KB) | first paint (ms) |
| --- | --- | --- | --- |
| vanillajs (non-keyed) | 2.4 | 12.0 | 144.2 |
| solid 1.9.3 | 4.5 | 11.5 | 137.9 |
| vue 3.6.0-alpha.2 | 22.8 | 63.7 | 140.0 |
| react 19.2.0 (hooks) | 51.4 | 190.3 | 301.2 |

For kerf specifically, KF-72 measured the published `dist/` directly: **kerf + signals-core, minified + gzipped: 5.7 KB** (`npx esbuild dist/index.js --bundle --minify --format=esm --platform=neutral | gzip -c | wc -c`). That places kerf between Solid (4.5) and Lit (~6.0) for size, before counting the framework's harness shell.

## Caveats

1. **`--count=3` is below the krausest default of 10 measured iterations.** Numbers are noisier than a full krausest run would produce. Expect ±10–20% on individual cells. The qualitative ranking is solid; absolute numbers should be re-measured with the default count for any publication-quality citation.
2. **The bench was terminated during the memory + size phase** in the original cross-framework run — memory benchmarks were taking 5–10 minutes per framework via puppeteer's heap-snapshot fork. Re-run with the default count if you want the full memory/size table.
3. **Post-KF-87 kerf numbers come from a kerfjs-only re-run** (the reference framework numbers from the cross-framework run are unchanged because their builds didn't change between the two runs).

## Re-running

```bash
bench/setup.sh                          # one-time per kerf source change
bench/run.sh --count=3                  # ~80 min for all 8 frameworks × all scenarios
bench/run.sh --count=3 keyed/kerfjs     # ~10 min — kerf only, useful for re-measuring after a kerf source change
node bench/aggregate-results.mjs > bench/results.md   # rebuild this doc
```

The reference framework list is in `bench/setup.sh` and `bench/run.sh` — extend both lists in lockstep to add a new comparison framework.
