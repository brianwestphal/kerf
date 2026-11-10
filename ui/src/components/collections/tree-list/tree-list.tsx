import { each } from 'kerfjs';

import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { ListTreeItem } from '../list-item/parts/tree-item.js';
import {
  type TreeListNode,
  treeListPath,
  treeListRows,
} from './model/tree-rows.js';

export {
  isExpandable,
  moveTreeListNode,
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
  /**
   * Reuse unchanged rows through native keyed reconciliation. Keep node objects
   * immutable and stable. Use only outside an enclosing each() row render.
   * Default false preserves ordinary markup composition, including nested lists.
   */
  keyedRows?: boolean;
  /** The selected node's id. */
  selected?: string;
  /** Delegated action for choosing a row; the row's `data-item-id` names it. */
  action: string;
  /**
   * Delegated action for expanding or collapsing a row, from its disclosure
   * arrow or the keyboard (Right and Left). Flip the id in `expanded`.
   */
  toggleAction: string;
  /** Row density: `default` (44px rows) or `compact` (36px). */
  density?: 'default' | 'compact' | /** @deprecated Use default. */ 'standard';
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
  density = 'default',
  keyedRows = false,
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
  const renderRow = (row: (typeof rows)[number]) => (
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
      draggable={row.node.draggable}
      rootAttributes={row.node.rootAttributes}
      density={density}
      action={action}
      toggleAction={toggleAction}
    />
  );
  const byNode = new Map(rows.map((row) => [row.node, row]));
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
      {keyedRows
        ? each(
            rows.map((row) => row.node),
            (node) => renderRow(byNode.get(node)!),
            {
              key: `tree-list:${Array.from(id, (character) => character.codePointAt(0)!.toString(16)).join('_')}`,
              cacheKey: (node) => {
                const row = byNode.get(node)!;
                return JSON.stringify([
                  row.level,
                  row.position,
                  row.setSize,
                  row.expandable,
                  row.expanded,
                  node.id === selected,
                  node.id === focusId,
                  density,
                  action,
                  toggleAction,
                ]);
              },
            },
          )
        : rows.map(renderRow)}
    </div>
  );
}
