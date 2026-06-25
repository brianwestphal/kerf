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
   - **Dependency creep**. CLAUDE.md says: *"No transitive deps beyond `@preact/signals-core` + `morphdom`."* Open `package.json` and verify the `dependencies` block has only these two. Anything else is a violation; flag it.
   - **Inline `addEventListener` calls in test/example code on morph-managed nodes**. Symptom of skipping `delegate()` / `delegateCapture()`. Grep `examples/` and `tests/` for `addEventListener` outside `data-morph-skip` regions and flag for review.
   - **Duplicate code across files**. Sample heuristic: search for repeated `DOMParser` + `parsererror` blocks (already a known pattern in `src/toElement.ts`), repeated try/catch idioms across modules, or any source-line matched ≥3× by `grep -c`.

7. **Check the dist build shape**
   ```
   npm run build && ls dist/
   ```
   Verify:
   - One `dist/index.js`, one `dist/jsx-runtime.js`, one `dist/testing.js`.
   - At least one `dist/chunk-*.js` (proof that `splitting: true` is in effect — a regression here resurrects KF-14/KF-15).
   - All four expected `.d.ts` files present.

   `npm pack --dry-run` for the published file list (skip if it errors due to local npm cache permissions; the CI run is authoritative).

## Report Format

Generate a structured report with:
- **Summary**: Overall health (tests pass/fail across the three test layers, lint clean, coverage %, typecheck clean).
- **Test Results**: pass rates for `npm test` / `npm run test:dist` / `npm run test:dist:full`.
- **Coverage**: per-file table, highlighting any file below 100% (CLAUDE.md threshold).
- **Lint Issues**: grouped by rule.
- **Type Issues**: grouped by file.
- **Anti-Pattern Violations**: specific files and lines with severity (high/medium/low) and a one-line fix suggestion each.
- **Build Shape**: pass/fail per check from step 7.
- **Recommendations**: prioritized list of improvements. If any anti-pattern is non-trivial to fix, suggest filing a Hot Sheet ticket via `hs-task` / `hs-bug`.
