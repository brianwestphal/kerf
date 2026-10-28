# Unified Kerf UI Sketch Library

[Kerf-UI.sketch](../Kerf-UI.sketch) is the Library designers install. It is
rebuilt from the six family Libraries by `npm run sketch:library` and holds 308
Symbols, 141 Color Variables, and Button's 42 shared layer styles and 38 shared
text styles.

## Pages and naming

Each family has one page: Button, Form Controls, Advanced Inputs, Lists and
Data, Toolbars and Navigation, and Content and Feedback. Masters are ordered by
name and flow in columns, with a Light region and a Dark region on a dark
surface so dark-theme masters stay legible. The page labels and the dark
surface are page layers outside every Symbol. [Page overviews](pages/) are
exported on each build.

Symbols keep their family names, `Component / Variant / State / Theme`, which
group them in Sketch's component browser. Color Variables are named
`Kerf/<Theme>/<Role>`, for example `Kerf/Light/Text Quiet` or
`Kerf/Dark/Button Primary Brand Fill`. Where families agree on a role's color,
they share one variable. Six roles have different colors in different
families, so those keep a family-qualified name instead of being silently
recolored, for example `Kerf/Dark/On Loud · Form Controls` and
`Kerf/Dark/On Loud · Toolbars and Navigation, Content and Feedback`.

## Identity contract

Linked consumers depend on four identities, and none of them changes between
releases:

- **Document ID.** It is pinned to `libraryDocumentId` in
  [symbol-manifest.json](https://github.com/brianwestphal/kerf/blob/main/ui/docs/design/sketch/unified/symbol-manifest.json), because Sketch assigns a new
  one whenever a document is saved.
- **Symbol, master, and descendant layer IDs, Text override keys included.**
  These equal the family Library's IDs, which each family pipeline already
  keeps stable. The merge copies each master and then sets its Symbol ID and
  every layer's object ID back to the family values.
- **Color Variable IDs.** Each variable takes the ID of its first source
  swatch in family order. A cross-document copy drops swatch references, so
  the merge rebinds every fill, border, and text paint, and checks that each
  family keeps the same number of bound paints.
- **Shared style IDs.** Styles are copied with their IDs, so layer links keep
  resolving, and their paints are rebound too.

The build fails if a family master is missing or a Symbol, master, Text, or
Color Variable ID differs from the family manifests or the previous unified
manifest.

## Build and verify

From `ui/`, with one existing Sketch process:

```sh
npm run sketch:library -- build
npm run sketch:library -- verify
npm run sketch:library -- sync
```

`npm run sketch:library` runs all three. `verify` opens the Library, checks
every family page, and builds a consumer linked to one master per family and
theme. Each instance gets a text override and an 80px resize, and the
consumer is saved and reopened ([verification.json](https://github.com/brianwestphal/kerf/blob/main/ui/docs/design/sketch/unified/verification.json),
[consumer exports](https://github.com/brianwestphal/kerf/tree/main/ui/docs/design/sketch/unified/consumer-exports)). `sync` publishes a next version with
one master text edited under the same document ID, syncs a consumer through
Sketch's libraries controller, and checks that the edit arrives and the
overrides survive save/reopen ([sync-verification.json](https://github.com/brianwestphal/kerf/blob/main/ui/docs/design/sketch/unified/sync-verification.json)).

Rebuild after any family Library changes. A Library with an unchanged set of
family masters rebuilds with identical IDs.
