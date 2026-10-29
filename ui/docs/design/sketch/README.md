# Kerf UI Sketch catalog

[Kerf-UI.sketch](Kerf-UI.sketch) is the one Kerf UI Sketch Library. It holds
all 312 editable light and dark Symbols for the 112 template variants, on one
page per family: Button, Form Controls, Advanced Inputs, Lists and Data,
Toolbars and Navigation, and Content and Feedback. Each page shows its light
masters beside its dark masters on a dark surface, ordered by Symbol name.
Symbols are named `Component / Variant / State / Theme` in the component
browser, and 141 Color Variables are named `Kerf/<Theme>/<Role>`. See the
[unified Library guide](unified/README.md) for its identity contract, build,
and verification. [Coverage](coverage.md) accounts for every source variant.
Source SVG sheets in [templates](../templates.md) are review material, not
substitutes for editable Symbols.

## Install and update

The Library was created and verified with **Sketch 2026.3.1**. Kerf UI ships
it as a Sketch Library, not a document template: documents link its Symbols
and Color Variables, so a new release reaches every design that uses them.

To install:

1. Install Apple's [SF Pro](https://developer.apple.com/fonts/) fonts if they
   aren't already installed. The Library's text uses SF Pro, the font
   production's `system-ui` resolves to on macOS. Without it, Sketch reports
   missing fonts and substitutes another face. Sketch can't embed SF Pro, so
   its Embed Fonts settings leave it unembedded, and viewers without SF Pro
   see a fallback font.
2. Find the file. In a project that depends on `@kerfjs/ui` it is
   `node_modules/@kerfjs/ui/docs/design/sketch/Kerf-UI.sketch`; you can also
   download it from the
   [repository](https://github.com/brianwestphal/kerf/blob/main/ui/docs/design/sketch/Kerf-UI.sketch).
3. Copy it to a stable folder outside any package or repository checkout, for
   example `~/Design Libraries/Kerf-UI.sketch`. Don't add it from
   `node_modules`: a reinstall or branch switch would move or delete the file
   your designs link to.
4. In Sketch, open **Settings → Libraries**, choose **Add Library…**, and
   select the copy.

To use it, insert a Symbol from the component browser. Symbols are named
`Component / Variant / State / Theme`, so typing `Button` finds every Button.
Kerf's Color Variables (`Kerf/<Theme>/<Role>`) appear in the color picker
under the Library's name.

To update, copy the newly published file over the same installed path. Sketch
then offers the Library update in any open document that uses it; accept it to
sync. Linked instances keep their overrides: the Library's document ID, Symbol
IDs, Text layer IDs, and Color Variable IDs stay the same across releases, and
the build fails if any of them changes. Don't add the new file as a second
Library alongside the old one. If the native format or supported Sketch version changes, this guide
and the unified guide must record the new verification result before
publication.

## Family build inputs

`Kerf-UI.sketch` is assembled from six family Libraries, which are the
maintained build inputs rather than files to install:
[Button](button/README.md), [Forms](forms/README.md),
[Advanced inputs](advanced/README.md), [Lists and data](lists/README.md),
[Toolbars and navigation](toolbar/README.md), and
[Content and feedback](content/README.md). Each family pipeline owns capture,
semantic layout, edited-source migration, and Color Variable binding for its
masters, and pins its own document ID (Sketch assigns a new one on each save).
After a family changes, rebuild the unified Library with
`npm run sketch:library` from `ui/`.

A multi-control SVG variant is a showcase page; it is not an individual
reusable component.

The `@kerfjs/ui` npm package ships `Kerf-UI.sketch`, its page overviews, and
these guides. The family build-input Libraries, manifests, captured fixtures,
and verification evidence the guides mention live in the
[repository](https://github.com/brianwestphal/kerf/tree/main/ui/docs/design/sketch).
