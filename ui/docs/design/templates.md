# Design templates — components as self-contained SVGs

`docs/design/templates/` holds **SVG design templates** for `@kerfjs/ui`
components: a faithful, self-contained picture of each component in its common
presentation combinations, captured from the real rendered HTML/CSS (production
tokens and styles, representative sample data). They're for design review,
documentation, figma/paste hand-off, and any surface that wants an accurate
component picture without running the app.

## Coverage

Templated components (each with light + dark variants):
`ToolbarControlGroup`, `Toolbar`, `ToolbarText`, `List`, `ListItem`, `ListHeader`,
`ListActionRow`, `ValueTable`, `Disclosure`, `ProgressBar`, `ProgressRing`, `StateBanner`, `EmptyState`, `Skeleton`,
`SegmentedControl`, `TabBar`/`TabBarItem`, `SearchField`, `TagField`, `Chip`, `ChoiceChips`,
`MessageComposer`, `ColorSwatches`, and the native form controls `Button`, `TextField`, `Checkbox`,
`RadioGroup`, `Switch`, `Slider`, and `Select`.

Deliberately **not** templated (they don't read as a single static component
picture): `DialogSurface`, `ListDetailDialog`, and `WorkbenchDialog` are modal `<dialog>`s that only present as a dialog
in the browser's top layer, so the catalog's surface-scaffold route shows it
instead; `LucideIcon` and
`DisclosureArrow` are decorative primitives best seen inside the components that
use them; `ResizableRegion` and the whole-screen layouts (`NavStack`,
`SplitView`, `Workbench`, `TabNavigator`) and the `Catalog` shell are
interaction-/viewport-driven screens rather than component cards — the live UX
catalog and the app-layouts docs cover those. `ColorPicker` is not templated
either: its hue and opacity tracks are range-input pseudo-elements a static
capture cannot reproduce.

## Layout

```
docs/design/templates/
  toolbar.svg                   ← library: every variant, composed (light)
  toolbar-dark.svg              ← library: dark theme
  toolbar/
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
  the variants out with captions. The generator writes a temporary HTML page whose
  `<img>` elements reference the individual variant SVGs, then captures that page
  with domotion and `--flatten-nested-svg`. The final library is self-contained,
  contains positioned groups rather than nested `<svg>` elements, and remains
  reliable in design tools such as Sketch. The individual variant files stay
  independently reusable.

## Building

```sh
npm run design-templates:build
```

This renders each component's real `SafeHtml` (with its CSS subpaths + `foundation.css`
tokens and representative sample data) into a standalone page and captures it with
[`domotion-svg`](https://github.com/brianwestphal/domotion)'s `domotion capture`.
The capture command uses `--flatten-nested-svg`, which converts safely flattenable
inline SVGs (including component icons) to groups so design tools such as Sketch do
not have to interpret nested `<svg>` elements.
`domotion` must be reachable: it resolves `DOMOTION_BIN`, then a local
`node_modules/.bin/domotion`, then a sibling `../domotion` checkout.

Each manifest entry's `css` list names the stylesheets a template starts from; the
build expands every component in it through that component's generated browser
entry (`dist/browser/<name>.js`), which imports every stylesheet the component's
runtime reaches. A nested component's styles — the `Badge` inside `StateBanner` or
`ListHeader`, the `Skeleton` inside a placeholder — are therefore loaded exactly as a
consumer's browser import loads them, instead of depending on a hand-maintained
list. Run `npm run build` before the template build so those entries exist.

**Keep the templates current as components change.** The variants live in the
`COMPONENTS` manifest in `scripts/build-design-templates.mjs` — when a component
gains or changes a presentation combination (e.g. a new `Toolbar` slot), add
or adjust its variant there and re-run the build. Cover the common cases: if a
component can render with or without an icon, include both.

`npm run check:design-templates` (part of `npm run check`) is an offline gate
that verifies every component + variant in the manifest has its committed output —
a light and dark SVG per variant plus the two per-component library files — and
that no stray template files linger for a removed component. It also rejects any
variant or library capture that still contains nested `<svg>` elements, guarding
the Sketch compatibility contract. It does **not**
re-render (that needs domotion + a browser), so it catches a manifest entry whose
templates were never generated or a half-regenerated set.

Deeper **visual drift** — a component changed but its template was not regenerated —
is caught by `npm run check:design-templates:drift`, a CI-only gate (it runs in a
dedicated macOS browser job, **not** in the offline `npm run check`). The committed
templates use system-font text, whose layout metrics differ by operating system, so
macOS is the canonical exact-render environment for both generation and comparison.
The capture fixture also pins its monospace token to `Courier New`; otherwise
`ui-monospace` resolves to different fonts on developer and hosted macOS machines.
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
   tokens and `layout.css`), and any of your own component CSS. Include the CSS of
   every `@kerfjs/ui` component it renders inside itself (a `Badge`, a `Skeleton`),
   or expand the list the way `resolveTemplateStyles()` does.
3. Enumerate the presentation combinations in the per-component manifest.
4. Capture each variant with `domotion capture <page.html> --selector <css>
--text-mode system-font --flatten-nested-svg -o <variant>.svg`, once per theme with
   `--color-scheme light` / `--color-scheme dark` (if your components theme with
   `light-dark()`).
5. Build a light and dark HTML library page that references the generated variants
   with `<img src="./component/variant.svg">`, and capture each page with the same
   domotion options, including `--flatten-nested-svg`. Let domotion own embedding,
   id isolation, and flattening instead of hand-assembling SVG markup.

Maintaining these next to the components — and reviewing the captured SVGs on
every component change — keeps the design source of truth honest.

ListItem templates retain the shared 18px leading icon and 44px row target;
regenerate both themes and library sheets when that geometry changes. The browser
pane/sidebar geometry checks cover the resulting 43px icon-label offset from the
section edge (17px content inset + 18px icon + 8px gap).

For a focused update, pass component names: `npm run design-templates:build -- toolbar`. Omit them to capture all components. Toolbar width variants use the real `wireToolbarVisibility` helper after rendering typed props. The `ListActionRow` "Trailing overflow menu" variant renders a real `trailingMenu` `PopupMenu`; its trigger is a native light-DOM button, so it captures as vectors with no template-only styling.

The form-control templates render real components. A variant that needs wiring
names it in the manifest's `wire` field (the `Checkbox` "Mixed Parent" variant
runs `wireCheckboxes` so the native mixed state draws). domotion cannot
vectorize the text inside a `<textarea>` or a textarea's native resize grip,
so the `TextField` multi-line variant shows a growing field (`maxRows`, no grip)
with a placeholder rather than a value.

The `ToolbarControlGroup` "Glass Material Over Artwork" variant draws the glass
group over flat sample color bands with `--kui-chrome-material-filter: none`.
domotion rasterizes a live `backdrop-filter` into an embedded image that keeps a
nested `<svg>` in the library sheet, which design tools cannot load, and a
gradient backdrop does the same. The template therefore shows the translucent
material, specular edge, and shadow as designed, without the blur, which exists
only at run time.
