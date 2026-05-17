# bench/

Local performance comparison against [krausest/js-framework-benchmark][upstream]
— the de-facto standard "1k/10k rows" suite that Solid, Svelte, Vue, Inferno,
etc. all cite.

The implementation in `kerfjs-impl/` is the kerfjs entry, written so it can be
copied verbatim into an upstream PR at `frameworks/keyed/kerfjs/`. The harness
itself is **not** vendored — `bench/setup.sh` shallow-clones it into a
gitignored cache (`bench/.bench-cache/`) and copies our entry in.

## Layout

```
bench/
  kerfjs-impl/         tracked — the kerfjs framework entry
    src/main.tsx       implementation of the standard 1k-rows table app
    package.json       references kerfjs by published version (PR-ready)
    vite.config.ts
    tsconfig.json
    index.html
  setup.sh             builds local kerfjs, clones upstream, builds frameworks
  preflight.sh         system-busy pre-check (KF-139) — sourced by run.sh
  run.sh               runs the benchmark against kerfjs + reference frameworks
  results.sh           builds the aggregated table and serves the viewer
  .bench-cache/        gitignored — upstream clone + build outputs
```

## First-time setup

```bash
bench/setup.sh
```

This:
1. Builds local kerfjs and packs it as a tarball.
2. Clones `krausest/js-framework-benchmark` into `bench/.bench-cache/`.
3. Copies `kerfjs-impl/` into the cache as `frameworks/keyed/kerfjs/` and
   rewrites the `kerfjs` dependency to point at the local tarball — so the
   benchmark runs against your working tree, not whatever's on npm.
4. `npm install` and `npm run build-prod` for kerfjs and the reference
   frameworks (vanilla-js, solid, react-hooks, vue by default — edit
   `REFERENCE_FRAMEWORKS` in `setup.sh` to change).
5. Builds the webdriver-ts harness.

Re-run after pulling upstream changes or after editing `kerfjs-impl/`. It's
idempotent.

## Running

```bash
bench/run.sh
```

Runs the default framework set (kerfjs + the four references) headless and
writes per-framework JSON to `bench/.bench-cache/js-framework-benchmark/webdriver-ts/results/`.

```bash
bench/run.sh keyed/kerfjs keyed/solid     # run just two frameworks
bench/run.sh --count 5                    # run 5 iterations instead of the default
```

Anything starting with `-` is forwarded to webdriver-ts; anything else is
treated as a framework selector. `--force` is consumed locally (skip the
pre-flight system check) and is NOT forwarded.

### Pre-flight check (KF-139)

`bench/run.sh` calls `bench/preflight.sh` before kicking off any timing.
If the host is busy — CPU loaded, on battery, in Low Power Mode, thermal-
throttled, or has another process pegged above 25 % CPU — the run aborts
with a one-line cause + remediation for each failed check. This is what
keeps the numbers in `bench/results.md` clean instead of noisy.

```bash
bench/preflight.sh                       # run the checks standalone
bench/run.sh --force                     # skip checks (intentional noisy run)
KERF_BENCH_FORCE=1 bench/run.sh ...      # same, via env (useful for CI)
BENCH_LOAD_MAX=4.0 bench/run.sh ...      # raise the load-avg ceiling
BENCH_OTHER_CPU_MAX=50 bench/run.sh ...  # raise the per-process CPU ceiling
```

Linux is supported for CI (`uptime` for load, `/sys/class/power_supply` for
AC); the macOS-only checks (Low Power Mode, thermal, pageouts) are skipped
on other platforms.

## Viewing results

```bash
bench/results.sh
```

Aggregates raw results into the upstream viewer's table format and serves
`http://localhost:8080/webdriver-ts-results/`.

For a quick text dump that doesn't need a browser:

```bash
node bench/results-table.mjs            # fixed-width comparison table to stdout
node bench/results-table.mjs --csv      # same data, comma-separated
node bench/results-table.mjs --pin solid    # put `solid*` first instead of kerfjs
```

Reads the same per-framework JSONs in `webdriver-ts/results/` that the viewer
uses. Each cell shows `mean ±stddev (Nx)`; `*` marks the row's fastest
framework, `Nx` is the ratio to that fastest. The header line surfaces the
mtime of the newest results file so you can tell at a glance how stale the
data is.

## Refreshing the homepage perf widget (KF-138)

```bash
node bench/aggregate-results.mjs > bench/results.md
```

`aggregate-results.mjs` writes two outputs every run:

- **`bench/results.md`** (stdout, redirect to the file) — the markdown
  tables published in the repo.
- **`bench/results.json`** (side effect, fixed path) — a structured
  snapshot the homepage's `site/src/components/PerfTable.astro` imports
  at build time.

Both files are tracked in git. Commit the regenerated pair whenever you
publish new numbers — the GitHub Pages build doesn't have access to
`bench/.bench-cache/`, so `bench/results.json` IS the source of truth at
site-build time. The homepage table is a subset (5 scenarios × 4
frameworks); edit `SUBSET_SCENARIOS` / `SUBSET_FRAMEWORKS` in
`PerfTable.astro` to change what gets surfaced without re-running the
bench.

## Micro-benchmarks (`bench/micro/`)

The cross-framework bench above measures end-to-end **click-to-paint** for each krausest scenario. It's the right granularity for "what's kerf's user-visible speed vs the rest of the field?" — but the wrong granularity for "before I commit this primitive-level change, will it move the needle?"

For that, `bench/micro/` runs in seconds (~10s for the whole suite) using Vitest's bench mode (which uses `tinybench` internally). Run it with:

```bash
npm run bench:micro
```

Each `*.bench.ts` file targets one hot path:

| File | What it answers |
| --- | --- |
| `morph-vs-replace.bench.ts` | Is `morph()` faster than `replaceChild` for a kerf-typical row? (Spoiler: comparable. This is the retrospective KF-201 check that would have predicted the perf nothingburger.) |
| `parse-row.bench.ts` | What's the cost of `parseRowTemplate` for one row vs 100 bulk-joined? Sets the ceiling for "how much KF-198's parse-skipping fast path could save." |
| `each-snapshot-classify.bench.ts` | What's the per-row cost in `eachSnapshotById`'s cache-hit and cache-miss loops? Tests KF-199's "alloc reduction is meaningful" premise. |
| `jsx-string-build.bench.ts` | JSX runtime vs raw string concat. Shows the JSX abstraction's overhead vs the absolute floor. |
| `attribute-diff-detection.bench.ts` | Placeholder for KF-198 — measures the proposed HTML-string diff heuristic in isolation. |

### When to use

- **Before committing a primitive-level change** (replacing one DOM op with another, changing a hot-path data structure, adding a fast-path detector). Run the relevant `*.bench.ts` first; if the change doesn't move the microbench, don't expect it to move krausest either.
- **When investigating where time goes** in a hot path — pair with Chrome devtools sampling or `node --prof` runs of the same primitives.

### When NOT to use

- **Don't trust microbench numbers as proxies for end-to-end app perf.** They miss cache effects, batched layouts, paint coalescing, real-world DOM tree sizes, and everything that makes Chrome's click-to-paint different from a synthetic primitive timing. Krausest is still the canonical truth.
- **Don't gate commits on absolute thresholds locally.** Local numbers are host-dependent and noisy (±2–5% RME on a quiet machine, much higher on a busy one). The output is for human judgment, not CI enforcement. The local micro-bench suite is intentionally NOT part of `npm run check`. The CodSpeed CI gate below uses a different measurement (instruction count, not wall-clock) and CAN flag PR regressions deterministically.

### Reading the output

Vitest prints per-bench tables with `hz` (operations per second) and percentile latencies. The Summary block at the end calls out winners per `describe` block as "N.NNx faster than ..." — useful for "did my change actually win?" gut-checks.

### CodSpeed gate in CI (per-PR)

`.github/workflows/codspeed-micro.yml` runs this same `*.bench.ts` suite under [CodSpeed](https://codspeed.io)'s `mode: simulation` instrument on every PR. Instead of timing wall-clock (which is hopeless on shared CI runners), CodSpeed counts CPU instructions via Valgrind/cachegrind — deterministic regardless of host noise — and posts a comment on the PR when any microbench moves outside its noise band relative to the base commit.

The integration is wired via `@codspeed/vitest-plugin` (registered in `vitest.config.bench.ts`). The plugin is a no-op when `CODSPEED_ENV` is unset, so `npm run bench:micro` locally is unchanged — it still uses tinybench wall-clock timing for the iterate-locally feedback loop.

Instruction-count is a great proxy for "did this change get cheaper / more expensive?" but not for "did this change get faster end-to-end" — paint, layout, batched mutation cost don't show up in the instruction stream. Use the CodSpeed gate as a regression detector for primitive-level changes; use the full krausest run (next section) as the user-visible-speed source of truth.

#### CodSpeed activation (one-time, user-driven)

The workflow file is committed but the gate is dark until the CodSpeed account is linked to this repo. To activate:

1. Sign in at [codspeed.io](https://codspeed.io) with the GitHub account that owns `brianwestphal/kerf`.
2. Install the CodSpeed GitHub app on the `brianwestphal/kerf` repo.
3. The next PR to merge into `main` will trigger the workflow. If OIDC auth fails, add a `CODSPEED_TOKEN` repository secret (from the CodSpeed project settings) and set `token: ${{ secrets.CODSPEED_TOKEN }}` on the action step.

## Caveats

- **Absolute numbers aren't comparable across machines.** Only the
  geomean-vs-vanilla column is. Treat local runs as relative trends, not
  publishable scores. The official table is run on Stefan Krause's reference
  hardware — see [the published results][results].
- **Iterate on `kerfjs-impl/`, not the cache copy.** `setup.sh` overwrites
  `frameworks/keyed/kerfjs/` every run.
- **The implementation is intentionally idiomatic kerf** — single signal for
  rows, single signal for the selected id, both read inside one `mount()`.
  Not micro-optimized. We want the benchmark to reflect what users would
  actually write.

## Eventually submitting upstream

When the API is stable enough to publish numbers:

1. Fork [krausest/js-framework-benchmark][upstream].
2. Copy `bench/kerfjs-impl/` to `frameworks/keyed/kerfjs/` in the fork.
3. The `package.json` already references `kerfjs` by published version, so it
   works as-is once that version is on npm.
4. Open a PR. The maintainer re-runs the full suite on his reference hardware
   before merging.

[upstream]: https://github.com/krausest/js-framework-benchmark
[results]: https://krausest.github.io/js-framework-benchmark/current.html
