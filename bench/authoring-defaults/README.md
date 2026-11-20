# Production browser baseline for ordinary and tuned authoring

This standalone benchmark measures how much work a straightforward correct implementation and a tuned implementation perform for the same interaction. All six list adapters render the same 1,000 records, editable text inputs, list structure and stylesheet. Each picker uses its library's production component, with a common small application stylesheet. The benchmark runs outside the normal CI pass/fail gates.

## Reproduce

Start from the Kerf revision recorded in `baseline-chromium.json`. To replay the historical baseline after the runtime changes, check out that revision in a fresh directory and copy this benchmark directory from the commit that supplied the baseline. The raw file records framework package versions, lockfile hashes, source digest, browser version, viewport, platform, CPU, seed and production asset hashes. If the hashes differ, label the run as a new comparison.

From the repository root:

```sh
npm ci
npm run build
npm --prefix ui ci
npm --prefix ui run build
npm --prefix bench/authoring-defaults ci
npx playwright install chromium
cd bench/authoring-defaults
ROUNDS=8 SEED=1729 npm run bench
node summarize.mjs results.local.json
```

The root lock pins Playwright and its Chromium revision. Chromium launches one browser with serial fresh contexts and pages. The project's machine-wide WebKit slot limit applies to WebKit runs. Select another file with `RESULT`. A failed DOM, focus, selection, or commit assertion is saved as a failed page and sets a failing exit code. The summary withholds timings for any variant with a failed page.

## What executes

| Stack | Ordinary list                                                                                   | Tuned list                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Kerf  | Plain keyed JSX elements from `map`, coarse signal reads in a mounted view                      | `each`, leaf bindings, per-key `selector` and identity reuse for unchanged records on immutable server responses |
| Solid | `For` and a keyed `reconcile` into a store so same-ID immutable data preserves an active editor | Same ownership and reconciliation with `createSelector` for selection                                            |
| React | Keyed function components with state in the parent                                              | `memo` around rows with primitive props; the React Compiler is off in both                                       |

The Kerf adapter shares the direct selector binding shape of `../micro/select-row-binding.bench.ts`. Refetch identity normalization in the tuned adapter is charged to its operation. Each framework uses its ordinary scheduling for updates. React uses `flushSync` only for deterministic initial mounting.

The sequence mounts, edits a label, switches selection, edits one row's label, swaps two rows, refetches fresh objects with the same IDs, removes a neighbor of a focused row, and disposes. After every operation the harness checks all actual IDs and labels against an independently constructed expectation. A typed draft, caret range and the original input node must survive through refetch and removal. Teardown must empty the root. Instrumented bundles count calls to the adapter's view/row renderers and selection expressions where visible, and DOM mutation records. These counts identify work at observable boundaries; a Solid row setup and a React component render represent different events.

The picker pass uses Kerf UI Combobox with its delegated wiring, Kobalte Combobox, and React Aria Components ComboBox. It opens a labeled field, filters to Blueberry, selects using the keyboard, verifies exactly one commit with focus on the input, and repeats after disposal/remount. Library-specific markup, CSS, and portals remain part of this scenario. Picker bytes are reported separately from runtime-only bytes.

## Timing, sizes and memory

- The first pass gathers correctness, counters and Chromium CDP heap observations. Subsequent shuffled rounds use freshly built uninstrumented code and a new page per adapter. Each page runs a cold scenario, then a warm scenario in the same JS realm; the cold mount and warmed operation samples are retained separately.
- Dispatch time includes the synchronous cost of the harness's shared input-event dispatch and framework dispatch. Deferred commits can continue afterward. The second time runs from dispatch start to the next animation-frame callback. It measures a frame opportunity, not a confirmed paint. The keyboard picker measures keydown-to-frame in the page. Validation and Playwright IPC are outside those measurements.
- Raw samples are in milliseconds. `summarize.mjs` prints minima, medians, interpolated 95th percentiles and maxima. The spread matters at this sample size, particularly with quantized clocks, different scheduling and variable frame phase. The code checks correctness on a later frame.
- Size is minified production JS or CSS for each loaded bundle, gzip level 9 per file. The same esbuild configuration bundles all frameworks, the JSX transform differs by framework, and Solid uses its production DOM compiler. Assets are fulfilled locally without network-transfer timing. Framework compilation and bundle construction are outside the measured intervals.
- Heap observations are CDP JS heap used after explicit GC, once after a warm disposed scenario and again after three more disposed scenarios. The test drops its reference to the focused input. The difference also includes browser/driver caches and per-page test work; it is descriptive and cannot prove a leak. Cross-engine heap comparisons are unavailable.

See [the recorded run](./baseline-chromium.json) for raw per-page observations.

## Recorded results

Eight timed fresh pages per adapter, Apple M5 Pro, Chromium 153.0.8010.12, Kerf tree `9ee444b2`. All 81 pages passed (nine preflight pages plus 72 timing pages). Times below are median milliseconds. Select callbacks are from the separate instrumented pass.

| List adapter   | Cold mount dispatch | Warm select dispatch | Warm select to frame opportunity | Observable select work  |
| -------------- | ------------------: | -------------------: | -------------------------------: | ----------------------- |
| Kerf ordinary  |                3.05 |                 0.90 |                             9.55 | 1,000 row calls         |
| Kerf tuned     |                7.05 |                 0.10 |                             9.40 | 2 class evaluations     |
| Solid ordinary |                4.85 |                 0.40 |                             9.60 | 1,000 class evaluations |
| Solid tuned    |                5.35 |                 0.10 |                             9.50 | 2 class evaluations     |
| React ordinary |                6.65 |                 0.00 |                             9.20 | 1,000 row calls         |
| React tuned    |                6.80 |                 0.00 |                             8.80 | 2 row calls             |

Kerf's tuned version moved observable work from selection to mount. The frame-opportunity ranges for ordinary and tuned Kerf selection overlapped (8.50–10.30 ms and 7.90–10.40 ms). React scheduled its updates beyond the synchronous setter, so the 0.00 ms dispatch median is a clock-resolution result for scheduling, not the cost of rendering rows. DOM mutation counts include repeated writes, even where a property ultimately retains the same visible value.

| Picker stack          | Loaded JS / CSS (gzip bytes) | Cold mount dispatch | Keyboard commit to frame opportunity (min–max) |
| --------------------- | ---------------------------: | ------------------: | ---------------------------------------------: |
| Kerf UI               |               24,560 / 3,809 |                0.90 |                             11.05 (7.90–12.30) |
| Kobalte on Solid      |                 38,991 / 155 |                5.40 |                              9.55 (6.40–11.70) |
| React Aria Components |                120,681 / 155 |                6.70 |                              8.20 (2.90–10.20) |

All three pickers committed exactly once through each mount. Kerf UI includes its component stylesheet and foundation. The headless libraries received the shared application stylesheet. Portal layout, control anatomy and extra features differ. These totals describe these particular working fixtures. Frame variation and the small sample do not justify a general input-latency ranking.
