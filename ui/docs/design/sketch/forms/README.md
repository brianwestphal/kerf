# Form controls Sketch library

[Kerf-Forms.sketch](Kerf-Forms.sketch) contains 66 editable Symbols for the 20
source variants of SplitButton, TextField, Checkbox, CheckboxGroup, RadioGroup,
and Switch. Each individual control has a light and dark master. The source
showcase sheets contain 33 controls per theme; the library exports those
controls separately so a designer can place and override one state at a time.

The Symbols contain native Text and vector paths, with no bitmap layers.
Shared Color Variables cover editable text, brand, danger, success, neutral
fill, and border colors. [The manifest](symbol-manifest.json) records stable Symbol, Text, and
Color Variable IDs. Text overrides work in linked Library instances. TextField
borders stretch and its trailing icon stays pinned; checkboxes, radio groups,
and switches keep their controls at a fixed left position as the instance grows.
SplitButton keeps its primary content centered and the options control on the
right for the tested short override (`Done`) and an 80px wider instance.

The builder reads each captured string's CSS weight and font family, so native
Text matches the production capture: 650 becomes semibold, 500 medium, and a
monospace capture keeps its named face. A label that outgrows its fixed frame
at the heavier weight is refitted instead of wrapping.

This file was created and tested with Sketch 2026.3.1. Install a copy at a
stable path through Sketch Settings → Libraries. Update that same installed
file when a new version is published, then refresh the Library and sync
consumer instances. Do not change Symbol or shared asset IDs: linked
instances rely on them. The exporter checks previously published IDs.

When a source SVG changes, `generate` imports it into a temporary master,
applies the same layout, and updates the published layers in place, so the
Symbol, Text override, and layer IDs stay the same. Unchanged paint colors
keep their Color Variables; run `assets` afterward to bind changed colors.
Published Color Variables stay in the library even when no Symbol uses them.
A changed layer count, layer or shape type, or a reordered label is rejected
with the fixture and tree path before any published layer changes; such an
edit needs a deliberate override-key migration.

## Regenerate and verify

From `ui/`, with the project's login-shell Node toolchain and one existing
Sketch process:

```sh
npm run sketch:forms -- capture
npm run sketch:forms -- generate
npm run sketch:forms -- assets
npm run sketch:forms -- verify
node scripts/sketch/forms/compare.mjs
```

The native tasks use the shared serial runner. They reuse the existing Sketch
process, track test-owned documents and temporary Library registrations, and
leave preexisting documents and Library settings untouched. The capture step
renders the actual component templates in Chromium, clips each individual
control, and converts it to SVG. The generator imports those SVGs as native
layers. The asset step binds shared Color Variables. Verification saves and
reopens the library, imports 12 representative linked instances across all
six families and both themes, changes text, grows width by 80px, and saves
and reopens a consumer document. The two `comparison-*.png` files juxtapose
production capture, native Symbol, and linked wide instance for visual review.

The linked wide test covers short SplitButton labels. Sketch 2026.3.1 does
not automatically ellipsize a long editable text override in this Symbol's
centered Stack. The `KF-2QG72T` native probe tested a long label and a
fixed-width Text layer at natural and +80px widths in both themes: both clipped
across the primary segment. Use a manually shortened editable label ending
in `…` when the full text cannot fit. For an icon SplitButton, keep the
measured label width at or below **instance width − 80px**: 40px for the
options trigger, 16px for the icon, 8px for its gap, and 16px of breathing
room around centered content. Without an icon, use **instance width − 56px**.
These are conservative layout bounds; inspect the result at the actual size.
Keep the full action text in the handoff annotation and restore it when a
wider instance can fit it. The `Upd…` probe passed native light/dark natural
and wide exports and survived linked consumer save/reopen. Run
`node scripts/sketch/forms/truncation.mjs` from `ui/` to reproduce it.

Automatic one-line CSS ellipsis is an explicitly unsupported Sketch effect.
Sketch's [text override guide](https://www.sketch.com/docs/symbols-and-styles/overrides/)
documents editable instance text; its
[Text API](https://developer.sketch.com/reference/api/#text) exposes fixed
versus flexible width, without a one-line ellipsis setting. Interactive
browser states, focus behavior, and event handling live in `@kerfjs/ui`, not
the static Sketch file.
