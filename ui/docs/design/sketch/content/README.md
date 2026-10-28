# Content and feedback Sketch library

[Kerf-Content.sketch](Kerf-Content.sketch) contains 56 editable light and dark
Symbols for 28 reusable roots across 20 source variants: Disclosure,
MessageComposer, ProgressBar, ProgressRing, StateBanner, EmptyState, and
Skeleton. Multi-control Disclosure and progress sheets become separate native
masters. This library was created and tested with Sketch 2026.3.1.

ProgressRing geometry stays fixed. Other components stretch their tracks and
container surfaces with the instance: leading content stays left, the trailing
half (a banner's action button, a composer's send button, a value label) moves
to the right edge as one cluster, and EmptyState content stays centered. The
builder turns the imported capture from a Sketch Graphic, which would scale
its contents, into a plain group so these pins apply.

The masters use native Text and vector paths with shared Color Variables for
matching text, progress, status, fill, and border paints.
[The manifest](symbol-manifest.json) records stable Symbol, Text, and Color
Variable IDs.

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
npm run sketch:content -- capture
npm run sketch:content -- generate
npm run sketch:content -- assets
npm run sketch:content -- verify
npm run sketch:content -- sync
node scripts/sketch/content/compare.mjs
```

`sync` proves linked consumers follow an update. It builds a consumer on the
published Library with a Text override per instance, publishes a next version
with one master text edited under the same document ID, syncs through Sketch's
libraries controller, and checks that the edit arrives, the overrides survive,
and save/reopen keeps both (`sync-verification.json`).

The capture renders production templates in Chromium and clips each reusable
root. Sketch's SVG import cannot reproduce three browser features, so the
pipeline translates them: a ProgressRing's dashed arc becomes an explicit arc
path, a translucent stroke's alpha moves into `stroke-opacity`, and a blurred
box shadow becomes a native Gaussian blur on the imported shadow layer. A
native shadow extends past the master's frame, as a CSS box shadow does, so
exports of MessageComposer include it. Native tasks use the serial runner in the existing Sketch process and
preserve preexisting documents and Library registrations. Verification
imports fourteen linked instances across all seven families and both themes,
tests text overrides where text exists, increases width by 80px, then saves
and reopens the Library and consumer document. The reviewed
`comparison-*.png` files show production, native, and widened instances.

Designers install the unified [Kerf-UI.sketch](../Kerf-UI.sketch), which
`npm run sketch:library` rebuilds from this file with the same Symbol, Text,
and Color Variable identities; this family file is its build input. Captured progress values, disclosure states, and skeleton frames
are static design states. Runtime progress, expansion, and animation remain in
`@kerfjs/ui`.
