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

A helper is identified by its imported name when its module is the
component's package or any subpath of it, the same way `kerf-ui-analyze`
resolves it. Named, aliased, and namespace imports all count, so these are
equivalent:

```tsx
import { ListItem } from '@kerfjs/ui/list-item';
import { foregroundColor } from '@kerfjs/ui/css-values';
import { foregroundColor as fg } from '@kerfjs/ui';
import * as css from '@kerfjs/ui/css-values';

// Each reports KUI-L014: a fill takes `fillColor()`, `uiColor()`, or `colorVar()`.
<ListItem label="A" iconTile={{ color: foregroundColor('#000') }} />;
<ListItem label="B" iconTile={{ color: fg('#000') }} />;
<ListItem label="C" iconTile={{ color: css.foregroundColor('#000') }} />;
```

A same-named helper from another package (`other-ui/css-values`, or a
package that only shares the prefix, such as `@kerfjs/ui-extras`) is not a
cataloged helper, and the rule leaves its call alone.

Third-party component suites can provide the same contracts in a composition
catalog through `settings.kerfjs.ui.catalog` and its matching selection catalog.
