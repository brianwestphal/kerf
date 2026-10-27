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
installation is required for native generation and verification. Browser
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
```

`npm run sketch:button -- all` performs the same capture, native, and render
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
file after any interrupted job.

The capture uses a normal 600×200 browser viewport for domotion, then crops
each SVG to the measured control bounds without scaling. `fixtures.json`
holds the six appearance captures; `layout.json` records separate semantic
layout values measured from resolved production CSS. The native generator
maps the CSS system font to Sketch's system font at 16px medium and constructs
a centered horizontal Stack with a fixed 16px icon, 8px gap, and 9px insets
(8px padding plus the border). The documented `generate` command creates
new Symbol IDs. Stable IDs across regeneration are tracked in KF-TWZV8K.

## Outputs and checks

- `Kerf-Button.sketch`: six-Symbol library to copy or import.
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

These six Symbols model content-fit Button width. The web Button's fill mode
with ellipsis below the label's intrinsic width is tracked in KF-CAZ8YB;
additional Button states in KF-NQ80Y0, shared color and typography assets in
KF-R5DMGJ, and the wider component catalog in KF-P8AS51.
