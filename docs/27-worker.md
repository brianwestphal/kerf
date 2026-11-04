# 27. Off-main-thread compute: recipe or a `kerfjs/worker` subpath

> **Status: decided — recipe extended, no subpath.** The maintainer chose
> Option 1 (§27.4): KF-E6ER9X extended the `kerfjs/async` Worker recipe in
> `docs/8-api-reference.md` with cancellation (abort terminates and respawns
> the worker, then replays its resident data through `init`), a worker
> `error` handler that rejects pending calls, `dispose()`, and a pool snippet.
> No `kerfjs/worker` subpath ships. This document keeps the measurements, the
> criteria, and the §27.5 subpath design for a later revisit. Ticket:
> KF-3BZ49N (design a worker subpath for off-main-thread compute primitives).

## 27.1 Context

kerf renders, diffs, and morphs on the main thread, and it must: render
functions read signals there, and only the main thread can parse HTML or touch
the DOM. A Worker can take the app's own compute off that thread: filtering and
sorting large datasets, parsing CSV or markdown, building a search index.

The seam already exists. `docs/8-api-reference.md` § `kerfjs/async` carries
**"Recipe: heavy app compute in a Worker"**: a request/reply `call()` helper
with id correlation and transfer lists, a module worker that holds the dataset,
and a `resource()` fetcher that posts to it. `resource()` already drops
superseded replies (its stale-response guard), lands errors in `value.error`,
and, since KF-DSXXTD (fetchers receive an `AbortSignal`), aborts the
superseded run's signal, so an app can terminate a runaway worker.

So the "worker-backed `resource()`" and "off-thread `computed()`" the ticket
lists are already expressible: an `effect()` over a (debounced) input signal
calls `resource.run()`, and the resource's `{ status, data }` is the
last-settled value plus a pending state. The open question is narrower: **what
would a subpath add that an app cannot copy from the recipe, and do the
measured costs justify it?**

## 27.2 Measured crossover

### Method

Harness: `bench/micro/worker-crossover/` (`node bench/micro/worker-crossover/run.mjs`;
see its README). A static page and a real module worker
(`new Worker(url, { type: 'module' })`) in Playwright-launched browsers. Both
threads import the same `shared.js`, so they run identical code.

- **Work:** substring filter over N `{ id, label }` rows (krausest-style labels,
  a minority match), sort by label, top-50 slice.
- **Cases:**
  - `floor`: an empty message and its reply.
  - `a-sent`: all N rows cross on every call (structured clone); the top 50
    come back.
  - `b-resident`: the rows were posted once; each call sends only the query
    and gets the top 50 back.
  - `c-column`: an N-element `Float64Array` (8 MB at 1M), structured clone vs.
    transfer, with a trivial sum as the work. The transfer case hands the
    buffer back each time.
- **Columns:** _round trip_ is wall-clock from `postMessage` to the reply
  handler. _Busy_ is how long the main thread was blocked: the whole
  computation for `main`, the `postMessage` call (serialization) for worker
  cases. Busy is what users feel as jank; round trip is how long the result
  takes to appear.
- **Statistics:** each value is the median of 21 calls (9 at 100k, 5 at 1M)
  after two warm-ups. Chromium is the median over 5 fresh browser launches;
  Firefox and WebKit ran once each, for shape. The page is served
  cross-origin-isolated only to sharpen `performance.now()` to about 5 µs.
- **Conditions:** 2026-11-04 on a shared Apple-silicon Mac with other agents
  running; load averages 5.3 to 6.5 throughout. Chromium 153 (headless shell),
  Firefox 155, WebKit 26.6, all from Playwright 1.63. **Directional only; never
  publish these as kerf performance claims.**

### Results (ms)

Round trip-floor: Chromium 0.020, Firefox 0.020, WebKit 0.060.

**(a) and (b): filter + sort, top 50** (round trip / main-thread busy)

| Engine   | N    | main  | a-sent: worker | b-resident: worker |
| -------- | ---- | ----- | -------------- | ------------------ |
| Chromium | 1k   | 0.065 | 0.37 / 0.115   | 0.090 / 0.005      |
| Chromium | 10k  | 0.85  | 3.55 / 1.08    | 0.89 / 0.005       |
| Chromium | 100k | 11.7  | 38.6 / 12.6    | 11.6 / 0.015       |
| Chromium | 1M   | 163   | 502 / 186      | 132 / 0.015        |
| Firefox  | 10k  | 1.12  | 4.86 / 1.70    | 1.26 / 0.000       |
| Firefox  | 100k | 14.8  | 73.1 / 21.7    | 18.4 / 0.020       |
| Firefox  | 1M   | 310   | 1189 / 258     | 636 / 0.020        |
| WebKit   | 10k  | 0.76  | 6.58 / 4.24    | 0.96 / 0.020       |
| WebKit   | 100k | 11.5  | 62.8 / 43.1    | 9.20 / 0.000       |
| WebKit   | 1M   | 136   | 705 / 503      | 97.9 / 0.020       |

**(c) `Float64Array` column, sum** (round trip / main-thread busy)

| Engine   | N    | main  | clone         | transfer      |
| -------- | ---- | ----- | ------------- | ------------- |
| Chromium | 100k | 0.100 | 0.325 / 0.090 | 0.140 / 0.005 |
| Chromium | 1M   | 0.985 | 2.56 / 0.725  | 1.10 / 0.010  |
| Firefox  | 1M   | 1.00  | 3.06 / 0.800  | 1.06 / 0.020  |
| WebKit   | 1M   | 0.98  | 2.26 / 0.440  | 1.08 / 0.000  |

### What the numbers say

1. **Sending the data on every call never pays.** Serializing N rows blocks
   the main thread about as long as just doing the work (Chromium 1.1x;
   WebKit 3x to 5x; Firefox 0.8x only at 1M), and the result arrives 3x to 5x
   later. At no N and on no engine does `a-sent` win on both axes; it loses on
   both nearly everywhere. Structured clone is O(n) like a filter, and it is a
   main-thread cost.
2. **Resident data wins as soon as the work is long enough to matter.** With
   the rows living in the worker, main-thread busy is flat at 5 to 20 µs for
   every N, and the round trip is about the same as computing on the main
   thread (Chromium and WebKit slightly faster at 1M; Firefox up to 2x slower,
   but off-thread). The crossover is therefore a UI-responsiveness threshold,
   not a throughput one: once the main-thread version of a call exceeds a few
   milliseconds (between 10k and 100k rows for this workload), a resident
   worker removes that time from the frame budget at little or no latency
   cost. Below about 1 ms (1k to 10k rows here) the worker buys nothing.
3. **Transfer makes binary handoff free; clone does not.** Transferring an
   8 MB column blocks the main thread for at most 20 µs; cloning it takes 0.4
   to 0.8 ms and doubles the round trip. Transfer is the right default for
   file contents and typed arrays, which the recipe already says.
4. **The fixed overhead is small.** An empty round trip costs 20 to 60 µs, so
   the protocol layer itself is never the reason a worker fails to pay off.
   The data placement is.

The design consequence: the value lives in **where the data sits**, which is an
app decision (what to load, when to refresh it, how to partition it), not in
the message plumbing. A primitive can make the resident pattern the obvious
path, but it cannot make send-every-call cheap.

## 27.3 What the recipe leaves to the app

Measured against the recipe as it stands, these are the gaps:

| Gap                  | Recipe today                                                               | Real cost for an app                                                                                  |
| -------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Cancellation         | Prose: on the fetcher's `AbortSignal`, terminate and recreate the worker.  | About 15 lines, but easy to get wrong: termination discards resident data, so respawn must reload it. |
| Queued-job drop      | None: a superseded queued message still runs.                              | The debounce keeps the queue short; truly dropping needs a main-side queue.                           |
| Pool / concurrency   | One worker.                                                                | About 60 to 100 lines: queue, idle tracking, per-worker resident state, error routing.                |
| Lifecycle            | Module-level worker, never disposed.                                       | Pending promises leak on teardown unless the app rejects them; `kerfjs/scope` fit is manual.          |
| Worker-side protocol | Hand-written `onmessage` with `try`/`catch` and transfer handling.         | About 15 lines per worker; the envelope must match the main side.                                     |
| Worker load failure  | Not handled: a 404 or syntax error fires `error` and every `call()` hangs. | A real bug class: the promise never settles, so `resource()` stays `running` forever.                 |

The last row is a correctness defect in the recipe as written, independent of
the decision below, and should be fixed either way.

## 27.4 Options and decision criteria

**Option 1: extend the recipe only.** Add a cancellation snippet (abort while
running terminates and respawns, re-sending resident data through an `init`
step), a worker `error` handler that rejects pending calls, a `dispose()` that
rejects pending calls and terminates, and a short pool snippet. Keep the
protocol app-owned.

**Option 2: ship `kerfjs/worker` v1** (§27.5). The plumbing above becomes about
1 KB of tested, three-engine-covered code with one envelope shared by both
sides.

**Option 3: close.** The recipe stands as is, apart from the load-failure fix.

Criteria for choosing a subpath over a recipe, the same bar `kerfjs/router` and
the companion utilities cleared:

1. **Is it reinvented?** Several real apps hand-roll the same plumbing. Today
   it is not: the survey of six real kerf apps found five hand-rolled gaps,
   and none of them involved a Worker.
2. **Is it subtle?** The recipe's natural version has bugs the subpath fixes
   once. Yes, partly: the load-failure hang and terminate-loses-resident-data
   are both subtle.
3. **Is it materially smaller than the recipe for the app?** A subpath saves
   about 40 lines per app with one worker, and about 120 with a pool.
4. **Does it need kerf?** Router, list, and overlay compose kerf primitives.
   A worker pool needs none: no signals, no render core. Its only kerf touch
   points are `resource()`'s `AbortSignal` and `kerfjs/scope`'s `add()`, both
   of which accept any function.
5. **Is the contract cheap to keep?** The subpath fixes a wire envelope
   (`{ id, kind, ... }` / `{ id, result | error }`) that both sides depend on;
   changing it later is a breaking change in two bundles at once.

Criteria 1 and 4 argue for the recipe; 2 and 3 argue weakly for the subpath.
**Recommendation: Option 1.** Extend the recipe now, including the load-failure
fix, and revisit the subpath when two real apps carry a worker pool or the
recipe's cancellation snippet is copied with a bug. The measurement says the
win is a data-placement decision the app owns, and the plumbing is small enough
to copy. If the maintainer prefers a blessed primitive, §27.5 is ready to
build.

## 27.5 Proposed v1 surface (if Option 2)

### Main thread

```ts
import { createWorker } from 'kerfjs/worker';

const pool = createWorker(
  () => new Worker(new URL('./search.worker.js', import.meta.url), { type: 'module' }),
  {
    size: 1, // default 1; >1 is a pool
    init: (call) => call({ kind: 'load', rows }, []), // runs on every (re)spawn
    cancel: 'drop', // or 'terminate'
  },
);

const hits = resource<Hit[], string>();
effect(() => {
  const q = settledQuery.value;
  void hits.run(q, (_report, signal) =>
    pool.call<Hit[]>({ kind: 'search', query: q }, [], { signal }),
  );
});

disposeScope(host).add(pool.dispose); // kerfjs/scope fit
```

```ts
interface WorkerHandle {
  call<T>(
    message: Record<string, unknown>,
    transfer?: Transferable[],
    options?: { signal?: AbortSignal },
  ): Promise<T>;
  dispose(): void;
}

function createWorker(
  spawn: string | URL | (() => Worker),
  options?: {
    size?: number;
    init?: (call: WorkerHandle['call']) => Promise<unknown> | unknown;
    cancel?: 'drop' | 'terminate';
  },
): WorkerHandle;
```

- **Input.** A URL (string or `URL`, spawned as a module worker) or a factory
  returning a `Worker`. A factory is required for `size > 1` and for
  `cancel: 'terminate'`, because both spawn more than once; a bundler only
  rewrites the `new Worker(new URL(...))` expression where the app wrote it, so
  kerf cannot construct the worker itself in a bundled app. A bare `Worker`
  instance is deliberately not accepted for that reason.
- **Queue.** FIFO; each worker runs one job at a time (a worker is
  single-threaded anyway, so more in flight only hides queueing). A job goes to
  the first idle worker.
- **Latest-wins through `AbortSignal`.** An abort on a queued job removes it
  and rejects with an `AbortError`. An abort on a running job rejects at once;
  with `cancel: 'drop'` (default) the worker finishes and its reply is
  discarded, and with `cancel: 'terminate'` that worker is terminated and
  respawned, and `init` runs again before it takes a job. `resource()` passes
  exactly this signal, so latest-wins needs no extra code.
- **Errors.** A handler throw becomes a rejection with the worker's message. A
  worker `error` or `messageerror` event (load failure, uncaught error) rejects
  every job that worker held, and that worker is respawned on the next job; a
  spawn that fails during `init` rejects the queue instead of looping.
- **Dispose.** Terminates every worker and rejects every pending and queued
  job with an `AbortError`; idempotent; later `call()`s reject.
- **Resident data and pools.** `init` runs once per worker, so a pool of N
  holds N copies of resident data. The doc and the API reference must say so,
  and partitioning stays app code (a `kind`-routed message per shard).

### Worker side

```ts
// search.worker.js
import { expose, transfer } from 'kerfjs/worker';

let rows = [];
expose({
  load(msg) {
    rows = msg.rows;
  },
  search(msg) {
    return topMatches(rows, msg.query);
  },
  csv(msg) {
    const values = parseColumn(msg.buffer);
    return transfer({ values }, [values.buffer]);
  },
});
```

`expose(handlers)` installs `self.onmessage`, dispatches on `kind`, awaits the
handler, posts `{ id, result }` or `{ id, error }`, and honors a
`transfer(value, list)` wrapper on the result. It imports nothing else, so a
worker bundle stays a few hundred bytes. `createWorker` and `expose` can live
in one entry (each tree-shakes away from the other's bundle) or as
`kerfjs/worker` and `kerfjs/worker/expose` if an unbundled importmap consumer
should not load both.

### Fit with kerf's rules

- **Design rule 2 (no compiler).** Module workers already work in Vite,
  webpack 5, Parcel, and native browsers; esbuild needs the app's own worker
  entry. kerf adds no plugin.
- **Design rule 5 (module-level state).** Queue, idle set, pending map, and
  id counter live in the `createWorker` closure; `expose` keeps its handler
  table in its own closure. No top-level `let`; `check:design-rule-5` would
  pass without amending the rule.
- **Dependencies.** None: no signals, no render core. The entry imports
  nothing from the rest of `src/`.
- **Bundle budget.** Estimated 0.7 to 1.0 KB min+gzip for `createWorker`,
  0.3 KB for `expose`. A new `worker` entry in `scripts/check-bundle-size.mjs`
  starts at the measured size plus the usual slack.
- **Testing.** happy-dom has no `Worker`. Unit tests use a fake worker built
  on `MessageChannel` (available in Node) that runs `expose()` handlers in the
  same process, covering the state machine: queued abort, running abort under
  both cancel modes, respawn plus `init` replay, `error` event with jobs in
  flight, `init` failure, dispose with pending and queued jobs, pool fan-out,
  and transfer detachment. A transition-matrix test enumerates those states
  (idle, queued, running, respawning, disposed). A Playwright spec in
  `tests/browser/` runs a real module worker through all three engines,
  including the load-failure path. Feature-coverage rows go in
  `docs/14-feature-coverage.md`.
- **Surfaces.** `docs/8-api-reference.md` (and the recipe rewritten around the
  subpath), the site API page, `docs/ai/usage-guide.md`, `docs/ai/code-summary.md`,
  `kerf.claude-skill.md` / `kerf.cursorrules` (skill-version bump), the
  CHANGELOG, `tsup.config.ts` and `package.json` exports, and an example app
  (a resident-data search over 100k rows) under `site/src/examples/complete/`.

## 27.6 Explicitly out of scope

- **Stringified-function workers** (`Blob` + `URL.createObjectURL(fn.toString())`).
  They lose closures and imports, are opaque to bundlers and type checkers, and
  break under a CSP without `blob:` in `worker-src`.
- **Signal-graph synchronization across threads.** Mirroring signals into a
  worker costs a message per write and makes reads asynchronous; the graph
  stays on the main thread and workers are async producers behind
  `resource()`.
- **`SharedArrayBuffer` and `Atomics` in v1.** They need cross-origin
  isolation (COOP/COEP), which breaks third-party embeds, ads, and OAuth
  popups. The measurement found no case that needs them: transfer already
  makes binary handoff near-free. A feature-detected fast path can be
  reconsidered with a workload that shares mutable memory.
- **RPC proxies** (Comlink-style `Proxy` objects that make worker functions
  look local). They hide the cost model the measurement shows matters; an
  explicit `call()` keeps the crossing visible.
- **OffscreenCanvas and rendering helpers.** Transferring an `OffscreenCanvas`
  already works through the transfer list; kerf renders only on the main
  thread.

## 27.7 Follow-ups

- KF-CP3SZV (the worker recipe's `call()` hung forever when the worker failed
  to load): fixed in the recipe. A worker `error` or `messageerror` now
  rejects every pending call and every later one.
- KF-E6ER9X (extend the Worker recipe, the maintainer's choice of Option 1):
  done. The recipe's `createCompute(spawn, init)` client and pool snippet were
  run against real module workers in Chromium, Firefox, and WebKit (abort
  mid-job, load failure, dispose, error reply, a superseded `resource()` run,
  and two-worker parallelism).
- Revisit the subpath when two real apps carry a worker pool, or when the
  recipe's cancellation code is copied with a bug (§27.4).
