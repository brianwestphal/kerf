# Design templates — components as self-contained SVGs

`docs/design/templates/` holds **SVG design templates** for `@kerfjs/ui`
components: a faithful, self-contained picture of each component in its common
presentation combinations, captured from the real rendered HTML/CSS (production
tokens and styles, representative sample data). They're for design review,
documentation, figma/paste hand-off, and any surface that wants an accurate
component picture without running the app.

## Layout

```
docs/design/templates/
  panel-header.svg              ← library: every variant, by reference
  panel-header/
    icon-summary-actions.svg    ← one self-contained variant
    icon-actions.svg
    no-icon.svg
    title-only.svg
    page-heading.svg
  toolbar-control-group.svg
  toolbar-control-group/
    …
```

- Each **variant** file is a standalone SVG — embeds its own glyph data and
  styles, scales crisply, and drops into an `<img>` anywhere.
- The **library** file (`<component>.svg`) is a small index that lays the variants
  out with captions and references each one by file
  (`<image href="<component>/<variant>.svg">`). It renders in a browser or an
  `<img>`; the variants stay individually reusable and the library stays tiny.
  (External `<use href="…#id">` is not resolved by static SVG rasterizers, so the
  library references variants with `<image>`, which browsers resolve relative to
  the library file.)

## Building

```sh
npm run design-templates:build
```

This renders each component's real `SafeHtml` (with its CSS subpaths + `foundation.css`
tokens and representative sample data) into a standalone page and captures it with
[`domotion-svg`](https://github.com/brianwestphal/domotion)'s `domotion capture`.
`domotion` must be reachable: it resolves `DOMOTION_BIN`, then a local
`node_modules/.bin/domotion`, then a sibling `../domotion` checkout.

**Keep the templates current as components change.** The variants live in the
`COMPONENTS` manifest in `scripts/build-design-templates.mjs` — when a component
gains or changes a presentation combination (e.g. a new `PanelHeader` slot), add
or adjust its variant there and re-run the build. Cover the common cases: if a
component can render with or without an icon, include both.

## Templating your own components

Apps that build on `@kerfjs/ui` can produce the same design templates for their
own application-level components. Copy `scripts/build-design-templates.mjs` as a
starting point and:

1. Import your component and render it to a `SafeHtml` string with realistic
   sample data (pass icon/action slots as `SafeHtml`, e.g. `LucideIcon({ … })` or
   `raw('<button …>')` — never plain strings, which kerf escapes).
2. List the component's CSS (its `@kerfjs/ui` subpaths plus `foundation.css` for
   tokens and `layout.css`), and any of your own component CSS.
3. Enumerate the presentation combinations in the per-component manifest.
4. Capture each variant with `domotion capture <page.html> --selector <css> -o
   <variant>.svg`, then write a library file that references the variants.

Maintaining these next to the components — and reviewing the captured SVGs on
every component change — keeps the design source of truth honest.
