import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { ListTreeItem } from '../list-item/internal/tree-item.js';
import {
  type TreeListNode,
  treeListPath,
  treeListRows,
} from './model/tree-rows.js';

export {
  isExpandable,
  type TreeListNode,
  treeListPath,
  type TreeListRow,
  treeListRows,
} from './model/tree-rows.js';

const TREE_LIST_PROTECTED = new Set(['data-component', 'data-tree-list-id']);

export interface TreeListProps {
  /** Identifies the tree for `wireTreeList` and in tests. */
  id: string;
  /** The tree's accessible name, such as "Document outline". */
  label: string;
  /** The hierarchy. The application owns it. */
  nodes: readonly TreeListNode[];
  /** Ids of the expanded nodes. The application owns this state. */
  expanded: ReadonlySet<string> | readonly string[];
  /** The selected node's id. */
  selected?: string;
  /** Delegated action for choosing a row; the row's `data-item-id` names it. */
  action: string;
  /**
   * Delegated action for expanding or collapsing a row, from its disclosure
   * arrow or the keyboard (Right and Left). Flip the id in `expanded`.
   */
  toggleAction: string;
  /** Row density: `standard` (44px rows, default) or `compact` (36px). */
  density?: 'standard' | 'compact';
  className?: string;
  /** Safe `data-*` metadata for the tree element. */
  rootAttributes?: RootDataAttributes;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/**
 * A hierarchical list: ListItem rows indented by depth, with a disclosure
 * arrow on each row that has children. The tree is an ARIA `tree` of flat
 * `treeitem` rows; the application owns the nodes, which are expanded, and
 * which is selected, and handles `action` and `toggleAction`. Wire keyboard
 * navigation with `wireTreeList`.
 */
export function TreeList({
  id,
  label,
  nodes,
  expanded,
  selected,
  action,
  toggleAction,
  density = 'standard',
  className = '',
  rootAttributes = {},
  slot,
}: TreeListProps) {
  const rows = treeListRows(nodes, expanded);
  const visible = new Set(rows.map((row) => row.node.id));
  // The Tab stop: the selected row, or the nearest visible ancestor of a
  // selection inside a collapsed node, or else the first row.
  const focusId =
    (selected === undefined
      ? undefined
      : treeListPath(nodes, selected)
          .reverse()
          .find((pathId) => visible.has(pathId))) ?? rows[0]?.node.id;
  return (
    <div
      {...filterDataAttributes(rootAttributes, TREE_LIST_PROTECTED)}
      id={id}
      role="tree"
      class={`kui-tree-list ${className}`.trim()}
      aria-label={label}
      data-component="tree-list"
      data-tree-list-id={id}
      slot={slot}
    >
      {rows.map((row) => (
        <ListTreeItem
          itemId={row.node.id}
          label={row.node.label}
          description={row.node.description}
          icon={row.node.icon}
          trailing={row.node.trailing}
          level={row.level}
          position={row.position}
          setSize={row.setSize}
          expandable={row.expandable}
          expanded={row.expanded}
          selected={row.node.id === selected}
          focusable={row.node.id === focusId}
          disabled={row.node.disabled}
          density={density}
          action={action}
          toggleAction={toggleAction}
        />
      ))}
    </div>
  );
}
