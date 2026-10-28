# ColumnExplorer

`@kerfjs/ui/column-explorer` browses a hierarchy the way the macOS Finder's
column view does: one column per level in a `ColumnTrack`, where choosing a
row with children opens the next column of its children. It reads the same
`TreeListNode` model as [`TreeList`](./tree-list.md), and the application owns
the nodes and the chosen path.

```tsx
import { ColumnExplorer } from "@kerfjs/ui/column-explorer";
import { treeListPath } from "@kerfjs/ui/tree-list";
import { wireColumnExplorer } from "@kerfjs/ui/wire-column-explorer";
import { delegateActions } from "kerfjs/actions";

const path = signal<readonly string[]>([]);

<ColumnExplorer
  id="files"
  label="Files"
  nodes={nodes}
  path={path.value}
  action="choose-file"
/>;

delegateActions(root, "click", {
  "choose-file": (_event, row) =>
    (path.value = treeListPath(nodes, row.dataset.itemId!)),
});
const stop = wireColumnExplorer(root);
```

## Props

- `id` and `label` (required): the explorer's identity and accessible name.
- `nodes` (required): the hierarchy as `TreeListNode`s (`id`, `label`, and
  optionally `description`, `icon`, `trailing`, `disabled`, `children`, and
  `hasChildren` for children loaded on demand).
- `path` (required): the chosen ids from the top level down. Column one lists
  the top level, and each chosen node with children opens the next column.
- `action` (required): the delegated action for choosing a row; its
  `data-item-id` names the node.
- `preview`: content for a last column when the chosen node is a leaf, such
  as a file's details.
- `layout` (`scroll`, the default, or `paged` for a phone), `minColumnWidth`,
  and `peek`: passed to the `ColumnTrack`.
- `density`: `standard` or `compact` rows.

## Keyboard

`wireColumnExplorer(root)` wires every explorer under `root` and returns a
disposer:

- Up and Down move within a column; Home and End jump to its ends.
- Right opens the focused row's column (choosing it) and moves into it; Left
  returns to the chosen row of the column before.
- Enter and Space choose the row.
- Typing finds the next row in the column whose label starts with the typed
  letters.

Each column keeps one Tab stop (its chosen row, else its first), and choosing
a row brings the column it opens into view.

## The model

`explorerColumns(nodes, path)` returns the columns a path shows (each with its
`level`, `parent`, `nodes`, and `chosen` id), and `explorerChosen(nodes, path)`
the node a path ends at. Use `treeListPath(nodes, id)` from
`@kerfjs/ui/tree-list` to turn a chosen id into a path.

## Geometry

The `ColumnTrack` owns the sideways scroll, the column width, and the paged
layout; each column is a scrollable `List` of `ListItem` rows, which own their
insets, hover, and selected tint. The explorer fills its parent's height, so
give it a container with a height.
