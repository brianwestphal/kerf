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
