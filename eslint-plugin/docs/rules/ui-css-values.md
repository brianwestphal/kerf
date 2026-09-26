# `ui-css-values`

Checks literal JSX and direct component-function calls against each component's
cataloged `cssValueProps` contracts. The catalog keeps length, size, flex,
color, declaration-list, media-query, and numeric-pixel grammars distinct and
names their accepted helpers, finite shorthands, and raw-value policy.

Stable diagnostics are `KUI-L013` (raw or unknown shorthand), `KUI-L014`
(wrong property helper), `KUI-L015` (non-standalone expression), `KUI-L016`
(forbidden declaration list), and review-oriented `KUI-L017` (exceptional
spacing shorthand). Messages name the preferred shorthand or helper. Dynamic
values are left to TypeScript rather than guessed.

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
