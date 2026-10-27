# Form controls Sketch library

[Kerf-Forms.sketch](Kerf-Forms.sketch) contains 66 editable Symbols for the 20
source variants of SplitButton, TextField, Checkbox, CheckboxGroup, RadioGroup,
and Switch. Each individual control has a light and dark master. The source
showcase sheets contain 33 controls per theme; the library exports those
controls separately so a designer can place and override one state at a time.

The Symbols contain native Text and vector paths, with no bitmap layers.
Shared Color Variables cover brand, danger, success, neutral fill, and border
colors. [The manifest](symbol-manifest.json) records stable Symbol, Text, and
Color Variable IDs. Text overrides work in linked Library instances. TextField
borders stretch and its trailing icon stays pinned; checkboxes, radio groups,
and switches keep their controls at a fixed left position as the instance grows.
SplitButton keeps its primary content centered and the options control on the
right for the tested short override (`Done`) and an 80px wider instance.

This file was created and tested with Sketch 2026.3.1. Install a copy at a
stable path through Sketch Settings → Libraries. Update that same installed
file when a new version is published, then refresh the Library and sync
consumer instances. Do not change Symbol or shared asset IDs: linked
instances rely on them. The exporter checks previously published IDs. A
changed source SVG currently requires an explicit native layer migration;
the exporter stops before replacing a Symbol with fresh IDs.

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

The linked wide test covers short SplitButton labels. Longer SplitButton text
can overflow its current native Stack layout; see `KF-2QG72T`. Interactive
browser states, focus behavior, and event handling live in `@kerfjs/ui`, not
the static Sketch file.
