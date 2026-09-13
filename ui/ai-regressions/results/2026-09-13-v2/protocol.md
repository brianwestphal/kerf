# Suite-v2 Astra rerun protocol

KF-4SNNHC and KF-HNCMKD rerun the seven-task UI authoring corpus after the
copyable recipe-wiring and missing-concept adapter guidance changes. The user
requested `gpt-6-astra` in place of the tickets' earlier Fable comparison. This
is an Astra execution; it does not measure or claim equivalence to Fable.

The run contains the same seven tasks under `none`, `current-guidance`, and
`revised-recipes-catalog`: three fresh condition sessions and 21 response
artifacts. Every session uses medium reasoning and `fork_turns: none`.
Temperature, seed, the underlying model build, and the complete provider system
envelope are not exposed. The recorded model version is therefore the runtime
alias, not an independently identified snapshot.

## Input and isolation

The committed `prepare-ai-regression.mjs --suite 2 --condition <condition>`
command creates every request. Where an assembled stream exceeded tool output
limits, the same command was run with `--case <case-id>` in corpus order. This
does not change request text, context, hashes, or response schema.

Each clean session was instructed to read only its generated request stream and
write its own condition's response artifacts. It did not receive repository
source, project guidance outside the prepared condition, scoring rules, prior
responses, findings, or scorer feedback. The seven tasks share a condition
session and are processed in stable corpus order; this is condition-level, not
prompt-level, isolation. An initial worker cohort that opened repository
guidance was rejected before producing any response files and is not part of
the measured run.

The execution instruction asks for realistic TypeScript, TSX, and CSS files
matching the supplied response schema. It prohibits repository or external
retrieval, execution or compilation of proposed programs, scoring-driven
revision, and further delegation. Workers may correct JSON serialization before
submission but receive no quality or scorer feedback.

## Scoring and compile evidence

The run uses the explicitly versioned suite-v2 descriptor, frozen revised
context snapshot, public declaration context, and additive v2 scorer. Suite v1,
its immutable context snapshot, and its six existing measured manifests remain
unchanged and replay under the original oracle.

The deterministic score measures imports, public primitive/helper reuse,
wiring calls and retained cleanup, layout ownership, basic static accessibility,
and honest escalation for the missing recurring concept. It does not establish
runtime behavior, interaction accessibility, responsive geometry, or visual
quality.

Each response is also passed through the opt-in, non-executing TypeScript
compile probe. Compile sidecars are reported separately from structural scores:
the in-memory host checks the proposed files against pinned Kerf UI, Kerf core,
Preact, and Web Awesome declarations without evaluating generated code or build
configuration. A compile failure does not alter the structural result.

This single post-change cohort is regression evidence, not a population sample,
leaderboard, or causal estimate. Report every condition and failure. Do not
retroactively rescore or rewrite older evidence, and do not infer general model
quality from the small corpus.
