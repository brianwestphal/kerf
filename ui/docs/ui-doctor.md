# Kerf UI doctor

`kerf-ui-doctor` is the supported repair-loop entry point for a Kerf application. It produces one versioned report from application-profile and catalog validation, TypeScript, the Kerf UI ESLint preset, static layout analysis, and an explicitly enabled browser evaluation.

```sh
npx kerf-ui-doctor --full
npx kerf-ui-doctor --changed
npx kerf-ui-doctor --package @acme/admin --changed
npx kerf-ui-doctor --full --browser-url http://127.0.0.1:4173
npx kerf-ui-doctor --full --fail-on warning
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

The analyzer stage also reads consumer stylesheets for theme overrides:
`KUI-L018` is a review finding for a `--wa-color-{tone}-fill-loud` override
that lacks a governing `--wa-color-{tone}-on-loud` (in the same or an ancestor
scope, in any stylesheet the same entry loads), or whose literal pair measures
below 4.5:1 (see [the analyzer rule](./ui-analyzer.md#loud-fill--on-loud-pairing-kui-l018)).

Component ownership is part of the same loop. The analyzer stage reports
application or third-party CSS that restyles another package's component
(`KUI-L019`), touches its private `--_*` variables (`KUI-L020`), overrides a
token a typed prop sets (`KUI-L021`), or styles it through a hook class on its
root (`KUI-L022`). It also reports source modules that render another
component's public classes as their own markup (`KUI-L023`), including raw HTML
and DOM class writes. Raw HTML checks include complete static class tokens in
interpolated template literals. `KUI-L023` skips `*.test.*`, `*.spec.*`, and `__tests__/`
modules so output assertions are not mistaken for rendered markup. The ESLint
stage's `ui-component-ownership` rule reports
`KUI-L020` / `KUI-L021` in script. Each finding's `action` points at the
component's configuration, and its message routes a need with no prop to a
component-gap report instead of an override (see
[the analyzer rule](./ui-analyzer.md#component-ownership-kui-l019kui-l023)).
In component mode, `KUI-L019` also follows an owned wrapper to a composed
child's cataloged root and descendant element types. For example, a wrapper
around `LucideIcon` cannot size its `svg` or `path` with an element selector;
use the icon's props or style an app-owned element. The same check follows
local function components returned from the owner module and treats their
intrinsic markup as app-owned.
Unknown custom `IconNode` tags are identified when a selector explicitly
passes through the icon's `svg[data-lucide]` root; unrelated HTML descendants
without that marker remain app-owned.
The analyzer resolves a cataloged application component imported through an
exact or wildcard TypeScript `paths` alias from the nearest consumer tsconfig,
so the same root hook-class check applies in those files.
Set `"ownership": "component"` in `.kerf-ui-doctor.json` to enforce the same
boundary between a consumer package's own cataloged components. The default is
`"package"`. Selection-only entries participate too. A component owns its
`styleSources` (relative to its package root), or its direct relative CSS
imports when that list is absent, and its selection catalog `source` module.
Literal rendered BEM classes are inferred when those stylesheets style their
block. An owned root or styled literal owns its whole `block__*` and `block--*`
family, including dynamic names and classes placed on imported components.
Modules sharing one of those stylesheets co-own its classes, so their
own markup does not borrow from one another. A class inferred by several
co-owners has no arbitrary single owner for CSS subject diagnostics. A
stylesheet foreign to all co-owners receives one `KUI-L019` per subject rule,
including dynamic BEM modifiers; `evidence.components` names the co-owner set.
Set `"implicitComponentOwnership": true` to include uncataloged modules
that directly import CSS. Component mode reports sibling CSS and hook-class
restyles while allowing a component's own stylesheet and module.
For an entry stylesheet shared by modules without direct CSS imports, configure
`"ownershipGroups": [{ "styleSources": ["src/style.css"], "sources": ["src/main.tsx", "src/app/"] }]`.
These package-relative paths define one owner: its stylesheet and every listed
source file or directory prefix. Doctor reports sibling CSS restyles and markup
class use as `KUI-L019` and `KUI-L023`. Source paths ending in `/` match a
directory subtree; other paths match exactly. When implicit ownership is also
enabled, the group takes precedence over listed source modules and any direct
import of its stylesheet. An unrelated importer still borrows the group's
classes; its other stylesheets can retain their own implicit ownership.

Set `"ownershipContext": "any"` to also report a same-package sibling's class
used as ancestor or sibling context or within `:has()`, `:is()`, `:where()`, or
`:not()`. The default `"subject"` keeps subject-only context policy; classes
from another package may still provide context. Set
`"ownershipContext": "any-package"` to include cross-package component
classes and `[data-component]` roots in the same selector-context checks.

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
  "ownership": "component",
  "stages": { "browser": false },
  "cache": true,
  "failOn": "warning",
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

Exit codes are deterministic. `failOn` defaults to `error`; `--fail-on error|review|warning` overrides the config for a run. `review` fails on errors or review findings; `warning` also fails on warnings. Suppressed diagnostics never count. The effective threshold is part of the cache key.

- `0`: no active diagnostics at or above the selected threshold;
- `1`: repairable application findings;
- `2`: malformed configuration, unavailable required tooling, or a failed stage;
- `130`: cancellation.

Warnings and review findings remain visible at every threshold. A cached report keeps its original exit code and labels previously run stages `cached`.

## Monorepos and repair loops

`--package` accepts either a workspace package name or a workspace-relative package path. The doctor uses the selected package for compiler, lint, profile-discovery start, and analyzer scope, while workspace profile precedence and root lockfiles remain authoritative.

A repair agent should run JSON mode, apply only source-located safe changes, and rerun until exit `0`. Do not treat exit `2`, a skipped required stage, or an empty changed selection as clean. Browser evidence is objective input; the evaluator's named subjective rubric still requires human review.
