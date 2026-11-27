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

Default rendering composes as ordinary markup, including inside an enclosing
`each()` row. Opt into native keyed reconciliation with `keyedRows` for large
standalone trees. In that mode, keep unchanged node objects stable and replace a
node when its content changes. Expansion, selection, and row position update
independently, preserving unaffected row DOM and avoiding repeated row rendering.
Do not enable `keyedRows` inside an enclosing `each()` row; render its default
markup so the outer row owns updates. HTML ids retain their normal unrestricted
character set in either mode; keyed list identities are encoded internally.

## Row actions

Use `trailingMenu` for secondary row commands. Its shape matches the
`ListActionRow` trailing menu. Register `@kerfjs/ui/popup-menu/register` once
and keep `wireTreeList(root)` installed.
When loading styles manually, include `@kerfjs/ui/popup-menu.css` for the menu.

```tsx
import "@kerfjs/ui/popup-menu/register";
import { LucideIcon } from "@kerfjs/ui/lucide-icon";
import { Ellipsis } from "lucide";

const project: TreeListNode = {
  id: "platform",
  label: "Platform rollout",
  trailingMenu: {
    label: "Actions for Platform rollout",
    icon: <LucideIcon icon={Ellipsis} name="ellipsis" />,
    items: [
      {
        label: "Show project",
        action: "show-project",
        attributes: { "data-project-id": "platform" },
      },
    ],
  },
};
```

The trailing button opens the menu without choosing the row. A right-click
on the row opens the same commands at the pointer. Shift+F10 or the Context
Menu key opens them from the focused treeitem. Escape returns focus to the
treeitem when it opened the menu. The tree keeps one Tab stop. Menu actions
are dispatched through their own `data-action` values, and each item can carry
the row identity through its `attributes`.

The trigger appears on the selected row and on hover or focus. It stays
visible while open and on devices without hover. A disabled node also disables
its menu. Set `trailingMenu.disabled` to keep primary selection available while
disabling the menu.

## Props

- `id` and `label` (required): the tree's identity and accessible name.
- `nodes` and `expanded` (required): the hierarchy and the ids of open nodes.
- `keyedRows`: opt into native keyed rows; default false. Requires immutable node identities and placement outside an enclosing `each()` row.
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
- Shift+F10 and the Context Menu key open a row’s trailing menu when available.
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

### Drops from outside the tree

A drag your application runs itself, starting outside the tree (a palette of
new items, say), can land on its rows the same way. `treeListExternalDrop`
finds the legal move under the pointer and paints the tree's own indicator;
you apply the move when the pointer is released:

```ts
import { treeListExternalDrop } from '@kerfjs/ui/wire-tree-list';

const outline = treeListExternalDrop(root, {
  canDrop: ({ sourceId, target }) => canAdd(sourceId, target),
});
// On each pointermove of your drag:
const move = outline.over(
  document.elementFromPoint(event.clientX, event.clientY),
  event.clientY,
  newItemId,
);
// On pointerup: if (move) addItem(move); then outline.clear().
```

The positions and indicator match a dragged row's: before, after, or inside,
painted only for a drop `canDrop` accepts, and `over` clears the previous
row's indicator.

## The model

`treeListRows(nodes, expanded)` returns the visible rows with each one's
`level`, `position`, `setSize`, `parentId`, `expandable`, and `expanded`, and
`treeListPath(nodes, id)` the ids from the top down to a node. Use them to
work with the same hierarchy outside the tree.

## Geometry

Rows are ListItems and own their margin, border, padding, hover, and selected
tint. Each level indents 16px, and every row reserves a 16px disclosure
column, so labels at one level share an edge whether or not they expand.
