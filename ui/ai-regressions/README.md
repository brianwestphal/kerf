# Local AI regressions

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
