# Variant Set library linkage (Sketch 2026.4)

The [repeatable investigation](../../../../scripts/sketch/catalog/variant-link-investigation.mjs)
uses disposable copies of `Kerf-UI.sketch`. Run it from `ui/` with
`node scripts/sketch/catalog/variant-link-investigation.mjs`; it writes the
[machine-readable report](variant-link-report.json). The published Library is
unchanged.

## Result

`VariantSetReference.import()` creates a library-linked **set**. Keep that
imported set detached, select a child master with
`getBestVariantMasterForConfiguration({ State, Theme })`, and place an instance
of that master on the consumer page. The document retains one native
`foreignVariantSets` record after save/reopen. In a disposable next Library
version, a text edit reached both a Light/Default and Dark/Error instance after
syncing that record and reopening the consumer. Their text overrides and
360 → 440 px width changes survived. The existing non-variant Library sync gate
also passed for Light and Dark.

The child masters receive new local Symbol IDs and individually return false
for `getLibrary()` and `foreignObject()`. Those child-level checks do not measure
the set's linkage; the earlier [prototype report](variant-prototype-report.json)
was inconclusive on update propagation for that reason. The imported set itself
has a native foreign object before placement, and its document-level foreign
record is the sync target.

Do **not** assign the imported set's `parent` to the consumer page. The probe's
placed-set control retains the foreign record, and its native sync call reports
the record current, but the placed masters and instances remain at their old
text even after save/reopen. Keep the set detached and place instances only.

## Source identity and import surface

Grouping the four `Text Field / Form` variants preserved all 328 source
Symbol/master IDs, descendant IDs, layer IDs, and all 141 Color Variable IDs.
Sketch renamed the grouped masters to `Default/Light`, `Default/Dark`,
`Error/Light`, and `Error/Dark`. The individual importable Symbol reference
count fell from 328 to 325; none of these four masters remains an individual
import target. The Variant Set reference is the new import target.

Sketch's [2026.4 API guide](https://developer.sketch.com/plugins/updates/new-in-sketch-20264)
documents Variant Set references and importing them. The [API reference](https://developer.sketch.com/reference/api/)
describes Library linkage for imported Symbols; the saved-document and update
tests above establish the behavior for this Variant Set path.

The six-family migration is tracked separately in `KF-5H65PZ`. It must keep
the detached-set consumer pattern and re-run identity, theme, override,
resize, reopen, and sync checks for each family.
