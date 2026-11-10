# Editor Play navigation readiness (KF-C09GS4)

The Firefox failure in [main run 42787177304, job 129731378012](https://github.com/brianwestphal/kerf/actions/runs/42787177304/job/129731378012) began checking played content before the iframe had loaded its document and entry module. The screenshot shows an empty device interior. Its trace contains an empty editor mount, pending module/CSS requests, and no page exception or failed completed response. It does not show an incorrectly selected NavStack view.

## Trace boundary

| Event                                              | Trace monotonic time |
| -------------------------------------------------- | -------------------: |
| Play click begins                                  |             66698 ms |
| Child HTML request begins                          |             66809 ms |
| Initial iframe geometry and viewport checks finish |      before 67157 ms |
| Root-view text assertion begins                    |             67179 ms |
| Child HTML response completes after 4519 ms        |             71328 ms |
| Child JavaScript/CSS requests begin                |     71351 / 71353 ms |
| Five-second root-view assertion expires            |             72192 ms |

The HTML request spent 4518.8 ms waiting for the server. The asset requests were still pending when the test ended. Firefox exposed the initial `about:blank` HTML with the correct 402 × 678 viewport before actual navigation committed, so geometry and parent Done focus were insufficient readiness checks. Two parameter/compiler tests ran concurrently; compiler contention is plausible but was not profiled and is not asserted as the server-stall cause.

The player, Play stage, standalone editor entry, and this browser spec are unchanged between `56e4394d` and failing `feff2523`. The intervening Vite host preview-registration changes do not establish causation for this standalone navigation delay.

## Repair and controlled regression

The shared Play helper now waits for the actual iframe URL carrying `kerf-ui-play` and its `DOMContentLoaded` event. Waiting for a generic load state alone would incorrectly accept the initial `about:blank` document. The existing five-second content assertion remains unchanged, as do device viewport/geometry, root NavStack view, Done focus, real played interactions, and selection restoration. There are no retries, sleeps, timeout increases, or production changes.

Two real-browser controls explicitly hold the child HTML response and, separately, its entry-module response behind release gates. They prove parent geometry/focus and the initial viewport can be correct while the new readiness promise stays pending and root content is absent. Releasing each real response permits navigation/bootstrap and the unchanged root-view/Done assertions. Chromium and WebKit frame locators wait during pending navigation, whereas Firefox can expose the initial HTML; the diagnostic reads the initial same-origin child through its parent to verify the same browser state across engines.

The bounded Chromium/Firefox/WebKit set passes 15 tests, covering both controlled response gates, original selection restoration, fit/resizing, and real played behavior. The full affected Firefox spec passes 25 tests with one unchanged Chromium-only capture skipped, because every Play helper call now uses the navigation barrier. Scoped lint, strict editor typecheck, formatting, and diff checks pass.

Inspected corresponding Firefox captures use the failing viewport, 1440 × 900: `KF-C09GS4-play-root-ready.png` and `KF-C09GS4-editor-selection-restored.png`. Covering canonical CI on the repaired shipping SHA remains the final integration gate.
