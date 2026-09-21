# Design templates — components as self-contained SVGs

`docs/design/templates/` holds **SVG design templates** for `@kerfjs/ui`
components: a faithful, self-contained picture of each component in its common
presentation combinations, captured from the real rendered HTML/CSS (production
tokens and styles, representative sample data). They're for design review,
documentation, figma/paste hand-off, and any surface that wants an accurate
component picture without running the app.

## Coverage

Templated components (each with light + dark variants): `PanelHeader`,
`ToolbarControlGroup`, `Toolbar`, `ToolbarText`, `ListItem`, `ListHeader`,
`ListActionRow`, `ValueTable`, `StateBanner`, `EmptyState`, `Skeleton`,
`SegmentedControl`, `TabBar`/`AppTab`, and `TokenSearchField`.

Deliberately **not** templated (they don't read as a single static component
picture): `Select` renders a Web Awesome custom element that needs its runtime
registered, so it has no faithful static capture; `LucideIcon` and
`DisclosureArrow` are decorative primitives best seen inside the components that
use them; `ResizableRegion` and the whole-screen layouts (`NavStack`,
`SplitView`, `Workbench`, `TabScaffold`) and the `Catalog` shell are
interaction-/viewport-driven screens rather than component cards — the live UX
catalog and the app-layouts docs cover those.

## Layout

```
docs/design/templates/
  panel-header.svg              ← library: every variant, inlined (light)
  panel-header-dark.svg         ← library: dark theme
  panel-header/
    icon-summary-actions.svg    ← one self-contained variant (light)
    icon-summary-actions-dark.svg ← the same variant, dark theme
    icon-actions.svg
    icon-actions-dark.svg
    …
  toolbar-control-group.svg
  toolbar-control-group-dark.svg
  toolbar-control-group/
    …
```

- Each **variant** is captured in both themes — `<variant>.svg` (light) and
  `<variant>-dark.svg` (dark) — a standalone SVG that scales crisply and drops
  into an `<img>` anywhere. Dark is driven by domotion's `--color-scheme`, which
  foundation.css's `light-dark()` tokens respond to. Captured with
  `--text-mode system-font`, so text is emitted as authored `<text>` painted by the
  viewer's system fonts: real, selectable, and small (no embedded font data). The
  kerf UI design font stack is system-based, so the picture matches; a viewer
  without those fonts falls back to its own.
- The **library** files (`<component>.svg` light, `<component>-dark.svg` dark) lay
  the variants out with captions and embed an inline **copy** of each variant as a
  positioned nested `<svg>`. Each is fully self-contained and renders everywhere —
  a browser, an `<img>`, GitHub, or a static rasterizer. (External
  `<use href="…#id">` and `<image href="…">` references render blank in many SVG
  viewers, so the library inlines copies instead. Each copy's local ids and
  domotion font-family names are namespaced so the inlined variants don't collide
  in the one document; the individual variant files stay individually reusable.)

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

`npm run check:design-templates` (part of `npm run check`) is an offline gate
that verifies every component + variant in the manifest has its committed output —
a light and dark SVG per variant plus the two per-component library files — and
that no stray template files linger for a removed component. It does **not**
re-render (that needs domotion + a browser), so it catches a manifest entry whose
templates were never generated or a half-regenerated set.

Deeper **visual drift** — a component changed but its template was not regenerated —
is caught by `npm run check:design-templates:drift`, a CI-only gate (it runs in a
dedicated macOS browser job, **not** in the offline `npm run check`). The committed
templates use system-font text, whose layout metrics differ by operating system, so
macOS is the canonical exact-render environment for both generation and comparison.
The gate regenerates every template into a throwaway directory and fails if any
regenerated SVG differs from the committed one, after normalizing the bits that
legitimately vary between runs (XML comments and the auto-minted element ids / font
names). If it fails, run `npm run design-templates:build` on macOS and commit the
updated SVGs.

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
--text-mode system-font -o <variant>.svg`, once per theme with
   `--color-scheme light` / `--color-scheme dark` (if your components theme with
   `light-dark()`), then write a light and a dark library file that each embed an
   inline copy of every variant (namespacing each copy's ids/font-family names so
   they don't collide) rather than referencing them, so they render everywhere.

Maintaining these next to the components — and reviewing the captured SVGs on
every component change — keeps the design source of truth honest.
