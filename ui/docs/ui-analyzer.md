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

| Rule       | Kind   | Meaning                                                                               |
| ---------- | ------ | ------------------------------------------------------------------------------------- |
| `KUI-L001` | error  | A stylesheet reaches into a private or unknown `.kui-*` selector.                     |
| `KUI-L002` | error  | A stylesheet references an unknown or private `--kui-*` token.                        |
| `KUI-L003` | error  | One element combines public classes that claim the same geometry.                     |
| `KUI-L004` | review | Nested literal classes both add a content inset.                                      |
| `KUI-L005` | —      | Retired; folded into `KUI-L019` (see below).                                          |
| `KUI-L006` | review | Literal spacing falls outside Kerf's approved scale.                                  |
| `KUI-L007` | error  | A declared scroll owner is nested inside another scroll owner.                        |
| `KUI-L008` | review | A dynamic class expression cannot be classified soundly.                              |
| `KUI-L009` | error  | A stylesheet cannot be parsed.                                                        |
| `KUI-L010` | error  | A selector reaches a private Kerf descendant from a public root.                      |
| `KUI-L011` | error  | A `::part()` target is not cataloged as a public extension point.                     |
| `KUI-L012` | error  | CSS assigns a Kerf token without a public configuration contract.                     |
| `KUI-L013` | error  | A CSS-adjacent prop uses an unknown shorthand or raw literal.                         |
| `KUI-L014` | error  | A typed helper produces the wrong property grammar.                                   |
| `KUI-L015` | error  | An expression-only helper is passed without a composer.                               |
| `KUI-L016` | error  | A removed declaration-list escape hatch is used.                                      |
| `KUI-L017` | review | A valid but exceptional off-scale shorthand needs justification.                      |
| `KUI-L018` | review | A loud fill override lacks a governing `on-loud`, or the literal pair is below 4.5:1. |
| `KUI-L019` | error  | A rule's subject is another package's component (class, `data-component`, or tag).    |
| `KUI-L020` | error  | CSS reads or writes another component's private `--_*` variable.                      |
| `KUI-L021` | error  | CSS overrides a component token that a typed prop sets.                               |
| `KUI-L022` | error  | A class placed on a component's root is styled by the application (a hook class).     |

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
Selectors for application-owned content remain allowed, including in a
component's context (`.kui-pane > .my-content`): a public class is an
extension point for naming a context, not for restyling the component itself,
which `KUI-L019` reports.

Catalog entries may also publish `cssValueProps`. Each path names its grammar,
finite shorthands, canonical and exceptional scale steps, accepted typed
helpers, expression-only helpers, raw escape policy, and examples. The analyzer
uses that same metadata for direct component calls and JSX, including nested
paths such as `choices[].color`; consumer catalogs receive identical checks.
Dynamic values remain a type-system responsibility rather than being guessed.

## Component ownership (`KUI-L019`–`KUI-L022`)

Components own their styles and are configured, never overridden. These
diagnostics apply the package's own `check:css-ownership` rules to
applications and component packages; the selector parsing is the same module
(`analyzer/selectors.mjs`), so the package rule and the consumer rule agree on
which element a selector styles.

- **`KUI-L019` — a rule restyles a cataloged component.** The rule's subject
  (the rightmost compound of each selector, ignoring `:has()` and `:not()`
  arguments) names a public class of a cataloged component (`.kui-toolbar`,
  `.kui-list-item__label`, `.acme-meter`), its `[data-component="…"]` root, or
  a Web Awesome tag the package themes (`wa-button`, `wa-select`), and the rule
  sets at least one ordinary property. A `::part()` subject is left to
  `KUI-L011`; a rule that only sets custom properties is configuration, judged
  by the token rules. Forcing a component's dimensions is one such restyle
  and reports here once: `.kui-pane { width: 300px }`.
- **`KUI-L020` — another component's private variable.** CSS reads or writes a
  `--_<root>-*` variable of a cataloged component (`--_kui-list-gap`), or any
  `--_kui-*` variable.
- **`KUI-L021` — a token a typed prop sets.** CSS assigns `--<root>-<prop>`
  where the component has that typed prop (`--kui-list-gap` is `List gap`,
  `--kui-floating-toolbar-inset` is `FloatingToolbar inset`). The message
  quotes the prop's cataloged example.
- **`KUI-L022` — a hook class on a component's root.** A literal class on an
  imported component's JSX (`<Toolbar className="header" />`) is the subject
  of a rule in a stylesheet that file imports, so the application restyles the
  component through it. The evidence names the stylesheet, line, and selector.

Every message names the configuration to use (the component's typed props,
public tokens, and variants from its catalog entry) and ends with the same
route for a real need that has none: report the component gap to the owning
package (open a feature request) instead of overriding it.

What stays allowed mirrors the package rule, where a child styles itself in a
parent's context:

```css
/* Your own element in a component's context. */
.kui-toolbar > .my-widget {
  margin-inline-start: auto;
}
/* Keying your own element on a component's state. */
.shell:has(.kui-select[open]) .my-status {
  opacity: 0.5;
}
/* Configuring a component through a public token with no typed prop. */
.kui-list {
  --kui-list-divider-color: var(--kui-color-neutral-border-quiet);
}

/* KUI-L019, KUI-L020, KUI-L021. */
.kui-toolbar {
  padding: 0;
}
.app {
  --_kui-list-gap: 2px;
  --kui-list-gap: 4px;
}
```

Ownership is decided per package: a stylesheet belongs to the package whose
`package.json` is nearest it, and only other packages' catalog entries are
foreign to it. A component package built on Kerf UI therefore styles its own
cataloged components (including `.kui-toolbar > .acme-meter` from its own
stylesheet) without findings, while an application that restyles
`.acme-meter` is reported against `@acme/widgets`. All four ids are
ownership-boundary diagnostics, so `--adoption` reports them as review
findings. `eslint-plugin-kerfjs`'s `ui-component-ownership` rule reports
`KUI-L020` and `KUI-L021` in JavaScript and TypeScript (style strings, style
objects, and `style.setProperty()`), where this analyzer reads only CSS.

### Retired: `KUI-L005` (forced component dimension)

`KUI-L005` used to report, as a review finding, any `width`/`height`/`min-*`/
`max-*` declaration in a rule that mentioned a public component class
anywhere in its selector. `KUI-L019` now reports every restyle whose subject is
a cataloged component — dimensions included — so the subject case was
double-reported (an error and a review finding for one declaration). Its only
other shape, a public class as an ancestor
(`.kui-pane .app-sidebar { width: 240px }`), sizes the application's own
element in the component's context, which the ownership rules explicitly
allow. With no unique true positive left,
the rule was retired rather than narrowed. The analyzer no longer emits it;
the id stays in `ai/application-ui-diagnostic-ids-v1.json` (listed under
`retired`) so a profile exception that already names it still loads. Remove
such exceptions at your convenience.

## Loud fill / on-loud pairing (`KUI-L018`)

The shipped Web Awesome theme pairs every `--wa-color-{tone}-fill-loud` with a
`--wa-color-{tone}-on-loud` foreground that clears WCAG AA (4.5:1), for the
`neutral`, `brand`, `success`, `warning`, `danger`, and `pop` tones. A
stylesheet that overrides a loud fill without also setting that tone's
`on-loud` keeps the theme's foreground on an unknown fill, so the guarantee no
longer holds. `KUI-L018` reports such a fill and names each scope that lacks a
pair, and it reports a pair that is present but measurably fails.

**Which `on-loud` governs a fill.** Each individual selector of the fill
(after resolving CSS nesting and splitting selector lists) inside its chain of
at-rules is one scope. An `on-loud` of the same tone governs it when declared:

- in the same scope, in the same or a separate rule, in either order; or
- in an ancestor scope: a document-root selector (`:root`, `html`, `:host`,
  `*`), or the leading part of a descendant or child chain (`.shell` governs
  `.shell .panel` and `.frame > .tile`, but not `.shell-alt .panel` or
  `.shell.dense`); and
- under no at-rule, or the same at-rule chain (an unconditional `on-loud`
  applies inside `@media`, but one under `@media` or `@supports` is not proven
  to apply to an unconditional fill).

That `on-loud` may live in the same stylesheet or in another one the same
entry loads: a source module that imports both stylesheets, or a stylesheet
that reaches both through `@import`. A stylesheet no entry loads with the fill
does not count. When several candidates apply, the same scope wins (this
stylesheet first), then the nearest ancestor.

**Contrast, when it can be proven.** When the fill and its governing `on-loud`
are both literal opaque colors (hex, `rgb()`/`rgba()`, `hsl()`/`hsla()`,
`white`/`black`, or a `light-dark()` of two of them), the analyzer computes the
WCAG contrast ratio in each color scheme and reports a pair below 4.5:1, with
the ratio and scheme in its evidence. An unpaired literal fill is accepted when
it clears 4.5:1 in both schemes against the theme's default `on-loud` for its
tone (`light-dark(#fff, #111113)` for `brand` and `danger`, `#1d1d1f` for
`success` and `warning`); `neutral` follows a surface token and `pop` has no
Web Awesome default, so their unpaired fills are always reported. Values it
cannot prove (`var()`, `color-mix()`, translucent colors, keywords) are not
measured: a present pair is accepted, and an unpaired fill is reported.

```css
/* KUI-L018: brand fill moves, its foreground does not. */
.billing {
  --wa-color-brand-fill-loud: #7540a8;
}

/* Paired: both in the same scope. */
.billing {
  --wa-color-brand-fill-loud: #7540a8;
  --wa-color-brand-on-loud: #ffffff;
}

/* Paired through an ancestor scope (6.87:1). */
:root {
  --wa-color-brand-on-loud: #ffffff;
}
.billing {
  --wa-color-brand-fill-loud: #7540a8;
}

/* KUI-L018: present, but white on this fill measures 2.14:1. */
.billing {
  --wa-color-brand-fill-loud: #7fb3ff;
  --wa-color-brand-on-loud: #ffffff;
}
```

It is a review finding rather than an error because the analyzer cannot see
every cascade: an `on-loud` set inline, by script, or by a stylesheet it does
not analyze may still govern the fill. Set the `on-loud` explicitly beside the
fill, which also documents the pair; use `--fail-on-review` to gate it in CI.
See [the Web Awesome theme customization notes](./webawesome-theme.md#customization).

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
`KUI-L011`, `KUI-L012`, `KUI-L013`, `KUI-L014`, `KUI-L015`, `KUI-L016`,
`KUI-L019`, `KUI-L020`, `KUI-L021`, or `KUI-L022`:
those indicate a
definite boundary or parsing failure rather than an aesthetic judgment.
