# Toolbar and navigation Sketch library

[Kerf-Toolbar.sketch](Kerf-Toolbar.sketch) contains 70
editable light and dark Symbols for 35 individual controls across 25 source variants: ToolbarControlGroup,
Toolbar, ToolbarText, TabBar, SegmentedControl, ChoiceChips, and Chip. The two
Chip showcase sheets become twelve separate Chip masters. Group components
remain grouped; a toolbar or tab bar is distinct from a reusable Chip.

Every master uses native Text and vector paths, with no bitmap layers. Shared
Color Variables bind text, icon, fill, and border paints.
[The manifest](symbol-manifest.json) records stable Symbol, Text, and Color
Variable IDs. The exporter stops if a published source SVG changes until its
native layers can be migrated without replacing linked IDs (`KF-8970GK`).

This library was created and tested with Sketch 2026.3.1.

## Generate and verify

From `ui/`, with the project's login-shell Node toolchain and one existing
Sketch process:

```sh
npm run sketch:toolbar -- capture
npm run sketch:toolbar -- generate
npm run sketch:toolbar -- assets
npm run sketch:toolbar -- verify
node scripts/sketch/toolbar/compare.mjs
```

The capture renders production templates in Chromium and clips each target
root before importing editable SVG layers. It drops fully transparent
gradient layers that chips capture for an empty background image, because
Sketch would import them as opaque black. The native tasks use the serial
runner in the existing Sketch process, preserving preexisting documents and
Library registrations. Verification imports fourteen linked instances across
all seven families and both themes, tests a text override and an 80px width
increase, then saves and reopens the Library and consumer document. Reviewed
`comparison-*.png` files place production captures, native masters, and
widened linked instances side by side.

Only a Toolbar fills its width: its leading content stays left and its
trailing half, including a grouped control's background and icons, moves to
the right edge as one cluster. ToolbarControlGroup, ToolbarText, TabBar,
SegmentedControl, ChoiceChips, and Chip hug their content, so a wider instance
keeps them at their authored size, pinned left. The builder turns the imported
capture from a Sketch Graphic, which would scale its contents, into a plain
group so these pins apply. Captured blurred box shadows import as hard offset
rectangles, so the builder gives each imported shadow layer a native Gaussian
blur with the captured radius.

Install a copy at a stable path through Sketch Settings → Libraries. On an
update, replace that installed file, refresh the Library, and sync consumer
instances. The `width-visibility-600` and `width-visibility-320` toolbar
Symbols are separate captured responsive states; runtime breakpoints,
selection, and interaction stay in `@kerfjs/ui`.
