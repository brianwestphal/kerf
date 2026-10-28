// KF-JY68DQ: the columns a column explorer shows for a chosen path through a
// hierarchy. It walks the same TreeListNode model as TreeList, DOM-free.
import {
  isExpandable,
  type TreeListNode,
} from '../../tree-list/model/tree-rows.js';

/** One column: the children of the node chosen in the column before it. */
export interface ExplorerColumn {
  /** 0 for the top level. */
  readonly level: number;
  /** The node whose children this column lists, or undefined at the top. */
  readonly parent?: TreeListNode;
  readonly nodes: readonly TreeListNode[];
  /** The id chosen in this column, when the path reaches it. */
  readonly chosen?: string;
}

/**
 * The columns for `path` (ids from the top level down): the top level, then
 * the children of each chosen node that can expand. A path id that is not a
 * child of the column before it ends the walk there.
 */
export function explorerColumns(
  nodes: readonly TreeListNode[],
  path: readonly string[],
): ExplorerColumn[] {
  const columns: ExplorerColumn[] = [];
  let siblings: readonly TreeListNode[] = nodes;
  let parent: TreeListNode | undefined;
  for (let level = 0; ; level += 1) {
    const chosen = siblings.find((node) => node.id === path[level]);
    columns.push({
      level,
      ...(parent ? { parent } : {}),
      nodes: siblings,
      ...(chosen ? { chosen: chosen.id } : {}),
    });
    if (!chosen || !isExpandable(chosen)) return columns;
    parent = chosen;
    siblings = chosen.children ?? [];
  }
}

/** The node at the end of `path`, when the whole path resolves. */
export function explorerChosen(
  nodes: readonly TreeListNode[],
  path: readonly string[],
): TreeListNode | undefined {
  let siblings: readonly TreeListNode[] = nodes;
  let node: TreeListNode | undefined;
  for (const id of path) {
    node = siblings.find((candidate) => candidate.id === id);
    if (!node) return undefined;
    siblings = node.children ?? [];
  }
  return node;
}
