# TreeList

`@kerfjs/ui/tree-list` shows a hierarchy (a file tree, a document outline,
nested categories) as ListItem rows indented by depth, with a disclosure arrow
on each row that has children. It is an ARIA `tree` of flat `treeitem` rows.
The application owns the nodes, which are expanded, and which is selected.

```tsx
import { TreeList, type TreeListNode } from "@kerfjs/ui/tree-list";
import { wireTreeList } from "@kerfjs/ui/wire-tree-list";
import { delegateActions } from "kerfjs/actions";

const expanded = signal<ReadonlySet<string>>(new Set(["src"]));
const selected = signal<string | undefined>(undefined);

<TreeList
  id="files"
  label="Files"
  nodes={nodes}
  expanded={expanded.value}
  selected={selected.value}
  action="pick-file"
  toggleAction="toggle-folder"
/>;

delegateActions(root, "click", {
  "pick-file": (_event, row) => (selected.value = row.dataset.itemId),
  "toggle-folder": (_event, arrow) => {
    const next = new Set(expanded.value);
    const id = arrow.dataset.itemId!;
    if (!next.delete(id)) next.add(id);
    expanded.value = next;
  },
});
const stop = wireTreeList(root);
```

## Nodes

A `TreeListNode` has an `id` (the row's `data-item-id` and its key across
re-renders), a `label`, and optionally a `description`, an `icon` (an unsized
`LucideIcon`), `trailing` content (a count `Badge`), `disabled`, and
`children`. A node with a `children` array expands, even an empty one; mark a
node `hasChildren` to make it expandable before its children are loaded, and
load them when `toggleAction` expands it.

## Props

- `id` and `label` (required): the tree's identity and accessible name.
- `nodes` and `expanded` (required): the hierarchy and the ids of open nodes.
- `selected`: the chosen node's id. It is the tree's Tab stop; when it sits
  inside a collapsed node, its nearest visible ancestor is.
- `action` and `toggleAction` (required): delegated actions for choosing a
  row and for its disclosure arrow. Both carry `data-item-id`.
- `density`: `standard` (44px rows) or `compact` (36px).

A disabled row is `aria-disabled`: the keyboard still reaches it, and it sends
neither action.

## Keyboard

`wireTreeList(root)` wires every TreeList under `root` and returns a disposer:

- Down and Up move between visible rows; Home and End jump to the first and
  last.
- Right opens a closed row, or moves into an open one's first child; Left
  closes an open row, or moves to its parent. Opening and closing click the
  row's disclosure arrow, so `toggleAction` stays the one place that changes
  `expanded`.
- Enter and Space choose the row.
- Typing finds the next row whose label starts with the typed letters.

## Drag and drop

Mark nodes `draggable` and pass `onMove` to rearrange the tree by dragging:

```tsx
const stop = wireTreeList(root, {
  canDrop: ({ sourceId, target }) => isLegal(sourceId, target),
  onMove: ({ sourceId, target }) => {
    // target.position is 'before', 'after', or 'inside' target.id.
    moveInMyTree(sourceId, target);
    render();
  },
});
```

A dragged row lands before or after another row of its tree (the top and
bottom quarters of the row), or inside it (the middle half); when inside is
not legal, the halves mean before and after. Only drops `canDrop` accepts
show an indicator: a line at the target's label edge for before and after, a
ring around the row for inside. A disabled row never drags. The tree stays
application state: `onMove` reports the move and the application re-renders.
Dragging is a pointer gesture, so give people a keyboard way to move items
too (a "Move to" choice, or moving the selected node up and down).

## The model

`treeListRows(nodes, expanded)` returns the visible rows with each one's
`level`, `position`, `setSize`, `parentId`, `expandable`, and `expanded`, and
`treeListPath(nodes, id)` the ids from the top down to a node. Use them to
work with the same hierarchy outside the tree.

## Geometry

Rows are ListItems and own their margin, border, padding, hover, and selected
tint. Each level indents 16px, and every row reserves a 16px disclosure
column, so labels at one level share an edge whether or not they expand.
