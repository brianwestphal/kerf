# Local AI regressions

The [October 9 consumer adoption review](consumer-adoption-2026-10-09.md)
examines Hot Sheet 2 and Karwan Procurement tickets, commits, and browser
captures around KF-TMA3JT. It is observational evidence alongside the
provider-neutral regression harness below.

This directory is an internal authoring and regression tool. It is not a
leaderboard, a public comparison, or evidence that any particular model is
better than another.

The first three-run internal result and its limitations are recorded in
[`results/2026-09-12/findings.md`](./results/2026-09-12/findings.md).
Three additional Astra repeats, using the same frozen inputs and scorer, are
recorded in [`results/2026-09-13/findings.md`](./results/2026-09-13/findings.md),
with their [execution protocol](./results/2026-09-13/protocol.md). These replace
the requested Fable run by user direction; they do not measure Fable or model
equivalence.

`corpus.json` keeps seven task-shaped prompts separate from their scoring
oracles. Prompt files contain product needs only; component names, imports,
classes, and failure patterns remain in the oracle. The three conditions are:

- `none`: the task alone;
- `current-guidance`: a checked-in, hand-authored concise bundle derived from
  guidance immediately before production recipes landed, pinned by its own
  content hash and the full reference revision;
- `revised-recipes-catalog`: for suite v1, a checked-in snapshot of the exact
  revised guidance, canonical machine catalog, and production-backed recipe
  docs and sources used by the recorded runs. Later guidance changes cannot
  retroactively alter those manifests or scores.

Run `npm run check:ai-regressions` to validate schemas, prompts, catalog and
package references, context assembly, and adversarial scorer fixtures. It is
deterministic and belongs in the normal package check.

To score a response without calling a model:

```bash
npm run ai:regressions:score -- \
  --case compact-exclusive-choice \
  --response ai-regressions/fixtures/responses/compact-choice-valid.json
```

Prepare a provider-neutral request without calling a model:

```bash
npm run --silent ai:regressions:prepare -- \
  --case application-shell \
  --condition revised-recipes-catalog
```

The command emits the exact prompt, assembled context, source and content
hashes, and `response.schema.json`. An external runner supplies that JSON to a
fresh isolated model context and saves only the returned response JSON. The
repository deliberately has no network client or provider-specific adapter.
After all three conditions are present, `npm run ai:regressions:record -- ...`
scores them and writes a separate `run.schema.json` manifest containing the
exposed model identity/settings plus corpus, scorer, prompt, context, source,
and saved-response hashes. Keeping execution metadata outside the response
avoids asking an output to contain its own hash.

Suite-v2 scoring keeps the frozen v1 scorer intact while accepting equivalent
supported public wiring imports: `wireResizableRegions` from its dedicated UI
subpath or the UI root, and either `delegateActions` from `kerfjs/actions` or
`delegate` from `kerfjs`. The v2 overrides and fixtures are checked separately
from all v1 run manifests.

The default prepare, score, and record commands remain suite v1 so historical
automation cannot silently change. Pass `--suite 2` to opt into the descriptor
in `suite-v2.json`, the exact frozen `conditions-v2.json` guidance context, the v2
equivalent-import scorer, and `run-v2.schema.json`:

```bash
npm run --silent ai:regressions:prepare -- \
  --suite 2 --case navigation-sections --condition revised-recipes-catalog
npm run ai:regressions:score -- \
  --suite 2 --case navigation-sections --response path/to/response.json
```

Suite-v2 run manifests additionally hash the suite descriptor, overrides, and
public signature context. Audit selects the matching immutable context snapshot
and oracle from each manifest's schema version, so later guidance and measured
evidence cannot rewrite old raw responses or conclusions.

## Suite v3: contextual first-attempt quality

Suite v3 is a new, parallel repair-loop contract. It does not rescore or relabel
v1/v2 responses. `suite-v3.json` binds the versioned quality, request,
response, evidence, run, compatibility, contextual-corpus, and feedback-policy
contracts. Its cases ask for changes inside complete existing recipe files and
identify which files may be returned. All three policies receive the exact same
attempt-one `modelInput`; the condition and feedback policy live outside that
model-visible value. The preparer records one shared model-input digest so a
condition cannot accidentally gain different initial guidance:

```bash
npm run --silent ai:regressions:prepare -- \
  --suite 3 --case extend-application-navigation \
  --condition guidance-static-browser
```

The policies are `guidance-only` (one response, no feedback),
`guidance-static` (static and compile feedback), and
`guidance-static-browser` (static, compile, and browser feedback). A fresh
session is required for every case × condition × replicate cell; repair
attempts within that cell retain its session. The default protocol permits at
most three attempts. Final static, compile, browser, and bounded human review
measure every condition, but a stage is returned to the model only when the
policy permits it.

The stable diagnostic registry in `quality-contract-v3.json` covers component
selection, reuse of consumer-owned symbols, public API accuracy, wiring and
cleanup, composition legality, geometry ownership, static accessibility,
compile compatibility, browser interaction/keyboard/responsiveness, and five
bounded visual dimensions. Static, compile, browser, and human-visual records
are separate `evidence-v3.schema.json` documents tied to the same response
hash. A browser pass cannot erase a compile failure; a visual rating cannot be
substituted for a hard diagnostic. The helper validator also rejects unknown,
duplicate, or cross-stage diagnostic codes and ratings outside the 0–2 visual
scale.

Thresholds are targets for future tooling and measured cohorts, not CI claims:
all applicable hard diagnostics must pass per case, with suite targets of 90%
static hard passes, 90% compile passes, 85% browser passes, a 1.5 overall
visual mean, and no visual dimension below 1.25. Conclusions still require at
least three isolated runs per condition and two model/version identities.
Generation and human review remain opt-in and outside CI; deterministic checks
may replay checked-in responses and evidence.

Each run records ordered attempts, raw and parsed response hashes, provider and
model identity, settings, timing, token usage (or an explicit unavailable
reason), serialized context bytes, evidence/report hashes, terminal reason,
residual diagnostics, and diagnostic adjudication. The compatibility matrix
pins catalog/profile/report schema versions, the four explicit light-mode
browser contexts, the five visual dimensions used by this suite, and replay
rules. Doctor execution must use `cache: false`; browser execution must record
its URL, the explicit contexts, and AbortSignal forwarding. Browser evidence
also contains frozen case-specific interaction, keyboard, announcement, and
remount assertions; a generic evaluator pass alone is insufficient.

Canonical replay verifies every artifact hash, rejects absolute/traversing
paths and symlinks, validates requests, responses, evidence, and runs against
their pinned schemas, requires every frozen case diagnostic exactly once,
recalculates metrics, verifies current suite/compatibility/registry hashes, and
normalizes recorded timestamps.
Static evidence replays exactly. Browser artifact comparison is claimed only
when Node, platform, architecture, TypeScript, Playwright, browser engines, and
lockfile digest match; another environment reports `incompatible-environment`
instead of clean. See [workflow-v3.md](workflow-v3.md) for the recording layout,
metrics, compatibility, and release gates. The checked-in canned repair loop
exercises this protocol but is not model evidence.

`baseline-v3.json` intentionally records the current suite-v3 baseline as
unmeasured. The repository contains no responses to the contextual prompts, so
the isolated suite-v2 cohort cannot be reused as v3 evidence. `KF-PX9NKZ`
tracks the required measured multi-run, multi-model execution and recording of
compile, browser, and human-visual artifacts. Until that work exists, do not
state a v3 improvement or compare conditions using v2 numbers.

### Guidance variant: markdown component reference

`guidance-variants-v3.json` (schema `guidance-variants-v3.schema.json`) layers
opt-in guidance-representation experiments on suite v3 without touching its
frozen inputs. A variant replaces exactly one source of the shared
`conditions-v3.json` guidance and inherits one v3 feedback policy; everything
else in the attempt-one `modelInput` — prompt, case files, response contract,
response schema, and every other guidance source byte-for-byte and in order —
is identical to that policy's request.

`markdown-reference-guidance-only` asks whether assistants do as well with the
generated markdown reference in `ai/components/` as with the JSON catalog:

- **Replaced source.** `ai/component-catalog.json` is removed and, at the same
  position in the guidance, replaced by `ai/components/README.md` (the index of
  one-line purposes) followed by selected component pages.
- **Page selection: per case, from the case's own application files.** A page
  is included when a case `contextFiles` source already references its entry:
  an import of the entry's browser/module/CSS/registration/wiring path, a
  named `@kerfjs/ui` import of one of its exports or wiring helpers, or a
  `wa-*` tag or Web Awesome component registration. Pages follow catalog order.
  Recipe pages are excluded (`docs/recipes.md` is shared by both conditions),
  and the shared `webawesome.css` theme import selects nothing. Selection never
  reads the prompt or the scoring oracle, so it cannot leak the intended
  answer; a component the change needs but the files do not yet use is only
  discoverable through the index, which is exactly the one-shot limitation
  this variant measures.
- **Why not all pages.** The index plus all 124 pages is 750,068 guidance
  bytes, 16% larger than the JSON condition's 646,250, so it cannot answer the
  context-saving question.
- **Feedback policy.** `guidance-only`: one response, no feedback, compared
  against the `guidance-only` cells of the same case, model, and replicate.

Variants are not part of the default prepare output or the required measured
matrix. Once a model identity records any variant cell, the audit requires
that variant's full case × replicate 1,2,3 matrix too, with each cell in a
fresh session and exactly one attempt. A variant cell's attempt-one digest is
paired only with the same variant, never with the three policies.

Measured context size without a model (`npm run --silent
ai:regressions:measure-context`; context bytes are the UTF-8 length of the
canonical attempt-one `modelInput`, recorded as a run attempt's
`contextBytes`; tokens are a rough 4-bytes-per-token estimate, so record the
provider's real usage in the run):

| case                          | condition                        | guidance sources | guidance bytes | context bytes | est. tokens |
| ----------------------------- | -------------------------------- | ---------------: | -------------: | ------------: | ----------: |
| extend-application-navigation | guidance-only                    |                7 |        646,250 |       687,884 |     171,971 |
| extend-application-navigation | markdown-reference-guidance-only |               16 |        439,228 |       459,011 |     114,753 |
| add-list-selection-actions    | guidance-only                    |                7 |        646,250 |       686,072 |     171,518 |
| add-list-selection-actions    | markdown-reference-guidance-only |               17 |        441,679 |       459,881 |     114,970 |
| add-form-draft-status         | guidance-only                    |                7 |        646,250 |       686,111 |     171,528 |
| add-form-draft-status         | markdown-reference-guidance-only |               20 |        449,322 |       468,176 |     117,044 |

The markdown condition sends 32–33% fewer context bytes per request (about
218–229 KB, an estimated 55–57K tokens). These figures move whenever the
catalog, pages, or shared guidance change; re-run the measurement with the
campaign rather than quoting this table.

Running the comparison (paid and nondeterministic; never in CI):

The audit accepts measured variant cells only inside a complete suite-v3
campaign: every model identity must also carry the full three-policy matrix.
Run the variant as a fourth condition of the measured v3 campaign (KF-PX9NKZ)
rather than as a separate two-condition campaign.

1. Prepare all four conditions for every v3 case and save the requests:

   ```bash
   mkdir -p requests
   for c in extend-application-navigation add-list-selection-actions add-form-draft-status; do
     for k in guidance-only guidance-static guidance-static-browser markdown-reference-guidance-only; do
       npm --prefix ui run --silent ai:regressions:prepare -- \
         --suite 3 --case "$c" --condition "$k" > "requests/$c.$k.json"
     done
   done
   npm --prefix ui run --silent ai:regressions:measure-context > context-size.md
   ```

2. For each case × condition × replicate 1, 2, 3, and for at least two
   model/version identities, open a fresh isolated session, send that
   request's `modelInput` unchanged with fixed system instructions and
   settings, and save the raw provider bytes plus the parsed response JSON.
   Record provider, model, version, settings, session id, timing, token usage
   (or an unavailable reason), and `contextBytes`. `guidance-only` and the
   variant return no feedback, so each of their cells has exactly one
   attempt; the two feedback policies run their repair loops in the same
   session as described in [workflow-v3.md](workflow-v3.md).
3. Produce the static, compile, browser, and named human-visual evidence for
   every response and lay the campaign out as in
   [workflow-v3.md](workflow-v3.md), using the condition id as the
   `<condition>` directory. `npm --prefix ui run ai:regressions:compile --
--response <response> --out <compile-evidence>` gives an early,
   non-executing type signal before the full evidence exists.
4. Record each model's draft manifest, then audit the campaign:

   ```bash
   npm --prefix ui run ai:regressions:record-v3 -- \
     --draft ai-regressions/results-v3/<campaign>/<model>/draft.json \
     --out ai-regressions/results-v3/<campaign>/<model>/run.json
   npm --prefix ui run check:ai-regressions
   ```

5. Compare the variant with `guidance-only` per case and model: static and
   compile hard-pass counts, browser passes, the five visual means, residual
   diagnostics, context bytes, and real input tokens. Write the findings to
   `ai-regressions/results-v3/<campaign>/findings.md`, stating whether the
   markdown reference is non-inferior and what it saves; file a ticket for
   every page fact whose absence explains a regression.

To add static TypeScript evidence for a saved response without executing any
generated source:

```bash
npm run ai:regressions:compile -- \
  --response path/to/response.json \
  --out path/to/compile-evidence.json
```

The opt-in probe accepts only relative `.ts`, `.tsx`, `.d.ts`, and `.css`
response paths, compiles the code in an in-memory host with fixed options, and
activates the shipped `@kerfjs/ui/webawesome` JSX declaration boundary for the
catalog-supported `wa-*` elements without registering or executing them. It
records normalized diagnostics plus hashes for the raw response, compiler
options, TypeScript version, exact package versions, and their emitted
declaration sets. Its schema is `compile-evidence.schema.json`. This sidecar is
independent of the structural score and never executes response files,
configuration, or build scripts. Regenerate the human-readable declaration
context with `npm run ai:signatures:sync`; the normal check rejects stale output.

A response is JSON with a `files` object whose values are TypeScript/TSX/CSS
source strings. A missing recurring concept may also include
`followUp: { "suggested": true, "concept": "…" }`.

## Deterministic score boundary

The scorer derives imports and component/helper invocations from the TypeScript
AST. Copying a public class name does not receive component-reuse credit. It
also checks disposer/result capture, supported-but-not-preferred substitutions,
semantic layout classes, one inset owner per element, bounded scroll owners,
hard-coded spacing, CSS against the catalog's exact `publicClasses` boundary,
named native buttons, and explicit upstream escalation for a recurring missing
concept. `ListHeader` count rules inspect both JSX attributes and equivalent
direct calls whose props are an object literal: they reject a count without its
localized label, count/badge competition, numeric badges, label-concatenated
counts, and statically invalid count literals. Dynamic prop objects and count
expressions are deliberately left to the compile probe and runtime normalization
instead of being guessed structurally. Public-class-to-public-class selectors
are accepted; descendant tags, ids, attribute-only targets, and unlisted classes
are rejected.
Results keep reuse, wiring, layout, accessibility, and escalation separate;
there is no weighted composite.

These structural checks are not a substitute for building and interacting with
generated code. The opt-in compile probe covers only public type compatibility;
a later runner may add Playwright geometry, keyboard, contrast, reduced-motion,
and screenshot evidence. It must record the
exact model version and settings, prompt/context/source/scorer revisions and
hashes, and raw-output hash. The live Web Awesome declarations are generated
to `ai/webawesome-jsx-signatures-v1.md`; the older suite-v2 signature document
and context snapshot remain immutable so checked-in measurements replay.
Historical manifests also replay with the stricter public-boundary rule whose
hash they recorded; their saved scores and findings are not relabeled by the
corrected current oracle.
Paid or nondeterministic generation must never be
part of push or pull-request CI, and canned fixtures must never be described as
measured model improvement.

Use at least three isolated runs for each compared condition and at least two
available model/version identities when drawing a conclusion. Keep system
instructions, context ordering, and settings fixed; record temperature and seed
when exposed, without calling seeded generation deterministic. Report per-run
static-hard-pass counts and dimension results. Mark canned-response and static-only
results `inferred`; mark results `measured` only after the named model actually
ran and the saved output hash was scored. Each condition must use a fresh
session; record those session identities separately in `conditionSessions` so a
combined run manifest does not imply that conditions shared context. Within a
condition session, the seven requests run in stable corpus order, recorded as
`requestOrdinal`; this suite measures condition-level, not prompt-level,
isolation. A provider
or model name that did not execute must never appear in measured results.

## Bounded visual review

For generated code that builds, capture wide, intermediate, and narrow
viewports plus 200% zoom. Review five dimensions on the same explicit scale:

- hierarchy: `0` unclear scope, `1` usable with competing emphasis, `2` clear
  application/page/section priority;
- rhythm: `0` arbitrary or doubled spacing, `1` isolated inconsistencies, `2`
  one coherent semantic spacing system;
- density: `0` clipped or undersized controls, `1` usable but uneven, `2`
  compact and consistently operable;
- alignment: `0` visibly broken columns/edges, `1` minor drift, `2` shared
  columns and intentional edges;
- responsive behavior: `0` overflow/lost actions/competing scrolling, `1`
  usable with awkward wrapping, `2` deliberate relocation and one scroll owner
  per pane.

Geometry, overflow, hit-target, focus, and scroll-owner assertions may be
machine checks. The five visual scores require recorded human review and never
gate pull requests. Preserve screenshots and reviewer notes as internal ticket
evidence, not public comparative marketing.

Suite v3 records hierarchy, rhythm, density, alignment, and scroll ownership
on this same 0–2 scale. Responsive behavior is instead a deterministic browser
diagnostic across the frozen wide/intermediate/narrow/200%-zoom matrix. Every
human-visual record names its reviewer, hashes its screenshots, and includes a
written rationale; it remains non-CI evidence.
