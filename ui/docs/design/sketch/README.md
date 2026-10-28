# Kerf UI Sketch catalog

[Kerf-UI.sketch](Kerf-UI.sketch) is the one Kerf UI Sketch Library. It holds
all 308 editable light and dark Symbols for the 110 template variants, on one
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

The Library was created and verified with **Sketch 2026.3.1**. Copy
`Kerf-UI.sketch` to a stable location outside a versioned package or
repository checkout, then add that copy in Sketch Settings → Libraries.

For an update, copy the new published file over that same installed path and
refresh the Library in Sketch. Linked instances sync while keeping their
overrides: the Library's document ID, Symbol IDs, Text layer IDs, and Color
Variable IDs stay the same across releases, and the build fails if any of them
changes. If the native format or supported Sketch version changes, this guide
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
