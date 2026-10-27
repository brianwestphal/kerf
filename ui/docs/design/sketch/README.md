# Kerf UI Sketch catalog

The current native library is [Kerf-Button.sketch](button/Kerf-Button.sketch).
It contains 40 editable light and dark Button Symbols with stable Symbol and
shared asset IDs. The [Button guide](button/README.md) has the regeneration,
verification, and Library import details. [Coverage](coverage.md) accounts for
all 110 source variants and names the implementation ticket for each pending
family. Source SVG sheets in [templates](../templates.md) are review material,
not substitutes for editable Symbols.

## Install and update

This library was created and verified with **Sketch 2026.3.1**. Copy the
published `.sketch` file to a stable location outside a versioned package or
repository checkout. In Sketch Settings → Libraries, add that copy. Use the
`Button / … / Light|Dark` names in the component browser to choose a Symbol;
the light and dark appearances are distinct masters.

For an update, copy the new published file over that same installed path and
refresh the Library in Sketch. Keep the installed document ID and Symbol IDs;
the maintained exporter rejects accidental identity changes. Consumer
instances can then sync while retaining supported overrides. If the native
format or supported Sketch version changes, this guide and the family's guide
must be updated with the new verification result before publication.

The family tickets in [coverage](coverage.md) will add further components in
reviewable batches. Until a row becomes supported, use its SVG as visual
reference and the public UI component as the source of behavior. A multi-control
SVG variant is a showcase page; it is not an individual reusable component.
