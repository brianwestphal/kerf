# Native Sketch Button library

`Kerf-Button.sketch` contains six editable native Symbols: primary brand,
secondary, and primary brand with a Plus icon, each in light and dark. They are
captured from the production `Button` and `LucideIcon` components, not from
the multi-control SVG design-template sheet. Text remains a native Text layer,
icons remain vector paths, and the Symbol frame owns its fill, border, and
12px corners. No bitmap layers are present.

The library is part of the `@kerfjs/ui` package under
`docs/design/sketch/button/`. It targets Sketch 2026.3.1, which was used for
the native save/reopen and Library import checks. A licensed macOS Sketch
installation and Python 3 are required for native generation and verification.
Python restores the Library document ID in the staged Sketch archive. Browser
capture and source checks need the repository's Node toolchain and Playwright
Chromium, but no Sketch installation.

## Reproduce from a fresh checkout

From `ui/`, run Node package commands through the configured login shell:

```sh
npm ci
npm run build
npx playwright install chromium
npm run sketch:button -- capture
npm run sketch:button -- check-source
```

Open Sketch normally and wait for its startup to finish. Leave the app running
for the native steps:

```sh
npm run sketch:button -- generate
npm run sketch:button -- verify
npm run sketch:button -- render
npm run sketch:button -- fill
```

`npm run sketch:button -- all` performs the capture, native, fill-width, and render
steps in order after `npm run build`. The native commands refuse to start
without an existing Sketch process and fail explicitly if Sketch or its
license is unavailable. They use the serial runner documented in
[Sketch job runner](../../sketch-runner.md), never `--new-instance`. Each job
records only documents and temporary Library registrations it created and
closes/removes only those after save/reopen. Existing documents, Libraries,
and the app process remain open. If cleanup cannot be acknowledged, follow
the runner's recovery instructions before starting another job.
Regeneration builds into a uniquely named sibling `.sketch` file, then
replaces the published library only after native build and layout both finish.
This avoids Sketch's modal overwrite panel and preserves the previous library
if generation fails. Recover the runner before inspecting a leftover staged
file after any interrupted job. When a library already exists, the staged file
starts as a copy of it. The generator matches each Button variant by its
stable fixture key in `identity-manifest.json`, updates the master and existing
Text/Icon layers in place, and rejects a changed master, Symbol, or nested
layer ID before replacing the published file. The staged archive retains the
original document ID, which is the consumer's Library link; the manifest
checks that ID too. Renamed variants keep their key
and IDs. Removed variants remain in the library and are marked `retired` in
the manifest, so their IDs cannot silently move to another component.

The capture uses a normal 600×200 browser viewport for domotion, then crops
each SVG to the measured control bounds without scaling. `fixtures.json`
holds the six appearance captures; `layout.json` records separate semantic
layout values measured from resolved production CSS. The native generator
maps the CSS system font to Sketch's system font at 16px medium and constructs
a centered horizontal Stack with a fixed 16px icon, 8px gap, and 9px insets
(8px padding plus the border). Existing icon vector paths retain their IDs,
and their paint follows the production text color. When SVG path geometry
changes, regeneration updates compatible native vector paths in place. The
identity manifest records the ordered SVG geometry and path structure so
repeat generation keeps the same IDs. Added or removed paths, changed path
commands or types, reordered paths, and simultaneous edits to multiple paths
with the same command structure are rejected before staging; they need an
explicit identity mapping so consumer path overrides cannot silently move to
a different vector.

## Outputs and checks

- `Kerf-Button.sketch`: six-Symbol library to copy or import.
- `identity-manifest.json`: stable variant, layer, Color Variable, and shared
  style IDs; `asset-report.json` lists the current semantic assets and colors.
- `Button-Consumer-Test.sketch`: linked instances with saved text overrides.
- `Button-Resizing-Test.sketch`: five layouts per Symbol, 30 in total.
- `verification.json`, `resizing-verification.json`, and
  `layout-checks.json`: editable layers, Library links, round trips,
  dimensions, alignment, and layout assertions.
- `comparison.png` and `resizing-comparison.png`: browser and native renders
  for visual review. Text rasterization differs slightly between Chromium and
  Sketch; the comparison metrics are descriptive, not a pixel-perfect gate.

Install the library durably by copying `Kerf-Button.sketch` to a stable
location outside a versioned package directory, then add that copy in Sketch
Settings → Libraries. When regenerating, update that same stable file and
refresh the Library. The verification command uses a temporary registration
and removes it after the job; it never changes an existing registration.
In the native update check, a separate saved consumer retained its Library
link plus text and icon-color overrides after a source-fill change, Library
refresh, and save/reopen. The `verify` command covers fresh imports and saved
text overrides. A separate scratch regeneration also preserved a user-added
Text layer outside the generated Symbols.

## Shared colors and styles

The Library includes eight Color Variables, four shared layer styles, and four
shared text styles for the six Button presentations. Names follow semantic
roles and theme: `Kerf/Light/Brand/Fill Loud`,
`Kerf/Dark/Neutral/Border Loud`, and so on. Light and dark assets remain
separate even if their resolved colors match. The two brand presentations
share their theme's assets. Secondary Buttons use the neutral `On Quiet` text
and `Border Loud` variables; their transparent fill stays transparent. The
border variables retain their alpha from the production capture.
The mapped source roles are `--kui-color-brand-fill-loud`,
`--kui-color-brand-on-loud`, `--kui-color-neutral-border-loud`, and
`--kui-color-neutral-on-quiet` in each theme context; their values come from
the real rendered Button, not a separate Sketch palette.

Choose the Light or Dark Symbol for the corresponding product theme. Its
background, border, label, and icon paths reference the appropriate Color
Variables. Shared layer styles own visual paint, border, and corners; shared
text styles own the system family, 16px medium weight, centered alignment,
automatic line height, and semantic text color. The Symbol's Stack owns the
44px control height, gap, insets, and Fit/Fixed sizing. Instance label and icon
color overrides remain available. An explicit icon color override wins over
a later source token change when that Library Symbol is refreshed.

`identity-manifest.json` records stable IDs for each Color Variable and
shared style. Regeneration updates these assets in place and rejects missing
IDs or name collisions. To propagate a theme token change, recapture the
production Button, regenerate the Library at its installed stable path, and
refresh its linked Symbols in consumer documents. A saved consumer retained
its Library link, text override, and icon color override after a brand fill
and foreground token update; the regenerated Symbol picked up both new
semantic colors on save/reopen. The native `verify` command checks serialized
asset IDs and bindings after reopening the Library.

Sketch creates a private linked copy of a shared style for each imported
Symbol. Those consumer IDs include the source style ID in brackets and may
repeat a style name across separate Symbols; they are Sketch's sync records,
not duplicate assets in the source Library. Import a Color Variable explicitly
from the Library when using it on a new consumer-owned layer.

## Fill-width instances

The six Library Symbols remain content-fit masters. `fill-layout.json` records
36 real `Button({ fill: true })` browser references: short and long labels,
primary, secondary, and icon variants in light and dark, at widths above, equal to, and
below natural content width. `Button-Fill-Test.sketch` contains editable,
Library-linked fixed-width instances for those cases. `fill-checks.json` and
the two `fill-comparison*.png` captures verify the supported workflow.

To make a fill-width Button in Sketch, import the matching Symbol, set the
instance's horizontal size to **Fixed**, and set its width to the parent
track. Keep the label override as the full source text while it fits. Below
its natural width, shorten the editable label override to a prefix followed
by `…` that fits between the 9px side insets (and the fixed 16px icon plus
8px gap, if present). Keep the full text separately in the design annotation
or handoff data; `fill-layout.json` records both `sourceLabel` and
`displayLabel` for the verified examples. On widening, restore the full
label override. To return to natural width, set horizontal size to **Fit**
and run Sketch's Smart Layout resize.

Sketch 2026.3.1 wraps a long editable Text override inside a narrowed Stack;
it does not reproduce CSS `text-overflow: ellipsis` automatically. The manual
override keeps the 44px frame, unscaled 16px text and icon, 8px gap, centered
content group, original border, and editable text without spill. Extremely narrow widths that
cannot fit the icon plus a readable ellipsis need a different product label
or a wider track. The 36-case native/browser review and six resize cycles
are the supported bounds of this template; automatic truncation after any
arbitrary override or resize is not implied.

Additional Button states are tracked in KF-NQ80Y0, shared color and
typography assets in KF-R5DMGJ, and the wider component catalog in
KF-P8AS51.
