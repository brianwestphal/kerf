# Advanced inputs Sketch library

[Kerf-Advanced.sketch](Kerf-Advanced.sketch) contains 34 editable light and
dark Symbols for 17 source variants across Select, SearchField, TagField,
Slider, ColorField, ColorPicker, and ColorSwatches. Each template variant has
its own master in each theme. All imported content remains native Text and
vector paths, with no bitmap layers. Sixteen shared Color Variables bind
matching input fills and borders; [the manifest](symbol-manifest.json) pins
Symbol, Text, and Color Variable IDs.

This library was created and tested with Sketch 2026.3.1. Install a copy at a
stable path through Sketch Settings → Libraries. Update that same installed
file, refresh the Library, and sync consumer instances on a later release.
The exporter checks previously published identities and stops if a source SVG
changes before its native layers can be migrated safely (`KF-E7DE7P`).

## Regenerate and verify

From `ui/`, with the project's login-shell Node toolchain and one existing
Sketch process:

```sh
npm run sketch:advanced -- capture
npm run sketch:advanced -- generate
npm run sketch:advanced -- assets
npm run sketch:advanced -- verify
node scripts/sketch/advanced/compare.mjs
```

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
and ColorField use pinned/stretching vector layout; ColorPicker and
ColorSwatches retain their control grouping and native color shapes.

The captured Slider value, ColorPicker selection, and popup/field states are
static design states. Browser interaction, range input behavior, and live
gradient selection remain in `@kerfjs/ui`; the Sketch file provides editable
appearance at the captured state.
