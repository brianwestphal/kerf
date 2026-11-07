// The editor shell's names (KF-YF1PDR: split out of editor.tsx): the
// delegated action, dialog, and drop-target names its regions render and
// wire, the Embed in tables, and the small shared Inspector shapes.
import type { ViewValue } from '@kerfjs/ui/view';
import type { SafeHtml } from 'kerfjs';

import type { PaneConfig } from '../components/layout/pane/pane.js';
import type { SlotAddress } from './model/control-flow.js';

export const OUTLINE_ACTION = 'editor-select-node';
export const OUTLINE_TOGGLE_ACTION = 'editor-toggle-node';
export const PALETTE_ACTION = 'editor-show-component';
export const PALETTE_CLEAR_ACTION = 'editor-clear-palette-filter';
/**
 * KF-FXACB5: a Library document, which a click inserts as a `#view` and a
 * drag (source `document:<path>`) drops like a component.
 */
export const PALETTE_DOCUMENT_ACTION = 'editor-insert-library-document';
export const PROBLEM_ACTION = 'editor-select-problem';
export const NEW_ACTION = 'editor-new';
// KF-60BEEJ: play mode's Play (Canvas toolbar) and Done (play bar).
export const PLAY_ACTION = 'editor-play';
export const PLAY_DONE_ACTION = 'editor-play-done';
// KF-MHY1GB: each rail switches between focus areas with a segmented tab strip.
export const DOCUMENT_TAB_ACTION = 'editor-document-tab';
export const INSPECTOR_TAB_ACTION = 'editor-inspector-tab';
/** The Document rail's tab strip id. */
export const DOCUMENT_AREAS = 'editor-document-areas';
/** How long a drag rests on a tab before it opens. */
export const SPRING_MS = 500;
export type DocumentArea = 'outline' | 'problems';
export type InspectorArea = 'properties' | 'flow' | 'children';
export const SAVE_ACTION = 'editor-save';
export const SAVE_AS_ACTION = 'editor-save-as';
export const SAVE_AS_DIALOG = 'editor-save-as-dialog';
/** KF-D9P3NP: Extract to document, and its Save As–style dialog. */
export const EXTRACT_ACTION = 'editor-extract';
export const EXTRACT_DIALOG = 'editor-extract-dialog';
export const UNDO_ACTION = 'editor-undo';
export const REDO_ACTION = 'editor-redo';
export const MOVE_UP_ACTION = 'editor-move-up';
export const MOVE_DOWN_ACTION = 'editor-move-down';
export const DELETE_ACTION = 'editor-delete';
/** Copies the selected node right after itself (KF-QAVK73). */
export const DUPLICATE_ACTION = 'editor-duplicate';
export const ADD_ACTION = 'editor-add-child';
/** Add a child's choice for a text run in a text-accepting zone (KF-YBMVVM). */
export const TEXT_RUN = '#text';
export const REPLACE_ROOT_ACTION = 'editor-replace-root';
/** KF-PK3GVY: makes the chosen component a rootless document's root. */
export const FIRST_ROOT_ACTION = 'editor-first-root';
/**
 * A rootless document's canvas empty state (KF-PK3GVY): a drop target whose
 * outline id is `ROOT_TARGET`, where a palette drop becomes the root.
 */
export const ROOT_EMPTY = 'root';
export const ROOT_TARGET = 'editor-root';
export const CONTENT_TO_NODES_ACTION = 'editor-content-to-nodes';
export const CONTENT_TO_TEXT_ACTION = 'editor-content-to-text';
/** A canvas drop target naming an empty zone (KF-7BB55F). */
export const EMPTY_ZONE_TARGET = 'editor-empty-zone:';
/** The zone an empty-zone drop target names, if `id` is one. */
export const emptyZoneTarget = (id: string) =>
  id.startsWith(EMPTY_ZONE_TARGET)
    ? (JSON.parse(id.slice(EMPTY_ZONE_TARGET.length)) as SlotAddress)
    : undefined;
/**
 * KF-WKABP2: a drop target replacing the node it names, alone in a zone
 * that holds one child.
 */
export const REPLACE_TARGET = 'editor-replace:';
/** The node a replacing drop target names, if `id` is one. */
export const replaceTarget = (id: string) =>
  id.startsWith(REPLACE_TARGET) ? id.slice(REPLACE_TARGET.length) : undefined;
/** KF-WKABP2: the menu a drop asks with, and its entries' action. */
export const DROP_MENU = 'data-editor-drop-menu';
export const DROP_CHOICE_ACTION = 'editor-drop-choice';
export const REPLACE_DIALOG = 'editor-replace-dialog';
export const REPLACE_CONFIRM_ACTION = 'editor-replace-confirm';
/** Adds a node to a content prop's zone from its Properties row (KF-5T3TE4). */
export const CONTENT_ADD_ACTION = 'editor-content-add';
/**
 * KF-3Y2GS2: an optional text prop's Not set toggle. Pressed while the prop
 * is unset; an empty field is the empty string.
 */
export const UNSET_ACTION = 'editor-toggle-unset';
export const EXAMPLE_ACTION = 'editor-fill-example';
// KF-Z9S029: object forms in a pushed Inspector view or a dialog.
export const FIELD_OPEN_ACTION = 'editor-open-field';
export const FIELD_BACK_ACTION = 'editor-field-back';
export const FIELD_DONE_ACTION = 'editor-field-done';
export const FIELD_RESET_ACTION = 'editor-reset-field';
export const FIELD_EXAMPLE_ACTION = 'editor-fill-field-example';
export const FIELD_JSON_ACTION = 'editor-field-json';
export const FIELD_DIALOG = 'editor-field-dialog';
export const INSPECTOR_STACK = 'editor-inspector-stack';
/**
 * KF-NV427Y: the Inspector's own edits insert and remove rows above the
 * reader, and Safari then applies a stale scroll-anchoring jump on the next
 * unrelated reflow (the autosave status), so its panes opt out of anchoring.
 */
export const INSPECTOR_PANE: PaneConfig = { scrollAnchoring: 'none' };
// KF-VYRDDQ: icon data picks a Lucide icon in a searchable dialog.
export const ICON_OPEN_ACTION = 'editor-open-icon';
export const ICON_CHOOSE_ACTION = 'editor-choose-icon';
export const ICON_REMOVE_ACTION = 'editor-remove-icon';
export const ICON_CLEAR_ACTION = 'editor-clear-icon-search';
export const ICON_DIALOG = 'editor-icon-dialog';
// KF-65FTKX: a component's data-* attributes.
export const OPEN_VIEW_ACTION = 'editor-open-view';
export const VIEW_BACK_ACTION = 'editor-view-back';
export const DATA_ATTRIBUTE_ADD_ACTION = 'editor-add-data-attribute';
export const DATA_ATTRIBUTE_REMOVE_ACTION = 'editor-remove-data-attribute';
export const SHOW_VIEW_ACTION = 'editor-show-view';
export const EMBED_ACTION = 'editor-embed';
export const EMBED_OTHER_ACTION = 'editor-embed-other';
export const EMBED_CLEAR_ACTION = 'editor-embed-clear';
export const EMBED_DIALOG = 'editor-embed-dialog';
/**
 * KF-PX5EVZ: Add a child's choice that inserts an existing document as a
 * `#view`, and its dialog: a filtered pick list when the storage lists the
 * project's documents, a path field when it does not.
 */
export const INSERT_DOCUMENT = '#view';
export const INSERT_DOCUMENT_ACTION = 'editor-insert-document';
export const INSERT_DOCUMENT_CLEAR_ACTION = 'editor-insert-document-clear';
export const INSERT_DOCUMENT_DIALOG = 'editor-insert-document-dialog';
/** The node context menu's root (KF-JV7XW1). */
export const CONTEXT_MENU = 'data-editor-context-menu';
// The node context menu's commands have actions of their own, so a page
// still finds one Inspector control per action.
export const CONTEXT_EMBED_ACTION = 'editor-context-embed';
export const CONTEXT_EMBED_OTHER_ACTION = 'editor-context-embed-other';
export const CONTEXT_MOVE_UP_ACTION = 'editor-context-move-up';
export const CONTEXT_MOVE_DOWN_ACTION = 'editor-context-move-down';
export const CONTEXT_DUPLICATE_ACTION = 'editor-context-duplicate';
export const CONTEXT_DELETE_ACTION = 'editor-context-delete';
/**
 * The containers Embed in offers first (KF-6MGYSG); Other… lists every
 * container that can hold the node.
 */
export const EMBED_FIRST = [
  '@kerfjs/ui:sized-region',
  '@kerfjs/ui:list-inset-control',
  '@kerfjs/ui:list-inset-text',
];
/**
 * KF-N7K17T: the pane a split layout holds an embedded node in, when it has
 * no main zone: a SplitView's detail, the content beside its list.
 */
export const EMBED_PANES: Readonly<Record<string, string>> = {
  '@kerfjs/ui:split-view': 'detail',
};
/**
 * Props a new container starts with when it embeds a node: a SizedRegion
 * keeps a usable height even where its parent sizes to its content, such as
 * the canvas's root Pane.
 */
export const EMBED_PROPS: Readonly<Record<string, Record<string, ViewValue>>> =
  {
    '@kerfjs/ui:sized-region': { minHeight: { $css: 'rem(20)' } },
  };
// KF-CY1D5W: a list of objects or union items edits item by item.
export const FIELD_ADD_ITEM_ACTION = 'editor-add-item';
export const FIELD_REMOVE_ITEM_ACTION = 'editor-remove-item';
// KF-EXA2WH: an application field editor's button sets its value.
export const FIELD_SET_ACTION = 'editor-set-field';
export const PROMOTE_ACTION = 'editor-promote';
/** Promotes one app-supplied prop from its own row (KF-D85GY0). */
export const PROMOTE_PROP_ACTION = 'editor-promote-prop';
/** Promotes one field inside an object prop to a param (KF-3QEZFB). */
export const PROMOTE_FIELD_ACTION = 'editor-promote-field';
export const EXPORT_MODULE_ACTION = 'editor-export-module';
export const EXPORT_DECLARATIONS_ACTION = 'editor-export-declarations';
export const DOCUMENT_TOGGLE = 'editor-toggle-document';
export const INSPECTOR_TOGGLE = 'editor-toggle-inspector';
/** How far the selection ring reaches outside its box: 3px plus 1px offset. */
export const RING_REACH = 4;

/** One row of an Inspector section and how it is contained. */
export interface InspectorRow {
  readonly kind: 'edit' | 'open' | 'fixed';
  readonly row: SafeHtml;
}
