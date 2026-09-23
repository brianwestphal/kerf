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

Third-party component suites can provide the same contracts in a composition
catalog through `settings.kerfjs.ui.catalog` and its matching selection catalog.
