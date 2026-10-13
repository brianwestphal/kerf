# `ui-css-values`

Checks literal JSX and direct component-function calls against each component's
cataloged `cssValueProps` contracts. The catalog keeps length, size, flex,
color, declaration-list, media-query, and numeric-pixel grammars distinct and
names their accepted helpers, finite shorthands, and raw-value policy.
A contract path is dot-separated object members, each optionally suffixed with
`[]` to visit every array element: `gap`, `choices[].swatch`, `iconTile.color`.
A member that is not a literal object or array (a tone string such as
`iconTile="brand"`, a variable) is skipped.

Stable diagnostics are `KUI-L013` (raw or unknown shorthand), `KUI-L014`
(wrong property helper), `KUI-L015` (non-standalone expression), `KUI-L016`
(forbidden declaration list). Messages name the preferred shorthand or helper.
Dynamic values are left to TypeScript rather than guessed. The review finding
`KUI-L017` (exceptional spacing shorthand) is reported by the companion
[`ui-exceptional-shorthands`](ui-exceptional-shorthands.md) rule so it can carry
the `warn` severity that matches the analyzer's `review` classification.

Only component exports carry an entry's contracts. A catalog entry's
`publicExports` also lists the helpers its props consume (`Select` ships
`uiColor`, `List` ships `px`, `rem`, and `flex`); a helper call such as
`flex({ gap: '12px' })` is not a `List` call and is never checked as one. A
component export is one whose name starts with an uppercase letter, the rule
JSX itself uses to tell a component tag from an intrinsic element; a default
import keeps its subpath's entry. `@kerfjs/ui`'s catalog check enforces the
convention for the package, and `kerf-ui-analyze` applies the same rule.

Third-party component suites can provide the same contracts in a composition
catalog through `settings.kerfjs.ui.catalog` and its matching selection catalog.
