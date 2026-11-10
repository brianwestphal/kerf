# PagedView Linux full-load investigation (KF-SAYTM1)

The original Linux skip remains a real, unexplained failure. This diagnostic
does not claim a runtime repair or weaken the native snap contract.

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
uninstrumented full-suite control helps identify this limitation. The first
settled-fling screenshot is taken after its existing assertions/quiet period and
before the second gesture; it cannot influence the first landing. On a first-fling
failure, teardown retains the last observed state instead. These captures are
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

Linux results must be added after the manual operation. Until then, the requested
Linux full-load investigation remains pending; no negative conclusion is inferred
from local success.
