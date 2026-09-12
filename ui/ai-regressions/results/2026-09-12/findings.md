# 2026-09-12 internal regression findings

This is internal engineering evidence, not a leaderboard or a public model
comparison. Three model identities each ran the same seven neutral tasks in
three fresh condition-level sessions at medium reasoning effort. Within each
session the seven prompts ran in stable corpus order; prompts did not each
receive a fresh session. Temperature and seed were not exposed. Saved response,
prompt, context, source, corpus, catalog, schema, scorer, and parser identities
are recorded in each `run.json` manifest.

| Run | Model identity exposed by runtime | No guidance | Frozen guidance | Revised recipes + catalog |
| --- | --- | ---: | ---: | ---: |
| `astra-1` | `gpt-6-astra` | 0/7 | 0/7 | 2/7 |
| `sol-1` | `gpt-5.6-sol` | 0/7 | 0/7 | 2/7 |
| `terra-1` | `gpt-5.6-terra` | 0/7 | 0/7 | 1/7 |
| **Aggregate static hard passes** | three isolated runs | **0/21** | **0/21** | **5/21** |

The explicit dimension totals show where the change occurred:

| Dimension | No guidance | Frozen guidance | Revised recipes + catalog |
| --- | ---: | ---: | ---: |
| Required component reuse | 0/21 | 9/21 | 20/21 |
| Required wiring | 0/15 | 3/15 | 3/15 |
| Layout/CSS ownership | 6/21 | 8/21 | 15/21 |
| Basic static accessibility | 18/21 | 21/21 | 21/21 |
| Missing-concept escalation | 3/3 | 3/3 | 3/3 |

These are measured static-structure results from the named executions. They
show a repeatable association between the revised context and better component
reuse/layout-contract adherence. It is an inference—not a measured
attribution—that recipes, catalog metadata, or their greater context detail
individually caused the improvement. The run does not score runtime behavior or
the five-axis visual rubric because generated answers were not integrated and
built; no visual-quality claim is made.

The remaining failures are also useful. All three revised runs substituted a
custom delegated-event helper for canonical `delegateActions` wiring in the
compact choice, navigation, and master-detail tasks. All three honestly
escalated the missing command-palette concept, but all missed at least part of
the canonical `layout.css` + `kui-control-cluster` boundary. Follow-ups:

- `KF-4SNNHC` — make recipe wiring boundaries copyable outside the catalog;
- `KF-HNCMKD` — clarify thin-adapter layout rules for missing concepts;
- `KF-F3NGSB` — repeat the frozen corpus with Fable when a Fable-capable runner
  is available.

Deterministic fixture replay separately proves that CI rejects a wrong Web
Awesome substitution, copied class names without real component invocation,
duplicated navigation primitives, competing inset owners/private CSS/hardcoded
spacing, and malformed TSX. Those fixture outcomes are inferred test evidence,
not model measurements.
