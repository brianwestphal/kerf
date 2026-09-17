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
  panel-header.svg              ← library: every variant, inlined
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

- Each **variant** file is a standalone SVG — scales crisply and drops into an
  `<img>` anywhere. Captured with `--text-mode system-font`, so text is emitted as
  authored `<text>` painted by the viewer's system fonts: real, selectable, and
  small (no embedded font data). The kerf UI design font stack is system-based, so
  the picture matches; a viewer without those fonts falls back to its own.
- The **library** file (`<component>.svg`) lays the variants out with captions and
  embeds an inline **copy** of each variant as a positioned nested `<svg>`. It is
  fully self-contained and renders everywhere — a browser, an `<img>`, GitHub, or
  a static rasterizer. (External `<use href="…#id">` and `<image href="…">`
  references render blank in many SVG viewers, so the library inlines copies
  instead. Each copy's local ids and domotion font-family names are namespaced so
  the inlined variants don't collide in the one document; the individual variant
  files stay individually reusable.)

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
4. Capture each variant with `domotion capture <page.html> --selector <css>
   --text-mode system-font -o <variant>.svg`, then write a library file that embeds an inline
   copy of each variant (namespacing each copy's ids/font-family names so they
   don't collide) rather than referencing them, so it renders everywhere.

Maintaining these next to the components — and reviewing the captured SVGs on
every component change — keeps the design source of truth honest.
