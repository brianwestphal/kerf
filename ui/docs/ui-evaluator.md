# Browser UI quality evaluator

`kerf-ui-evaluate` is the runtime half of Kerf's UI integration checks. The
static [`kerf-ui-analyze`](./ui-analyzer.md) command finds source-level ownership
mistakes; this Playwright-backed evaluator loads a running application and
records what a browser can establish about the rendered result.

Install Playwright beside `@kerfjs/ui` and install its browsers in CI:

```bash
npm install --save-dev playwright
npx playwright install --with-deps chromium firefox webkit
```

Start the application separately, then evaluate its URL from the project root:

```bash
npx kerf-ui-evaluate \
  --url http://127.0.0.1:4173 \
  --root . \
  --output artifacts/kerf-ui
```

The command discovers and resolves the same `.kerf-ui-profile.json` layers as
the static analyzer. By default it runs Chromium, Firefox, and WebKit through
six contexts: wide, intermediate, narrow, a half-width CSS viewport representing
200% browser zoom, dark color scheme, and reduced motion. Use
`--browser chromium` for a fast local loop; keep all three engines in CI.

## CLI options

| Option                 | Meaning                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--url <url>`          | The running application to evaluate (required).                                                                         |
| `--root <path>`        | Workspace root (default: the current directory). Other paths resolve against it.                                        |
| `--start <path>`       | Directory where profile discovery starts (default: the root), for one application in a monorepo.                        |
| `--profile <path>`     | Use this profile in place of the package-default application UI profile Kerf ships.                                     |
| `--browser <list>`     | Comma-separated engines: `chromium`, `firefox`, `webkit` (default: all three).                                          |
| `--output <directory>` | Evidence directory (default: `kerf-ui-evidence`).                                                                       |
| `--report <path>`      | Report JSON path (default: `<output>/report.json`).                                                                     |
| `--timeout <ms>`       | Per-operation timeout (default: `15000`).                                                                               |
| `--settle <ms>`        | Post-navigation settle delay (default: `100`).                                                                          |
| `--retention <policy>` | Screenshot retention: `on-failure` (default), `always`, or `never` (see [Report and artifacts](#report-and-artifacts)). |
| `--format <format>`    | Terminal output: `text` (default) or `json` (the full report). The report file is written either way.                   |
| `--no-fail`            | Exit 0 even when objective diagnostics fail, for evidence-collection jobs.                                              |
| `-h`, `--help`         | Print usage and exit 0.                                                                                                 |

The command prints the report path on standard error. A flag missing its
value, an unknown argument, or an invalid number prints
`kerf-ui-evaluate: <message>` and exits 2.

## Objective checks

The versioned JSON report uses stable `KUI-B###` codes and includes the context,
selector, measured evidence, and a repair-oriented message for each finding.

| Code       | Browser fact                                                                     |
| ---------- | -------------------------------------------------------------------------------- |
| `KUI-B001` | Navigation, timeout, or browser-context failure                                  |
| `KUI-B010` | Horizontal page overflow                                                         |
| `KUI-B011` | Interactive content clipped by a hidden/clip owner or entirely off viewport      |
| `KUI-B012` | An in-viewport action covered at its center point                                |
| `KUI-B020` | Positive `tabindex` overriding DOM focus order                                   |
| `KUI-B021` | Stable per-element focus reaches an invisible control or causes no visual change |
| `KUI-B022` | Any ARIA widget role is absent from sequential keyboard order                    |
| `KUI-B023` | A representative action does not activate with Enter                             |
| `KUI-B030` | An interactive control has no text alternative                                   |
| `KUI-B040` | Alpha-composited interactive text is below its WCAG AA contrast threshold        |
| `KUI-B050` | A button-like target is smaller than 44 × 44 CSS pixels                          |
| `KUI-B060` | A pane or declared scroll scope has multiple active scroll owners                |
| `KUI-B070` | Elements in an explicitly declared alignment group drift by more than one pixel  |
| `KUI-B080` | A cataloged root computes geometry assigned to `none`, `parent`, or `child`      |

For a representative application action that must be operated in the generic
evaluation, add `data-kui-evaluator-action` to its owning native control or
keyboard-operable custom control. The evaluator focuses it, presses Enter, and
accepts a click event or controlled `aria-expanded`, `aria-pressed`,
`aria-checked`, or `value` transition as evidence. This attribute is test
instrumentation, not an application event hook.

Alignment checks are similarly explicit: put `data-kui-align-group` on the
shared container and `data-kui-align-edge` on two or more elements whose logical
start edges must align. Use `data-kui-scroll-scope` only for an application-owned
scope that is not a `.kui-pane`.

Target size (`KUI-B050`) measures the area the pointer can actually reach, not
just the border box. When a control's box is under 44 × 44, the evaluator
hit-tests outward from its center with `elementFromPoint`, so a transparent hit
layer (a positioned `::before`/`::after` that receives pointer events, as on the
`ListHeader` action) counts toward the target, while a pseudo-element with
`pointer-events: none`, a clipping ancestor, or an overlapping neighbor does
not. Where the probe reaches the viewport edge it mirrors the opposite side's
reach; a control whose center is off-screen or covered keeps its border box.
The diagnostic evidence reports the measured `width`/`height` and the border
`box`.

Compact density is a documented exception. Inside `[data-density="compact"]` —
the compact `List`/`ListHeader` family, whose rows are 36px tall — a target
still needs the full 44px width but only the 36px row height, because a taller
hit layer would reach into the neighboring row. The evidence's `required` field
names the floor that applied (`44×44`, or `44×36` in compact density).

Accessible names follow ARIA/native naming inputs, including labels, referenced
content with `aria-hidden` descendants removed, and native input values.
Geometry checks use each catalog entry's explicit `boundaries.rootClass`; the
order of `publicClasses` has no runtime meaning.

Profile exceptions apply only when both the `KUI-B###` rule and `target` match
exactly. For the browser evaluator, `target` is the evaluated `startDirectory`
relative to `workspaceRoot` (for example `apps/settings`); wildcards and broad
workspace targets remain invalid.

## Report and artifacts

The public Node API is available at `@kerfjs/ui/evaluator`:

```js
import { evaluateUi } from '@kerfjs/ui/evaluator';

const abortController = new AbortController();
const report = await evaluateUi({
  url: 'http://127.0.0.1:4173',
  workspaceRoot: process.cwd(),
  retention: 'on-failure',
  signal: abortController.signal,
});
if (!report.summary.passed) process.exitCode = 1;
```

The default output is `kerf-ui-evidence/report.json`; its schema ships at
`@kerfjs/ui/evaluator/report.schema.json`. Every retained screenshot has a
SHA-256 digest. Retention is deterministic:

- `on-failure` (default) removes current and stale evaluator screenshots when
  every objective check passes;
- `always` retains one full-page PNG per browser/context;
- `never` removes current and stale evaluator screenshots and writes only the
  focused DOM/computed-style evidence in the report.

`--timeout` bounds navigation and browser operations, while `--settle` provides
one small explicit post-navigation delay for applications with asynchronous
startup. A timeout becomes `KUI-B001` evidence rather than an unstructured crash.
A screenshot that cannot be captured is its own `KUI-B001` diagnostic; the
context's other checks and evidence are still reported.
The Node API accepts an `AbortSignal`; cancellation closes the active browser,
removes screenshots from the interrupted run, does not write a partial report,
and rejects with `AbortError`.
The CLI exits `1` for objective failures, `2` for invocation/profile errors, and
`0` for a pass; `--no-fail` is available only for evidence-collection jobs.

The rest of `@kerfjs/ui/evaluator` (types ship in `evaluator/index.d.mts`):

| Export                                  | Purpose                                                                                                                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evaluateUi(options)`                   | Runs the evaluation above. Beyond the CLI's options it accepts `contexts` (a custom matrix), `recordedAt`, a preloaded `playwright` module, and `signal`.                                    |
| `formatUiEvaluationText(report)`        | Renders a report as the CLI's terminal text.                                                                                                                                                 |
| `buildEvaluationContexts(overrides?)`   | Returns the default six-context matrix, or normalizes custom contexts (filling `reducedMotion`) for `evaluateUi`'s `contexts`.                                                               |
| `contrastRatio(foreground, background)` | The WCAG contrast ratio of two CSS colors or RGB(A) arrays, compositing a translucent foreground over the background; `null` when a color cannot be parsed.                                  |
| `createEvaluationReport(options)`       | Assembles a schema-version-1 report from `target`, `profileFiles`, `contexts`, `diagnostics`, `artifacts`, `recordedAt`, and `retention`, with its summary and unrecorded subjective review. |
| `SUBJECTIVE_REVIEW_RUBRIC`              | The named human-review rubric (`{ id, prompt }`) every report carries; see below.                                                                                                            |
| `UI_EVALUATION_RULES`                   | Every `KUI-B###` rule: `{ severity, title }` by id.                                                                                                                                          |
| `UI_EVALUATION_SCHEMA_VERSION`          | The report schema version (`1`).                                                                                                                                                             |

## Human visual review stays human

Hierarchy, rhythm, density, aesthetic fit, and the perceived clarity of
alignment or scroll ownership are not inferred from computed pixels. Every
report carries the suite-v3 0–2 review rubric with `status: "not-recorded"` and
an empty rating list. An AI agent may use the retained screenshots as review
input, but it must record a named reviewer and rationale in the separate
human-visual evidence workflow; it must not turn a subjective rating into a
`KUI-B###` assertion.

The deterministic good/bad downstream fixtures and three-engine integration
suite live under `tests/fixtures/ui-evaluator/` and
`tests/integration/ui-evaluator-downstream.test.ts`.
