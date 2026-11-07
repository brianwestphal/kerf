// The editor's selected-node context menu. The shell owns opening and
// selection; this view receives the current document and legal actions.
import type { ReadonlySignal } from 'kerfjs';

import {
  PopupMenu,
  type PopupMenuEntry,
} from '../components/actions/popup-menu/popup-menu.js';
import type { EditorContext } from './editor-context.js';
import { isMovable } from './model/edits.js';
import {
  CONTEXT_DELETE_ACTION,
  CONTEXT_DUPLICATE_ACTION,
  CONTEXT_EMBED_ACTION,
  CONTEXT_EMBED_OTHER_ACTION,
  CONTEXT_MENU,
  CONTEXT_MOVE_DOWN_ACTION,
  CONTEXT_MOVE_UP_ACTION,
  EMBED_FIRST,
  EXTRACT_ACTION,
} from './shell-names.js';

export interface NodeContextMenuState {
  readonly embedFirstLegal: ReadonlySignal<ReadonlySet<string>>;
  readonly extractBlocked: (id: string) => string | undefined;
}

/** Commands for the selected node, shared by the Outline and canvas. */
export function nodeContextMenu(
  ctx: EditorContext,
  { embedFirstLegal, extractBlocked }: NodeContextMenuState,
) {
  const id = ctx.selectedNodeId();
  const movable = id ? isMovable(ctx.doc.value, id) : undefined;
  const { componentNames, propsByKey } = ctx.catalog;
  const embedIn: PopupMenuEntry[] = [
    ...EMBED_FIRST.filter((key) => propsByKey.has(key)).map((key) => {
      const legal = embedFirstLegal.value.has(key);
      return {
        label: componentNames.get(key)!,
        action: CONTEXT_EMBED_ACTION,
        disabled: !legal,
        ...(legal ? {} : { disabledReason: 'It cannot hold this node here.' }),
        attributes: { 'data-editor-context-embed': key },
      };
    }),
    { kind: 'divider' },
    { label: 'Other…', action: CONTEXT_EMBED_OTHER_ACTION },
  ];
  return (
    <PopupMenu
      context
      label="Node actions"
      rootAttributes={{ [CONTEXT_MENU]: '' }}
      items={
        movable
          ? [
              { label: 'Embed in', submenu: embedIn },
              { kind: 'divider' },
              {
                label: 'Move up',
                action: CONTEXT_MOVE_UP_ACTION,
                disabled: !movable.up,
              },
              {
                label: 'Move down',
                action: CONTEXT_MOVE_DOWN_ACTION,
                disabled: !movable.down,
              },
              {
                label: 'Duplicate',
                action: CONTEXT_DUPLICATE_ACTION,
                disabled: !movable.placed,
              },
              {
                label: 'Extract to Document…',
                action: EXTRACT_ACTION,
                ...(extractBlocked(id!)
                  ? { disabled: true, disabledReason: extractBlocked(id!) }
                  : {}),
              },
              { kind: 'divider' },
              {
                label: 'Delete',
                action: CONTEXT_DELETE_ACTION,
                tone: 'danger',
                disabled: !movable.remove,
              },
            ]
          : []
      }
    />
  );
}
