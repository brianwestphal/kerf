---
name: analyze-code-quality
description: Run all available tests and linters, check for anti-patterns, and generate a comprehensive code quality report
allowed-tools: Read, Grep, Glob, Bash, Agent
---

> **Thresholds and file lists live in the config files, not here.** `vitest.config.ts` owns the coverage bar, `tsup.config.ts` owns the entry list, CLAUDE.md owns the conventions. Every one of those has been out of sync with a copy in this skill at least once. Read the source of truth; treat figures below as pointers to where to look. The mechanical recipes are the durable part.

Analyze the overall quality of the kerf source code. Generate a comprehensive report.

## Steps

1. **Run unit + integration tests with coverage** (against `src/`)
   ```
   npm test
   ```
   Report: total tests, pass/fail count, coverage percentage by file. **Read the thresholds out of `vitest.config.ts`** rather than trusting a number quoted here — they are the enforcement, so anything that passes `npm test` is by definition at or above the bar. As of writing: 100% lines / functions / statements, **99% branches**. The branch allowance is deliberate and documented in CLAUDE.md — a handful of `c8 ignore` defensive returns whose loop-completion branches v8 tracks but which cannot be exercised by construction. Do NOT flag a file for sitting under the branch bar; flag only a file that drags the total below the configured threshold — which would have failed the run anyway.

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

   - **File length**. Read CLAUDE.md § *Code Quality Gates* for the current rule instead of a number quoted here. As of writing it is "one coherent concern per file", with ~500 LOC a *smell* worth a second look, **not a gate** — and a large file housing one algorithm (the keyed list reconciler is named explicitly) is not a finding. Rank with `wc -l src/*.ts src/utils/*.ts | sort -rn`, then judge each large file on concern count.
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
   - One `dist/<name>.js` for **every** entry in `tsup.config.ts`'s `entry` array. Derive the list — do not use one written here. A hardcoded list is how this check silently stopped covering `html` and `dev`, and `dist/dev.js` missing is exactly the regression that would disable every diagnostic without failing a test:
     ```
     node -e "const c=require('fs').readFileSync('tsup.config.ts','utf8');const m=/entry:\s*\[([^\]]*)\]/.exec(c);console.log(m[1].match(/src\/([\w-]+)\.ts/g).map(e=>e.replace(/src\/|\.ts/g,'')).join(' '))"
     ```
   - At least one `dist/chunk-*.js` (proof that `splitting: true` is in effect — a regression here resurrects KF-14/KF-15).
   - A matching `.d.ts` for each of those same entries.

   `npm pack --dry-run` for the published file list (skip if it errors due to local npm cache permissions; the CI run is authoritative).

## Report Format

Generate a structured report with:
- **Summary**: Overall health (tests pass/fail across the three test layers, lint clean, coverage %, typecheck clean).
- **Test Results**: pass rates for `npm test` / `npm run test:dist` / `npm run test:dist:full`.
- **Coverage**: per-file table. Highlight a file only if it drags a metric under the threshold configured in `vitest.config.ts` — several files sit below 100% branches by design (the documented `c8 ignore` defensive returns) and are not findings.
- **Lint Issues**: grouped by rule.
- **Type Issues**: grouped by file.
- **Anti-Pattern Violations**: specific files and lines with severity (high/medium/low) and a one-line fix suggestion each.
- **Behavioral / State-Transition Audit**: per stateful module — its states, whether the transition matrix is exercised, and any gap (module tested only single-operation-from-clean-state) with the concrete adversarial sequences to add. This section is required even when line/branch coverage is 100%.
- **Build Shape**: pass/fail per check from step 8.
- **Recommendations**: prioritized list of improvements. If any anti-pattern is non-trivial to fix, suggest filing a Hot Sheet ticket via `hs-task` / `hs-bug`.
