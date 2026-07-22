# bench/

Performance tooling for [krausest/js-framework-benchmark][upstream] — the
de-facto standard "1k/10k rows" suite that Solid, Svelte, Vue, Inferno, etc.
all cite.

**The published numbers come from upstream krausest, not this local harness.**
`kerfjs-impl/` is the kerf entry and it is **merged upstream** at
`frameworks/keyed/kerfjs/`, so krausest measures kerf on the same reference
machine as every competitor. `bench/import-krausest.mjs` pulls those official
numbers into the git-tracked `bench/results.{json,md}` that the site publishes
(`node bench/import-krausest.mjs`; re-run + commit to refresh — see
[Importing the official numbers](#importing-the-official-numbers-published-source)).
Keep `kerfjs-impl/` in sync with the upstream entry, and open a follow-up
upstream PR to bump the pinned kerfjs version on each release.

Everything else here is the **local dev-only harness** — for "did my change
move the needle?" profiling on your own machine. `bench/setup.sh` shallow-clones
the upstream suite into a gitignored cache (`bench/.bench-cache/`) and copies our
entry in; `run.sh` measures; `aggregate-results.mjs` tabulates into the
gitignored `bench/results.local.*`. These local numbers are iteration signal
only — **never publish them.**

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
  site.sh              interactive: serve the kerfjs bench app + open the browser
  results.sh           builds the aggregated table and serves the viewer
  .bench-cache/        gitignored — upstream clone + build outputs
```

## Interactive playground — `npm run bench:serve`

Want to poke at kerf by hand rather than measure it? `npm run bench:serve`
(a.k.a. `bench/site.sh`) rebuilds the kerfjs entry from your **current working
tree**, starts the upstream static server on `http://localhost:8080`, and opens
the kerfjs page — the standard 1k-rows app with the Create / Append / Update /
Swap / Clear buttons plus row select + remove. Ctrl-C stops the server.

```bash
npm run bench:serve                 # rebuild from the working tree, then serve + open
npm run bench:serve -- --no-build   # skip the rebuild; serve what's already built (fast)
```

The first run bootstraps the cache via `setup.sh` (one-time clone + reference
builds); after that it only rebuilds the kerfjs entry, so it's quick. This is
the measurement-free sibling of `run.sh`; for Chrome-devtools profiling of a hot
path use `dev-server.sh` (serve-only, no auto-open) instead.

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
bench/run.sh --count=5                    # run 5 iterations instead of the default
```

Anything starting with `-` is forwarded to webdriver-ts; anything else is
treated as a framework selector. `--force` is consumed locally (skip the
pre-flight system check) and is NOT forwarded. **Use the `--flag=value` form
for any webdriver-ts flag that takes a value** (`--count=N`, `--browser=…`,
`--runner=…`) — the bare `--count 5` two-token form routes the `5` into the
framework list instead of into webdriver-ts. `run.sh` validates the framework
list and aborts loudly if any token doesn't resolve to a directory under
`frameworks/keyed/` so a misuse like that fails fast rather than silently
running zero frameworks.

### Post-kerf-change verification rerun — kerf-only by default

For verifying that a kerf-side perf change moved the needle (the most common
reason to re-run the bench), use the kerf-only invocation:

```bash
bash bench/run.sh keyed/kerfjs --count=10
```

This re-measures **only kerfjs** in ~10 minutes; the other frameworks'
results from the last full run are kept as the comparison baseline.
`bench/aggregate-results.mjs` merges the new kerfjs row with the cached
other-framework JSONs in `bench/.bench-cache/.../webdriver-ts/results/`, so
the committable `bench/results.json` stays consistent — only the kerfjs row
reflects the latest source. The other frameworks' numbers are stable across
our kerf-side optimization attempts, so re-measuring them every time would
be ~80 minutes of wall-clock wasted.

Reserve the full cross-framework rerun (`bash bench/run.sh --count=10`,
~1.5 hr) for re-baselining moments:

- A reference framework version bumps (new Vue / React major).
- A host-OS or Chrome major upgrade.
- A ~6-month cadence sanity check for Chrome/V8/macOS perf regressions that
  affect all frameworks uniformly.
- A major kerf version release where a freshly-reproduced full baseline is
  the right artifact to commit.

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

## Importing the official numbers (published source)

The numbers the site publishes come from **upstream krausest**, not this local
harness (see the top of this file for why). Refresh them with:

```bash
node bench/import-krausest.mjs        # fetch krausest's live published results
node bench/import-krausest.mjs FILE   # or parse a local results.ts copy offline
```

It fetches krausest's published `webdriver-ts-results` data, extracts the
tracked frameworks' medians, and writes two git-tracked files:

- **`bench/results.json`** — a structured snapshot the homepage's
  `site/src/components/PerfTable.astro` imports at build time.
- **`bench/results.md`** — the full CPU / memory / size markdown tables.

Commit both whenever krausest republishes (most importantly after a kerf
release, once krausest re-runs with the bumped upstream `frameworks/keyed/kerfjs`
pin — the GitHub Pages build doesn't fetch krausest at build time, so
`bench/results.json` IS the source of truth then). Edit `TRACKED_DIRS` in the
importer to change which frameworks appear; the homepage table is a further
subset (5 scenarios × 4 frameworks) controlled by `SUBSET_SCENARIOS` /
`SUBSET_FRAMEWORKS` in `PerfTable.astro`.

### Local dev snapshot (not published)

`bench/aggregate-results.mjs` tabulates the **local** M1-Pro cache for
"did my change move the needle?" profiling:

```bash
node bench/aggregate-results.mjs > bench/results.local.md
```

It writes the **gitignored** `bench/results.local.md` (stdout) +
`bench/results.local.json` (side effect) — deliberately NOT the published
`bench/results.json`, so a local run can't clobber the krausest snapshot.
These numbers are iteration signal only; never publish them.

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
- **Don't gate commits on absolute thresholds.** The numbers are host-dependent and noisy (±2–5% RME on a quiet machine, much higher on a busy one). The output is for human judgment, not CI enforcement. The micro-bench suite is intentionally NOT part of `npm run check`.

### Reading the output

Vitest prints per-bench tables with `hz` (operations per second) and percentile latencies. The Summary block at the end calls out winners per `describe` block as "N.NNx faster than ..." — useful for "did my change actually win?" gut-checks.

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
