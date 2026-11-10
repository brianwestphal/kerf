# PagedView Linux full-load investigation (KF-SAYTM1)

The bounded Linux full-load investigation is complete: the original skip did not
recur in either exact-source full-suite pass. Its cause remains unexplained. No
runtime repair or statistical stability claim is supported; the native snap
contract and assertions remain unchanged. Remaining cause work is tracked in the
typed Backlog follow-up **KF-5WTPEP**, not silently removed from the human queue.

## Inputs and comparison

- Failing source: `14c603b83ac6755bd24a4c4695f3d5f7cf9c53bc`, main run
  `42762569528`, Chromium job `129651614771`.
- Prior green: `e77e5d9a6c91ce44d44d210af1f0f50e22fcc780`.
- PagedView component/CSS/wiring/demo, browser test, UI lockfile and core runtime
  were unchanged between those revisions. The retained original trace has one
  gesture and crosses Rates before the application reports Triage.
- Prior macOS isolated runs passed 10/10 on each tree; the native positive
  control landed on Rates in all six `always` cases and overshot in all six
  `normal` cases. These results do not establish Linux full-suite stability.

## Reproduction operation

Manually dispatch `.github/workflows/paged-view-diagnostic.yml` with the exact
source SHA. The harness revision and source checkout are recorded separately.
The Ubuntu 24.04 job uses Node 22.23.4/npm 10.9.9 and the target's exact lockfiles
and installed Chromium. It runs the full UI Chromium suite with two workers and
zero retries twice, sequentially: an uninstrumented control, then an instrumented
comparison. Both passes retain their complete logs/results/reports independently,
including failures. The second pass runs even if the first fails; it is a
measurement comparison, never a retry that replaces the first outcome.

The preparation script replaces only the test's import in an ephemeral checkout.
Every native gesture, pacing, geometry assertion, report assertion and input-no-op
retry remains byte-preserved. Original/patched test digests, overlay diff, and
source tree hashes against prior-green and harness revisions are retained. The
fixture records only the hard-fling test; other suite tests use the same base
Playwright fixtures. No diagnostic code enters the shipped runtime.

## Instrumentation and limits

The recording includes actual `browser.version()`, `Browser.getVersion` revision,
Playwright package/browser manifests, worker identity, node/browser time origins,
CDP touch send/ack timestamps, browser touch coordinates/timestamps, per-frame
offset/width/page, native snap-change/scroll-end events, application `data-page`
reports and viewport resize events. It caps recording at 30 seconds/12,000 events
and records dropped events and aggregate/maximum frame callback cost.

Observers and layout reads can perturb timing. Their cost is measured but is not
claimed to cover every event callback or browser scheduling effect. The paired
uninstrumented full-suite control helps identify this limitation. The fixture
captures before the second CDP session. In the verified local and Linux runs,
each session was a real fling, so this was after the first fling's existing
assertions/quiet period and could not influence its landing. A future input-no-op
retry would make a session index insufficient to label that capture; the
selection/label guard is included in KF-5WTPEP. On a first-fling assertion failure,
teardown retains the last observed state instead. These captures are
reproduction/positive-control evidence, never proof of a fix.

## Local harness verification

One isolated macOS Chromium smoke test passed with the original assertions. The
recorder observed 12 CDP touch commands, 193 browser events, 117 frames, zero
dropped events, and 6.9 ms aggregate / 1.3 ms maximum measured frame callback cost.
Actual browser: Chromium 153.0.8010.12, revision
`971a7443b0c9b0a9b2860529b33331b76077ec62`. Native `always` snap stopped at Rates
(438 px), then Triage (876 px), each before the corresponding application report.
The inspected 1280×900 first-fling capture shows Rates and the second selected dot.
This smoke validates instrumentation, not Linux behavior.

## Exact-source Linux results

[Manual run 42787306672](https://github.com/brianwestphal/kerf/actions/runs/42787306672)
completed successfully. Harness `feff2523c2105239eb9ff086923117b0fb1d8509`
checked out failing source `14c603b83ac6755bd24a4c4695f3d5f7cf9c53bc`.
Both full suites ran on the same Ubuntu 24.04 runner (image `20261101.360.1`,
four available CPUs), Node 22.23.4 and npm 10.9.9, with two workers and zero
retries. They ran sequentially; neither result replaces the other.

| Pass                    | Result                    | Full-suite reported time | Step wall time | Hard-fling test |
| ----------------------- | ------------------------- | ------------------------ | -------------- | --------------- |
| Uninstrumented control  | 1,047 passed, one skipped | 14.9 min                 | 14 min 57 s    | Passed, 2.6 s   |
| Instrumented comparison | 1,047 passed, one skipped | 15.0 min                 | 15 min         | Passed, 2.8 s   |

Actual Playwright was **1.63.0**, Chromium **153.0.8010.12**, download revision
**1243**, engine revision `971a7443b0c9b0a9b2860529b33331b76077ec62`.
The original failure trace independently records the same Playwright version and
Chrome product version. The original trace does not expose its engine commit;
no stronger original engine-commit equality is inferred from the lockfile.

The retained provenance maps match across failing source, prior green and harness
for all seven inputs: PagedView source/CSS/wiring, demo, test, UI lockfile and core
runtime tree. The original test bytes match `git show` at the failing commit;
the patched digest reverses exactly to those bytes with only its import changed.
The fixture digest matches the harness commit. The overlay diff is retained.

## Linux gesture and frame findings

The recorder captured exactly **two touch starts, eight moves and two ends**:
12 CDP commands, six per gesture. No input-no-op retry occurred. Thus the actual
first-fling screenshot was taken before the second fling, not before a retried
first input attempt. It shows Rates and the second selected dot at 1280×900;
actual pixels were inspected for readable content, alignment and clipping. It is
attached as `KF-SAYTM1-linux-first-fling-rates-1280x900.png`, explicitly a
positive-control state rather than repair proof.

- Computed styles were `scroll-snap-type: x mandatory` and `scroll-snap-stop:
always` on all three pages. The component viewport remained 438×318 px, inside
  the unchanged 1280×900 browser viewport. The sole ResizeObserver notification
  was its initial observation; no intervening resize was recorded.
- First gesture: CDP sends spanned **174.16 ms**, browser-observed touch delivery
  **179.2 ms**, synthetic timestamps encoded **40 ms**. Acknowledgments ranged
  **12.17–36.67 ms**. Maximum and final offsets before the next gesture were both
  **438 px**. Native Rates snap change was observed at **983.4 ms**, while
  `data-page` was still Today; the application reported Rates at **993.1 ms**.
- Second gesture: sends spanned **138.91 ms**, observed delivery **146.6 ms**,
  encoded **40 ms**; acknowledgments ranged **3.48–34.76 ms**. Maximum/final offset
  was **876 px**. Native Triage snap change was observed at **2165.6 ms**, while
  the application still showed Rates; Triage was reported at **2169.9 ms**.
  Event times are milliseconds relative to the page's performance time origin.
- There were **144 frame callbacks / 142 viewport samples**, **zero dropped
  events**, **17.7 ms** aggregate and **3.1 ms** maximum measured frame callback
  cost. The largest observed sample gap was **42.3 ms**. One-minute host load
  averages were 4.23 before and 3.89 after this test; those numbers do not measure
  browser scheduling or prove the original host conditions were reproduced.

The successful first gesture had a larger send/delivery span than the retained
original failure's approximately 128 ms command span. This is evidence against
that mismatch alone being a sufficient explanation, not proof that timing or
Chromium scheduling cannot cause the rare skip. No overshoot, early application
report or resize cause was demonstrated in this run.

## Evidence integrity and remaining boundary

[Portable summary](2026-11-10-paged-view-linux-summary.json) retains raw selected
file SHA-256 hashes, both original/new GitHub artifact digests, original failure
trace/log hashes, source provenance and the normalized browser metadata. Only the
known runner-home prefix in the executable path is replaced by `<runner-home>`
in this tracked summary; the original raw artifact bytes remain untouched.
`kerf-say-linux-raw-sha256.json` hashes every one of the **723** downloaded raw
files and is attached with its own digest in the summary. Full logs, raw
telemetry, provenance/overlay and the matching screenshot are retained in one
reference-evidence batch on KF-SAYTM1. Passing tests do not retain a new failure
trace; the original failing trace remains attached and hashed.

The bounded two-pass Linux operation fulfilled the remaining requested
investigation scope. Two successful first-fling observations cannot establish a
failure rate or rule out intermittent native/scheduling behavior. Instrumentation
is intrusive, the second pass has warmer filesystem caches, and worker/host
scheduling cannot be replayed exactly. The original incident remains valid.
**KF-5WTPEP** owns evidence-led recurrence capture/minimal reproduction and cause
analysis in Backlog, with no assertion softening, additional test retries or
unproven implementation fix. KF-SAYTM1 was not demoted from its human-promoted
queue position by this worker.
