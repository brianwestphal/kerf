// KF-ECR4XG: the visible rows of a hierarchy. TreeList renders them, and a
// column explorer can walk the same nodes, so the model stays DOM-free.
import type { SafeHtml } from 'kerfjs';

import type { KerfUiContent } from '../../../../shared/content/semantic-content.js';

/** One node of a hierarchy the application owns. */
export interface TreeListNode {
  /** Stable id: the row's `data-item-id` and its key across re-renders. */
  readonly id: string;
  readonly label: string | SafeHtml;
  readonly description?: string | SafeHtml;
  /** A leading icon, normally an unsized LucideIcon. */
  readonly icon?: SafeHtml;
  /** Trailing content, such as a count Badge. */
  readonly trailing?: KerfUiContent;
  readonly disabled?: boolean;
  /** Child nodes. An empty array is an expandable node with no children yet. */
  readonly children?: readonly TreeListNode[];
  /**
   * Marks a node expandable before its children are loaded. The application
   * loads them when its `toggleAction` handler expands the node.
   */
  readonly hasChildren?: boolean;
}

/** One visible row: a node with its place in the hierarchy. */
export interface TreeListRow {
  readonly node: TreeListNode;
  /** 1 for a top-level node. */
  readonly level: number;
  /** 1-based position among its siblings. */
  readonly position: number;
  /** How many siblings it has, itself included. */
  readonly setSize: number;
  /** The parent's id, or undefined at the top level. */
  readonly parentId?: string;
  /** Whether the node can expand: it has children or `hasChildren`. */
  readonly expandable: boolean;
  /** Whether it is expanded (always false when not expandable). */
  readonly expanded: boolean;
}

/** Whether a node can expand: it has a children array or `hasChildren`. */
export function isExpandable(node: TreeListNode): boolean {
  return node.children !== undefined || node.hasChildren === true;
}

/**
 * The rows a tree shows: every top-level node, and the children of each
 * expanded node, depth first in order.
 */
export function treeListRows(
  nodes: readonly TreeListNode[],
  expanded: ReadonlySet<string> | readonly string[],
): TreeListRow[] {
  const open = expanded instanceof Set ? expanded : new Set(expanded);
  const rows: TreeListRow[] = [];
  const visit = (
    siblings: readonly TreeListNode[],
    level: number,
    parentId: string | undefined,
  ) => {
    siblings.forEach((node, index) => {
      const expandable = isExpandable(node);
      const isOpen = expandable && open.has(node.id);
      rows.push({
        node,
        level,
        position: index + 1,
        setSize: siblings.length,
        ...(parentId === undefined ? {} : { parentId }),
        expandable,
        expanded: isOpen,
      });
      if (isOpen && node.children) visit(node.children, level + 1, node.id);
    });
  };
  visit(nodes, 1, undefined);
  return rows;
}

/** The ids on the path from the top level down to `id`, or [] when absent. */
export function treeListPath(
  nodes: readonly TreeListNode[],
  id: string,
): string[] {
  for (const node of nodes) {
    if (node.id === id) return [id];
    const below = node.children ? treeListPath(node.children, id) : [];
    if (below.length) return [node.id, ...below];
  }
  return [];
}
