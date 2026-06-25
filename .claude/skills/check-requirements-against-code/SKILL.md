---
name: check-requirements-against-code
description: Check requirements docs against implementation and report discrepancies
allowed-tools: Read, Grep, Glob, Bash, Agent, Edit, Write
---

Comprehensively compare the requirements documents in `docs/` against the actual implementation. Also verify that the AI summary docs (`docs/ai/code-summary.md`, `docs/ai/requirements-summary.md`, `docs/ai/usage-guide.md`), the human-facing orientation one-pager (`docs/orientation.md`), and `CLAUDE.md` are in sync with both the requirements docs and the code. Generate a report with recommendations and questions about any discrepancies.

## Steps

1. **Read all requirements documents** in `docs/`. Note every stated requirement, behavior, and constraint. The numbered set is `1-overview.md` through `9-live-demo.md`. If new numbered docs have been added since this skill was written, include them too. Also read `README.md` and `llms.txt` at repo root since both enumerate the public API and link to the docs — they drift the same way.

2. **For each requirement**, verify it against the implementation:
   - Search the codebase for the relevant code (everything lives under `src/`)
   - Check if the behavior matches what's documented
   - Note any differences, missing features, or extra features not in the docs

3. **Check for undocumented features**: Scan `src/` for significant functionality not covered by any requirements doc. These are public exports / observable behaviours that should either be documented in `docs/` and `docs/ai/usage-guide.md`, or questioned.

4. **Check for stale documentation**: Requirements that describe behaviour that no longer exists or has changed.

5. **Verify `CLAUDE.md` completeness**:
   - Every numbered doc under `docs/` appears in CLAUDE.md's "Requirements Documentation → Reading order" list. Report any docs present on disk but missing, or listed but missing from disk.
   - The "Source layout" bullet list under "Architecture" lists every file under `src/` (including `src/utils/*`). Report any drift.
   - The "Public API surface" import block matches the public exports of `src/index.ts`. Report any export missing from CLAUDE.md or vice versa.
   - The "Testing" section lists every `npm run test*` script that exists in `package.json`.
   - The "Coverage thresholds" sentence matches the actual thresholds in `vitest.config.ts`.

6. **Synchronize `docs/ai/code-summary.md`**: Open the file and confirm each section still matches the current codebase. Flag any inaccuracy, then update the file in place. Check specifically:
   - **Directory tree** matches actual files under `src/`, `tests/`, `docs/`, and the repo root (use `Glob`/`ls` to verify).
   - **Public exports table** matches the symbols re-exported from `src/index.ts`.
   - **Build outputs** section matches what `npm run build` actually emits (entries, chunks, source maps, .d.ts files).
   - **Where to look for X** reverse-index entries still point at files that exist and contain the symbol/section claimed.
   - **Update triggers** list at the bottom is still accurate.
   Make the edits as part of this check — do not just report them.

7. **Synchronize `docs/ai/requirements-summary.md`**: Open the file and confirm each entry still matches its source doc. Flag and update:
   - **Dashboard table** rows for each numbered doc, with current Status (Shipped / Partial / Design-only / Deferred).
   - **Per-doc summary** paragraphs — flag any sentence that no longer reflects the current doc.
   - Any newly-added numbered doc that is not listed here.
   - Any doc that has been renumbered or superseded.
   Make the edits as part of this check — do not just report them.

8. **Synchronize `docs/ai/usage-guide.md`**: Open the file and confirm:
   - The `import { … } from 'kerfjs'` block lists every public export.
   - The export table lists every symbol with a current signature.
   - The "Hard rules" don't contradict any current doc.
   - The "Common errors → fixes" table doesn't reference removed APIs.
   Make the edits as part of this check.

9. **Synchronize `docs/orientation.md` (KF-179)**: Open the file and confirm each section still matches the current codebase. **This doc is hard-capped at 500 words** (`wc -w docs/orientation.md` ≤ 500); preserve the cap when editing — trim elsewhere if you need to add. Check specifically:
   - **"How the source is organized"** bullets match the current files under `src/` (and `src/utils/`). One bullet per primary export; add new files as they land in `src/`.
   - **Render-pipeline diagram** at `docs/diagrams/render-pipeline.svg` still reflects the actual pipeline (signal write → render fn → SafeHtml → morph + list reconciler → live DOM). If the pipeline shape changes — e.g. a new pre-morph stage, a new segment kind — the SVG needs an edit and the surrounding paragraph needs a rewrite.
   - **"Things to be aware of"** still names the two documented module-level mutable spots (`store.ts:REGISTRY` and `each.ts:context`), the coverage thresholds, and the Hot Sheet `KF-` prefix convention. Coverage thresholds must match `vitest.config.ts`.
   - **"Where to look next"** links resolve.
   Make the edits as part of this check. Run `wc -w docs/orientation.md` and confirm ≤ 500 afterwards. If you cannot stay under the cap without losing essential information, surface that in the report instead of silently bloating the doc.

10. **Final consistency pass**: Make sure `CLAUDE.md`, `README.md`, `llms.txt`, `docs/orientation.md`, `docs/ai/code-summary.md`, `docs/ai/requirements-summary.md`, and `docs/ai/usage-guide.md` agree with each other and with the source docs / code. Any disagreement gets resolved in favor of the source doc / code, and the summaries and `CLAUDE.md` are updated accordingly. **The single most common drift in this project is when a new public export is added (e.g. `isSafeHtml`) and only `src/index.ts` + `docs/8-api-reference.md` are updated — the AI summaries and root-level files lag.** Look for that pattern explicitly.

## Report Format

### Discrepancies Found

For each discrepancy:
- **Requirement**: Which doc, section number, and the stated requirement
- **Implementation**: What the code actually does (file path, line numbers)
- **Type**: `missing` (doc says X, code doesn't do X) | `different` (doc says X, code does Y) | `undocumented` (code does X, no doc mentions it) | `stale` (doc says X, feature was removed/changed)
- **Recommendation**: Should the doc be updated, or should the code be fixed?

For doc-vs-doc drift (e.g., the same export listed in CLAUDE.md but missing from `llms.txt`), recommend updating both to match the canonical source — usually `src/index.ts` for the export list, the numbered docs for behaviour, and `vitest.config.ts` for coverage thresholds.

### CLAUDE.md Coverage Audit

- Numbered docs on disk but missing from CLAUDE.md reading order
- Entries in CLAUDE.md reading order that no longer exist on disk
- Source files in `src/` but missing from CLAUDE.md "Source layout"
- Public exports in `src/index.ts` but missing from CLAUDE.md import block
- `npm run test*` scripts in `package.json` but missing from CLAUDE.md "Testing" section
- Coverage thresholds in `vitest.config.ts` that don't match the CLAUDE.md "Coverage thresholds" sentence

### AI Summary Synchronization

- **`docs/ai/code-summary.md`** — list of sections edited and why (or "no changes needed")
- **`docs/ai/requirements-summary.md`** — list of entries edited and why (or "no changes needed")
- **`docs/ai/usage-guide.md`** — list of changes (or "no changes needed")
- **`docs/orientation.md`** — list of changes (or "no changes needed"). **Always include the post-edit word count (`wc -w`)** to confirm the 500-word cap is preserved.
- **`README.md`** / **`llms.txt`** — list of changes (these are usually quick one-liner updates to the API enumeration)

### Questions

List any ambiguous requirements where the implementation had to make a judgment call, and ask whether the current behavior is correct.

### Summary

- Total requirements checked
- Requirements fully implemented
- Discrepancies found (by type)
- Documentation gaps (CLAUDE.md, README.md, llms.txt, and the three AI summaries)
- Files edited
