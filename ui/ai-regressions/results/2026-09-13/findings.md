# 2026-09-13 internal Astra repeat findings

KF-F3NGSB (repeat the UI authoring corpus) uses Astra in place of Fable by
explicit user direction. These are actual `gpt-6-astra` executions, not Fable
measurements or evidence of equivalence between those models. This is internal
engineering evidence, not a leaderboard or public comparative claim.

Three repeats cover seven tasks under each of three conditions: nine fresh
condition-level sessions and 63 preserved response artifacts. Sessions use
medium reasoning with no inherited conversation. Each session reads the same
seven requests in corpus order; prompts within a condition are not independent
sessions. The underlying model build, temperature and seed are not exposed.
The [protocol](./protocol.md) describes input preparation, isolation and the
execution instruction. Each run manifest records session identities, exposed
settings, source revisions, and response/prompt/context/schema/scorer hashes.
The folder date is local Asia/Manila; manifest timestamps are UTC.

## Measured frozen-scorer results

| Run manifest | No guidance | Frozen current guidance | Revised recipes + catalog |
| --- | ---: | ---: | ---: |
| [astra-1](./astra-1/run.json) | 0/7 | 0/7 | 2/7 |
| [astra-2](./astra-2/run.json) | 0/7 | 0/7 | 2/7 |
| [astra-3](./astra-3/run.json) | 0/7 | 0/7 | 2/7 |
| Aggregate static hard passes | 0/21 | 0/21 | 6/21 |

Both passing tasks in every revised repeat are `workspace-states` and
`tokenized-search`. All other tasks fail at least one required structural
check. This repeats the earlier September 12 Astra run's 0/7, 0/7, 2/7
hard-pass pattern; the new cohort is reported separately rather than pooled
with the older mixed-model cohort.

Per-repeat dimensions keep the same denominators: seven reuse/layout/basic
accessibility checks, five applicable wiring cases and one escalation case.

| Run / condition | Reuse | Wiring | Layout | Basic static accessibility | Escalation |
| --- | ---: | ---: | ---: | ---: | ---: |
| astra-1 / none | 0/7 | 0/5 | 2/7 | 6/7 | 1/1 |
| astra-1 / current | 4/7 | 1/5 | 2/7 | 7/7 | 1/1 |
| astra-1 / revised | 7/7 | 1/5 | 4/7 | 7/7 | 1/1 |
| astra-2 / none | 0/7 | 0/5 | 2/7 | 7/7 | 1/1 |
| astra-2 / current | 4/7 | 1/5 | 2/7 | 7/7 | 1/1 |
| astra-2 / revised | 7/7 | 1/5 | 5/7 | 7/7 | 1/1 |
| astra-3 / none | 0/7 | 0/5 | 2/7 | 7/7 | 1/1 |
| astra-3 / current | 4/7 | 0/5 | 3/7 | 7/7 | 1/1 |
| astra-3 / revised | 7/7 | 1/5 | 6/7 | 7/7 | 1/1 |
| Aggregate / none | 0/21 | 0/15 | 6/21 | 20/21 | 3/3 |
| Aggregate / current | 12/21 | 2/15 | 7/21 | 21/21 | 3/3 |
| Aggregate / revised | 21/21 | 3/15 | 15/21 | 21/21 | 3/3 |

In this cohort, revised context is associated with consistently higher
required-component reuse and more layout checks passing. All three revised
repeats still miss the exact resize wiring check, all three delegated-action
checks, and the missing-concept `kui-control-cluster` check. Layout spacing
checks also fail for one navigation response and two master-detail responses.
The following limitations prevent interpreting those counts as runtime defects
or attributing the differences to recipes alone.

## Interpretation and actionable failures

The frozen scorer measures structural checks, not successful compilation,
runtime interaction, full accessibility or visual quality. None of these
generated programs was integrated, built or browser-tested. The repository's
passing checks validate its implementation and deterministic artifact replay,
not the correctness of the proposed programs.

Source review distinguishes actual risks from scorer-specific failures:

- `astra-1/revised-recipes-catalog/application-shell.json` guesses `onResize`
  and `onResizeEnd` callback options. The actual public helper in
  `ui/src/wire-resizable-regions.ts` requires `onCommit` and optionally accepts
  `onPreview`, each receiving a change object. Component-choice credit cannot
  detect that mismatch. The revised context does not include complete public
  prop/helper signatures. KF-BZTZFE (public signatures and opt-in compile
  probes) tracks that gap.
- The same response imports the resize helper from its valid dedicated
  `@kerfjs/ui/wire-resizable-regions` export. The frozen oracle requires that
  helper from `@kerfjs/ui/resizable-region`, so that wiring failure is not by
  itself evidence of an invalid import. Keep this separate from the incorrect
  callbacks; KF-BZTZFE also tracks the accepted-import boundary.
- The frozen oracle requires `delegateActions()` for three tasks, while
  `ui/ai/skill.md` explicitly permits `delegate()` or `delegateActions()`.
  Missing the exact required call is not proof that documented delegation is
  broken. KF-4SNNHC (copyable recipe wiring) already tracks portable wiring
  examples; its scope note now distinguishes valid alternatives from actual
  missing lifecycle behavior.
- The CSS scanner can reject descendant selectors targeting catalog-declared
  public anatomy. KF-Y2GJ0W (public CSS/scoring alignment) tracks that oracle
  mismatch. Raw layout failures therefore must not all be described as private
  DOM coupling.
- KF-HNCMKD (thin-adapter layout guidance) remains the existing follow-up for
  recurring concepts that need an upstream primitive and a bounded local
  adapter. A suggested follow-up in a model response is only escalation
  evidence, not an implemented component or a newly created product ticket.

The September 12 artifacts are unchanged. This repeat cohort uses identical
prompt/context and scorer identities, but only one exposed model alias. It
does not supply new independent model identities, identify a model snapshot,
or isolate the causal contribution of recipes from the catalog or additional
context. No result justifies changing the scorer retroactively or presenting
the small corpus as a model-quality ranking.

## Verification

- All 63 saved response files match the submitted temporary artifacts byte for
  byte; all nine condition session identities are distinct, and protocol hashes
  match the preserved protocol.
- Harness, context and prompt identities match the September 12 Astra baseline;
  no corpus, source-context, scorer or older result file changed.
- `ui`: `npm run check` passed lint, typecheck, 39 unit tests, 12 bundle tests,
  coverage, build, catalog/recipe/guidance checks and packaging checks. After
  saving the full cohort, `npm run check:ai-regressions` passed all eight scorer
  fixtures and exact replay of all six measured run manifests.
- Repository root: `npm run check` passed lint, typecheck, 1,558 core tests,
  16 dist tests, 836 full-dist tests, production build, typing/documentation
  checks and bundle budgets. `git diff --check` passed.

These are repository and artifact checks only; generated program compilation,
browser behavior and the human visual rubric remain unmeasured, with the
compile-evidence gap tracked by KF-BZTZFE (public signatures and compile probes).
