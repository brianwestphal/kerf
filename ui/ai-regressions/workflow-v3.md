# Suite-v3 AI-first workflow

Suite v3 measures whether an authoring model can change a realistic existing
Kerf application, then whether deterministic feedback helps it repair the
change. It does not rank models. Every comparison is paired by case, exact
model/version, settings, and replicate.

## Controlled conditions

The attempt-one model input is byte-identical across all three policies. It
contains the same prompt, frozen guidance, application files, response
contract, and response schema. Condition identity is harness metadata and is
not sent to the model.

1. `guidance-only` records one response and returns no tool feedback.
2. `guidance-static` may return normalized static and compile diagnostics.
3. `guidance-static-browser` may additionally return normalized browser
   diagnostics.

Each case × condition × replicate uses a fresh session. Repair attempts retain
only that cell's session and include the current complete editable files plus
the permitted normalized diagnostics. No condition exceeds `maxAttempts`.
Final evaluation runs every applicable stage for every condition even when a
stage was not available as feedback.

Doctor runs use full mode with cache disabled and its browser stage disabled.
The harness calls the evaluator explicitly so it can name a URL, forward the
same AbortSignal, and pass the four contexts from `compatibility-v3.json`
rather than relying on evaluator defaults. The browser stage combines evaluator
diagnostics with case-specific interaction, keyboard, live-announcement, and
repeated mount/unmount assertions.

## Evidence and replay

Store one campaign below `ai-regressions/results-v3/<campaign>/`. A model cell
uses `<model>/<replicate>/<condition>/<case>/attempt-N/` and preserves the
canonical request, raw provider bytes, parsed response, doctor/evaluator raw
and normalized reports, stage evidence, and browser artifacts. Every manifest
reference is relative and SHA-256-addressed. Absolute paths, traversal, and
symlinks are invalid.

Canonical JSON recursively sorts object keys, uses UTF-8 and LF, and ends in
one newline. Raw provider bytes are hashed without normalization. Report replay
normalizes `recordedAt` and `startedAt`. Replay validates every request,
response, evidence record, and run against its pinned schema, then requires
exactly one record for every diagnostic named by the frozen case. Static replay
requires the pinned tool,
schema, rule, catalog, dependency, and lockfile inputs. Exact browser and
screenshot comparison additionally requires the recorded OS, architecture,
Playwright, and nonempty pinned Chromium, Firefox, and WebKit engine versions.
Missing engine versions are incompatible, even when both sides are otherwise
empty. A mismatch is reported as
`incompatible-environment`; it is never interpreted as a pass.

The recorder and auditor compare suite, compatibility, and shared diagnostic
registry hashes with freshly read repository artifacts. They compare the
manifest environment with an independently detected environment or an explicit
`--environment` capture; they never use the manifest itself as current-state
evidence.

The deterministic repository gate runs
`node scripts/audit-ai-regression-results-v3.mjs`. It always replays the canned
broken-to-clean fixture and audits any checked-in campaigns. Paid generation is
opt-in and belongs to KF-PX9NKZ, outside CI.

## Reported metrics

Report first-pass hard success and terminal clean convergence as explicit
numerators and denominators. Report repair iterations as a distribution,
terminal residuals by stable diagnostic and stage, and tool findings as
true-positive, false-positive, disputed, or unreviewed. A false-positive rate
uses only adjudicated findings as its denominator.

Keep provider latency, deterministic-tool time, browser time, and total runtime
separate. Report input, output, cached-input, reasoning, and total tokens when
the provider supplies them; otherwise record an unavailable reason. Always
record serialized context bytes. Missing evidence and tool failure remain
missing/failure and are never coerced to clean.

Human review uses only hierarchy, rhythm, density, alignment, and scroll
ownership on the recorded 0–2 rubric. Preserve the named reviewer, rationale,
and all four viewport screenshots. Screenshot references and hashes are unique
and map exactly one each to `wide`, `intermediate`, `narrow`, and `zoom-200`.
Every dimension requires exactly one rating and written rationale. These bounded
ratings are subjective evidence, not an
automated or general aesthetic-quality score.

## Release gates

- all contracts and schemas remain pinned to the compatibility matrix;
- attempt-one model input digests match across the three policies;
- sessions are unique across cells and stable only within a repair loop;
- feedback never crosses its policy boundary;
- every artifact path and digest replays safely and metrics recompute exactly;
- doctor cache is disabled and browser URL, contexts, AbortSignal forwarding,
  and case assertions are recorded;
- canned replay is deterministic and environment incompatibility fails closed;
- measured conclusions contain exactly the complete frozen
  case × condition × replicates 1,2,3 matrix for each of at least two
  model/version identities; duplicate or unbalanced cells fail the audit;
- raw artifacts contain no secrets or developer-specific absolute paths;
- every reproducible residual gap has a Hot Sheet follow-up.

Until KF-PX9NKZ performs the paid runs and named visual reviews, the v3 baseline
remains `unmeasured`; repository-local protocol work cannot claim otherwise.
