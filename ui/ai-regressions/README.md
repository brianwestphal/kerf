# Local AI regressions

This directory is an internal authoring and regression tool. It is not a
leaderboard, a public comparison, or evidence that any particular model is
better than another.

The first three-run internal result and its limitations are recorded in
[`results/2026-09-12/findings.md`](./results/2026-09-12/findings.md).

`corpus.json` keeps seven task-shaped prompts separate from their scoring
oracles. Prompt files contain product needs only; component names, imports,
classes, and failure patterns remain in the oracle. The three conditions are:

- `none`: the task alone;
- `current-guidance`: a checked-in, hand-authored concise bundle derived from
  guidance immediately before production recipes landed, pinned by its own
  content hash and the full reference revision;
- `revised-recipes-catalog`: live guidance, the canonical machine catalog, and
  the production-backed recipe docs and sources.

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

A response is JSON with a `files` object whose values are TypeScript/TSX/CSS
source strings. A missing recurring concept may also include
`followUp: { "suggested": true, "concept": "…" }`.

## Deterministic score boundary

The scorer derives imports and component/helper invocations from the TypeScript
AST. Copying a public class name does not receive component-reuse credit. It
also checks disposer/result capture, supported-but-not-preferred substitutions,
semantic layout classes, one inset owner per element, bounded scroll owners,
hard-coded spacing, selectors that reach through a Kerf root, named native
buttons, and explicit upstream escalation for a recurring missing concept.
Results keep reuse, wiring, layout, accessibility, and escalation separate;
there is no weighted composite.

These structural checks are not a substitute for building and interacting with
generated code. A later opt-in runner may add compile, Playwright geometry,
keyboard, contrast, reduced-motion, and screenshot evidence. It must record the
exact model version and settings, prompt/context/source/scorer revisions and
hashes, and raw-output hash. Paid or nondeterministic generation must never be
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
