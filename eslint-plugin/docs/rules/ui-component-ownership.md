# `ui-component-ownership`

Components own their styles and are configured, never overridden. This rule
keeps application and component-package code from reaching into another
package's component through its variables:

- `KUI-L020` — a string, template, object key, or `style` value references a
  component's private `--_<root>-*` variable (`--_kui-list-gap`), or any
  `--_kui-*` variable. Private variables are implementation; reading or writing
  them breaks when the component changes.
- `KUI-L021` — code assigns a component token that a typed prop sets, in a
  `style` string (`style="--kui-list-gap: 4px"`), a style object key
  (`style={{ '--kui-floating-toolbar-inset': '0' }}`), or
  `style.setProperty('--kui-disclosure-arrow-size', …)`. Set the prop instead
  (`<List gap="xs" />`).

Both messages name the owning component and end with the same guidance: if no
configuration covers the need, report the component gap to the owning package
(open a feature request) instead of overriding it.

```tsx
// KUI-L020 / KUI-L021
<div style="--_kui-list-gap: 2px; --kui-list-gap: 4px">…</div>;

// Configure the component instead.
<List gap="xs">…</List>;
```

Ownership comes from the loaded composition catalogs, so third-party component
packages declared in `.kerf-ui-profile.json` get the same protection. A file
inside the package that owns a component (the nearest `package.json` names the
catalog entry's `package`) may use that component's own private variables and
tokens. Reading a public token (`var(--kui-list-divider-color)`) and setting a
theme token with no equivalent prop remain configuration and are not reported.

CSS files are outside ESLint's reach: `kerf-ui-analyze` (and `kerf-ui-doctor`)
report the same `KUI-L020` / `KUI-L021` ids in stylesheets, plus `KUI-L019`
(a rule whose subject is a cataloged component) and `KUI-L022` (a hook class
on a component's root). See `@kerfjs/ui/docs/ui-analyzer.md`.

Exact profile exceptions may name either id. The rule reads
`@kerfjs/ui/ai/component-composition.json` by default; see the plugin README for
alternate catalog settings.
