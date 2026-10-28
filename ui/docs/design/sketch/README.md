# Kerf UI Sketch catalog

The native libraries are [Kerf-Button.sketch](button/Kerf-Button.sketch),
[Kerf-Forms.sketch](forms/Kerf-Forms.sketch),
[Kerf-Advanced.sketch](advanced/Kerf-Advanced.sketch),
[Kerf-Lists.sketch](lists/Kerf-Lists.sketch),
[Kerf-Toolbar.sketch](toolbar/Kerf-Toolbar.sketch), and
[Kerf-Content.sketch](content/Kerf-Content.sketch). They contain 40 Button,
66 form-control, 34 advanced-input, 42 list/data, 70 toolbar/navigation, and 56 content/feedback light/dark Symbols with stable identities
and shared assets. Their [Button](button/README.md), [Forms](forms/README.md),
[Advanced inputs](advanced/README.md), [Lists and Data](lists/README.md), [Toolbars and navigation](toolbar/README.md), and [Content and feedback](content/README.md) guides cover regeneration,
verification, and Library import. [Coverage](coverage.md) accounts for all 110
source variants and names the implementation ticket for each family.
Source SVG sheets in [templates](../templates.md) are review material, not
substitutes for editable Symbols.

## Install and update

These libraries were created and verified with **Sketch 2026.3.1**. Copy each
published `.sketch` file to a stable location outside a versioned package or
repository checkout. In Sketch Settings → Libraries, add those copies. Use the
`Button / … / Light|Dark` and form component names such as
`Text Field / … / Light|Dark` and `Color Picker / … / Light|Dark` in the
component browser;
the light and dark appearances are distinct masters.

For an update, copy the new published file over that same installed path and
refresh the Library in Sketch. Keep the installed document and Symbol IDs;
the maintained exporters reject accidental identity changes. Every exporter
pins its Library's document ID, the identity consumers link to, to the
`libraryDocumentId` recorded in its manifest (Sketch assigns a new one on
each save). Releases before that pin gave the Forms, Advanced, Lists,
Toolbar, and Content files a new document ID on each rebuild; a consumer
linked to one of those intermediate files needs one library swap to the
current file. Consumer
instances can then sync while retaining supported overrides. If the native
format or supported Sketch version changes, this guide and the family's guide
must be updated with the new verification result before publication.

The family tickets in [coverage](coverage.md) will add further components in
reviewable batches. Until a row becomes supported, use its SVG as visual
reference and the public UI component as the source of behavior. A multi-control
SVG variant is a showcase page; it is not an individual reusable component.
