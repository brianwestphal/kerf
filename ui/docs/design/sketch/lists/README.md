# Lists and Data Sketch library

[Kerf-Lists.sketch](Kerf-Lists.sketch) contains 42 editable light and dark
Symbols for 21 production variants across List, ListItem, ListHeader,
ListActionRow, and ValueTable. A whole List or ValueTable is a separate Symbol
from its reusable rows. Every master uses native Text and vector paths, with
no bitmap layers. Ten shared Color Variables bind text, fills, and borders.
[The manifest](symbol-manifest.json) pins Symbol, Text, and Color Variable IDs.

This library was created and tested with Sketch 2026.3.1. Install a copy at a
stable path through Sketch Settings → Libraries. Update that same installed
file, refresh the Library, and sync consumer instances on a later release.
When a source SVG changes, `generate` imports it into a temporary master,
applies the same layout, and updates the published layers in place
(`scripts/sketch/shared/migrate-layers.js`), so Symbol, Text override, and
layer IDs stay the same. Unchanged paint colors keep their Color Variables;
run `assets` afterward to bind changed colors. A changed layer count, layer
or shape type, or a reordered label is rejected with the fixture and tree
path before any published layer changes. When an edit only adds non-Text layers, they are
inserted beside the matched layers. When the importer reshapes the tree so
no layer-by-layer mapping exists but the ordered labels still match, the
builder keeps the Symbol and moves each published Text layer (the override
keys) into the fresh tree, and the build report flags it as `retreed`.

## Regenerate and verify

From `ui/`, with the project's login-shell Node toolchain and one existing
Sketch process:

```sh
npm run sketch:lists -- capture
npm run sketch:lists -- generate
npm run sketch:lists -- assets
npm run sketch:lists -- verify
npm run sketch:lists -- sync
node scripts/sketch/lists/compare.mjs
```

`sync` proves linked consumers follow an update. It builds a consumer on the
published Library with a Text override per instance, publishes a next version
with one master text edited under the same document ID, syncs through Sketch's
libraries controller, and checks that the edit arrives, the overrides survive,
and save/reopen keeps both (`sync-verification.json`).

The capture renders production templates in Chromium and converts each
component root to SVG. Native import retains its editable text and vector
layers. The builder maps the captured 400, 500, 600, and 650 font weights to
Sketch Text weights. It turns the imported capture from a Sketch Graphic,
which would scale its contents, into a plain group so pins apply. List, row,
selection, and table backgrounds stretch with the Symbol; leading icons and
labels stay pinned left; trailing actions and right-aligned values follow the
right edge, and a shorter text override stays right aligned. The serial runner uses the
existing Sketch process and preserves its preexisting documents and Library
registrations.

Verification saves and reopens the library, imports ten linked instances
covering all five families and both themes, applies a text override and an
80px width increase, then saves and reopens the consumer document. The
reviewed `comparison-*.png` files show the production capture, native master,
and widened linked instance side by side.

Captured selected, expanded, and action states are static design states.
Selection, activation, wrapping, truncation, and responsive behavior at other
widths remain in `@kerfjs/ui`; these Symbols provide editable appearance at
the captured widths and a tested wider instance.
