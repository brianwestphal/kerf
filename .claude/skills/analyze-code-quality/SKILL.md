---
name: analyze-code-quality
description: Run all available tests and linters, check for anti-patterns, and generate a comprehensive code quality report
allowed-tools: Read, Grep, Glob, Bash, Agent
---

Analyze the overall quality of the kerf source code. Generate a comprehensive report.

## Steps

1. **Run unit + integration tests with coverage** (against `src/`)
   ```
   npm test
   ```
   Report: total tests, pass/fail count, coverage percentage by file. CLAUDE.md mandates 100% lines/branches/functions/statements; flag any file under that bar.

   **Coverage is a floor, not a ceiling.** 100% line/branch coverage proves every line *executed* — not that every *behavior* or every *sequence* of behaviors is *asserted*. Line coverage is structurally blind to a missing state transition (KF-125: two critical reconciler bugs shipped under 100% coverage). Do NOT treat a green coverage report as proof of correctness — treat it as the trigger for the **behavioral / state-transition audit** in step 7 below.

2. **Run targeted dist regression suite** (against `dist/`)
   ```
   npm run test:dist
   ```
   Report: total tests, pass/fail count. These tests pin known bundling failure modes (KF-14 SafeHtml class duplication, KF-15 store registry sharing). A failure here means the published artefact is broken even if `src/` is clean.

3. **Run full unit + integration suite remapped onto dist** (KF-16)
   ```
   npm run test:dist:full
   ```
   Report: total tests, pass/fail count. A failure here that doesn't reproduce in `npm test` indicates new bundling drift.

4. **Run linter**
   ```
   npm run lint
   ```
   Report: total errors / warnings, categorized by rule.

5. **Run typecheck**
   ```
   npm run typecheck
   ```
   Report any type errors.

6. **Check for anti-patterns documented in CLAUDE.md and the design docs**

   Read `CLAUDE.md`, `docs/8-api-reference.md`, and `docs/ai/usage-guide.md`. Look for violations in `src/` of documented conventions:

   - **Files exceeding ~200 LOC**. CLAUDE.md says: *"the largest file in `src/` should stay under ~200 LOC."* Use `wc -l src/**/*.ts`.
   - **Missing `.js` extension on relative imports**. CLAUDE.md says: *"Import paths use `.js` extension (TypeScript convention for ESM resolution)."* Grep `src/` and `tests/` for relative imports without `.js`.
   - **Files violating one-primary-export-per-file**. CLAUDE.md design rule #4. A few legitimate exceptions exist (`delegate.ts` exports the paired `delegate` + `delegateCapture`; `escapeHtml.ts` exports paired escapers; `jsx-runtime.ts` exports the JSX-spec-required cluster `jsx`/`jsxs`/`jsxDEV`/`Fragment`). Anything else with multiple unrelated exports is a violation.
   - **`any` type leaks**. Grep `src/` for `: any\b`, `as any\b`, `<any>`. Permitted only behind a type guard (we use `unknown` and `isSafeHtml(...)` pattern).
   - **Dependency creep**. CLAUDE.md says: *"No transitive deps beyond `@preact/signals-core`."* (The former `morphdom` dependency was removed — kerf's reconciler is now `src/morph.ts`.) Open `package.json` and verify the `dependencies` block has only `@preact/signals-core`. Anything else is a violation; flag it.
   - **Inline `addEventListener` calls in test/example code on morph-managed nodes**. Symptom of skipping `delegate()` / `delegateCapture()`. Grep `examples/` and `tests/` for `addEventListener` outside `data-morph-skip` regions and flag for review.
   - **Duplicate code across files**. Sample heuristic: search for repeated `DOMParser` + `parsererror` blocks (already a known pattern in `src/toElement.ts`), repeated try/catch idioms across modules, or any source-line matched ≥3× by `grep -c`.

7. **Behavioral / state-transition audit** (the step line/branch coverage can't do for you)

   100% line coverage says every line ran; it does NOT say every *behavior* or *sequence* is asserted. This step audits the thing coverage is blind to: **untested transitions in stateful modules**. Two critical KF-125 bugs (select-after-delete, append-after-clear) shipped under 100% coverage because the reconciler's state *transitions* were never walked.

   - **Identify the stateful modules.** A module is stateful if it has multiple code paths keyed on an internal mode/phase/flag, a state machine, a cache with fallback paths, or lifecycle transitions. In kerf the canonical ones are the list reconciler (`src/each.ts`, `src/list-reconcile*.ts` — states: `first-render ↔ granular ↔ snapshot ↔ empty-binding ↔ drift-recovery`), `src/morph.ts`, and `src/store.ts`. Confirm the current set with `ls src/` rather than trusting this list.
   - **For each, enumerate states + transitions.** List the internal states and the operations that move between them (for the reconciler: create / append / insert-middle / update / move / remove / clear / select-via-`cacheKey`).
   - **Check the tests walk the transitions, not just the operations.** Grep the module's test file for multi-step sequences that cross state boundaries (e.g. `create → select → delete → select`; `clear → append → select`; `empty-via-remove → insert`). **Flag any stateful module whose tests only exercise single-operation-from-clean-state** — that is the exact gap that hides transition bugs behind a green report.
   - **Recommend an adversarial transition-matrix test** for any gap found, pointing at `tests/unit/array-signal.test.ts` › "reconciler transition matrix (adversarial)" as the template, and listing concrete sequences to add (out-of-order / interleaved / repeated / empty-then-refill).

8. **Check the dist build shape**
   ```
   npm run build && ls dist/
   ```
   Verify (confirm the exact entry list against `tsup.config.ts` — it drives what ships):
   - One each of `dist/index.js`, `dist/jsx-runtime.js`, `dist/testing.js`, `dist/array-signal.js` (the four entry points).
   - At least one `dist/chunk-*.js` (proof that `splitting: true` is in effect — a regression here resurrects KF-14/KF-15).
   - A matching `.d.ts` for each entry point (`index`, `jsx-runtime`, `testing`, `array-signal`).

   `npm pack --dry-run` for the published file list (skip if it errors due to local npm cache permissions; the CI run is authoritative).

## Report Format

Generate a structured report with:
- **Summary**: Overall health (tests pass/fail across the three test layers, lint clean, coverage %, typecheck clean).
- **Test Results**: pass rates for `npm test` / `npm run test:dist` / `npm run test:dist:full`.
- **Coverage**: per-file table, highlighting any file below 100% (CLAUDE.md threshold).
- **Lint Issues**: grouped by rule.
- **Type Issues**: grouped by file.
- **Anti-Pattern Violations**: specific files and lines with severity (high/medium/low) and a one-line fix suggestion each.
- **Behavioral / State-Transition Audit**: per stateful module — its states, whether the transition matrix is exercised, and any gap (module tested only single-operation-from-clean-state) with the concrete adversarial sequences to add. This section is required even when line/branch coverage is 100%.
- **Build Shape**: pass/fail per check from step 8.
- **Recommendations**: prioritized list of improvements. If any anti-pattern is non-trivial to fix, suggest filing a Hot Sheet ticket via `hs-task` / `hs-bug`.
