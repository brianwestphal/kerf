# Play-frame response latency under parameter analysis (KF-GCZ2AP)

The Firefox Play failure in main run 42787177304 recorded a 4,519 ms child-HTML
response, 4,518.8 ms of it server wait, while two parameter/compiler tests ran
concurrently ([editor Play readiness](./2026-11-10-editor-play-readiness.md)).
This profile asks whether project-type analysis can delay that response, and
how.

## Mechanism

Both the Play specs and the parameter specs use the editor's `vite preview`
server (`editor/playwright.config.ts`, `EDITOR_URL`). That server mounts
`editorFileMiddleware` (`ui/vite-editor.mjs`), whose
`/__kerf-ui-editor/api/types` route creates and calls the TypeScript project
type service (`ui/view/project-types.mjs`) **inside the request handler, on
the server's event loop**. The language service's work is synchronous. While
an analysis runs, the same process can't answer any other request, including
the static Play child HTML (`/?kerf-ui-play=…`).

## Measurement

Harness: `editor/scripts/play-latency.mjs` against a locally built `vite preview` of the editor.
It takes 40 sequential baseline requests for the Play child HTML, then polls
that HTML every 25 ms while the types API answers:

- one cold `analyze` request (first service creation);
- five warm `analyze` requests, one at a time;
- two concurrent `analyze` requests.

The machine was an Apple M5 Pro (15 cores) running Node 26.13.0, otherwise
idle, at commit `49965924`.

| Condition                        | Analysis duration |                                Play HTML latency while it ran |
| -------------------------------- | ----------------: | ------------------------------------------------------------: |
| Baseline (no analysis)           |                 — |                              0.3 ms median, 0.6 ms max (n=40) |
| Cold analysis (service creation) |          1,004 ms |                                                        976 ms |
| Warm analysis, five runs         |        180–196 ms |       181–196 ms each, equal to the analysis it waited behind |
| Two concurrent analyses          | 196 ms and 376 ms | 196 ms; the second analysis waited for the first (serialized) |

Every HTML request issued during an analysis completed only when that
analysis did. The server answered nothing else in between. Concurrent analyses
queue rather than overlap, so each extra one adds its full duration.

## Interpretation and limits

- **Causal path established:** project-type analysis blocks the preview
  server's event loop, so it delays the Play child HTML for the full duration
  of any analysis in progress (here up to about 1 s cold, about 0.2 s warm),
  and for the sum of any queued behind it. Cold initialization, not transport
  or filesystem work, dominates the first request.
- **Not reproduced:** the 4.5 s figure. That needs the CI runner's slower,
  2-vCPU Firefox job with two parameter specs issuing their analyze and
  validate requests concurrently. Several queued cold or validate requests on
  such a runner could plausibly add up to seconds, but this profile measured
  about 1 s on one fast machine. The CI attribution remains an inference, not
  a measurement.
- **Not measured:** `validate` requests (whole-document checking), which are
  likely heavier than `analyze`; their blocking would follow the same path.
- **Unchanged:** the KF-C09GS4 readiness barrier (actual iframe URL plus
  `DOMContentLoaded`) and the existing five-second content assertion. They
  remain correct; this profile explains why the barrier can wait.

## Recommendation

Run the project-type service off the server's event loop, in a worker thread
owned by `editorFileMiddleware`, so analysis never stalls unrelated responses
in the dev server, the preview server or an application's host. This is
tracked as a follow-up. Do not raise test timeouts to absorb the stall.
