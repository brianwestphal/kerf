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
  The outline is a tree (`TreeList`): close and open a node with its arrow or
  Left and Right, and choosing a node inside a closed one on the canvas opens
  its parents.
- **Inspect** the selected node's props, grouped by the curated
  `component-props.json` hints. Selecting a palette component documents its
  props and types instead.
- **Problems:** every `validateView` diagnostic is listed at the top of the
  Document rail. Selecting one selects its node, and outline rows carry a
  problem-count badge. A document with problems still previews: each node a
  problem is about renders as a selectable "cannot render" placeholder through
  `previewView`, and the rest renders normally.

- **Export** the generated view module from the Export menu, either the full
  `.view.ts` or the declarations-only form for apps that render with
  `interpretView`. The bytes are exactly what `kerf-ui-view generate` writes.
  A banner reports the contract changes since the previous export in this
  session. Export is disabled while the document has problems.
- **Compare** with a generated module your app already imports. Choose its
  `.view.ts` (or `.view.js`), and a banner lists the contract changes
  regenerating would make, flags a hand-edited module, and becomes the
  baseline that later exports compare against.

- **Edit** the selected node in the Inspector. Enum props are a Select (its
  first choice restores the default), booleans a Switch, and strings,
  numbers, text-accepting content, and `$css` builder calls a text field
  committed on Enter or blur; a value the prop cannot take shows its reason.
  Values bound to params, actions, or icons are shown read-only. Name a node
  to make it a typed ref, or promote a literal prop to a document param.
- **Bind** a prop to a document param or a field of an enclosing `$each` item
  in the Inspector's Bind section; it offers only the sources the validator
  accepts for that prop, and Not bound clears a binding.
- **Add, move, and delete** nodes. Add a child picks one of the node's legal
  zones (a full zone is disabled with its reason) and a component that zone
  accepts, seeded with the props it needs to be valid. The Inspector toolbar
  moves the node up or down within its zone or deletes it; the root, `$each`
  templates, and `$if` branches belong to their structure and stay put.
- **Undo and redo** every edit from the Preview toolbar or with Cmd/Ctrl+Z and
  Shift+Cmd/Ctrl+Z (text fields keep their own undo). Opening a document
  clears the history.

Drag-and-drop placement, non-literal `$css` editing, and adding control flow
come later.

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
