# Kerf UI editor (private)

A visual composer for Kerf UI view documents (`*.kui.json`). The design is in
[`docs/26-ui-editor.md`](../docs/26-ui-editor.md). This package is private and
never published: the document format, validator, generator, and interpreter
it uses ship from `@kerfjs/ui/view`, so tools and applications work without it.

## What it does today

- **Open** a `.kui.json` file and **Save** the current document as a download.
- **Preview** the document on the canvas through `interpretView`, with
  placeholder inputs for params that have no default and a label for each slot.
- **Select** a node by clicking it on the canvas (the previewed document's own
  actions never run) or in the outline. A highlight marks it on the canvas.
- **Inspect** the selected node's props, read-only and grouped by the curated
  `component-props.json` hints. Selecting a palette component documents its
  props and types instead.
- **Problems:** every `validateView` diagnostic is listed at the top of the
  Document rail. Selecting one selects its node, and outline rows carry a
  problem-count badge. A document with problems is not previewed until they
  are fixed.

- **Export** the generated view module from the Export menu, either the full
  `.view.ts` or the declarations-only form for apps that render with
  `interpretView`. The bytes are exactly what `kerf-ui-view generate` writes.
  A banner reports the contract changes since the previous export in this
  session. Export is disabled while the document has problems.

Editing is a later slice.

## Develop

The editor resolves `kerfjs` to the repository source and `@kerfjs/ui` to the
sibling `ui/` build, so one copy of kerf serves both.

```bash
npm ci            # in editor/
npm run dev       # http://127.0.0.1:42917
npm run check     # builds ui/ if needed, then lint, types, unit tests, build
npm run test:e2e  # Playwright (add --project=chromium locally)
```

`.npmrc` sets `legacy-peer-deps` because npm crashes resolving vitest 4's
optional browser-mode peer set for a fresh tree.
