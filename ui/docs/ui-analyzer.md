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
composition catalog by `package:id`, parses literal TSX/JSX class usage and CSS,
and reports portable repository-relative locations.

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

Errors are provable contract violations and make the command exit 1. Review
findings are deliberately heuristic and do not fail by default; pass
`--fail-on-review` when a project has reviewed its baseline and wants them to
gate CI. Text, versioned JSON, and SARIF carry the same stable rule ids,
source locations, evidence, and ownership chain.

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
`KUI-L001`, `KUI-L002`, `KUI-L003`, `KUI-L007`, or `KUI-L009`: those indicate a
definite boundary or parsing failure rather than an aesthetic judgment.
