# Astra repeat protocol

KF-F3NGSB (repeat the UI authoring corpus) uses `gpt-6-astra` at the user's
request in place of the originally requested Fable runner. This is an Astra
execution, and does not measure equivalence to Fable.

Three repeats each contain the same seven tasks under `none`,
`current-guidance`, and `revised-recipes-catalog`: nine fresh condition sessions
and 63 response artifacts. All sessions request medium reasoning and
`fork_turns: none`. Temperature, seed, underlying model build and the complete
provider system envelope are not exposed. The reported model/version is the
runtime alias, not an independently identified model snapshot.

## Input and isolation

The repository's unmodified `prepare-ai-regression.mjs --condition <condition>`
creates the requests. A temporary preparation script separates each condition's
identical repeated context into one `context.md`, and emits the seven requests
in corpus order into `requests.json`, retaining `caseId`, `prompt`,
`promptSha256`, `responseContract`, and `responseSchema`. Thus the model reads
one copy of the same assembled context rather than seven identical copies.
The context text and task text are unchanged. Source files, prompt hashes,
assembled-context hashes, schema hashes, parser version and scorer hash are
recorded in each run manifest.

Each session is permitted to read only its prepared input files and write its
own response artifacts in temporary storage. It does not receive the audit,
repository guidance beyond the assigned condition, other model responses,
scoring rules, prior findings, or feedback from a scorer. It reads the complete
context; the long revised condition requires paginated reads. All seven tasks
share the condition session and appear in corpus order. This is condition-level
isolation, not a fresh session for each prompt or seven independent samples.

The shared execution instruction asks for realistic TypeScript/TSX/CSS
implementations matching each response schema, using the supplied context and
model knowledge. It forbids repository/external retrieval, executing or building
proposed code, scoring-driven revisions and further delegation. The only
condition-specific additions identify the permitted input/output directories,
describe the intentionally empty context for `none`, and require pagination for
the approximately 209,000-character revised context. Output JSON is copied
unchanged into the corresponding result directory; byte hashes preserve that
boundary. Agents may correct JSON serialization before submission, but receive
no quality or scorer feedback.

## Scoring and interpretation

Use the existing recorder and deterministic structural scorer without changing
the corpus, conditions or scorer between conditions or after seeing results.
Preserve the September 12 artifacts. `check:ai-regressions` must replay old and
new manifests exactly from their saved responses. Only deterministic replay,
fixture and drift checks run in the normal package gate; generation is opt-in.

The consumer audit identified limitations in this oracle: it rejects descendant
CSS even when the catalog lists the targeted anatomy as public, and its exact
wiring requirements can reject the documented `delegate()` alternative to
`delegateActions()`. Static parsing and required calls do not establish working
types, correct lifecycle behavior, accessible interaction or visual quality.
KF-Y2GJ0W (public CSS/scoring alignment) and KF-4SNNHC (copyable recipe wiring)
track those boundaries. KF-BZTZFE (public signatures and opt-in compile probes)
tracks guessed API shapes and the additional valid resize-helper import path
that the frozen scorer does not accept. Keep raw counts under this frozen oracle distinct from
runtime correctness and from any future rescoring under a corrected version.

Report every repeat and aggregate by dimension, including failures. This small
cohort measures responses under the exposed runner configuration. It does not
establish causal attribution to recipes alone, population-level model quality,
or a public comparative claim.
