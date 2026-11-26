# Variant Set library linkage (Sketch 2026.4)

The [repeatable investigation](../../../../scripts/sketch/catalog/variant-link-investigation.mjs)
uses disposable copies of the shipped `Kerf-UI.sketch`. Run it from `ui/` with
`node scripts/sketch/catalog/variant-link-investigation.mjs`; it writes the
[machine-readable report](variant-link-report.json). The shipped Library is
unchanged. The normal `npm run sketch:library -- sync` command writes the same
six-family check to [sync-verification.json](sync-verification.json).

## Linked import and update

`VariantSetReference.import()` creates a library-linked set. Keep that set
detached, choose a child master with
`getBestVariantMasterForConfiguration({ State, Theme })`, and place its instance
on the consumer page. The saved document retains a native
`foreignVariantSets` record. Six representative sets, one per family, each
kept Light and Dark text overrides and 80 px width changes through save/reopen,
then received a source text edit through Sketch's Library sync and kept both
overrides and widths through a second save/reopen. Button's auto-sized instances
require fixed horizontal sizing before the width change.

The child masters receive local Symbol IDs and individually return false for
`getLibrary()` and `foreignObject()`. The imported set's native foreign object
and the document's foreign Variant Set record carry the Library link. Placing
the imported set itself on the consumer page was tested in the earlier
[prototype](variant-prototype-report.json): its native sync reported current,
but placed instances did not receive the source text edit. Keep the set
detached and place instances only.

## Source identity and import surface

Grouping all 328 masters into 35 component sets preserved Symbol, master,
descendant, and Color Variable IDs after save/reopen. The unified
[manifest](symbol-manifest.json) pins each new Variant Set ID for subsequent
builds. Sketch presents each set as the import target and renames children by
their `State/Theme` configuration; the original family Symbol IDs remain the
source identity. Grouping reduced the individual importable Symbol reference
count from 328 to 35, while all 35 Variant Sets are importable. The production
verification asserts both counts. The earlier four-master prototype measured
the first reduction, from 328 to 325.

Sketch's [2026.4 API guide](https://developer.sketch.com/plugins/updates/new-in-sketch-20264)
documents Variant Set references. The [API reference](https://developer.sketch.com/reference/api/)
documents the imported Symbol and instance sizing APIs; the saved-document
and update checks above establish the behavior of this detached-set path.
