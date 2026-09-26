# Static CSS and layout ownership analyzer

`kerf-ui-analyze` checks integration facts that TypeScript and an individual
ESLint file cannot see across component markup, stylesheets, the component
catalog, and the application UI profile.

```sh
npx kerf-ui-analyze --root . --format text src
npx kerf-ui-analyze --root . --format json --output artifacts/kerf-ui.json
npx kerf-ui-analyze --root . --format sarif --output artifacts/kerf-ui.sarif
```

The analyzer is opt-in. Add a project script such as
`"check:kerf-ui-layout": "kerf-ui-analyze --root . src"`; it never executes
application code. It discovers `.kerf-ui-profile.json`, joins every declared
composition catalog by `package:id`, parses literal JavaScript/TypeScript
component calls, TSX/JSX, and CSS, and reports portable repository-relative
locations.

An imported component name is resolved to a catalog entry by `package:id`, not
by display name: several entries share one (the Kerf `Select` and the Web
Awesome `wa-select` are both "Select"), so the analyzer joins each composition
entry to its selection-catalog public exports and import subpaths and picks
the entry that the import actually names. That keeps the Kerf component's
CSS-value contracts (`KUI-L013`–`KUI-L017`) in force for `Select` and
`Skeleton`.

Only component exports resolve to an entry. A selection-catalog
`publicExports` list also carries the helpers a component's props consume
(`Select` ships `uiColor`, `List` ships `px`, `rem`, and `flex`), and a helper
never inherits its entry's contracts, so `uiColor({ choices: [...] })` is not
checked as a `Select` call. A component export is one whose name starts with
an uppercase letter, the same rule JSX uses to tell a component tag from an
intrinsic element; `eslint-plugin-kerfjs` applies the identical rule, and the
package's catalog check fails if a cataloged render function (a value
returning `SafeHtml`) is lowercase or any other runtime value is uppercase.
Third-party catalogs should follow the same naming convention.

Analysis is scoped per source file. Each TSX/JSX file resolves package,
workspace, and parent-to-child directory profiles from its own location, then
follows its relative CSS imports (including nested CSS `@import`s). Stylesheet
facts are never pooled across unrelated files or sibling packages, and a shared
stylesheet's diagnostics are evaluated against every importing source profile.
A violation stays active when any consumer has not narrowly excepted it;
duplicate source findings collapse to one result. Directly targeted or orphaned
CSS uses its own directory profile. A direct changed-file target still brings
its reachable project-local styles into the report, including quoted or
unquoted `url()` imports; external package styles remain outside the consumer
boundary.

Recursive discovery excludes generated and tool-owned trees, including any
nested `.claude/worktrees` checkout. Those checkouts are separate repositories,
not application source, and cannot contribute files, diagnostics, profile
policy, or analysis inputs to the containing application.

## Diagnostics and exit behavior

| Rule       | Kind   | Meaning                                                           |
| ---------- | ------ | ----------------------------------------------------------------- |
| `KUI-L001` | error  | A stylesheet reaches into a private or unknown `.kui-*` selector. |
| `KUI-L002` | error  | A stylesheet references an unknown or private `--kui-*` token.    |
| `KUI-L003` | error  | One element combines public classes that claim the same geometry. |
| `KUI-L004` | review | Nested literal classes both add a content inset.                  |
| `KUI-L005` | review | Consumer CSS forces a public component's dimensions.              |
| `KUI-L006` | review | Literal spacing falls outside Kerf's approved scale.              |
| `KUI-L007` | error  | A declared scroll owner is nested inside another scroll owner.    |
| `KUI-L008` | review | A dynamic class expression cannot be classified soundly.          |
| `KUI-L009` | error  | A stylesheet cannot be parsed.                                    |
| `KUI-L010` | error  | A selector reaches a private Kerf descendant from a public root.  |
| `KUI-L011` | error  | A `::part()` target is not cataloged as a public extension point. |
| `KUI-L012` | error  | CSS assigns a Kerf token without a public configuration contract. |
| `KUI-L013` | error  | A CSS-adjacent prop uses an unknown shorthand or raw literal.     |
| `KUI-L014` | error  | A typed helper produces the wrong property grammar.               |
| `KUI-L015` | error  | An expression-only helper is passed without a composer.           |
| `KUI-L016` | error  | A removed declaration-list escape hatch is used.                  |
| `KUI-L017` | review | A valid but exceptional off-scale shorthand needs justification.  |

Errors are provable contract violations and make the command exit 1. Review
findings are deliberately heuristic and do not fail by default; pass
`--fail-on-review` when a project has reviewed its baseline and wants them to
gate CI. Text, versioned JSON, and SARIF carry the same stable rule ids,
source locations, evidence, and ownership chain.

For staged adoption, pass `--adoption`. Ownership-boundary diagnostics are
reported as review findings so a team can inventory and migrate its baseline;
combine it with the exact file-and-rule exceptions below for intentional legacy
integrations. Remove `--adoption` to make unsupported overrides blocking.

Catalog `boundaries.publicClasses` and `boundaries.publicTokens` are explicit
CSS extension points. A component catalog may additionally list shadow-part
names in `boundaries.publicParts`; all other `::part()` targets are private.
Part names are scoped to that entry's `boundaries.rootClass`, so an extension
point on one component does not authorize the same-named part on another.
Parent-owned placement and selectors for application-owned content remain
allowed because the analyzer only reserves `.kui-*`, `--kui-*`, and cataloged
shadow boundaries.

Catalog entries may also publish `cssValueProps`. Each path names its grammar,
finite shorthands, canonical and exceptional scale steps, accepted typed
helpers, expression-only helpers, raw escape policy, and examples. The analyzer
uses that same metadata for direct component calls and JSX, including nested
paths such as `choices[].color`; consumer catalogs receive identical checks.
Dynamic values remain a type-system responsibility rather than being guessed.

The JSON report schema is exported as
`@kerfjs/ui/analyzer/report.schema.json`.

Profile discovery, parsing, catalog-loading, and validation diagnostics retain
their stable `KUI-P###` ids in every output format and count as errors. The
analyzer therefore cannot silently pass with stale or unreadable policy input.

The analyzer is conservative about dynamic class expressions: it emits one
review finding and does not guess which selectors, tokens, or owners the value
might contain. CSS values expressed through public variables or `calc()` are
also left to their owning token contract rather than reverse-engineered.

## Narrow exceptions

Use the application profile's `exceptions` only for an exact rule and exact
repository-relative file. Every exception requires an id and rationale; broad
directories, globs, absolute paths, and traversal are rejected by the profile
validator.

```json
{
  "id": "legacy-inspector-spacing",
  "rules": ["KUI-L006"],
  "target": "src/legacy/inspector.css",
  "rationale": "The legacy inspector retains its measured spacing until migration."
}
```

Review findings remain visible until explicitly suppressed. Avoid suppressing
`KUI-L001`, `KUI-L002`, `KUI-L003`, `KUI-L007`, `KUI-L009`, `KUI-L010`,
`KUI-L011`, `KUI-L012`, `KUI-L013`, `KUI-L014`, `KUI-L015`, or `KUI-L016`:
those indicate a
definite boundary or parsing failure rather than an aesthetic judgment.
