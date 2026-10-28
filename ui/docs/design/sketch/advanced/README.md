# Advanced inputs Sketch library

[Kerf-Advanced.sketch](Kerf-Advanced.sketch) contains 34 editable light and
dark Symbols for 17 source variants across Select, SearchField, TagField,
Slider, ColorField, ColorPicker, and ColorSwatches. Each template variant has
its own master in each theme. All imported content remains native Text and
vector paths, with no bitmap layers. Shared Color Variables bind native text,
input fills, and borders; [the manifest](symbol-manifest.json) pins
Symbol, Text, and Color Variable IDs.

The builder reads each captured string's CSS weight and font family, so native
Text matches the production capture: 650 becomes semibold, 500 medium, and a
monospace capture keeps its named face. A label that outgrows its fixed frame
at the heavier weight is refitted instead of wrapping.

This library was created and tested with Sketch 2026.3.1. Install a copy at a
stable path through Sketch Settings → Libraries. Update that same installed
file, refresh the Library, and sync consumer instances on a later release.
The exporter checks previously published identities.

When a source SVG changes, `generate` updates the published layers in place,
including text, geometry, gradients, and checkerboard paints, so the Symbol,
Text override, and layer IDs stay the same. Unchanged paint colors keep their
Color Variables; run `assets` afterward to bind changed colors. Published
Color Variables stay in the library even when no Symbol uses them. A changed
layer count, layer or path type, or a reordered label is rejected before any
published layer changes; such an edit needs a deliberate override-key
migration.

## Regenerate and verify

From `ui/`, with the project's login-shell Node toolchain and one existing
Sketch process:

```sh
npm run sketch:advanced -- capture
npm run sketch:advanced -- generate
npm run sketch:advanced -- assets
npm run sketch:advanced -- verify
npm run sketch:advanced -- sync
node scripts/sketch/advanced/compare.mjs
```

`sync` proves linked consumers follow an update. It builds a consumer on the
published Library with a Text override per instance, publishes a next version
with one master text edited under the same document ID, syncs through Sketch's
libraries controller, and checks that the edit arrives, the overrides survive,
and save/reopen keeps both (`sync-verification.json`).

The capture renders the production templates in Chromium, clips each
component root, and converts it to SVG. It turns `hsl(...)` gradient stops
into equivalent hex values because Sketch's SVG importer loses their hue.
It also flattens the opacity track's translucent checker squares to their
displayed light/dark colors; both changes retain editable vector shapes.
The native tasks use the serial runner in the existing Sketch process and
preserve preexisting documents and Library registrations.

Verification saves and reopens the library, imports 14 linked instances across
all seven families and both themes, applies short text overrides and an 80px
width increase, and saves and reopens the consumer document. The reviewed
`comparison-*.png` files show the production capture, native master, and
linked wide instance side by side. Select, SearchField, TagField, Slider,
and ColorField stretch their field surfaces with the instance while leading
content stays left and trailing controls stay right. ColorPicker and
ColorSwatches are fixed-size widgets: a wider instance keeps them at their
authored size, pinned left. The builder turns the imported capture from a
Sketch Graphic, which would scale its contents, into a plain group so these
pins apply, and re-applies the layout to every master on each build. Captured blurred box shadows import as hard offset
rectangles, so the builder gives each imported shadow layer a native Gaussian
blur with the captured radius.

The captured Slider value, ColorPicker selection, and popup/field states are
static design states. Browser interaction, range input behavior, and live
gradient selection remain in `@kerfjs/ui`; the Sketch file provides editable
appearance at the captured state.
