# 2026-09-13 suite-v2 Astra findings

KF-4SNNHC and KF-HNCMKD add copyable stable-root wiring and a bounded
application-local command-palette adapter to the revised guidance context. At
the user's direction, this post-change rerun uses `gpt-6-astra` rather than
Fable. It is an Astra measurement and does not establish equivalence between
those models.

One fresh condition-level session produced all seven responses for each of the
three suite-v2 conditions. The [protocol](./protocol.md) records isolation,
known settings, frozen inputs, and interpretation limits. The underlying model
snapshot, temperature, and seed are not exposed.

## Deterministic structural results

| Condition | Static hard passes | Reuse | Wiring | Layout | Basic static accessibility | Escalation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| No guidance | 0/7 | 0/7 | 0/4 | 2/7 | 6/7 | 1/1 |
| Frozen current guidance | 1/7 | 4/7 | 0/4 | 3/7 | 7/7 | 1/1 |
| Revised recipes + catalog | 6/7 | 7/7 | 4/4 | 6/7 | 7/7 | 1/1 |

The current-guidance hard pass is `tokenized-search`. The revised condition
hard-passes `application-shell`, `compact-exclusive-choice`,
`navigation-sections`, `workspace-states`, `master-detail-dialog`, and
`tokenized-search`.

All four applicable revised responses satisfy suite-v2's supported public
wiring checks, including stable delegated actions and retained cleanup. The
revised missing-concept response imports `layout.css`, uses `.kui-layout`, owns
one `.kui-surface-body` inset, groups footer actions with
`.kui-control-cluster`, and explicitly identifies the command palette as an
application adapter because Kerf UI does not export that concept. Its only
structural failure is `layout:scroll-owners`: it adds one bounded
`.kui-scroll-owner` for results where the frozen case definition allows zero.
That isolated oracle failure should not be described as missing the adapter or
control-group guidance.

This cohort is compatible with the intended ticket outcomes, but it is one
small nondeterministic repeat. The simultaneous addition of recipes, complete
signatures, adapter guidance, and suite-v2 equivalent-import scoring prevents a
causal claim about any single source. Suite-v1 evidence remains separate and is
not rescored.

## Non-executing compile probe

| Condition | Responses compatible with pinned declarations |
| --- | ---: |
| No guidance | 0/7 |
| Frozen current guidance | 0/7 |
| Revised recipes + catalog | 6/7 |

The six structurally passing revised responses also compile in the in-memory
probe. The revised missing-concept response compiles as well, so its static hard
failure is confined to the scroll-owner rule. The only revised compile failure
is `master-detail-dialog`, whose otherwise structurally passing TSX uses
`wa-dialog` and `wa-button`; the probe reports eight TS2339 diagnostics because
those Web Awesome JSX intrinsic declarations are not present in the pinned
environment. KF-BYN78M already tracks publication of those declarations.

The unguided and frozen-current responses mainly fail on guessed JSX event,
component-prop, `key`, and `ref` shapes. Compile sidecars are evidence of public
type compatibility only: they do not execute generated code, validate browser
behavior, establish interaction accessibility, or assess responsive visual
quality.

## Verification boundary

The measured manifest hashes every raw response, prompt, condition context,
schema, suite descriptor, scorer layer, override, public signature context,
and the implementation base revision. The normal UI gate replays this run and
all six historical v1 manifests exactly, validates both immutable context
snapshots, runs lint and TypeScript checks, runs unit and bundle tests, builds
the package and demo, and checks the packed public surface. Repository-root
checks cover the broader build and test matrix. These repository checks do not
turn generated snippets into runtime-tested applications.
