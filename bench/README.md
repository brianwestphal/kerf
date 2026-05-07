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
treated as a framework selector.

## Viewing results

```bash
bench/results.sh
```

Aggregates raw results into the upstream viewer's table format and serves
`http://localhost:8080/webdriver-ts-results/`.

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
