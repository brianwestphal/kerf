// The editor's document Outline tree and its per-node problem badges.
import type { ViewDocument } from '@kerfjs/ui/view';
import type { ReadonlySignal } from 'kerfjs';

import {
  TreeList,
  type TreeListNode,
} from '../components/collections/tree-list/tree-list.js';
import { Badge } from '../components/feedback/badge/badge.js';
import { EmptyState } from '../components/feedback/empty-state/empty-state.js';
import type { EditorContext } from './editor-context.js';
import { isMovable } from './model/edits.js';
import {
  type OutlineNode,
  outlineParents,
  outlineTree,
  slotRowAddress,
  slotRowId,
} from './model/outline.js';
import { OUTLINE_ACTION, OUTLINE_TOGGLE_ACTION } from './shell-names.js';

export function outlineView(
  ctx: EditorContext,
  collapsed: ReadonlySignal<ReadonlySet<string>>,
  document: ViewDocument,
  counts: ReadonlyMap<string, number>,
) {
  const current = ctx.selection.value;
  const badge = (id: string) => {
    const count = counts.get(id);
    return count ? (
      <Badge
        tone="danger"
        label={`${count} ${count === 1 ? 'problem' : 'problems'}`}
      >
        {count}
      </Badge>
    ) : undefined;
  };
  const toTree = (nodes: readonly OutlineNode[]): TreeListNode[] =>
    nodes.map((node) => ({
      id: node.id,
      label: node.label,
      description: node.detail,
      trailing: badge(node.id),
      ...(slotRowAddress(node.id) || isMovable(document, node.id).placed
        ? { draggable: true }
        : {}),
      ...(node.children ? { children: toTree(node.children) } : {}),
    }));
  const tree = outlineTree(document, ctx.catalog.componentNames);
  const closed = collapsed.value;
  if (!tree.length)
    return (
      <EmptyState
        title="No components yet"
        detail="Add the first component on the canvas, or drag one there from the Library."
      />
    );
  return (
    <TreeList
      id="editor-outline"
      label="Document outline"
      nodes={toTree(tree)}
      expanded={outlineParents(tree).filter((id) => !closed.has(id))}
      selected={
        current?.kind === 'node'
          ? current.id
          : current?.kind === 'slot'
            ? slotRowId(
                current.address.parent,
                current.address.zone,
                current.address.index,
              )
            : undefined
      }
      action={OUTLINE_ACTION}
      toggleAction={OUTLINE_TOGGLE_ACTION}
      density="compact"
    />
  );
}
