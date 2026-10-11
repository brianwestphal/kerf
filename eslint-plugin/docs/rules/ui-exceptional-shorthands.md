# `ui-exceptional-shorthands`

Reports `KUI-L017` when a Kerf UI component prop uses a valid but exceptional
off-scale shorthand — for example `<List gap="s" />` or `<Row gap="xl" />`,
where the catalog lists `s` and `xl` under the prop's `exceptionalShorthands`.
The value renders correctly; the finding asks whether the off-scale choice is
deliberate. The message names the canonical shorthands and helpers to prefer.

This is a review finding, not a contract violation. The analyzer classifies
`KUI-L017` as `review`, so the rule is `warn` in both `recommended-ui` and
`strict-ui`, and `kerf-ui-doctor` merges the ESLint and analyzer reports into a
single review finding. To make review findings fail a run, use the doctor's
`failOn: 'review'` rather than promoting this rule to `error`.

Keep a deliberate choice by recording a profile exception for `KUI-L017` with a
rationale, or move to a canonical shorthand or a typed helper such as
`space('s')`.

The rule shares its catalog walk with [`ui-css-values`](ui-css-values.md),
which reports the `KUI-L013`–`KUI-L016` contract violations at `error`. It
covers JSX and direct component calls against the bundled `@kerfjs/ui` catalog
and any third-party catalog configured through `settings.kerfjs.ui.catalog`.
