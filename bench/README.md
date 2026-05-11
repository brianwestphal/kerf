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
