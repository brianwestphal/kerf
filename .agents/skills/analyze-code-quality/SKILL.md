---
name: analyze-code-quality
description: Run every test suite, linter, and gate the project declares, measure coverage against the project's own floors, check the anti-patterns its instructions document, audit stateful modules for untested transitions, and produce one ticketed code-quality report.
allowed-tools: Read, Grep, Glob, Bash, Agent
---

<!-- ai-playbook:skill name=analyze-code-quality v=1 -->

> **Gates, thresholds, surfaces, and anti-patterns live in the project, not here.** Read
> `AGENTS.md` and anything it imports, the CI workflow files, each package manifest, and the
> project's codebase map and requirements summary before running anything. Treat every command
> or figure below as a pointer to where to look; never carry a surface list, crate list, or
> threshold from another project into this one.

Analyze the overall quality of this project and produce one report covering every surface it
has. The goal is not "does it compile and are the lines covered" but "is the code correct in the
sequences it actually runs". A green suite at full line coverage routinely ships behavioral
bugs (step 7); weight the report accordingly.

## Step 0: derive the surfaces and gates

1. Read `AGENTS.md` for the declared gates, commands, risk tiers, the modules it names as
   high-risk, and the anti-patterns it documents.
2. Enumerate surfaces from disk, not memory: workspace members (`Cargo.toml` `[workspace]`,
   `package.json` `workspaces`, `pyproject.toml`, `go.work`), client and server directories,
   migrators, scripts. Confirm with `ls`.
3. Read the CI workflow (`.github/workflows/*.yml` or the project's equivalent) and each
   package's manifest scripts. The CI job is the authoritative list of gates and their order;
   coverage floors, lint deny lists, and doctor budgets live in the configuration files CI
   reads, so quote those files, not your memory of them.
4. Write a surface table (surface, location, gates) at the top of your working notes and keep
   it in the report. Say explicitly when a surface has no gate.

## Steps

Run independent suites in parallel where the machine allows. Browser, process-spawning, and
end-to-end suites often fail inside a command sandbox; rerun those unsandboxed, or through the
project's documented escalation, before treating a failure as a regression.

1. **Format, lint, and type gates** per surface, exactly as CI runs them. Judge each command by
   its exit status, not by grepping its output. Report findings grouped by rule, type errors by
   file, and every suppression or allowlist entry together with the ticket that justifies it.
   The `conventions-as-code` rule requires one; a suppression without an open ticket is a
   finding.
2. **Unit and integration tests** per surface. Report per-package pass and fail counts. Skip
   tiers the project marks as credential-gated or paid (live inference, external services)
   unless asked, and do not report them as missing.
3. **End-to-end tests** through the real shipped flow (browser suites, real-server specs, CLI
   integration). For any failure, rerun that test alone, then with the runner's repeat flag,
   before calling it a regression; a test that fails only under load is a flake, and its root
   cause is a finding (see `test-operations` and `playwright-operations` when installed).
4. **Coverage.** Run the project's coverage command and compare against the floor its CI
   enforces; read it rather than assuming. Report per-package line and branch figures and the
   lowest-covered files in the surfaces the project names as high-risk. State that coverage is
   a floor, not a ceiling.
5. **Feature coverage record.** The `hotsheet-testing-philosophy` rule asks each project to
   keep a feature-by-feature record of unit, end-to-end, and manual coverage. Find it (the
   codebase map names it) and run its checker when one exists. List features marked
   unit-only, e2e-only, or manual-only, and cross-check the manual test plan for items that
   are now automatable. If no record exists, that is the first recommendation.
6. **Documented anti-patterns.** Read `AGENTS.md`, the UI conventions document, and the
   engineering docs the codebase map points at; they are authoritative and evolve. Check every
   surface for the patterns they name. Prefer **ast-grep** for structural checks
   (`ast-grep run --lang <lang> -p '<pattern>' <path>`) over text grep. Patterns that recur
   across projects and are worth checking even when the instructions are silent:
   - Panics or unchecked unwraps on request, file, network, or git input outside tests.
   - Lint suppressions without a stated reason and ticket.
   - A capability reachable from one surface only (client without CLI, or the reverse) when
     the project promises parity.
   - Live activity, locks, or leases derived from counters or status fields instead of the
     lease itself.
   - Shell strings built from input instead of a typed program with arguments.
   - Fixed-interval polling for application state where the project promises push updates.
   - Test fixtures whose JSON shape differs from the real wire shape.
   - Application CSS styling a design-system component's internals; the UI doctor or lint
     catches most of this, so review each remaining suppression for a still-open ticket.
   - Controls that work in a demo or catalog route but are unwired, or not disabled with a
     reason, in the real app.
   - Files holding more than one concern (judge by concern count, not raw length; rank with
     `wc -l`), the same workflow implemented separately on two surfaces, and
     developer-specific absolute paths in docs, tickets, or code.
7. **Behavioral and state-transition audit**, the step coverage cannot do for you.
   1. Identify the stateful modules: internal modes or phases, state machines and lifecycles,
      caches with a miss path, leases and debounces, "first versus subsequent" or "empty
      versus populated" branching, accumulated mutable state. Start from the modules
      `AGENTS.md` names as high-risk, then derive the real set from the code.
   2. For each, enumerate states and transitions, then check whether tests walk multi-step
      sequences that cross state boundaries rather than single operations from a clean
      fixture.
   3. Flag any stateful module tested only single-operation-from-clean-state and recommend a
      transition-matrix test with concrete sequences: out-of-order, interleaved, repeated,
      empty-then-refill, and stale or expired.

## Report format

- **Summary**: overall health per surface, plus a one-line behavioral-risk verdict.
- **Test results**: per surface and suite; which failures reproduce alone and which are
  flakes.
- **Coverage**: per package against the enforced floor. State that coverage is a floor, not a
  ceiling.
- **Lint, type, and doctor issues**: grouped by rule and surface; the suppression inventory
  with its tickets.
- **Feature coverage record**: single-layer and manual-only features, or the record's absence.
- **Anti-pattern violations**: file and line, severity (high, medium, low), and a one-line fix
  each.
- **Behavioral assessment**: per stateful module, its states, whether transitions are tested,
  and the sequences to add. Required even at full coverage.
- **Recommendations**: prioritized, with behavioral and cross-surface gaps above cosmetic
  ones. File a Hot Sheet ticket for every non-trivial finding (a bug for a defect, a task for
  a cleanup) and list the slugs. Do not claim a clean audit while any gate is unexecuted or
  red.
