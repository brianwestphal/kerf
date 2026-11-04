# Worker crossover micro-benchmark

Measures when moving app compute into a Web Worker pays off, with real module
workers in real browsers (Playwright). It produced the table in
[`docs/27-worker.md`](../../../docs/27-worker.md).

```bash
node bench/micro/worker-crossover/run.mjs                       # Chromium, N = 1k..1M, 3 runs
node bench/micro/worker-crossover/run.mjs --browsers=firefox,webkit --runs=1
node bench/micro/worker-crossover/run.mjs --sizes=1000,10000 --runs=5
```

On macOS, Chromium cannot start inside a command sandbox that blocks Mach port
registration; run it from an ordinary terminal.

## Cases

| Case         | What crosses the thread boundary per call                        |
| ------------ | ---------------------------------------------------------------- |
| `floor`      | an empty message and its reply                                   |
| `a-sent`     | all N `{ id, label }` rows in, the top 50 out (structured clone) |
| `b-resident` | the query string in, the top 50 out; rows were loaded once       |
| `c-column`   | an N-element `Float64Array` in (clone or transfer), a sum out    |

The work is a substring filter, a sort by label, and a top-50 slice
(`shared.js`, imported by both threads so they run the same code). The `main`
rows run that work synchronously on the page; `b-resident` shares its main row
with `a-sent`.

## Columns

- **round trip**: wall-clock time from `postMessage` to the reply handler.
- **main-thread busy**: time the page thread was blocked. For a worker case,
  that is the `postMessage` call itself (structured-clone serialization); for a
  main case, the whole computation.

Each in-page value is a median over 21 calls (9 at 100k, 5 at 1M) after two
warm-up calls; the table is the median over `--runs` fresh browser launches.
The server sends COOP/COEP headers only to sharpen `performance.now()` to about
5 µs; nothing uses `SharedArrayBuffer`.

The numbers are directional. Run on a quiet machine, note `uptime` before and
after, and never publish them as kerf performance claims.
