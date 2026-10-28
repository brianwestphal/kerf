// The outline rail's rows: one per node, in document order.
import type { ViewDocument, ViewNode } from '@kerfjs/ui/view';

import { visitNodes } from './document.js';

export interface OutlineRow {
  readonly id: string;
  /** The author's name for the node, else its component name. */
  readonly label: string;
  /** Where it sits: the ancestor chain and zone, plus "repeated" for rows. */
  readonly detail: string;
  readonly depth: number;
}

/** A node's display name: `#text` runs show their text. */
export function nodeTitle(
  node: ViewNode,
  names: ReadonlyMap<string, string>,
): string {
  if (node.type === '#text') {
    const value = typeof node.value === 'string' ? node.value : 'bound text';
    return `Text “${value.length > 24 ? `${value.slice(0, 23).trimEnd()}…` : value}”`;
  }
  if (node.type === '#view') return `View ${node.src ?? ''}`.trim();
  return names.get(node.type) ?? node.type;
}

export function outlineRows(
  document: ViewDocument,
  names: ReadonlyMap<string, string>,
): OutlineRow[] {
  return visitNodes(document).map(({ node, ancestors, repeated }) => {
    const component = nodeTitle(node, names);
    const where = ancestors
      .map(
        ({ node: parent, zone }) =>
          `${parent.name ?? nodeTitle(parent, names)} › ${zone}`,
      )
      .join(' › ');
    const parts = [
      node.name ? component : undefined,
      where || 'Root',
      repeated ? 'repeated' : undefined,
    ];
    return {
      id: node.id,
      label: node.name ?? component,
      detail: parts.filter(Boolean).join(' · '),
      depth: ancestors.length,
    };
  });
}

/** One outline tree node: a document node with its children (KF-ECR4XG). */
export interface OutlineNode {
  readonly id: string;
  /** The author's name for the node, else its component name. */
  readonly label: string;
  /** The component (when the node is named), its zone, and "repeated". */
  readonly detail: string;
  readonly children?: OutlineNode[];
}

/**
 * The document as a tree for the outline: each node under its parent, in
 * document order. A node with children has a `children` array.
 */
export function outlineTree(
  document: ViewDocument,
  names: ReadonlyMap<string, string>,
): OutlineNode[] {
  const top: OutlineNode[] = [];
  const byId = new Map<string, { children?: OutlineNode[] }>();
  for (const { node, ancestors, repeated } of visitNodes(document)) {
    const component = nodeTitle(node, names);
    const zone = ancestors.at(-1)?.zone;
    const entry: OutlineNode = {
      id: node.id,
      label: node.name ?? component,
      detail: [
        node.name ? component : undefined,
        zone ?? 'Root',
        repeated ? 'repeated' : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
    };
    byId.set(node.id, entry);
    const parent = ancestors.at(-1) && byId.get(ancestors.at(-1)!.node.id);
    if (parent) (parent.children ??= []).push(entry);
    else top.push(entry);
  }
  return top;
}

/** Ids of every outline node with children, so a tree can start expanded. */
export function outlineParents(nodes: readonly OutlineNode[]): string[] {
  return nodes.flatMap((node) =>
    node.children ? [node.id, ...outlineParents(node.children)] : [],
  );
}
