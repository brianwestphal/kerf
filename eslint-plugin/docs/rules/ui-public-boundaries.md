# `ui-public-boundaries`

Rejects `kui-*` classes and `--kui-*` custom properties that are not listed in the versioned composition catalog. This keeps application code out of private component anatomy while allowing cataloged styling seams.

Diagnostics are stable: `KUI-L101` identifies a private/unknown class and `KUI-L102` an unknown token. Exact profile exceptions can name either id. The rule deliberately does not rewrite selectors or tokens because there is no generally safe replacement.

The rule reads `@kerfjs/ui/ai/component-catalog-v2.json` by default. See the plugin README for alternate catalog settings used by monorepos and package authors.
