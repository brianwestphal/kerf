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
Variable IDs. The exporter rejects a changed source SVG until the published
native layers can be migrated safely (`KF-J00BCV`).

## Regenerate and verify

From `ui/`, with the project's login-shell Node toolchain and one existing
Sketch process:

```sh
npm run sketch:content -- capture
npm run sketch:content -- generate
npm run sketch:content -- assets
npm run sketch:content -- verify
node scripts/sketch/content/compare.mjs
```

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

Install a copy at a stable path through Sketch Settings → Libraries. On an
update, replace that installed file, refresh the Library, and sync consumer
instances. Captured progress values, disclosure states, and skeleton frames
are static design states. Runtime progress, expansion, and animation remain in
`@kerfjs/ui`.
