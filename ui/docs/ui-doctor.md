# Kerf UI doctor

`kerf-ui-doctor` is the supported repair-loop entry point for a Kerf application. It produces one versioned report from application-profile and catalog validation, TypeScript, the Kerf UI ESLint preset, static layout analysis, and an explicitly enabled browser evaluation.

```sh
npx kerf-ui-doctor --full
npx kerf-ui-doctor --changed
npx kerf-ui-doctor --package @acme/admin --changed
npx kerf-ui-doctor --full --browser-url http://127.0.0.1:4173
```

The default terminal output is short and repair-oriented. `--format json` emits the schema-version-1 report; `--output report.json` writes the same representation. The package exports its contract from `@kerfjs/ui/doctor`, its configuration schema from `@kerfjs/ui/doctor/config.schema.json`, and its report schema from `@kerfjs/ui/doctor/report.schema.json`.

## Stages and trust boundary

The catalog stage discovers the package-default application UI profile and workspace/root-to-leaf directory layers. It validates referenced selection/composition catalogs and, when a workspace declares `package.json#kerfComponentCatalog`, invokes the installed `create-kerf-component` catalog checker to validate metadata, source exports, schema conformance, and generated-output drift. This checker reads source text; it does not import application modules.

TypeScript uses the compiler API with `noEmit`. ESLint loads the installed `eslint-plugin-kerfjs` `recommended-ui` preset (`--eslint strict-ui` opts into advisory rules as errors). This is deliberately an isolated Kerf lint pass rather than the consumer's complete ESLint configuration. For each file, the doctor projects the applicable core ESLint rules and `linterOptions` from the consumer configuration so core-rule suppression directives retain the same used/unused semantics as the application's normal lint command. Consumer plugin rules are not executed, and inline directives for plugins such as `@typescript-eslint` therefore do not produce false "rule definition not found" diagnostics; the consumer's normal ESLint command remains authoritative for those rules. Unknown `kerfjs/*` directives still fail the doctor pass. Stable KUI identifiers come from the packaged `application-ui-diagnostic-ids-v1.json` registry; the doctor also reads installed ESLint message metadata for semantic conflict detection instead of duplicating rule definitions. The analyzer calls the public `@kerfjs/ui/analyzer` contract. None of these stages executes generated application code.

Property-specific CSS values are evaluated from each first- or third-party
catalog entry's `cssValueProps`. `KUI-L013`–`KUI-L016` are blocking grammar
violations and name a preferred shorthand/helper; `KUI-L017` keeps an
exceptional but valid spacing choice in the review queue. The ESLint and
analyzer stages share these ids, so the normalized report can be consumed as
one repair loop without tool-specific translations.

The browser evaluator is different: it runs the application and is disabled by default. It only runs when configuration supplies `browser.url` or the command receives `--browser-url`. Start and authorize the target application separately.

An unavailable or failed stage does not prevent independent stages from reporting. Its final exit is still a configuration failure, so a partial run cannot appear clean.

## Full and changed modes

`--full` is the default and analyzes the selected package. `--changed` reads tracked and untracked paths from Git unless one or more `--path` values are supplied. An empty changed set is a configuration error instead of a false-clean success. With `--package`, workspace-relative Git paths are converted to package-relative paths before TypeScript, ESLint, and analyzer selection; paths outside the selected package are ignored.

Full traversal treats generated/tool-owned directories (`dist`, `coverage`,
`node_modules`, `.git`, `.kerf-cache`, `kerf-ui-evidence`, and nested
`.claude/worktrees` checkouts) as outside application source. Their files are
excluded consistently from TypeScript, the isolated ESLint pass, analyzer
discovery, and cache inputs, even when one lives below another application
directory.

TypeScript constructs the selected package's program so compiler options retain their real meaning, while its root inputs are narrowed to changed source files. Use `--full` for release gates.

## Configuration and suppressions

Place `.kerf-ui-doctor.json` at the workspace root:

```json
{
  "$schema": "./node_modules/@kerfjs/ui/doctor/config.schema.json",
  "schemaVersion": 1,
  "mode": "full",
  "stages": { "browser": false },
  "cache": true,
  "suppressions": [
    {
      "id": "legacy-toolbar",
      "rules": ["KUI-L006"],
      "target": "src/legacy-toolbar.css",
      "rationale": "Removed with the toolbar migration in the next release."
    }
  ]
}
```

A suppression requires a stable id, one or more exact diagnostic ids, an exact portable source path or browser selector, and a substantive rationale. Wildcards, absolute paths, and parent traversal are rejected. Suppressed diagnostics remain in `report.suppressions` with their rationale and do not affect the exit code.

KUI suppression ids are checked against the analyzer, evaluator, doctor, installed ESLint-rule metadata, and diagnostics emitted by available tools. An unknown or stale id is a configuration error rather than a silent no-op. TypeScript `TS####` and namespaced `eslint:*` ids remain valid even when that particular run does not emit them.

The content-addressed cache lives at `.kerf-cache/ui-doctor-v1.json`. Its key covers selected source/config/catalog JSON, package manifests, root and package lockfiles, mode, paths, and configuration. Browser results are never cached. Use `--no-cache` when investigating tool installation changes not yet reflected in a lockfile.

Reports replace the workspace's absolute path with `<repo-root>` and express in-workspace files as portable relative paths. External paths are reduced to `<external>/<basename>`. URLs are excluded from the cache key. Tool messages and evidence receive the same root redaction before output or caching.

## Report and exit contract

Every diagnostic has a stable `id`, `severity`, `stage`, message, and—when applicable—an exact source location with JSON path or DOM context/selector. Analyzer evidence, catalog facts, documentation links, and safe next actions are preserved when the source tool provides them. Identical findings merge with their source stages; same identifiers with conflicting severities remain separate and add `KUI-D003`.

Exit codes are deterministic:

- `0`: no active error diagnostics;
- `1`: repairable application findings;
- `2`: malformed configuration, unavailable required tooling, or a failed stage;
- `130`: cancellation.

Warnings and review findings remain visible but do not fail unless their originating preset promotes them to errors. A cached report keeps its original exit code and labels previously run stages `cached`.

## Monorepos and repair loops

`--package` accepts either a workspace package name or a workspace-relative package path. The doctor uses the selected package for compiler, lint, profile-discovery start, and analyzer scope, while workspace profile precedence and root lockfiles remain authoritative.

A repair agent should run JSON mode, apply only source-located safe changes, and rerun until exit `0`. Do not treat exit `2`, a skipped required stage, or an empty changed selection as clean. Browser evidence is objective input; the evaluator's named subjective rubric still requires human review.
