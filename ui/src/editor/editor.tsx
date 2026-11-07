// The Kerf UI editor shell (docs/26-ui-editor.md; KF-4NRZCV: editor
// scaffold), published as `@kerfjs/ui/editor` (KF-6GT5QY: editor host). A
// Workbench with the document rail (outline and problems), the component
// Library popover (KF-Z54E4H), the canvas (the document rendered through interpretView), and
// the inspector that edits it, plus open, save, export, and compare of the
// generated view module. The host registers `@kerfjs/ui/popup-menu/register`
// and `@kerfjs/ui/select/register` and loads the global stylesheets, as for
// any Kerf UI app.

import {
  contractOf,
  validateView,
  type ViewContract,
  type ViewDocument,
  type ViewNode,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';
import {
  batch,
  computed,
  delegate,
  effect,
  raw,
  type SafeHtml,
  signal,
} from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Component,
  FileCode,
  FilePlus,
  FileText,
  FolderOpen,
  GitCompare,
  LayoutGrid,
  List as ListIcon,
  Play,
  Plus,
  Redo2,
  Save,
  Trash,
  Undo2,
} from 'lucide';

import { Button } from '../components/actions/button/button.js';
import {
  openPopupMenuAt,
  PopupMenu,
} from '../components/actions/popup-menu/popup-menu.js';
import { Toolbar } from '../components/actions/toolbar/toolbar.js';
import { ToolbarControlGroup } from '../components/actions/toolbar-control-group/toolbar-control-group.js';
import { ToolbarText } from '../components/actions/toolbar-text/toolbar-text.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import {
  TreeList,
  type TreeListNode,
} from '../components/collections/tree-list/tree-list.js';
import {
  treeListExternalDrop,
  wireTreeList,
} from '../components/collections/tree-list/wiring/wire-tree-list.js';
import {
  ValueTable,
  ValueTableRow,
} from '../components/data-display/value-table/value-table.js';
import { Badge } from '../components/feedback/badge/badge.js';
import { EmptyState } from '../components/feedback/empty-state/empty-state.js';
import { StateBanner } from '../components/feedback/state-banner/state-banner.js';
import { FilePickerTrigger } from '../components/forms/file-picker/file-picker.js';
import { wireFilePickers } from '../components/forms/file-picker/wiring/wire-file-pickers.js';
import { wireForms } from '../components/forms/form/wiring/wire-forms.js';
import {
  readSearchField,
  SearchField,
} from '../components/forms/search-field/search-field.js';
import { SegmentedControl } from '../components/forms/segmented-control/segmented-control.js';
import { Select } from '../components/forms/select/select.js';
import { wireTagFields } from '../components/forms/tag-field/wiring/wire-tag-fields.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { Grid } from '../components/layout/grid/grid.js';
import { wireWorkbench } from '../components/layout/workbench/wiring/wire-workbench.js';
import { Workbench } from '../components/layout/workbench/workbench.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { wireNavStack } from '../components/navigation/nav-stack/wiring/wire-nav-stack.js';
import { TabBar } from '../components/navigation/tab-bar/tab-bar.js';
import { wireTabBars } from '../components/navigation/tab-bar/wiring/wire-tab-bars.js';
import { TabBarItem } from '../components/navigation/tab-bar-item/tab-bar-item.js';
import { ContentItem } from '../components/surfaces/content-item/content-item.js';
import {
  closeDialog,
  DialogSurface,
  isPopoverPinned,
  openDialog,
  PinnablePopoverSurface,
  wirePinnablePopover,
} from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { Text } from '../components/typography/text/text.js';
import { realmOf } from '../shared/dom/realm.js';
import { isApplePlatform } from '../shared/selection/selection.js';
import { px } from '../shared/styles/css-values.js';
import {
  reorderListItems,
  wireListReorder,
} from '../wiring/wire-list-reorder.js';
import { wireScrollDividers } from '../wiring/wire-scroll-dividers.js';
import {
  createAutosave,
  draftPath,
  type EditorStorage,
  isDraft,
  rememberedPath,
  rememberPath,
} from './autosave.js';
import { wireCanvasDrag } from './canvas-drag.js';
import { canvasInputs, canvasRenderer, contained } from './canvas-renderer.js';
import type { EditorCatalog } from './catalog.js';
import {
  ADD_KIND_ACTION,
  ADD_ROW_DESIGN_ACTION,
  ADD_SLOT_ACTION,
  MOVE_ROW_DESIGN_EARLIER_ACTION,
  MOVE_ROW_DESIGN_LATER_ACTION,
  REMOVE_ROW_DESIGN_ACTION,
  slotEditor,
} from './control-flow-section.js';
import { HOOK, hook } from './dom-hooks.js';
import { createDropViews } from './drop-menu.js';
import type { EditorContext, Selection } from './editor-context.js';
import { embedDialog, extractDialog } from './embed-extract-views.js';
import { createFieldEditorShell } from './field-editor-shell.js';
import { createFieldEditorViews } from './field-editor-views.js';
import type { FieldEditors } from './field-editors.js';
import { type FieldPlace, type OpenField, placeKey } from './field-place.js';
import { createIconDialog } from './icon-dialog.js';
import {
  insertDocumentDialog,
  type InsertDocumentFiles,
} from './insert-document-dialog.js';
import { createInspectorControls } from './inspector-controls.js';
import { createLibraryDrag, type LibraryRead } from './library-drag.js';
import {
  LIBRARY_ID,
  PALETTE_ICONS,
  PALETTE_VIEW_ACTION,
  type PaletteView,
  rememberedLibrary,
  rememberedPaletteView,
  rememberLibrary,
  rememberPaletteView,
} from './library-memory.js';
import { contentOf, nodesToText, textToNodes } from './model/content.js';
import {
  controlOf,
  insertSlot,
  removeSlot,
  renameItem,
  repeatOptions,
  setCondition,
  setOtherwise,
  setRepeat,
  setSlotInput,
  type SlotAddress,
  slotAt,
} from './model/control-flow.js';
import {
  type ControlKind,
  CUSTOM_SIZE,
  followChoiceRename,
  isBinding,
  reshapeValue,
  type SeedCatalog,
  seedNode,
  valueFromControl,
  valuePicker,
} from './model/controls.js';
import {
  DATA_ATTRIBUTES_PROP,
  type DataAttributeEdit,
  dataAttributeNameError,
  dataAttributes,
  editDataAttributes,
  newDataAttributeName,
  protectedDataAttributes,
} from './model/data-attributes.js';
import {
  documentFileName,
  findNode,
  parseDocument,
  serializeDocument,
} from './model/document.js';
import { insertPlacement, moveDestinations } from './model/drop.js';
import { isSeedPlaceholder } from './model/drop-zones.js';
import {
  addsProblems,
  copyChild,
  duplicateNode,
  embedNode,
  History,
  insertNode,
  isMovable,
  legalZones,
  moveNode,
  newNodeId,
  ownFilledFields,
  paramTypeFor,
  pasteNode,
  placeChild,
  placementOf,
  placeNode,
  primaryFirst,
  promoteToParam,
  removeNode,
  renameNode,
  renameParam,
  replaceRoot,
  setField,
  setProp,
  setTextRun,
  suggestedComponents,
  withCatalog,
  type ZoneOption,
} from './model/edits.js';
import {
  exampleValue,
  resolveType,
  slotNamer,
  usedSlots,
} from './model/examples.js';
import {
  compareWithModule,
  describeExport,
  type ExportKind,
  exportModule,
  type ExportReport,
} from './model/export.js';
import {
  extractProblem,
  extractSuggestion,
  extractToDocument,
} from './model/extract.js';
import {
  appParamFor,
  containerFor,
  documentInDeclaredOrder,
  fieldZoneKeys,
  isFieldZoneKey,
  listMembers,
  objectFields,
  propLabel,
  stepTitle,
  valueAt,
  withRequiredBooleans,
  withValueAt,
} from './model/fields.js';
import { iconNameEdit } from './model/icons.js';
import {
  documentFolder,
  documentName,
  insertableDocuments,
  insertedView,
  insertProblem,
  LIBRARY_DOCUMENTS,
  libraryDocuments,
} from './model/insert-view.js';
import { inspectorSections } from './model/inspector.js';
import {
  itemSlotRowNode,
  nodeTitle,
  type OutlineNode,
  outlineParents,
  outlineRows,
  outlineTree,
  slotRowAddress,
  slotRowId,
} from './model/outline.js';
import type { ActionLogEntry, PlayHandlers } from './model/play-actions.js';
import {
  type DevicePresetsOption,
  resolveDevicePresets,
} from './model/play-device.js';
import {
  problemCounts,
  problemsOf,
  type PropsVariant,
  readableMessage,
} from './model/problems.js';
import {
  addKind,
  addRowDesign,
  moveRowDesign,
  removeRowDesign,
  renameKind,
  setRowCondition,
  setRowKind,
} from './model/row-designs.js';
import {
  composedDocuments,
  explainViewLoads,
  neededViews,
  type ViewLoad,
  viewPath,
  viewPropsEntry,
} from './model/views.js';
import { nodeContextMenu } from './node-context-menu.js';
import { createNodeInspectorViews } from './node-inspector-views.js';
import { paletteSketch } from './palette-schematics.js';
import { wirePaletteThumbnails } from './palette-thumbnails.js';
import { createPlayStage } from './play-stage.js';
import {
  createPlayer,
  fromPeer,
  isPlayPage,
  PLAY_ACTION as PLAY_ACTION_MESSAGE,
  PLAY_DOCUMENT,
  PLAY_ENVIRONMENT,
  PLAY_READY,
} from './player.js';
import { hintRows, problemRows } from './problem-rows.js';
import {
  ADD_ACTION,
  CONTENT_ADD_ACTION,
  CONTENT_TO_NODES_ACTION,
  CONTENT_TO_TEXT_ACTION,
  CONTEXT_DELETE_ACTION,
  CONTEXT_DUPLICATE_ACTION,
  CONTEXT_EMBED_ACTION,
  CONTEXT_EMBED_OTHER_ACTION,
  CONTEXT_MENU,
  CONTEXT_MOVE_DOWN_ACTION,
  CONTEXT_MOVE_UP_ACTION,
  DATA_ATTRIBUTE_ADD_ACTION,
  DATA_ATTRIBUTE_REMOVE_ACTION,
  DELETE_ACTION,
  DOCUMENT_AREAS,
  DOCUMENT_TAB_ACTION,
  DOCUMENT_TOGGLE,
  type DocumentArea,
  DROP_CHOICE_ACTION,
  DROP_MENU,
  DUPLICATE_ACTION,
  EMBED_ACTION,
  EMBED_CLEAR_ACTION,
  EMBED_DIALOG,
  EMBED_FIRST,
  EMBED_OTHER_ACTION,
  EMBED_PANES,
  EMBED_PROPS,
  EMPTY_ZONE_TARGET,
  EXAMPLE_ACTION,
  EXPORT_DECLARATIONS_ACTION,
  EXPORT_MODULE_ACTION,
  EXTRACT_ACTION,
  EXTRACT_DIALOG,
  FIELD_ADD_ITEM_ACTION,
  FIELD_BACK_ACTION,
  FIELD_DIALOG,
  FIELD_DONE_ACTION,
  FIELD_EXAMPLE_ACTION,
  FIELD_JSON_ACTION,
  FIELD_OPEN_ACTION,
  FIELD_REMOVE_ITEM_ACTION,
  FIELD_RESET_ACTION,
  FIELD_SET_ACTION,
  FIRST_ROOT_ACTION,
  ICON_CHOOSE_ACTION,
  ICON_CLEAR_ACTION,
  ICON_DIALOG,
  ICON_OPEN_ACTION,
  ICON_REMOVE_ACTION,
  INSERT_DOCUMENT,
  INSERT_DOCUMENT_ACTION,
  INSERT_DOCUMENT_CLEAR_ACTION,
  INSERT_DOCUMENT_DIALOG,
  INSPECTOR_PANE,
  INSPECTOR_STACK,
  INSPECTOR_TAB_ACTION,
  INSPECTOR_TOGGLE,
  type InspectorArea,
  MOVE_DOWN_ACTION,
  MOVE_UP_ACTION,
  NEW_ACTION,
  OPEN_VIEW_ACTION,
  OUTLINE_ACTION,
  OUTLINE_TOGGLE_ACTION,
  PALETTE_ACTION,
  PALETTE_CLEAR_ACTION,
  PALETTE_DOCUMENT_ACTION,
  PLAY_ACTION,
  PLAY_DONE_ACTION,
  PROBLEM_ACTION,
  PROMOTE_ACTION,
  PROMOTE_FIELD_ACTION,
  PROMOTE_PROP_ACTION,
  REDO_ACTION,
  REPLACE_CONFIRM_ACTION,
  REPLACE_DIALOG,
  REPLACE_ROOT_ACTION,
  RING_REACH,
  ROOT_EMPTY,
  ROOT_TARGET,
  SAVE_ACTION,
  SAVE_AS_ACTION,
  SAVE_AS_DIALOG,
  SHOW_VIEW_ACTION,
  TEXT_RUN,
  UNDO_ACTION,
  UNSET_ACTION,
  VIEW_BACK_ACTION,
} from './shell-names.js';

export const WORKBENCH_ID = 'kerf-ui-editor';

export type { Selection } from './editor-context.js';

const PANE = '@kerfjs/ui:pane';

/**
 * A fresh root `node` (KF-Z70DBC: a new root Pane fills): a Pane that becomes
 * the root starts with `fill` on, so the view fills an app's or play mode's
 * screen instead of showing at its content height. Authors can turn it off.
 */
function asRoot(node: ViewNode): ViewNode {
  return node.type === PANE
    ? { ...node, props: { fill: true, ...node.props } }
    : node;
}

/**
 * A new document (KF-PK3GVY): Kerf UI's catalog and no root yet; the first
 * component the author chooses becomes the root.
 */
export function emptyDocument(): ViewDocument {
  return {
    schema: 'kerf-ui-document/v1',
    name: 'Untitled',
    catalogs: ['@kerfjs/ui'],
  };
}

export {
  devServerStorage,
  EDITOR_FILE_API,
  EDITOR_LIST_API,
  type EditorStorage,
} from './autosave.js';
export {
  type CatalogEntry,
  type ComponentFunction,
  componentMap,
  createEditorCatalog,
  type EditorCatalog,
  type EditorCatalogInputs,
  type PaletteGroup,
  type PropsComponent,
} from './catalog.js';
export type {
  FieldEditor,
  FieldEditorAttributes,
  FieldEditorContext,
  FieldEditorControlKind,
  FieldEditors,
} from './field-editors.js';
export type {
  ActionLogEntry,
  ActionOutcome,
  PlayActionContext,
  PlayHandler,
  PlayHandlers,
  PlayNavStack,
  PlayView,
} from './model/play-actions.js';
export {
  type DeviceFrame,
  type DeviceInsets,
  type DeviceKind,
  type DevicePreset,
  type DevicePresetsOption,
  SHIPPED_DEVICE_PRESETS,
} from './model/play-device.js';

export interface EditorOptions {
  /** The document to start with; the default is an empty Pane. */
  readonly document?: ViewDocument;
  /** Saves a file; the default downloads it through a temporary link. */
  readonly save?: (fileName: string, text: string) => void;
  /**
   * Where documents live (KF-0SY9M6: autosave). With it, every change saves
   * itself, to a draft until Save as chooses a path, and the editor reopens
   * the last document; `devServerStorage()` uses the host's dev server.
   */
  readonly storage?: EditorStorage;
  /**
   * The components the editor can place and preview: Kerf UI's catalogs and
   * functions, plus an application's (`createEditorCatalog`).
   */
  readonly catalog: EditorCatalog;
  /**
   * Editors for named types (KF-EXA2WH: field editor API), such as a
   * catalog's `'ListConfig'` or an application's `'InvoiceFilter'`: each
   * replaces the type-driven form wherever a prop or field has that type.
   */
  readonly fieldEditors?: FieldEditors;
  /**
   * KF-R7KXSN: play mode's devices. An array adds to the shipped presets
   * (replacing one with the same id); a function returns the whole list.
   */
  readonly devicePresets?: DevicePresetsOption;
  /**
   * KF-RF6RCS: play mode's mock action handlers, by action name. They run
   * inside the play frame when the view fires that action.
   */
  readonly playHandlers?: PlayHandlers;
}

/** An inspector control's current value: a Select's, a switch's, or a field's. */
function controlValue(field: HTMLElement): string | boolean {
  // The host registers `kui-select`, whose element reports its value.
  if (field.localName === 'kui-select')
    return (field as HTMLElement & { value: string }).value;
  // A CheckboxGroup's checked values, in its choices' order (KF-A9ZHGW).
  if (
    field.dataset.editorKind === 'enum-set' ||
    field.dataset.editorKind === 'value-choices'
  )
    return JSON.stringify(
      [
        ...field.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"]:checked',
        ),
      ].map((input) => input.value),
    );
  // Every other inspector control wraps one native input, or is one (an
  // application field editor's own control; KF-EXA2WH).
  const input = field.matches('input, textarea, select')
    ? (field as HTMLInputElement)
    : field.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        'input, textarea',
      )!;
  return input instanceof HTMLInputElement && input.type === 'checkbox'
    ? input.checked
    : input.value;
}

/** Identifies what the Inspector shows, so a change of subject is detectable. */
function selectionKey(selection: Selection): string {
  if (!selection) return '';
  switch (selection.kind) {
    case 'node':
      return `node:${selection.id}`;
    case 'slot': {
      const { parent, zone, index } = selection.address;
      return slotRowId(parent, zone, index);
    }
    case 'component':
      return `component:${selection.key}`;
  }
}

/** Scrolls the Inspector rail, and anything scrolled inside it, to the top. */
function resetInspectorScroll(root: HTMLElement): void {
  // A reset scheduled just before the editor unmounted finds no rail.
  const rail = root.querySelector('[data-workbench-rail="right"]');
  if (!rail) return;
  for (const element of [rail, ...rail.querySelectorAll('*')])
    if (element.scrollTop) element.scrollTop = 0;
}

/** Text-entry input types whose draft a document value backs. */
const DRAFT_INPUT = /^(text|search|url|email|tel|number|password)?$/;

/**
 * Writes every drafted text field in `scope` back to its rendered value: an
 * input to its `value` attribute, a textarea to its text (KF-0Y88XZ). An
 * input with no `value` attribute holds nothing the document renders, so it
 * is left alone.
 */
function discardDrafts(scope: ParentNode): void {
  for (const input of scope.querySelectorAll('input')) {
    if (!input.hasAttribute('value') || !DRAFT_INPUT.test(input.type)) continue;
    if (input.value !== input.defaultValue) input.value = input.defaultValue;
  }
  for (const area of scope.querySelectorAll('textarea'))
    if (area.value !== area.defaultValue) area.value = area.defaultValue;
}

/** Adds a listener and returns its disposer. */
function on(
  target: EventTarget,
  type: string,
  listener: (event: Event) => void,
): () => void {
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}

function download(fileName: string, text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function createEditor(options: EditorOptions) {
  const { catalog } = options;
  const { viewCatalog, propsByKey, componentNames } = catalog;
  /** A component's prop variants, so a variant problem says how to fix it. */
  const variantsOf = (type: string) =>
    (propsByKey.get(type) as { variants?: readonly PropsVariant[] } | undefined)
      ?.variants;
  // KF-60BEEJ: on the play page (play mode's stage) this is the player:
  // the document its editor sends, rendered and wired as it runs.
  if (isPlayPage(globalThis.location)) {
    // KF-85SCQD: `#view`s render the composed documents the editor sent,
    // by path, as the canvas renders the ones it loaded.
    const playView = (src: string, path: string = src) =>
      player.views.value[path];
    const render = canvasRenderer(
      catalog,
      playView,
      (path, owner) => player.copies.value[owner] ?? player.views.value[path]!,
    );
    const player = createPlayer(
      options.document ?? emptyDocument(),
      (document, overrides, rows) =>
        render(
          document,
          problemsOf(
            document,
            validateView(document, viewCatalog, { resolveView: playView })
              .diagnostics,
            variantsOf,
          ),
          undefined,
          undefined,
          true,
          overrides,
          rows,
        ),
      // KF-RF6RCS: the host's mock handlers, given the canvas's samples.
      {
        handlers: options.playHandlers,
        inputs: (document) => canvasInputs(document, catalog.placeholders),
        label: (document, nodeId) => {
          const { node } = findNode(document, nodeId)!;
          return node.name ?? `${nodeTitle(node, componentNames)} ${nodeId}`;
        },
      },
    );
    return {
      ...player,
      selection: signal<Selection>(null),
      loadError: signal<string | null>(null),
    };
  }
  /**
   * KF-5N26H6: the composed documents `#view` nodes name, by project path,
   * as their loads stand. Loading a document starts it again.
   */
  const viewLoads = signal<ReadonlyMap<string, ViewLoad>>(new Map());
  /**
   * The documents Open document came from, newest last: each one's path and
   * the `#view` node to select on the way back.
   */
  const viewTrail = signal<readonly { path: string; node: string }[]>([]);
  /** Where `#view` sources resolve from: the current file, with storage. */
  const documentPath = () => (autosave ? autosave.path.value : undefined);
  /**
   * A composed document, once it has loaded. `at` is where `src` points
   * relative to this document's folder (KF-3X7MFF: the validator passes it
   * for a nested `#view`, whose `src` resolves from its own document).
   */
  const resolveView = (
    src: string,
    at: string = src,
  ): ViewDocument | undefined => {
    const base = documentPath();
    const path = base === undefined ? undefined : viewPath(base, at);
    const load = path === undefined ? undefined : viewLoads.value.get(path);
    return load?.state === 'loaded' ? load.document : undefined;
  };
  /**
   * The Inspector entry for a node: its component's, or for a `#view` one
   * prop per param of the document it composes (none until it loads).
   */
  const propsEntryOf = (node: ViewNode) =>
    node.type === '#view'
      ? viewPropsEntry(
          node.src ?? '',
          resolveView(node.src ?? '') ?? emptyDocument(),
        )
      : propsByKey.get(node.type);
  /** The document's validation, once per edit (and per composed load). */
  const validation = computed(() =>
    validateView(doc.value, viewCatalog, { resolveView }),
  );
  /** The document's problems. */
  const currentProblems = computed(() =>
    problemsOf(
      doc.value,
      explainViewLoads(
        validation.value.diagnostics,
        documentPath(),
        viewLoads.value,
      ),
      variantsOf,
    ),
  );
  /**
   * Non-blocking advice (KF-KQ72TW: a nested layout with no height), with
   * component keys written as names. Hints never block export or Compare.
   */
  const currentHints = computed(() =>
    problemsOf(doc.value, validation.value.hints).map((hint) => ({
      ...hint,
      diagnostic: {
        ...hint.diagnostic,
        message: readableMessage(hint.diagnostic.message, componentNames),
      },
    })),
  );
  /**
   * The selected node's problems by the prop each is about (KF-H782W9): a
   * problem at a prop's path, and each prop a variant hint names, so the
   * field can show it.
   */
  const fieldProblems = computed(() => {
    const id = selectedNodeId();
    const byProp = new Map<string, string>();
    for (const { diagnostic, nodeId } of currentProblems.value) {
      if (nodeId !== id) continue;
      // A composed document's problem (`…{./row.kui.json}…`) is its own.
      const prop = /^[^{]*\.props\.([A-Za-z]\w*)$/.exec(diagnostic.path)?.[1];
      if (prop) byProp.set(prop, diagnostic.message);
      // KF-5N26H6: a `#view` missing a required param shows it on that field.
      const required = /^#view "[^"]*" requires param "(\w+)"$/.exec(
        diagnostic.message,
      )?.[1];
      if (required) byProp.set(required, diagnostic.message);
      const fix = diagnostic.message.split('variants: ')[1];
      for (const [, name] of fix?.matchAll(/"([^"]+)"/g) ?? [])
        byProp.set(name!, `To fix: ${fix}`);
    }
    return byProp;
  });
  const canvasContent = canvasRenderer(catalog, resolveView);
  /** The type table component `key`'s props catalog declares. */
  const definitionsOf = (key: string) =>
    viewCatalog.components.get(key)?.definitions ?? {};
  /**
   * KF-YJFMZY: the file text for `document`, its props in declared order,
   * so a document saves the same bytes however its fields were edited.
   */
  const fileText = (document: ViewDocument) =>
    serializeDocument(
      documentInDeclaredOrder(
        document,
        (key) => propsByKey.get(key)?.props,
        definitionsOf,
      ),
    );
  const doc = signal<ViewDocument>(options.document ?? emptyDocument());
  const selection = signal<Selection>(null);
  const loadError = signal<string | null>(null);
  /**
   * KF-60BEEJ: play mode is on. The editing UI stays mounted but hidden, so
   * Done returns to it exactly as it was, selection included.
   */
  const playing = signal(false);
  /** KF-R7KXSN: the play bar's device, scale, and the stage that shows it. */
  const playStage = createPlayStage({
    presets: resolveDevicePresets(options.devicePresets),
    doneAction: PLAY_DONE_ACTION,
  });
  /** Why the last duplicate or paste did not happen (KF-QAVK73). */
  const editNotice = signal<string | null>(null);
  /**
   * The Outline row or canvas element the node context menu opened from,
   * where focus goes back when it closes (KF-JV7XW1).
   */
  let contextInvoker: HTMLElement | undefined;
  /** The node Copy took, for Paste; held per editor, never shared. */
  let clipboard: ViewNode | undefined;
  // Editing (KF-KX77TV): every change goes through commit(), so the
  // document stays the only state and undo/redo restores whole documents.
  const history = new History();
  const historyVersion = signal(0);
  let wired: HTMLElement | undefined;
  const autosave =
    options.storage &&
    createAutosave(options.storage, 400, () => realmOf(wired ?? document));
  const documentArea = signal<DocumentArea>('outline');
  const inspectorArea = signal<InspectorArea>('properties');
  const saveAsError = signal('');
  /** KF-D9P3NP: the Extract dialog's suggested path, and why it failed. */
  const extractPath = signal('');
  const extractError = signal('');
  const fieldErrors = signal<Readonly<Record<string, string>>>({});
  const addZone = signal('');
  const addComponent = signal('');
  const rootComponent = signal('');
  const promoteProp = signal('');
  const bindProp = signal('');
  const bindField = signal('');
  /**
   * The size prop (`<node id> <prop>`) whose Select is on Custom with no
   * builder call yet, so its builder field shows (KF-Q5AXNP).
   */
  const customSize = signal('');
  /** The field editor open on the selected node, if any (KF-Z9S029). */
  const openField = signal<OpenField | null>(null);
  /** Field editor steps (`placeKey`) showing their typed JSON instead. */
  const jsonSteps = signal<ReadonlySet<string>>(new Set());
  /** The icon prop or field the icon picker is choosing for (KF-VYRDDQ). */
  const iconPicker = signal<FieldPlace | null>(null);
  /** The icon picker's search, and its field's revision (to clear it). */
  const iconQuery = signal('');
  const iconQueryRevision = signal(0);
  /**
   * The lower view each NavStack shows on the canvas, by node id
   * (KF-RMZ2NP: Show this view); absent, a stack shows its top view.
   */
  const canvasViews = signal<ReadonlyMap<string, number>>(new Map());
  /** The node the Embed in dialog embeds, and its filter (KF-6MGYSG). */
  const embedTarget = signal<string | null>(null);
  const embedQuery = signal('');
  const embedQueryRevision = signal(0);
  /**
   * KF-PX5EVZ: where Insert Document puts the `#view` (the node and zone Add
   * a child had chosen), the documents it offers as their listing stands,
   * its filter, and why the last insert failed.
   */
  const insertTarget = signal<{ id: string; zone: string } | null>(null);
  const insertFiles = signal<InsertDocumentFiles>({ state: 'loading' });
  const insertQuery = signal('');
  const insertQueryRevision = signal(0);
  const insertError = signal('');
  /** The Library filter's text (KF-Y26SKM), and its editor's revision. */
  const paletteFilter = signal('');
  const paletteFilterRevision = signal(0);
  const paletteView = signal<PaletteView>(rememberedPaletteView());
  /**
   * KF-FXACB5: the project's documents the Library offers, as its last
   * listing answered (none while one loads, or when it failed), and why the
   * last document insert from the Library was refused.
   */
  const libraryFiles = signal<readonly string[]>([]);
  const libraryError = signal('');
  // Every caller passes a changed document (edits clone; moves are checked
  // against isMovable first).
  const commit = (next: ViewDocument) => {
    history.record(doc.value);
    doc.value = ownFilledFields(next, viewCatalog);
    fieldErrors.value = {};
    editNotice.value = null;
    historyVersion.value += 1;
  };

  /**
   * The contract later exports compare against (the last export, or a
   * module chosen with Compare), and the latest report about it.
   */
  /** The last export's contract and how the one before it changed. */
  const lastExport = signal<
    { contract?: ViewContract; report: ExportReport } | undefined
  >(undefined);
  const documentSize = signal(280);
  const inspectorSize = signal(300);
  const documentCollapsed = signal(false);
  const inspectorCollapsed = signal(false);

  /** Outline nodes the author closed; everything else starts open. */
  const collapsed = signal<ReadonlySet<string>>(new Set());

  const select = (next: Selection) => {
    selection.value = next;
    // A field editor belongs to the node it opened on (KF-Z9S029).
    if (next?.kind !== 'node' || next.id !== openField.value?.node)
      openField.value = null;
    // A node chosen elsewhere (the canvas, a problem) shows in the outline.
    if (next?.kind !== 'node' && next?.kind !== 'slot') return;
    const visit = findNode(
      doc.value,
      next.kind === 'node' ? next.id : next.address.parent,
    )!;
    const path =
      next.kind === 'node'
        ? visit.ancestors
        : [...visit.ancestors, { node: visit.node, zone: next.address.zone }];
    if (path.some(({ node }) => collapsed.value.has(node.id))) {
      const open = new Set(collapsed.value);
      for (const { node } of path) open.delete(node.id);
      collapsed.value = open;
    }
  };

  /** The selected node's id, while it is a node of the document. */
  const selectedNodeId = () => {
    const current = selection.value;
    return current?.kind === 'node' && findNode(doc.value, current.id)
      ? current.id
      : undefined;
  };
  /** The state most regions read (KF-N0CSVT: editor-context.ts). */
  const ctx: EditorContext = {
    catalog,
    doc,
    commit,
    selection,
    select,
    selectedNodeId,
    fieldErrors,
    currentProblems,
    inspectorArea,
    definitionsOf,
    propsEntryOf,
    resolveView,
    autosave,
  };

  const outline = (
    document: ViewDocument,
    counts: ReadonlyMap<string, number>,
  ) => {
    const current = selection.value;
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
        // KF-WXP6AB, KF-5RKX3W: a node directly in a zone, or a slot,
        // drags to another place.
        ...(slotRowAddress(node.id) || isMovable(document, node.id).placed
          ? { draggable: true }
          : {}),
        ...(node.children ? { children: toTree(node.children) } : {}),
      }));
    const tree = outlineTree(document, componentNames);
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
  };

  /**
   * The palette's groups, narrowed to components whose name or category
   * holds the filter text (KF-Y26SKM); a group with no match is left out.
   */
  const paletteMatches = () => {
    const query = paletteFilter.value.trim().toLocaleLowerCase();
    const holds = (text: string) => text.toLocaleLowerCase().includes(query);
    return catalog
      .paletteGroups()
      .map((group) => ({
        ...group,
        items: holds(group.category)
          ? group.items
          : group.items.filter((item) => holds(item.name)),
      }))
      .filter((group) => group.items.length);
  };

  const paletteSelected = (key: string) =>
    selection.value?.kind === 'component' && selection.value.key === key;

  // KF-K2VP9A / KF-YR81M0: each category is its own List under a default
  // ListHeader, spaced apart as the catalog's sidebar sections are.
  // KF-JC7WTW: in the grid view each category's components are tiles, each
  // showing its component as added (`wirePaletteThumbnails` draws them),
  // or its icon when it shows nothing until opened.
  const palette = (
    groups: ReturnType<typeof paletteMatches>,
    documents: readonly string[],
  ) => (
    <List gap="m">
      {groups.map((group) => (
        <List>
          <ListHeader label={group.category} />
          {paletteView.value === 'grid' ? (
            <Grid minColumnWidth={px(96)} autoFill gap="xs">
              {group.items.map((item) => (
                <ContentItem
                  interactive
                  action={PALETTE_ACTION}
                  itemId={item.key}
                  selectionMode="single"
                  selected={paletteSelected(item.key)}
                  ariaLabel={item.name}
                  title={item.name}
                  frame="framed"
                  // KF-78MHM8: a tile drags onto the canvas to add one.
                  rootAttributes={{
                    'data-editor-palette': item.key,
                    'data-key': item.key,
                  }}
                >
                  {paletteSketch(item.key) || PALETTE_ICONS[item.key] ? (
                    <div class="kui-editor__palette-thumb" aria-hidden="true">
                      {PALETTE_ICONS[item.key] ? (
                        <LucideIcon
                          icon={PALETTE_ICONS[item.key]!}
                          name="component"
                        />
                      ) : (
                        raw(paletteSketch(item.key)!)
                      )}
                    </div>
                  ) : (
                    <div
                      class="kui-editor__palette-thumb"
                      {...{ [HOOK.paletteThumb]: item.key }}
                      data-morph-skip
                      aria-hidden="true"
                      inert
                    >
                      <LucideIcon icon={Component} name="component" />
                    </div>
                  )}
                  <Text variant="span" size="compact" maxLines={1}>
                    {item.name}
                  </Text>
                </ContentItem>
              ))}
            </Grid>
          ) : (
            group.items.map((item) => (
              <ListItem
                action={PALETTE_ACTION}
                itemId={item.key}
                label={item.name}
                // KF-78MHM8: a palette row drags onto the canvas to add one.
                rootAttributes={{ 'data-editor-palette': item.key }}
                selected={paletteSelected(item.key)}
              />
            ))
          )}
        </List>
      ))}
      {documents.length ? libraryDocumentGroup(documents) : undefined}
    </List>
  );

  /**
   * KF-FXACB5: the Library's Documents group, after the components: each
   * project document as a row led by its file name over its folder (as
   * Insert Document lists them), or as a tile with a file icon (no live
   * thumbnail). A click inserts it as a `#view`; it drags like a component.
   */
  const libraryDocumentGroup = (documents: readonly string[]) => (
    <List>
      <ListHeader label={LIBRARY_DOCUMENTS} />
      {paletteView.value === 'grid' ? (
        <Grid minColumnWidth={px(96)} autoFill gap="xs">
          {documents.map((path) => (
            <ContentItem
              interactive
              action={PALETTE_DOCUMENT_ACTION}
              itemId={path}
              ariaLabel={path}
              title={path}
              frame="framed"
              rootAttributes={{
                'data-editor-palette-document': path,
                'data-key': `document:${path}`,
              }}
            >
              <div class="kui-editor__palette-thumb" aria-hidden="true">
                <LucideIcon icon={FileText} name="file-text" />
              </div>
              <Text variant="span" size="compact" maxLines={1}>
                {documentName(path)}
              </Text>
            </ContentItem>
          ))}
        </Grid>
      ) : (
        documents.map((path) => (
          <ListItem
            action={PALETTE_DOCUMENT_ACTION}
            label={documentName(path)}
            description={documentFolder(path)}
            accessibleLabel={path}
            title={path}
            rootAttributes={{ 'data-editor-palette-document': path }}
          />
        ))
      )}
    </List>
  );

  /**
   * A segmented strip of tabs `areas` under strip `id`, then one tabpanel per
   * area with only the current one shown. Hidden panels stay rendered, so
   * their fields keep their state while another area shows.
   */
  const areaTabs = <Area extends string>(
    id: string,
    label: string,
    action: string,
    current: Area,
    allocation: 'fill' | 'intrinsic',
    areas: readonly {
      area: Area;
      name: string;
      trailing?: SafeHtml;
      panel: unknown;
    }[],
  ) => [
    <TabBar
      id={id}
      label={label}
      presentation="segmented"
      // KF-YBD6XJ: a narrow rail's strip is rounded, not a pill.
      shape="rounded"
      allocation={allocation}
    >
      {areas.map(({ area, name, trailing }) => (
        <TabBarItem
          id={`${id}-${area}`}
          name={name}
          selected={area === current}
          closable={false}
          presentation="segmented"
          size="compact"
          selectAction={action}
          tabId={`${id}-${area}-tab`}
          panelId={`${id}-${area}-panel`}
          trailing={trailing}
        />
      ))}
    </TabBar>,
    ...areas.map(({ area, panel }) => (
      <div
        role="tabpanel"
        id={`${id}-${area}-panel`}
        aria-labelledby={`${id}-${area}-tab`}
        hidden={area !== current}
      >
        {panel as SafeHtml}
      </div>
    )),
  ];

  /**
   * The Inspector's body for the selection, and for a node the chrome pinned
   * above it (KF-5QXNWS).
   */
  const inspector = (
    document: ViewDocument,
  ): { header?: SafeHtml; content: SafeHtml } => {
    const current = selection.value;
    if (current?.kind === 'slot') {
      return {
        content: slotAt(document, current.address) ? (
          slotEditor(document, viewCatalog, current.address)
        ) : (
          <EmptyState
            title="Nothing selected"
            detail="Select a node on the canvas or in the outline to inspect its props."
          />
        ),
      };
    }
    const visit =
      current?.kind === 'node' ? findNode(document, current.id) : undefined;
    const key = visit
      ? visit.node.type
      : current?.kind === 'component'
        ? current.key
        : undefined;
    const component = key ? propsByKey.get(key) : undefined;
    if (!current || (current.kind === 'node' && !visit)) {
      return {
        content: (
          <EmptyState
            title="Nothing selected"
            detail="Select a node on the canvas or in the outline to inspect its props."
          />
        ),
      };
    }
    const title = visit
      ? nodeTitle(visit.node, componentNames)
      : componentNames.get(key!)!;
    // KF-YBMVVM: a text run beside nodes in a zone edits its text here.
    if (visit?.node.type === TEXT_RUN)
      return {
        content: (
          <List>
            <ListHeader label={title} />
            <List controlInsets="trbl">
              <TextField
                label="Text"
                value={(visit.node as { value: string }).value}
                hint="A run of text beside the other nodes in its zone."
                rootAttributes={{ 'data-editor-text-run': visit.node.id }}
              />
            </List>
          </List>
        ),
      };
    // KF-5N26H6: a composed document's props are its params.
    if (visit?.node.type === '#view') return viewEditor(visit.node, title);
    if (!component) {
      return {
        content: (
          <List>
            <ListHeader label={title} />
            <Text>This node has no props to inspect.</Text>
          </List>
        ),
      };
    }
    if (visit) return nodeEditor(visit.node, component, title);
    return {
      content: (
        <List>
          <ListHeader
            label={title}
            count={component.props.length}
            countLabel="props"
          />
          {inspectorSections(undefined, component).map((section) => [
            <ListHeader label={section.title} size="xs" />,
            <ValueTable label={`${title} ${section.title}`} density="compact">
              {section.rows.map((row) => (
                <ValueTableRow label={row.name} value={row.value} />
              ))}
            </ValueTable>,
          ])}
        </List>
      ),
    };
  };

  const { propControl, configureRow, iconOf, iconRow } =
    createInspectorControls(ctx, { fieldProblems, customSize });

  /**
   * The icon picker: a search over the Lucide names and the matching icons
   * themselves; choosing one writes `{ $icon: name }`.
   */
  const iconDialog = createIconDialog(ctx, {
    iconPicker,
    iconQuery,
    iconQueryRevision,
    iconOf,
  });

  const {
    fieldContext,
    opensEditor,
    stepLabel,
    fieldStep,
    isParamOrBind,
    inspectorRuns,
    customFor,
    editorContext,
  } = createFieldEditorViews(ctx, {
    propControl,
    configureRow,
    iconRow,
    nodeContentRow: (...args) => nodeContentRow(...args),
    writeField: (...args) => writeField(...args),
    bindField,
    jsonSteps,
    fieldEditors: options.fieldEditors,
  });

  const { activeField, fieldViews, fieldDialog } = createFieldEditorShell(
    ctx,
    openField,
    { stepLabel, fieldStep },
  );

  /**
   * A text-accepting content prop (KF-YR91FA): its text field with Use as
   * nodes, or, while its zone holds nodes, a note with Use as text when
   * those nodes are one text run. Undefined for every other prop.
   */
  /**
   * The one component a zone of `node` calls for, if any: the first its name
   * suggests.
   */
  const suggestionFor = (node: ViewNode, zone: string) => {
    const keys = addableIn(
      zonesOf(node, zone).find((option) => option.key === zone),
    ).map((choice) => choice.value);
    return suggestedComponents(zone, keys)[0];
  };

  /**
   * A content prop that takes only nodes (a Button's `icon`), as a row
   * (KF-5T3TE4): Add puts the zone's suggested component there; once
   * filled, the row names what fills it and selects it. A content field
   * inside a prop value (KF-VSWT2Q) passes its field zone and own label.
   */
  const nodeContentRow = (
    node: ViewNode,
    prop: string,
    label = propLabel(prop),
    /** What an empty row says it holds (KF-1ZSW5J: an item slot). */
    unset = 'Not set',
  ) => {
    const entries = node.zones?.[prop] ?? [];
    const children = entries.filter(
      (child): child is ViewNode => 'id' in child && 'type' in child,
    );
    if (!entries.length) {
      const suggestion = suggestionFor(node, prop);
      const adds = suggestion && componentNames.get(suggestion);
      return (
        <ListItem
          label={label}
          status={unset}
          accessibleLabel={
            adds
              ? `Add ${adds} to ${label.toLowerCase()}`
              : `Add to ${label.toLowerCase()}`
          }
          action={CONTENT_ADD_ACTION}
          trailing={<LucideIcon icon={Plus} name="plus" />}
          rootAttributes={{ 'data-editor-content-add': prop }}
        />
      );
    }
    const first = children[0];
    const icon = (first?.props?.icon as { $icon?: string } | undefined)?.$icon;
    return (
      <ListItem
        label={label}
        status={
          entries.length > 1 || !first
            ? `${entries.length} ${entries.length === 1 ? 'item' : 'items'}`
            : `${first.name ?? nodeTitle(first, componentNames)}${icon ? ` · ${icon}` : ''}`
        }
        icon={icon ? iconOf(icon) : undefined}
        accessibleLabel={`Select ${label.toLowerCase()}`}
        action={OUTLINE_ACTION}
        itemId={first?.id ?? node.id}
        trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
        rootAttributes={{ 'data-editor-content-node': prop }}
      />
    );
  };

  const contentControl = (
    node: ViewNode,
    prop: (typeof propsByKey extends ReadonlyMap<string, infer C>
      ? C
      : never)['props'][number],
  ) => {
    if (!prop.slot) return undefined;
    // Node-only content is a row of its own (nodeContentRow) or the outline's.
    if (!(prop.type as { acceptsText?: true }).acceptsText) return undefined;
    const content = contentOf(node, prop.name);
    const attributes = { 'data-editor-content': prop.name };
    if (content.kind !== 'nodes') {
      const field = propControl(
        prop,
        node.props?.[prop.name] as never,
        node.type,
      );
      return content.kind === 'text' ? (
        <>
          {field}
          <Button
            emphasis="secondary"
            size="compact"
            action={CONTENT_TO_NODES_ACTION}
            rootAttributes={attributes}
          >
            Use as nodes
          </Button>
        </>
      ) : (
        field
      );
    }
    return (
      <>
        <TextField
          label={propLabel(prop.name)}
          value={content.text ?? ''}
          disabled
          hint={`Holds ${content.count} ${content.count === 1 ? 'node' : 'nodes'}; select ${content.count === 1 ? 'it' : 'them'} in the outline.`}
        />
        {content.text !== undefined ? (
          <Button
            emphasis="secondary"
            size="compact"
            action={CONTENT_TO_TEXT_ACTION}
            rootAttributes={attributes}
          >
            Use as text
          </Button>
        ) : undefined}
      </>
    );
  };

  /**
   * Whether the selected node or slot can move up, down, or be removed;
   * undefined with nothing that moves selected (KF-5RKX3W: slots move too).
   */
  const selectedMovable = (document: ViewDocument) => {
    const current = selection.value;
    if (current?.kind === 'node')
      return findNode(document, current.id)
        ? isMovable(document, current.id)
        : undefined;
    if (current?.kind !== 'slot' || !slotAt(document, current.address))
      return undefined;
    const { parent, zone, index } = current.address;
    const count = findNode(document, parent)!.node.zones![zone]!.length;
    return {
      up: index > 0,
      down: index < count - 1,
      remove: true,
      placed: true,
    };
  };

  /**
   * Show this view (KF-RMZ2NP): a NavStack's views, the one the canvas shows
   * marked; choosing another previews the stack cut back to it. The canvas
   * shows the top view until one is chosen; the document never changes.
   */
  const viewsSection = (node: ViewNode) => {
    const views = node.props?.views;
    if (node.type !== '@kerfjs/ui:nav-stack' || !Array.isArray(views))
      return undefined;
    const top = views.length - 1;
    // A choice past the top (views removed since) shows the top.
    const current = Math.min(canvasViews.value.get(node.id) ?? top, top);
    return (
      <List rootAttributes={{ 'data-editor-shown-view': String(current) }}>
        <ListHeader label="Shown on the canvas" size="xs" />
        {views.map((view, index) => {
          // Each view's key is a required string, its name in the stack.
          const { key } = view as { key: string };
          return (
            <ListItem
              label={key}
              description={index === top ? 'Top view' : undefined}
              action={SHOW_VIEW_ACTION}
              itemId={`view-${index}`}
              selected={index === current}
              rootAttributes={{
                'data-editor-show-view': JSON.stringify({
                  id: node.id,
                  index,
                }),
              }}
            />
          );
        })}
      </List>
    );
  };

  /**
   * KF-D9P3NP: why node `id` cannot be extracted to a document of its own:
   * the editor has no storage to save it in, or the node cannot leave.
   */
  const extractBlocked = (id: string) =>
    autosave
      ? extractProblem(doc.value, id)
      : 'Extracting saves a new document, which needs the editor’s storage.';

  /**
   * The node context menu (KF-JV7XW1), opened at the pointer on an Outline
   * row or a canvas element, or from the keyboard: Embed in with the Flow
   * area's entries and legality, then the node commands the Inspector has.
   * It acts on the selected node, which opening it selects.
   */
  const contextMenu = () => {
    return nodeContextMenu(ctx, { embedFirstLegal, extractBlocked });
  };

  /** Move and delete controls for the selected node, when it can move. */
  const nodeActions = (document: ViewDocument) => {
    const movable = selectedMovable(document);
    if (!movable) return undefined;
    return (
      <ToolbarControlGroup label="Node" appearance="borderless">
        <button
          type="button"
          aria-label="Move up"
          data-action={MOVE_UP_ACTION}
          disabled={!movable.up}
        >
          <LucideIcon icon={ArrowUp} name="arrow-up" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          data-action={MOVE_DOWN_ACTION}
          disabled={!movable.down}
        >
          <LucideIcon icon={ArrowDown} name="arrow-down" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          data-action={DELETE_ACTION}
          disabled={!movable.remove}
        >
          <LucideIcon icon={Trash} name="trash" />
        </button>
      </ToolbarControlGroup>
    );
  };

  /**
   * Applies a legal drag move from the outline or the canvas and keeps the
   * moved node or slot selected.
   */
  /** The id a palette drag of component `key` carries. */
  const PALETTE_SOURCE = 'component:';
  /** KF-FXACB5: the id a Library drag of the document at `path` carries. */
  const DOCUMENT_SOURCE = 'document:';
  /** Whether a drag carries new content from the Library, not a node. */
  const fromLibrary = (sourceId: string) =>
    sourceId.startsWith(PALETTE_SOURCE) || sourceId.startsWith(DOCUMENT_SOURCE);
  /** The Library document a drag carries, if it carries one. */
  const documentSource = (sourceId: string) =>
    sourceId.startsWith(DOCUMENT_SOURCE)
      ? sourceId.slice(DOCUMENT_SOURCE.length)
      : undefined;
  /**
   * KF-FXACB5: each Library document's read, started once per listing, and
   * its answer once it came: the document, or why it cannot be inserted.
   */
  let libraryReads = new Map<string, Promise<LibraryRead>>();
  const libraryAnswers = new Map<string, LibraryRead>();
  const readLibraryDocument = (path: string): Promise<LibraryRead> => {
    let read = libraryReads.get(path);
    if (!read) {
      read = options
        .storage!.read(path)
        .then(
          (text): LibraryRead => {
            if (text === undefined) return { problem: `There is no ${path}.` };
            const parsed = parseDocument(text);
            if (!parsed.ok) return { problem: parsed.error };
            const problem = insertProblem(parsed.document);
            return problem ? { problem } : { document: parsed.document };
          },
          (error: unknown) => ({
            problem: error instanceof Error ? error.message : String(error),
          }),
        )
        .then((answer) => {
          libraryAnswers.set(path, answer);
          return answer;
        });
      libraryReads.set(path, read);
    }
    return read;
  };
  /** Why a drag's Library document cannot go anywhere, once it was read. */
  const sourceProblem = (sourceId: string) => {
    const path = documentSource(sourceId);
    const answer = path === undefined ? undefined : libraryAnswers.get(path);
    return answer && 'problem' in answer ? answer.problem : undefined;
  };
  /** A loaded document `#view` nodes compose, so the canvas shows it. */
  const showDocument = (path: string, document: ViewDocument) => {
    viewLoads.value = new Map(viewLoads.peek()).set(path, {
      state: 'loaded',
      document,
    });
  };
  const CHANGED_MEANWHILE = 'The document changed meanwhile; insert it again.';
  const {
    applyMove,
    askDrop,
    canvasNode,
    canvasZones,
    commitReplace,
    dropCaption,
    dropChoices,
    dropChoicesFor,
    dropFor,
    dropRefusal,
    library,
    moveOrAsk,
    pendingReplace,
    replaceMove,
    rowLabel,
    springTabs,
    zoneKeys,
  } = createLibraryDrag(ctx, {
    CHANGED_MEANWHILE,
    PALETTE_SOURCE,
    asRoot,
    documentArea,
    documentSource,
    emptyDocument,
    fromLibrary,
    libraryAnswers,
    readLibraryDocument,
    refuseLibrary: (...args) => refuseLibrary(...args),
    seededNode: (...args) => seededNode(...args),
    showDocument,
    sourceProblem,
    zonesOf: (...args) => zonesOf(...args),
  });
  const { dropMenu, replaceDialog } = createDropViews({
    dropChoices,
    pendingReplace,
    rowLabel,
  });

  /** Moves a node into another zone: the keyboard alternative to dragging. */
  const moveSection = (node: ViewNode) => {
    const destinations = moveDestinations(
      doc.value,
      viewCatalog,
      node.id,
      zoneKeys,
      (item) => nodeTitle(item, componentNames),
    );
    if (!destinations.length) return undefined;
    return (
      <>
        <ListHeader label="Move to" size="xs" />
        <List controlInsets="trbl" gap>
          <Select
            name="move-to"
            label="Zone"
            value=""
            choices={[
              { value: '', label: 'Choose a zone' },
              ...destinations.map((destination) => ({
                value: JSON.stringify({
                  parent: destination.parent,
                  zone: destination.zone,
                }),
                label: destination.label,
              })),
            ]}
            hint="Moves this node to the end of another zone. Drag it in the outline to place it exactly."
            rootAttributes={{ 'data-editor-move': 'true' }}
          />
        </List>
      </>
    );
  };

  /** The zones a node offers for adding a child. */
  const zonesOf = (
    node: ViewNode,
    /**
     * A content field the person asked to add to ("Add to trailing"), a
     * zone even before the objects around it are set (KF-KAVBDD).
     */
    wanted?: string,
  ) => {
    const props = propsByKey.get(node.type)?.props ?? [];
    const zones = legalZones(
      node,
      viewCatalog.entries.get(node.type) as Parameters<typeof legalZones>[1],
      props,
      new Set(viewCatalog.components.keys()),
    );
    // KF-PD6QC5: content fields inside the props it sets (a rail's content,
    // a toolbar's title) take nodes too.
    const fields = fieldZoneKeys(node, props, definitionsOf(node.type))
      .filter((key) => !zones.some((zone) => zone.key === key))
      .map((key): ZoneOption => ({ key }));
    const asked: ZoneOption[] =
      wanted &&
      ![...zones, ...fields].some((zone) => zone.key === wanted) &&
      isFieldZoneKey(node, props, definitionsOf(node.type), wanted)
        ? [{ key: wanted }]
        : [];
    return [...zones, ...fields, ...asked];
  };

  /** Each placeable component's palette category, in palette order. */
  const categories = new Map(
    catalog
      .paletteGroups()
      .flatMap((group) =>
        group.items.map((item) => [item.key, group.category]),
      ),
  );

  /**
   * The components a zone takes, as Select choices: the ones its name
   * suggests first, under Suggested (KF-N8TW04), then the rest by palette
   * category.
   */
  const addableIn = (
    zone:
      | { readonly key?: string; readonly accepts?: readonly string[] }
      | undefined,
    /** The node the zone belongs to; its cataloged children come first. */
    parent?: string,
  ) => {
    const keys = [...propsByKey.values()]
      .filter(
        (candidate) =>
          // Kerf UI's and an application's own components; Web Awesome
          // elements are placed through their Kerf wrappers.
          candidate.source !== 'webawesome' &&
          (!zone?.accepts || zone.accepts.includes(candidate.key)),
      )
      .map((candidate) => candidate.key);
    const suggested = [
      ...new Set([
        // KF-7BB55F: a ToolbarControlGroup's ToolbarButton.
        ...(parent
          ? childrenOf(parent).filter((key) => keys.includes(key))
          : []),
        ...(zone?.key ? suggestedComponents(zone.key, keys) : []),
      ]),
    ];
    const order = [...categories.keys()];
    const rank = (key: string) =>
      order.includes(key) ? order.indexOf(key) : order.length;
    const rest = keys
      .filter((key) => !suggested.includes(key))
      .sort((a, b) => rank(a) - rank(b));
    const group = (key: string) =>
      suggested.length || categories.size
        ? {
            group: suggested.includes(key)
              ? 'Suggested'
              : (categories.get(key) ?? 'Other'),
          }
        : {};
    return [...suggested, ...rest].map((key) => ({
      value: key,
      label: componentNames.get(key)!,
      ...group(key),
    }));
  };

  /**
   * A rootless document's canvas (KF-PK3GVY): asks for the first component,
   * which becomes the root, from a picker (a Pane first) or a palette drop.
   */
  const firstRoot = () => {
    const choices = addableIn(undefined);
    const value = choices.some((item) => item.value === rootComponent.value)
      ? rootComponent.value
      : (choices.find((item) => item.value === PANE) ?? choices[0]!).value;
    return (
      <EmptyState
        title="Start with a component"
        detail="The component you add becomes the root of the document. You can also drag one here from the Library."
        action={
          <List controlInsets="trbl" gap>
            <Select
              name="first-root-component"
              label="Component"
              value={value}
              choices={choices}
              rootAttributes={{ 'data-editor-root': 'component' }}
            />
            <Button
              emphasis="primary"
              size="compact"
              action={FIRST_ROOT_ACTION}
            >
              Add
            </Button>
          </List>
        }
        rootAttributes={{ [HOOK.empty]: ROOT_EMPTY }}
      />
    );
  };

  /**
   * Replace the root (KF-KWQVDJ): start the document from another component,
   * such as a NavStack, which needs to be the root to fill the view.
   */
  const replaceRootSection = () => {
    const choices = addableIn(undefined);
    const value = choices.some((item) => item.value === rootComponent.value)
      ? rootComponent.value
      : choices[0]!.value;
    return (
      <>
        <ListHeader label="Replace the root" size="xs" />
        <List controlInsets="trbl" gap>
          <Select
            name="root-component"
            label="Component"
            value={value}
            choices={choices}
            hint="Replaces everything in the document. Undo restores it."
            rootAttributes={{ 'data-editor-root': 'component' }}
          />
          <Button
            emphasis="secondary"
            size="compact"
            action={REPLACE_ROOT_ACTION}
          >
            Replace
          </Button>
        </List>
      </>
    );
  };

  /**
   * The node's data attributes (KF-65FTKX): its `rootAttributes` as name and
   * value fields, limited to unreserved `data-*` names, with Add and Remove.
   * Undefined for a component without the channel; a bound value reads as
   * its binding.
   */
  /** Applies one data attribute edit to the selected node (KF-65FTKX). */
  const editDataAttribute = (edit: DataAttributeEdit) => {
    const id = selectedNodeId()!;
    const node = findNode(doc.value, id)!.node;
    const attributes = dataAttributes(
      node.props?.[DATA_ATTRIBUTES_PROP] as ViewValue | undefined,
    )!;
    if (edit.kind === 'name') {
      const prop = propsByKey
        .get(node.type)!
        .props.find((item) => item.name === DATA_ATTRIBUTES_PROP)!;
      const error = dataAttributeNameError(
        edit.name,
        attributes,
        edit.index,
        protectedDataAttributes(prop.type as never, definitionsOf(node.type)),
      );
      const key = `#data-attribute-${edit.index}`;
      if (error) {
        fieldErrors.value = { ...fieldErrors.value, [key]: error };
        return;
      }
      if (fieldErrors.value[key]) fieldErrors.value = {};
      if (attributes[edit.index]![0] === edit.name) return;
    }
    if (edit.kind === 'value' && attributes[edit.index]![1] === edit.value)
      return;
    // Indexes shift on a remove, so a stale name error goes with it.
    if (edit.kind === 'remove') fieldErrors.value = {};
    commit(
      setProp(
        doc.value,
        id,
        DATA_ATTRIBUTES_PROP,
        editDataAttributes(attributes, edit),
      ),
    );
  };

  /** The canvas: the previewed document under the selection highlight. */
  /**
   * The canvas preview, rendered and checked by `contained` in an effect,
   * outside the editor's render pass, whenever the document changes; the
   * render only reads it. The effect lives as long as the editor.
   */
  const preview = signal<SafeHtml | undefined>(undefined);
  effect(() => {
    const current = selection.value;
    preview.value = contained(
      canvasContent(
        doc.value,
        currentProblems.value,
        current?.kind === 'node' ? current.id : undefined,
        canvasViews.value,
        false,
        undefined,
        undefined,
        activeField() ?? undefined,
      ),
    );
  });

  const canvas = () => (
    <div class="kui-editor__canvas" {...{ [HOOK.canvas]: true }}>
      {doc.value.root ? preview.value : firstRoot()}
      <div
        class="kui-editor__selection"
        data-morph-skip
        aria-hidden="true"
        hidden
      />
      {/* KF-WKABP2: a container's zones while a drag rests over it. */}
      <div
        class="kui-editor__zone-ghosts"
        data-morph-skip
        aria-hidden="true"
        hidden
      />
      <div class="kui-editor__drop" data-morph-skip aria-hidden="true" hidden />
      {/* KF-Y4GHQV: the drag's caption and dimmed source. */}
      <div
        class="kui-editor__drop-caption"
        data-morph-skip
        aria-hidden="true"
        hidden
      />
      <div
        class="kui-editor__drag-source"
        data-morph-skip
        aria-hidden="true"
        hidden
      />
    </div>
  );

  /**
   * KF-Y4GHQV: the chip naming what is dragged, which follows the pointer.
   * KF-23EBGS: it renders outside the panes, so it draws over the rails too
   * (a pane clips it in WebKit) while a drag heads for a spring tab or the
   * outline.
   */
  // KF-Z54E4H: a manual popover, shown in the top layer while a drag
  // lasts, so it also draws over the open Library.
  const dragChip = () => (
    <div
      class="kui-editor__drag-chip"
      data-morph-skip
      aria-hidden="true"
      popover="manual"
      hidden
    />
  );

  /**
   * KF-Z54E4H: the component Library, Xcode style: a popover below the
   * Preview toolbar's Library button that closes after a drop unless pinned
   * or Option is held. Its filter stays above the scrolling palette.
   */
  const libraryPopover = () => {
    const groups = paletteMatches();
    const documents = libraryDocuments(libraryFiles.value, paletteFilter.value);
    return (
      <PinnablePopoverSurface
        id={LIBRARY_ID}
        label="Library"
        size="small"
        height={px(560)}
        bodyLayout="fill-last"
        headerActions={
          // KF-JC7WTW: a list of names, or a grid of thumbnails.
          <SegmentedControl
            id="editor-palette-view"
            label="Component View"
            value={paletteView.value}
            action={PALETTE_VIEW_ACTION}
            choices={[
              {
                value: 'list',
                label: 'List',
                title: 'List',
                content: <LucideIcon icon={ListIcon} name="list" />,
              },
              {
                value: 'grid',
                label: 'Grid',
                title: 'Grid',
                content: <LucideIcon icon={LayoutGrid} name="layout-grid" />,
              },
            ]}
          />
        }
        rootAttributes={{ 'data-editor-library': '' }}
      >
        <List controlInsets="trbl" gap>
          <SearchField
            id="editor-palette-filter"
            label="Filter Components"
            placeholder="Filter"
            query={paletteFilter.value}
            revision={paletteFilterRevision.value}
            clearAction={PALETTE_CLEAR_ACTION}
            clearLabel="Clear Filter"
            editorAttributes={{ 'data-editor-palette-filter': '' }}
          />
          {libraryError.value ? (
            <StateBanner
              tone="danger"
              title="That document cannot be inserted"
              detail={libraryError.value}
              rootAttributes={{ 'data-editor-library-error': '' }}
            />
          ) : undefined}
        </List>
        <List scrollable flex>
          {groups.length || documents.length ? (
            palette(groups, documents)
          ) : (
            <EmptyState
              title="No matching components"
              detail="No component name or category holds that text."
            />
          )}
        </List>
      </PinnablePopoverSurface>
    );
  };

  /**
   * Shows `document` as a fresh session: no history or selection. With
   * storage it becomes the file at `path`, or a new draft saved right away.
   */
  const load = (document: ViewDocument, path?: string) =>
    // One batch, so the composed-document loader sees the new path with the
    // new document, never the old path's folder.
    batch(() => {
      doc.value = document;
      history.clear();
      historyVersion.value += 1;
      selection.value = null;
      loadError.value = null;
      // KF-5N26H6: composed documents load again for this one, and a
      // document opened any other way leaves the Open document trail.
      viewLoads.value = new Map();
      viewTrail.value = [];
      if (!autosave) return;
      const text = fileText(document);
      if (path) autosave.adopt(path, text);
      else void autosave.create(draftPath(newNodeId()), text);
    });

  /**
   * KF-5N26H6: Open document. Saves the composing document's pending change,
   * opens the selected `#view`'s document from where it loaded, and
   * remembers the way back.
   */
  const openView = async () => {
    // The row is enabled only once the selected `#view`'s document loaded,
    // which needs storage.
    const saver = autosave!;
    const id = selectedNodeId()!;
    const src = findNode(doc.value, id)!.node.src!;
    const from = saver.path.peek();
    const composed = resolveView(src)!;
    const trail = viewTrail.peek();
    await saver.flush();
    load(composed, viewPath(from, src));
    viewTrail.value = [...trail, { path: from, node: id }];
  };

  /**
   * KF-5N26H6: Back. Saves the composed document, then reopens the document
   * it was opened from, from storage, with its `#view` selected again.
   */
  const viewBack = async () => {
    const saver = autosave!;
    const trail = viewTrail.peek();
    const { path, node } = trail.at(-1)!;
    await saver.flush();
    let text: string | undefined;
    try {
      text = await options.storage!.read(path);
    } catch (error) {
      loadError.value = (error as Error).message;
      return;
    }
    const parsed =
      text === undefined
        ? { ok: false as const, error: `There is no ${path}.` }
        : parseDocument(text);
    if (!parsed.ok) {
      loadError.value = parsed.error;
      return;
    }
    load(parsed.document, path);
    viewTrail.value = trail.slice(0, -1);
    if (findNode(parsed.document, node)) select({ kind: 'node', id: node });
  };

  /** The Back control's label: the file Open document came from. */
  const backLabel = () => {
    const { path } = viewTrail.value.at(-1)!;
    return `Back to ${isDraft(path) ? 'Unsaved draft' : path.slice(path.lastIndexOf('/') + 1)}`;
  };

  /** The Preview header's file part: its name, or with storage its path and save state. */
  const fileState = (document: ViewDocument) => {
    if (!autosave) return documentFileName(document);
    const path = autosave.path.value;
    const name = isDraft(path) ? 'Unsaved draft' : path;
    switch (autosave.status.value) {
      case 'saving':
        return `${name} · saving…`;
      case 'failed':
        return `${name} · not saved: ${autosave.error.value}`;
      case 'saved':
        return isDraft(path) ? `${name} · autosaved` : `${name} · saved`;
    }
  };

  /** Save As: a project path for the document, where later changes save. */
  const saveAsDialog = (document: ViewDocument) => {
    const path = autosave!.path.value;
    return (
      <DialogSurface
        id={SAVE_AS_DIALOG}
        label="Save As"
        size="small"
        footer={
          <>
            <Button rootAttributes={{ 'data-dialog-close': '' }}>Cancel</Button>
            <Button
              tone="brand"
              action={SAVE_AS_ACTION}
              rootAttributes={{ 'data-editor-save-as': 'confirm' }}
            >
              Save
            </Button>
          </>
        }
      >
        <TextField
          label="Path"
          name="path"
          value={isDraft(path) ? documentFileName(document) : path}
          hint="A .kui.json file inside the project. Every later change saves there."
          error={saveAsError.value || undefined}
          spellcheck={false}
          autocapitalize="off"
          autocorrect="off"
          rootAttributes={{ 'data-editor-save-as': 'path' }}
        />
      </DialogSurface>
    );
  };

  /**
   * KF-D9P3NP: writes the selected node's subtree to a new document at the
   * dialog's path and puts a `#view` of it in its place, one undoable edit.
   * The file stays on Undo, as a Save As file does.
   */
  const extract = async (dialog: HTMLDialogElement) => {
    const saver = autosave!;
    const storage = options.storage!;
    const id = selectedNodeId()!;
    const from = saver.path.peek();
    const given = dialog
      .querySelector<HTMLInputElement>('[data-editor-extract="path"] input')!
      .value.trim();
    const path = viewPath('', given);
    const fail = (message: string) => {
      extractError.value = message;
    };
    if (!path?.endsWith('.kui.json') || isDraft(path))
      return fail(
        'Name a .kui.json file inside the project, outside the drafts folder.',
      );
    if (path === from) return fail('That is this document’s own file.');
    const before = doc.peek();
    const result = extractToDocument(before, id, {
      documentPath: from,
      path,
      view: newNodeId(),
      catalog: viewCatalog,
      resolveView,
    });
    if ('error' in result) return fail(result.error);
    try {
      if ((await storage.read(path)) !== undefined)
        return fail(`There is already a file at ${path}.`);
      await saver.flush();
      await storage.write(path, fileText(result.extracted));
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
    if (doc.peek() !== before)
      return fail('The document changed meanwhile; extract it again.');
    batch(() => {
      viewLoads.value = new Map(viewLoads.peek()).set(path, {
        state: 'loaded',
        document: result.extracted,
      });
      commit(result.document);
      select({ kind: 'node', id: result.view });
    });
    closeDialog(dialog);
  };

  /**
   * KF-PX5EVZ: Insert Document. With a storage that lists the project's
   * documents, a filter over them and a pick list; without one, a path.
   */
  const insertDialog = () =>
    insertDocumentDialog({
      listed: Boolean(options.storage!.list),
      files: insertFiles,
      query: insertQuery,
      queryRevision: insertQueryRevision,
      error: insertError,
    });

  /** Opens Insert Document for zone `zone` of node `id`. */
  const openInsertDialog = (id: string, zone: string) => {
    const root = wired!;
    const storage = options.storage!;
    const dialog = root.querySelector<HTMLDialogElement>(
      `#${INSERT_DOCUMENT_DIALOG}`,
    )!;
    insertTarget.value = { id, zone };
    insertError.value = '';
    insertQuery.value = '';
    insertQueryRevision.value += 1;
    if (!storage.list) {
      dialog.querySelector<HTMLInputElement>(
        '[data-editor-insert-document="path"] input',
      )!.value = '';
      openDialog(dialog);
      return;
    }
    // Only this opening's listing answers; a later opening replaces it.
    const loading = { state: 'loading' } as const;
    insertFiles.value = loading;
    const current = autosave!.path.peek();
    void storage.list().then(
      (paths) => {
        if (insertFiles.peek() === loading)
          insertFiles.value = {
            state: 'loaded',
            paths: insertableDocuments(paths, current),
          };
      },
      (error: unknown) => {
        if (insertFiles.peek() === loading)
          insertFiles.value = {
            state: 'failed',
            error: error instanceof Error ? error.message : String(error),
          };
      },
    );
    openDialog(dialog);
    root
      .querySelector<HTMLElement>('[data-editor-insert-document-search]')!
      .focus();
  };

  /**
   * KF-PX5EVZ: reads the document at `given`, then puts a `#view` of it in
   * the chosen zone as one undoable edit, selected, with the document
   * already loaded so the canvas shows it at once.
   */
  const insertDocument = async (dialog: HTMLDialogElement, given: string) => {
    const storage = options.storage!;
    const target = insertTarget.peek()!;
    const from = autosave!.path.peek();
    const path = viewPath('', given.trim());
    const fail = (message: string) => {
      insertError.value = message;
    };
    if (!path?.endsWith('.kui.json') || isDraft(path))
      return fail(
        'Name a .kui.json file inside the project, outside the drafts folder.',
      );
    if (path === from) return fail('That is this document’s own file.');
    const before = doc.peek();
    let text: string | undefined;
    try {
      text = await storage.read(path);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
    if (text === undefined) return fail(`There is no ${path}.`);
    const parsed = parseDocument(text);
    if (!parsed.ok) return fail(parsed.error);
    const problem = insertProblem(parsed.document);
    if (problem) return fail(problem);
    if (doc.peek() !== before)
      return fail('The document changed meanwhile; insert it again.');
    const node = insertedView(newNodeId(), from, path, parsed.document);
    // A content prop holds text or nodes, never both (KF-YR91FA). Add a
    // child offers zones only on a cataloged component.
    const parent = findNode(before, target.id)!.node;
    const base = propsByKey
      .get(parent.type)!
      .props.some((prop) => prop.name === target.zone && prop.slot)
      ? textToNodes(before, target.id, target.zone)
      : before;
    batch(() => {
      viewLoads.value = new Map(viewLoads.peek()).set(path, {
        state: 'loaded',
        document: parsed.document,
      });
      commit(insertNode(base, target.id, target.zone, node));
      select({ kind: 'node', id: node.id });
      inspectorArea.value = 'properties';
      insertTarget.value = null;
    });
    closeDialog(dialog);
  };

  /**
   * KF-60BEEJ: play mode's play bar and stage (docs/26-ui-editor.md §11.1).
   * The stage's iframe loads this page as a play page, which asks for the
   * document once it listens (wirePlay).
   */
  const playMode = () =>
    playStage.render(`${documentFileName(doc.value)} (playing)`);

  const render = () => {
    const document = doc.value;
    const nodes = outlineRows(document, componentNames).length;
    const problemList = currentProblems.value;
    const problems = problemList.length;
    const hintList = currentHints.value;
    const hints = hintList.length;
    const [documentStrip, ...documentPanels] = areaTabs(
      DOCUMENT_AREAS,
      'Document areas',
      DOCUMENT_TAB_ACTION,
      documentArea.value,
      // Names of different lengths: each tab takes its own width.
      'intrinsic',
      [
        {
          area: 'outline',
          name: 'Outline',
          // The tab names the area; the Preview header counts
          // its nodes.
          panel: <List>{outline(document, problemCounts(problemList))}</List>,
        },
        {
          area: 'problems',
          name: 'Problems',
          trailing: problems ? (
            <Badge
              tone="danger"
              label={`${problems} ${problems === 1 ? 'problem' : 'problems'}`}
            >
              {problems}
            </Badge>
          ) : hints ? (
            <Badge label={`${hints} ${hints === 1 ? 'hint' : 'hints'}`}>
              {hints}
            </Badge>
          ) : undefined,
          panel:
            problems || hints ? (
              <List gap="m">
                {problems ? <List>{problemRows(problemList)}</List> : undefined}
                {hints ? (
                  <List rootAttributes={{ 'data-editor-hints': '' }}>
                    <ListHeader
                      label="Hints"
                      count={hints}
                      countLabel={`${hints} ${hints === 1 ? 'hint' : 'hints'}`}
                    />
                    {hintRows(hintList)}
                  </List>
                ) : undefined}
              </List>
            ) : (
              <EmptyState title="No problems" detail="The document is valid." />
            ),
        },
      ],
    );
    return (
      <List fill rootAttributes={{ 'data-editor': 'kerf-ui-editor' }}>
        {/* KF-60BEEJ: hidden, not removed, while playing; keyed so the
            morph keeps it (and everything wired inside it) as it is. */}
        <div
          class="kui-editor__editing"
          data-key="editor-editing"
          hidden={playing.value}
        >
          <Toolbar
            label="Kerf UI Editor"
            safeAreaEdges={['block-start', 'inline-start', 'inline-end']}
            responsive="wrap"
            dividerSides="b"
            leading={<ToolbarText text="Kerf UI Editor" />}
            trailing={[
              <Button
                emphasis="plain"
                action={NEW_ACTION}
                icon={<LucideIcon icon={FilePlus} name="file-plus" />}
              >
                New
              </Button>,
              <FilePickerTrigger
                label="Open"
                accessibleLabel="Open a view document"
                accept=".json,application/json"
                pickerId="open-document"
                emphasis="plain"
                icon={<LucideIcon icon={FolderOpen} name="folder-open" />}
              />,
              <FilePickerTrigger
                label="Compare"
                accessibleLabel="Compare with an existing generated view module"
                accept=".ts,.js,text/javascript,text/typescript"
                pickerId="compare-module"
                emphasis="plain"
                icon={<LucideIcon icon={GitCompare} name="git-compare" />}
                disabled={problems > 0}
              />,
              <ToolbarControlGroup
                label="Export"
                appearance="borderless"
                single
                nestedDropdown
              >
                <PopupMenu
                  text="Export"
                  icon={<LucideIcon icon={FileCode} name="file-code" />}
                  placement="bottom-end"
                  items={[
                    // With storage the toolbar's Save As keeps the file; a
                    // download is then an export of a copy.
                    ...(autosave
                      ? [{ label: 'Document (.kui.json)', action: SAVE_ACTION }]
                      : []),
                    {
                      label: 'View module (.view.ts)',
                      action: EXPORT_MODULE_ACTION,
                      disabled: problems > 0,
                      disabledReason: 'Fix the problems first',
                    },
                    {
                      label: 'Declarations only (for interpretView)',
                      action: EXPORT_DECLARATIONS_ACTION,
                      disabled: problems > 0,
                      disabledReason: 'Fix the problems first',
                    },
                  ]}
                />
              </ToolbarControlGroup>,
              <Button
                emphasis="plain"
                action={autosave ? SAVE_AS_ACTION : SAVE_ACTION}
                icon={<LucideIcon icon={Save} name="save" />}
              >
                {autosave ? 'Save As…' : 'Save'}
              </Button>,
            ]}
          />
          {autosave ? saveAsDialog(document) : undefined}
          {autosave
            ? extractDialog({ path: extractPath, error: extractError })
            : undefined}
          {fieldDialog()}
          {iconDialog()}
          {embedDialog({
            catalog,
            target: embedTarget,
            query: embedQuery,
            queryRevision: embedQueryRevision,
            canEmbed: (id, key) => embedded(id, key) !== undefined,
          })}
          {autosave ? insertDialog() : undefined}
          {replaceDialog()}
          <List flex>
            <Workbench
              id={WORKBENCH_ID}
              label="Editor Panes"
              leftRail={{
                label: 'Document',
                size: documentSize.value,
                resizable: { min: 220, max: 420 },
                collapsed: documentCollapsed.value,
                toolbar: {
                  label: 'Document',
                  title: <ToolbarText text="Document" />,
                  toggle: { action: DOCUMENT_TOGGLE, name: 'Document' },
                },
                // KF-67K2VP: the strip stays pinned under the toolbar, so a
                // drag (or a click) reaches another area from anywhere in a
                // long panel.
                header: documentStrip,
                content: <List>{documentPanels}</List>,
              }}
              mainToolbar={{
                label: 'Canvas',
                // The previewed document draws its own title; the editor's main
                // toolbar names the region and the document's state instead.
                title: (
                  <ToolbarText
                    text="Preview"
                    description={`${fileState(document)} · ${nodes} ${nodes === 1 ? 'node' : 'nodes'} · ${problems === 0 ? 'valid' : `${problems} ${problems === 1 ? 'problem' : 'problems'}`}`}
                  />
                ),
                responsive: 'wrap',
                // KF-5N26H6: back to the document Open document came from.
                leading: viewTrail.value.length ? (
                  <Button
                    emphasis="plain"
                    action={VIEW_BACK_ACTION}
                    icon={<LucideIcon icon={ArrowLeft} name="arrow-left" />}
                  >
                    {backLabel()}
                  </Button>
                ) : undefined,
                trailing: [
                  // KF-Z54E4H: the component Library, as Xcode's + button.
                  <Button
                    emphasis="plain"
                    popoverTarget={LIBRARY_ID}
                    ariaHasPopup="dialog"
                    title={`Library (${isApplePlatform() ? '⇧⌘L' : 'Ctrl+Shift+L'})`}
                    icon={<LucideIcon icon={Plus} name="plus" />}
                    rootAttributes={{ 'data-editor-library-button': '' }}
                  >
                    Library
                  </Button>,
                  <ToolbarControlGroup
                    label="History"
                    appearance="borderless"
                    rootAttributes={{
                      'data-history': String(historyVersion.value),
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Undo"
                      data-action={UNDO_ACTION}
                      disabled={!history.canUndo}
                    >
                      <LucideIcon icon={Undo2} name="undo-2" />
                    </button>
                    <button
                      type="button"
                      aria-label="Redo"
                      data-action={REDO_ACTION}
                      disabled={!history.canRedo}
                    >
                      <LucideIcon icon={Redo2} name="redo-2" />
                    </button>
                  </ToolbarControlGroup>,
                  <Button
                    emphasis="plain"
                    action={PLAY_ACTION}
                    icon={<LucideIcon icon={Play} name="play" />}
                  >
                    Play
                  </Button>,
                ],
              }}
              mainHeader={
                editNotice.value ? (
                  <StateBanner tone="warning" title={editNotice.value} />
                ) : loadError.value ? (
                  <StateBanner
                    tone="danger"
                    title="That file could not be opened"
                    detail={loadError.value}
                  />
                ) : lastExport.value && !problems ? (
                  <StateBanner
                    tone={lastExport.value.report.breaking ? 'warning' : 'info'}
                    title={lastExport.value.report.title}
                    detail={lastExport.value.report.detail}
                  />
                ) : problems && document.root ? (
                  // KF-PK3GVY: a rootless document's canvas already says
                  // what it needs.
                  <StateBanner
                    tone="warning"
                    title={`${problems} ${problems === 1 ? 'problem' : 'problems'} in this document`}
                    detail="Each one is listed under Problems in the Document rail; select one to inspect its node."
                  />
                ) : undefined
              }
              main={canvas()}
              rightRail={{
                label: 'Inspector',
                size: inspectorSize.value,
                resizable: { min: 240, max: 480 },
                collapsed: inspectorCollapsed.value,
                toolbar: {
                  label: 'Inspector',
                  toggle: { action: INSPECTOR_TOGGLE, name: 'Inspector' },
                },
                // KF-Z9S029: an object's form pushes onto the Inspector.
                navStack: {
                  id: INSPECTOR_STACK,
                  label: 'Inspector',
                  toolbarConfig: { titleSize: 'default' },
                  views: [
                    {
                      key: 'inspector',
                      toolbar: {
                        title: 'Inspector',
                        trailing: nodeActions(document),
                      },
                      pane: INSPECTOR_PANE,
                      ...inspector(document),
                    },
                    ...fieldViews(),
                  ],
                },
              }}
            />
          </List>
          {/* After the panes, so the Inspector's own commands come first. */}
          {contextMenu()}
          {dropMenu()}
        </div>
        {playing.value ? playMode() : undefined}
        {libraryPopover()}
        {dragChip()}
      </List>
    );
  };

  /** Draws the selection highlight over the selected node on the canvas. */
  const placeHighlight = (root: HTMLElement) => {
    const canvas = root.querySelector<HTMLElement>(hook(HOOK.canvas));
    const highlight = canvas?.querySelector<HTMLElement>(
      '.kui-editor__selection',
    );
    if (!canvas || !highlight) return;
    const current = selection.value;
    const target =
      current?.kind === 'node'
        ? canvas.querySelector<HTMLElement>(`[data-kerf-node="${current.id}"]`)
        : current?.kind === 'slot'
          ? ([
              ...canvas.querySelectorAll<HTMLElement>(hook(HOOK.slotAddress)),
            ].find(
              (element) =>
                element.dataset.editorSlotAddress ===
                JSON.stringify(current.address),
            ) ?? null)
          : null;
    // A node in a hidden part of the canvas (an inactive tab's scene) keeps
    // its box under what is shown; ringing it would mark something else
    // (KF-ZC9EXM).
    if (
      !target ||
      target.checkVisibility?.({ visibilityProperty: true }) === false
    ) {
      highlight.hidden = true;
      return;
    }
    const outer = canvas.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    // Keep the whole ring (3px plus its 1px offset) inside the canvas, so a
    // node flush with an edge shows its outline just inside it (KF-F29M9E).
    const left = Math.max(box.left - outer.left, RING_REACH);
    const top = Math.max(box.top - outer.top, RING_REACH);
    const right = Math.min(box.right - outer.left, outer.width - RING_REACH);
    const bottom = Math.min(
      box.bottom - outer.top,
      canvas.scrollHeight - RING_REACH,
    );
    highlight.hidden = false;
    highlight.style.inset = `${top}px auto auto ${left}px`;
    highlight.style.width = `${Math.max(right - left, 0)}px`;
    highlight.style.height = `${Math.max(bottom - top, 0)}px`;
  };

  const exportAs = (kind: ExportKind) => {
    const result = exportModule(doc.value, viewCatalog, kind, resolveView);
    lastExport.value = {
      contract: result.contract,
      report: describeExport(result.contract, lastExport.value?.contract),
    };
    (options.save ?? download)(result.fileName, result.code);
  };

  // KF-0Y88XZ: undo and redo discard every Inspector draft along with its
  // error. A refused draft (an invalid name) leaves the field's `value`
  // attribute on the document's value, so the re-render never touches the
  // live `.value`; write it back here, after the render, so the field shows
  // the document again rather than text the document does not hold.
  const discardInspectorDrafts = () => {
    const stack = wired?.querySelector(`#${INSPECTOR_STACK}`);
    if (stack) discardDrafts(stack);
  };
  const undo = () => {
    if (!history.canUndo) return;
    doc.value = history.undo(doc.value);
    fieldErrors.value = {};
    historyVersion.value += 1;
    discardInspectorDrafts();
  };
  const redo = () => {
    if (!history.canRedo) return;
    doc.value = history.redo(doc.value);
    fieldErrors.value = {};
    historyVersion.value += 1;
    discardInspectorDrafts();
  };

  const moveSelected = (delta: -1 | 1) => {
    const current = selection.value;
    if (current?.kind === 'slot') {
      const movable = selectedMovable(doc.value);
      if (!(delta < 0 ? movable?.up : movable?.down)) return;
      const { address } = current;
      const moved = placeChild(doc.value, address, {
        ...address,
        index: address.index + (delta < 0 ? -1 : 2),
      });
      commit(moved.document);
      select({ kind: 'slot', address: moved.at });
      return;
    }
    const id = selectedNodeId();
    if (!id) return;
    const movable = isMovable(doc.value, id);
    if (delta < 0 ? movable.up : movable.down)
      commit(moveNode(doc.value, id, delta));
  };

  /** Applies one inspector control's value to the selected node. */
  const editProp = (
    field: HTMLElement,
    /** A TagField's next tags, reported before it re-renders. */
    raw = controlValue(field),
  ) => {
    const id = selectedNodeId();
    const name = field.dataset.editorProp!;
    const kind = field.dataset.editorKind as ControlKind;
    if (!id) return;
    // Custom shows the builder field; a keyword or the default hides it.
    if (kind === 'size')
      customSize.value = raw === CUSTOM_SIZE ? `${id} ${name}` : '';
    const node = findNode(doc.value, id)!.node;
    // A field renders only for a prop of the node's props entry.
    const prop = propsEntryOf(node)!.props.find((item) => item.name === name)!;
    // A value picked from the choices keeps its type (KF-9AWGPS).
    // Several picked values, in choice order; none is [] (KF-8MEWP2).
    if (kind === 'value-choices') {
      const picked = (JSON.parse(String(raw)) as string[]).map(
        (item) => JSON.parse(item) as ViewValue,
      );
      if (JSON.stringify(node.props?.[name]) !== JSON.stringify(picked))
        commit(setProp(doc.value, id, name, picked));
      return;
    }
    if (kind === 'value-choice') {
      const picked = raw ? (JSON.parse(String(raw)) as ViewValue) : undefined;
      if (JSON.stringify(node.props?.[name]) !== JSON.stringify(picked))
        commit(setProp(doc.value, id, name, picked));
      return;
    }
    const result = valueFromControl(kind, raw, prop.cssValue?.helpers, {
      type: prop.type as never,
      definitions: definitionsOf(node.type),
      // A typed choice's new member names its slots and keeps the fields it
      // shares with the old one (KF-907BXY).
      name,
      slot: slotNamer(usedSlots(doc.value)),
      current: node.props?.[name] as ViewValue | undefined,
      // An optional boolean reads false when absent, unless it defaults on.
      unset: prop.required ? undefined : prop.default === true,
      // Columns and rows starts a gap's axes at its default (KF-VA14AP).
      fallback: prop.default as ViewValue | undefined,
    });
    if ('error' in result) {
      fieldErrors.value = { ...fieldErrors.value, [name]: result.error };
      return;
    }
    const current = node.props?.[name];
    if (JSON.stringify(current) === JSON.stringify(result.value)) {
      if (fieldErrors.value[name]) fieldErrors.value = {};
      return;
    }
    let next = setProp(doc.value, id, name, result.value);
    // KF-E3MN4B: switching `multiple` reshapes the value it picks, in the
    // same undo step: one value becomes a list of it, a list its first.
    const valueProp =
      name === 'multiple'
        ? propsEntryOf(node)!.props.find((item) => item.name === 'value')
        : undefined;
    if (valueProp) {
      const after = findNode(next, id)!.node.props;
      const reshaped = reshapeValue(
        after?.value,
        valuePicker(valueProp.type as never, valueProp.required, after)
          .multiple,
      );
      if (JSON.stringify(reshaped) !== JSON.stringify(after?.value))
        next = setProp(next, id, 'value', reshaped as ViewValue);
    }
    commit(next);
  };

  /** Writes `next` at a field editor's place in the selected node's prop. */
  const writeField = (place: FieldPlace, next: ViewValue | undefined) => {
    const id = selectedNodeId()!;
    const node = findNode(doc.value, id)!.node;
    const props = node.props;
    const current = props?.[place.prop] as ViewValue | undefined;
    // KF-VQTDYG: a required boolean shown off is written as false.
    const value = withRequiredBooleans(
      withValueAt(current, place.path, next),
      propsEntryOf(node)?.props.find((item) => item.name === place.prop)
        ?.type as ViewType | undefined,
      definitionsOf(node.type),
      place.path,
    );
    if (JSON.stringify(current) === JSON.stringify(value)) return false;
    // KF-9AWGPS: renaming the selected choice keeps it selected, in the
    // value's own options list (KF-H1X3S7: a ColorSwatches' swatches).
    const list =
      propsEntryOf(node)?.props.find((item) => item.name === 'value')
        ?.choicesFrom ?? 'choices';
    const [index, field] = place.path;
    const followed =
      place.prop === list &&
      typeof index === 'number' &&
      field === 'value' &&
      place.path.length === 2
        ? followChoiceRename(props!, index, next, list).value
        : props?.value;
    const written = setProp(doc.value, id, place.prop, value);
    commit(
      followed === props?.value
        ? written
        : setProp(written, id, 'value', followed as ViewValue),
    );
    return true;
  };

  /** Applies a field editor control's value at its place (KF-Z9S029). */
  const editField = (
    field: HTMLElement,
    /** A TagField's next tags, reported before it re-renders. */
    raw = controlValue(field),
  ) => {
    // A field editor shows only for the selected node.
    const id = selectedNodeId()!;
    const place = JSON.parse(field.dataset.editorField!) as FieldPlace;
    const kind = field.dataset.editorKind as ControlKind;
    const key = placeKey(place);
    if (kind === 'size')
      customSize.value = raw === CUSTOM_SIZE ? `${id} ${key}` : '';
    // Custom… on a field's size only shows the builder field; clearing a
    // required field (a gap's axis) would break the value (KF-VA14AP).
    if (kind === 'size' && raw === CUSTOM_SIZE) return;
    const { definitions, type, declared, items, value } = fieldContext(
      findNode(doc.value, id)!.node,
      place,
    );
    // A typed choice picks a member of the whole union, starting from the
    // value it replaces, as the Inspector’s own choice does (KF-ZAQQFK).
    const result =
      kind === 'choice'
        ? valueFromControl(kind, raw, undefined, {
            type: (items ?? declared)!,
            definitions,
            current: value,
          })
        : valueFromControl(kind, raw, undefined, type && { type, definitions });
    if ('error' in result) {
      fieldErrors.value = { ...fieldErrors.value, [key]: result.error };
      return;
    }
    // A list's text item cleared stays in the list, empty (KF-CY1D5W).
    const next =
      result.value === undefined && typeof place.path.at(-1) === 'number'
        ? ''
        : result.value;
    if (!writeField(place, next) && fieldErrors.value[key])
      fieldErrors.value = {};
  };

  /**
   * Opens the form for `place` in the selected node's prop: in the
   * container the prop's type calls for, or, for a field nested in an open
   * editor, in that editor's container (KF-Z9S029).
   */
  const openFieldAt = (place: FieldPlace) => {
    // A Configure row shows only for the selected node.
    const id = selectedNodeId()!;
    const open = activeField();
    const node = findNode(doc.value, id)!.node;
    const prop = propsEntryOf(node)!.props.find(
      (item) => item.name === place.prop,
    )!;
    const container =
      open && open.prop === place.prop
        ? open.container
        : (customFor(prop.type as never)?.editor.container ??
          containerFor(
            prop.type as never,
            definitionsOf(node.type),
            prop.iconSource,
          ));
    openField.value = { node: id, ...place, container };
    if (container === 'dialog' && wired) {
      const dialog = wired.querySelector<HTMLDialogElement>(
        `#${FIELD_DIALOG}`,
      )!;
      if (!dialog.open) openDialog(dialog);
    }
  };

  /**
   * A field zone's row (KF-VSWT2Q) leads out of the field editor it sits in:
   * its dialog closes, and a subview's field steps pop.
   */
  /**
   * The node an Outline row or canvas element under `target` stands for, and
   * that element (KF-JV7XW1); undefined for a slot row or anything else.
   */
  const contextNode = (root: HTMLElement, target: Element) => {
    const row = target.closest<HTMLElement>('#editor-outline [data-item-id]');
    if (row) {
      const id = row.dataset.itemId!;
      return slotRowAddress(id)
        ? undefined
        : { id: itemSlotRowNode(id) ?? id, element: row };
    }
    const node = target.closest<HTMLElement>('[data-kerf-node]');
    return node && root.querySelector(hook(HOOK.canvas))!.contains(node)
      ? { id: node.dataset.kerfNode!, element: node }
      : undefined;
  };

  /**
   * Selects node `id` and opens the node context menu at `point`, or below
   * the start of `element` when the keyboard opened it (KF-JV7XW1).
   */
  const openContextMenu = (
    root: HTMLElement,
    { id, element }: { id: string; element: HTMLElement },
    point?: { x: number; y: number },
  ) => {
    select({ kind: 'node', id });
    contextInvoker = element;
    const box = element.getBoundingClientRect();
    openPopupMenuAt(
      root.querySelector<HTMLElement>(`[${CONTEXT_MENU}]`)!,
      point?.x ?? box.left + Math.min(16, box.width / 2),
      point?.y ?? box.bottom,
    );
  };

  const leaveFieldEditor = (target: HTMLElement) => {
    const zone =
      target.dataset.editorContentAdd ?? target.dataset.editorContentNode;
    // Field zones are paths (`choices.0.content`); a prop's zone is a name.
    if (!zone?.includes('.')) return;
    const dialog = target.closest<HTMLDialogElement>(`#${FIELD_DIALOG}`);
    if (dialog) closeDialog(dialog);
    openField.value = null;
  };

  /** Steps a field editor back one place, closing it from its first. */
  const fieldBack = () => {
    // Back shows only on an open field editor's step.
    const open = activeField()!;
    if (!open.path.length) {
      openField.value = null;
      return;
    }
    openField.value = { ...open, path: open.path.slice(0, -1) };
  };

  /**
   * Components whose catalog export contract names each parent (KF-7BB55F:
   * a ToolbarControlGroup's ToolbarButton, then its ToolbarActionLink).
   */
  const childrenByParent = new Map<string, string[]>();
  for (const [base, entry] of viewCatalog.entries)
    for (const [name, contract] of Object.entries(
      (
        entry as {
          // The composition schema requires each export's parents.
          jsxExports?: Record<string, { parents: { entries: string[] } }>;
        }
      ).jsxExports ?? {},
    ))
      for (const parent of contract.parents.entries)
        childrenByParent.set(parent, [
          ...(childrenByParent.get(parent) ?? []),
          `${base}#${name}`,
        ]);
  const childrenOf = (key: string) => childrenByParent.get(key) ?? [];

  /** A new node of component `key`, seeded so it renders as added. */
  const seededNode = (key: string): ViewNode =>
    seedNode(
      key,
      {
        component: (item) => propsByKey.get(item),
        name: (item) => componentNames.get(item)!,
        definitions: definitionsOf,
        entry: (item) =>
          viewCatalog.entries.get(item) as ReturnType<SeedCatalog['entry']>,
        childrenOf,
      },
      newNodeId,
      slotNamer(usedSlots(doc.value)),
    );

  /**
   * KF-JC7WTW: component `key`'s palette thumbnail: its seeded node as the
   * root of an otherwise empty document, rendered as the canvas renders it,
   * once per editor. An empty layout's zones show their canvas stand-ins,
   * so a Workbench's thumbnail sketches its regions.
   */
  const thumbnails = new Map<string, string>();
  const thumbnailOf = (key: string) => {
    if (!thumbnails.has(key)) {
      const document = withCatalog(
        { ...emptyDocument(), root: asRoot(seededNode(key)) },
        key,
      );
      // Static markup in a shadow root, never mounted, so no mount probe.
      thumbnails.set(
        key,
        canvasContent(document, [], undefined, undefined, true).toString(),
      );
    }
    return thumbnails.get(key);
  };

  /**
   * Where a new container holds the node it embeds, and the props and other
   * zones it starts with: its main zone; else (KF-N7K17T) a layout's first
   * view or tab content (a NavStack's `views.0.content`), whose seeded
   * `$slot` the node replaces; else a SplitView's detail pane, beside its
   * seeded list pane.
   */
  const embedPlace = (seeded: ViewNode) => {
    const options = zonesOf(seeded);
    const main = options.find(
      (option) => option.primary && !option.disabledReason,
    );
    if (main) return { zone: main.key, props: seeded.props };
    const content = options
      .map((option) => /^([^.]+)\.0\.content$/.exec(option.key))
      .find((match) => match !== null);
    if (content) {
      const prop = content[1]!;
      return {
        zone: content[0],
        props: {
          ...seeded.props,
          [prop]: withValueAt(
            seeded.props?.[prop] as ViewValue | undefined,
            [0, 'content'],
            undefined,
          )!,
        },
      };
    }
    const pane = EMBED_PANES[seeded.type];
    return pane && seeded.zones?.[pane]
      ? { zone: pane, props: seeded.props, zones: seeded.zones }
      : undefined;
  };

  /**
   * Node `id` embedded in a new container of component `key` (KF-6MGYSG):
   * undefined when the container has no main zone or the result adds a
   * problem. A container that becomes the root starts as a new root does: a
   * Pane fills (KF-84CCD1).
   */
  const embedded = (id: string, key: string) => {
    const target = embedPlace(seededNode(key));
    if (!target) return undefined;
    const props = { ...target.props, ...EMBED_PROPS[key] };
    const result = embedNode(
      doc.value,
      id,
      {
        type: key,
        props:
          id === doc.value.root?.id
            ? asRoot({ id, type: key, props }).props
            : props,
        ...(target.zones ? { zones: target.zones } : {}),
      },
      target.zone,
    );
    return result && !addsProblems(doc.value, result.document, viewCatalog)
      ? result
      : undefined;
  };

  /**
   * The first containers that can hold the selected node, checked once per
   * edit or selection rather than on every render.
   */
  const embedFirstLegal = computed(() => {
    const id = selectedNodeId();
    return new Set(
      id
        ? EMBED_FIRST.filter(
            (key) => propsByKey.has(key) && embedded(id, key) !== undefined,
          )
        : [],
    );
  });

  const { viewEditor, nodeEditor } = createNodeInspectorViews(ctx, {
    documentPath,
    propControl,
    configureRow,
    inspectorRuns,
    customFor,
    opensEditor,
    moveSection,
    viewsSection,
    contentControl,
    nodeContentRow,
    zonesOf,
    addableIn,
    replaceRootSection,
    areaTabs,
    extractBlocked,
    embedFirstLegal,
    bindProp,
    addZone,
    addComponent,
    promoteProp,
  });

  /** Opens Embed in › Other… for the selected node (KF-6MGYSG). */
  const openEmbedDialog = (root: HTMLElement) => {
    // Other… shows only with a node selected.
    embedTarget.value = selectedNodeId()!;
    embedQuery.value = '';
    embedQueryRevision.value += 1;
    openDialog(root.querySelector<HTMLDialogElement>(`#${EMBED_DIALOG}`)!);
    root.querySelector<HTMLElement>('[data-editor-embed-search]')!.focus();
  };

  /** Removes the selected slot, or the selected node when it can go. */
  const deleteSelected = () => {
    const current = selection.value;
    if (current?.kind === 'slot') {
      if (!slotAt(doc.value, current.address)) return;
      commit(removeSlot(doc.value, current.address));
      selection.value = null;
      return;
    }
    const id = selectedNodeId();
    if (!id || !isMovable(doc.value, id).remove) return;
    commit(removeNode(doc.value, id));
    selection.value = null;
  };

  /** Embeds node `id` in a new `key` container and selects the container. */
  const embed = (id: string, key: string) => {
    const result = embedded(id, key);
    if (!result) return;
    commit(result.document);
    select({ kind: 'node', id: result.id });
    inspectorArea.value = 'properties';
  };

  /** Adds the chosen component to the chosen zone and selects it. */
  /**
   * Makes a new node of the chosen component the document's root: Replace
   * the root, or a rootless document's first component (KF-PK3GVY).
   */
  const replaceRootWith = () => {
    // The picker renders beside Replace, or in a rootless canvas's empty
    // state (never both), and offers only cataloged components.
    const picker = document.querySelector<HTMLElement>(
      '[data-editor-root="component"]',
    )!;
    const root = asRoot(seededNode(String(controlValue(picker))));
    commit(replaceRoot(doc.value, root));
    select({ kind: 'node', id: root.id });
    inspectorArea.value = 'properties';
  };

  /** Commits a copy that landed at `next`, or says why it cannot (KF-QAVK73). */
  const placeCopy = (
    result: { document: ViewDocument; id: string },
    type: string,
    refusal: string,
  ) => {
    const next = withCatalog(result.document, type);
    if (addsProblems(doc.value, next, viewCatalog)) {
      editNotice.value = refusal;
      return;
    }
    commit(next);
    select({ kind: 'node', id: result.id });
  };

  /** Copies the selected node right after itself (KF-QAVK73). */
  const duplicate = () => {
    const id = selectedNodeId();
    const node = id ? findNode(doc.value, id)?.node : undefined;
    const result = id ? duplicateNode(doc.value, id) : undefined;
    if (!node || !result) return;
    placeCopy(
      result,
      node.type,
      `A copy of ${node.name ?? nodeTitle(node, componentNames)} does not fit beside it.`,
    );
  };

  /**
   * Pastes a copy of `node` after the selected node, or at the end of the
   * selected node's main zone when it has no place of its own (the root),
   * or of the root's with nothing selected.
   */
  const paste = (node: ViewNode) => {
    // KF-PK3GVY: a rootless document's paste becomes its root.
    if (!doc.value.root) {
      const copy = copyChild(node, new Set());
      commit(replaceRoot(doc.value, copy));
      select({ kind: 'node', id: copy.id });
      return;
    }
    const id = selectedNodeId() ?? doc.value.root.id;
    const at = placementOf(doc.value, id);
    const target = findNode(doc.value, id)!.node;
    const zone = at ? undefined : primaryFirst(zonesOf(target))[0]?.key;
    const to = at
      ? { ...at, index: at.index + 1 }
      : zone
        ? { parent: id, zone, index: target.zones?.[zone]?.length ?? 0 }
        : undefined;
    const title = node.name ?? nodeTitle(node, componentNames);
    if (!to) {
      editNotice.value = `${title} cannot be pasted there.`;
      return;
    }
    placeCopy(
      pasteNode(doc.value, node, to),
      node.type,
      `${title} cannot be pasted there.`,
    );
  };

  /**
   * Adds a component to a zone of the selected node: the Children area's
   * chosen zone and component, or `chosen` (KF-5T3TE4: a content row's Add).
   */
  const addChild = (chosen?: { zone: string; key: string }) => {
    const id = selectedNodeId();
    if (!id) return;
    const root = document.querySelector<HTMLElement>(
      `[data-editor-add="zone"]`,
    );
    const zone =
      chosen?.zone ?? (root ? String(controlValue(root)) : addZone.value);
    const picker = document.querySelector<HTMLElement>(
      `[data-editor-add="component"]`,
    );
    const key =
      chosen?.key ??
      (picker ? String(controlValue(picker)) : addComponent.value);
    if (zone && key === INSERT_DOCUMENT) {
      openInsertDialog(id, zone);
      return;
    }
    const component = propsByKey.get(key);
    if (!zone || (!component && key !== TEXT_RUN)) return;
    // A content prop holds text or nodes, never both: a child added to a
    // prop that holds text takes the text into the zone first (KF-YR91FA).
    const parent = findNode(doc.value, id)!.node;
    const base = propsByKey
      .get(parent.type)
      ?.props.some((prop) => prop.name === zone && prop.slot)
      ? textToNodes(doc.value, id, zone)
      : doc.value;
    const child =
      key === TEXT_RUN
        ? ({ id: newNodeId(), type: TEXT_RUN, value: 'Text' } as ViewNode)
        : seededNode(key);
    commit(
      key === TEXT_RUN
        ? insertNode(base, id, zone, child)
        : withCatalog(insertNode(base, id, zone, child), key),
    );
    select({ kind: 'node', id: child.id });
    inspectorArea.value = 'properties';
    // The new node's form opens at its top; take keyboard focus there too,
    // so it does not stay on the Add button at the bottom of the old form.
    realmOf(wired!).requestAnimationFrame(() =>
      wired
        ?.querySelector<HTMLInputElement>('[data-editor-name] input')
        ?.focus(),
    );
  };

  /** Promotes the chosen prop to a document param named after it. */
  const promote = (chosen?: string) => {
    const id = selectedNodeId();
    if (!id) return;
    const node = findNode(doc.value, id)!.node;
    const component = propsByKey.get(node.type);
    const picker = document.querySelector<HTMLElement>('[data-editor-promote]');
    const name =
      chosen ?? (picker ? String(controlValue(picker)) : promoteProp.value);
    const prop = component?.props.find((item) => item.name === name);
    // A function, signal, or model becomes a param of its prop's own type.
    const type =
      prop &&
      (paramTypeFor(prop.type as never) ??
        appParamFor(node.type, prop, definitionsOf(node.type)));
    const current = node.props?.[name];
    // Only a literal (or unset) prop promotes; one already bound stays as is.
    if (!prop || !type || isBinding(current)) return;
    const base = `${node.name ?? 'node'}${name[0]!.toUpperCase()}${name.slice(1)}`;
    let param = base;
    for (
      let index = 2;
      doc.value.params && param in doc.value.params;
      index += 1
    )
      param = `${base}${index}`;
    // The name is a fresh camelCase identifier on an existing node, so the
    // promotion cannot be refused.
    const result = promoteToParam(doc.value, id, name, param, type) as {
      document: ViewDocument;
    };
    commit(result.document);
  };

  /**
   * Promotes one field inside an object prop to a param named after the
   * node, the prop, and the field (KF-3QEZFB: nested params); its literal
   * becomes the default.
   */
  const promoteField = (at: FieldPlace) => {
    // The action renders only in the selected node's form, on a field whose
    // type promotes (fieldBindSection).
    const node = findNode(doc.value, selectedNodeId()!)!.node;
    const { type, definitions } = fieldContext(node, at);
    const paramType = paramTypeFor(
      resolveType(type as never, definitions) as never,
    );
    if (
      !paramType ||
      isBinding(valueAt(node.props?.[at.prop], at.path) as never)
    )
      return;
    const words = [
      at.prop,
      ...at.path.filter((step) => typeof step === 'string'),
    ];
    const base = `${node.name ?? 'node'}${words
      .map(
        (word) => `${String(word)[0]!.toUpperCase()}${String(word).slice(1)}`,
      )
      .join('')}`;
    let param = base;
    for (
      let index = 2;
      doc.value.params && param in doc.value.params;
      index += 1
    )
      param = `${base}${index}`;
    const result = promoteToParam(
      doc.value,
      node.id,
      at.prop,
      param,
      paramType,
      at.path,
    ) as { document: ViewDocument };
    commit(result.document);
  };

  /** Adds a `$slot` to the chosen zone of the selected node (KF-90GTJN). */
  const addSlot = () => {
    const id = selectedNodeId();
    const root = document.querySelector<HTMLElement>(
      `[data-editor-add="zone"]`,
    );
    const field = document.querySelector<HTMLElement>(hook(HOOK.slot, 'name'));
    if (!id || !field) return;
    const zone = root ? String(controlValue(root)) : addZone.value;
    const pass = document.querySelector<HTMLElement>(
      hook(HOOK.slot, 'pass-item'),
    );
    const result = insertSlot(
      doc.value,
      id,
      zone,
      String(controlValue(field)).trim(),
      pass ? controlValue(pass) === true : false,
    );
    if ('error' in result) {
      fieldErrors.value = { '#slot': result.error };
      return;
    }
    commit(result.document);
    select({ kind: 'slot', address: result.address });
  };

  /** The condition that picks the selected row design, when one does. */
  const rowCondition = (control: ReturnType<typeof controlOf>) =>
    control?.rows?.branches[control.rows.index]!.condition;

  /**
   * KF-1CRGP1: adds the row design chosen in the Repeat section's add form
   * (a component, shown when a true/false value holds) and selects it.
   */
  const addRow = () => {
    // The form shows only for a selected repeated node, with both values.
    const id = selectedNodeId()!;
    const field = (name: string) =>
      document.querySelector<HTMLElement>(hook(HOOK.rowDesign, name));
    const type = String(controlValue(field('component')!));
    const condition = String(controlValue(field('condition')!));
    const node = seededNode(type);
    commit(
      withCatalog(
        addRowDesign(doc.value, id, node, JSON.parse(condition) as ViewValue),
        type,
      ),
    );
    select({ kind: 'node', id: node.id });
  };

  /**
   * KF-YX6HMT: adds the kind named in the Row designs add form, shown as the
   * chosen component, and selects it.
   */
  const addRowKind = () => {
    // The form shows only for a selected node in a list keyed by kind.
    const id = selectedNodeId()!;
    const field = (name: string) =>
      document.querySelector<HTMLElement>(hook(HOOK.kind, name))!;
    const type = String(controlValue(field('component')));
    const node = seededNode(type);
    const result = addKind(
      doc.value,
      id,
      String(controlValue(field('name'))).trim(),
      node,
    );
    if ('error' in result) {
      fieldErrors.value = { '#new-kind': result.error };
      return;
    }
    // The name field is uncontrolled; a new kind starts it empty again.
    field('name').querySelector('input')!.value = '';
    commit(withCatalog(result.document, type));
    select({ kind: 'node', id: node.id });
  };

  /** Removes the selected row design and selects the design before it. */
  const removeRow = () => {
    // The button shows only for a selected node in a chain.
    const id = selectedNodeId()!;
    const rows = controlOf(doc.value, id)!.rows!;
    commit(removeRowDesign(doc.value, id));
    select({
      kind: 'node',
      id: rows.branches[rows.index ? rows.index - 1 : 1]!.node.id,
    });
  };

  /** Applies a change to a Show, Repeat, or Item name control. */
  const editControl = (field: HTMLElement) => {
    const id = selectedNodeId();
    if (!id) return;
    const value = String(controlValue(field));
    const current = controlOf(doc.value, id);
    switch (field.dataset.editorControl) {
      case 'condition': {
        const next = value ? (JSON.parse(value) as ViewValue) : undefined;
        if (JSON.stringify(next) === JSON.stringify(current?.condition)) return;
        commit(setCondition(doc.value, id, next));
        return;
      }
      case 'repeat': {
        if (value === JSON.stringify(current?.repeat?.source ?? '')) return;
        if (!value) {
          if (current?.repeat) commit(setRepeat(doc.value, id, undefined));
          return;
        }
        const option = repeatOptions(doc.value, viewCatalog, id).find(
          (item) => JSON.stringify(item.source) === value,
        );
        if (option)
          commit(
            setRepeat(doc.value, id, {
              source: option.source,
              as: option.as,
              key: option.key,
            }),
          );
        return;
      }
      case 'row-kind': {
        if (!value || value === JSON.stringify(current?.rows?.kind)) return;
        commit(setRowKind(doc.value, id, JSON.parse(value) as ViewValue));
        return;
      }
      case 'kind-name': {
        const result = renameKind(doc.value, id, value.trim());
        if ('error' in result) fieldErrors.value = { '#kind': result.error };
        else if (result.document !== doc.value) commit(result.document);
        return;
      }
      case 'row-condition': {
        if (!value || value === JSON.stringify(rowCondition(current))) return;
        commit(setRowCondition(doc.value, id, JSON.parse(value) as ViewValue));
        return;
      }
      case 'otherwise': {
        const otherwise = current?.otherwise;
        if (value === (otherwise && 'type' in otherwise ? otherwise.type : ''))
          return;
        commit(
          value
            ? withCatalog(setOtherwise(doc.value, id, seededNode(value)), value)
            : setOtherwise(doc.value, id, undefined),
        );
        return;
      }
      default: {
        if (value === current?.repeat?.as) return;
        const result = renameItem(doc.value, id, value);
        if ('error' in result) fieldErrors.value = { '#item': result.error };
        else commit(result.document);
      }
    }
  };

  /** The element the editor is wired to, for focus after an edit. */

  /**
   * Reopens the last document this browser had open, then saves every change
   * and remembers the current path; a pending change saves as the page hides.
   */
  const wireAutosave = (root: HTMLElement) => {
    const saver = autosave!;
    const last = rememberedPath();
    const start = historyVersion.peek();
    // A new draft for the document on screen, written on its first change.
    const fresh = () =>
      saver.adopt(draftPath(newNodeId()), fileText(doc.peek()));
    if (last)
      void options.storage!.read(last).then(
        (text) => {
          // An edit made while the file loaded wins: it saves to a draft.
          if (historyVersion.peek() !== start) {
            void saver.create(draftPath(newNodeId()), fileText(doc.peek()));
            return;
          }
          const parsed = text === undefined ? undefined : parseDocument(text);
          if (parsed?.ok) load(parsed.document, last);
          else fresh();
        },
        () => fresh(),
      );
    else fresh();
    return [
      effect(() => {
        const text = fileText(doc.value);
        if (saver.path.peek()) saver.change(text);
      }),
      effect(() => {
        const path = saver.path.value;
        if (path && (!isDraft(path) || saver.status.value === 'saved'))
          rememberPath(path);
      }),
      // KF-5N26H6: loads each composed document the current one needs (and
      // theirs), once per document; a load started for an earlier document
      // is dropped when it arrives.
      effect(() => {
        const path = saver.path.value;
        const loads = viewLoads.value;
        if (!path) return;
        const wanted = neededViews(doc.value, path, loads).filter(
          (item) => !loads.has(item),
        );
        if (!wanted.length) return;
        const started = new Map(loads);
        for (const item of wanted) started.set(item, { state: 'loading' });
        viewLoads.value = started;
        const settle = (item: string, load: ViewLoad) => {
          const current = viewLoads.peek();
          if (current.get(item)?.state !== 'loading') return;
          viewLoads.value = new Map(current).set(item, load);
        };
        for (const item of wanted)
          options.storage!.read(item).then(
            (text) => {
              if (text === undefined) return settle(item, { state: 'missing' });
              const parsed = parseDocument(text);
              settle(
                item,
                parsed.ok
                  ? { state: 'loaded', document: parsed.document }
                  : { state: 'failed', error: parsed.error },
              );
            },
            (error: unknown) =>
              settle(item, {
                state: 'failed',
                error: error instanceof Error ? error.message : String(error),
              }),
          );
      }),
      on(root.ownerDocument.defaultView!, 'pagehide', () => {
        void saver.flush();
      }),
      () => {
        void saver.flush();
        saver.dispose();
      },
    ];
  };

  /** KF-Z54E4H: the Library popover under `root`. */
  const librarySurface = (root: HTMLElement) =>
    root.querySelector<HTMLElement>(`#${LIBRARY_ID}`)!;
  /** Whether the Library is open and closes after a drop (not pinned). */
  const libraryTransient = (root: HTMLElement) => {
    const surface = librarySurface(root);
    return surface.matches(':popover-open') && !isPopoverPinned(surface);
  };
  /**
   * A palette drag began: the transient Library steps aside, so the canvas
   * and outline it covered take the drop, unless Option (Alt) is held.
   */
  const libraryDragStarted = (root: HTMLElement, altKey: boolean) => {
    library.asked = false;
    if (altKey || !libraryTransient(root)) return;
    library.aside = true;
    librarySurface(root).hidePopover();
  };
  /**
   * A palette drag ended. A transient Library closes after a drop; it
   * comes back after a drop that found no place, and stays (or comes back)
   * when Option (Alt) is held at the drop. An Option drop that asks where
   * it goes (KF-WKABP2) keeps the Library out of the way until the menu
   * closes, then brings it back.
   */
  const libraryDragEnded = (
    root: HTMLElement,
    dropped: boolean,
    altKey: boolean,
  ) => {
    const surface = librarySurface(root);
    const { aside, asked } = library;
    library.aside = false;
    // Pinned, or closed before the drag: nothing changes.
    if (!aside && !libraryTransient(root)) return;
    if (!dropped || (altKey && !asked)) {
      if (aside) surface.showPopover();
      return;
    }
    library.back = asked && altKey;
    if (aside) return;
    // Not a close the person asked for: focus stays with the drop.
    library.aside = true;
    surface.hidePopover();
    library.aside = false;
  };

  /**
   * KF-FXACB5: says in the Library why a document was not inserted, opening
   * it again when a drop had closed it.
   */
  const refuseLibrary = (message: string) => {
    const surface = librarySurface(wired!);
    // Opening lists the documents again, clearing an earlier reason.
    if (!surface.matches(':popover-open')) surface.showPopover();
    libraryError.value = message;
  };
  /**
   * KF-FXACB5: lists the project's documents for the Library as it opens,
   * reading each one again when it is next inserted. Without a storage that
   * lists them, or when listing fails, the Library shows no documents.
   */
  const listLibraryDocuments = () => {
    libraryError.value = '';
    const storage = options.storage;
    if (!storage?.list) return;
    libraryReads = new Map();
    libraryAnswers.clear();
    const current = autosave!.path.peek();
    void storage.list().then(
      (paths) => {
        libraryFiles.value = insertableDocuments(paths, current);
      },
      () => {
        libraryFiles.value = [];
      },
    );
  };
  /**
   * KF-FXACB5: a Library document's click reads it, then puts a `#view` of
   * it inside the selected node (its main zone first, at the end), else
   * after it; with nothing selected, inside the root; in a rootless
   * document, as the root. Each place is checked as a drop is. It is one
   * undoable edit, selected, and renders at once; a transient Library then
   * closes unless Option (`keep`) is held.
   */
  const insertFromLibrary = async (
    root: HTMLElement,
    path: string,
    keep: boolean,
  ) => {
    libraryError.value = '';
    const before = doc.peek();
    const at = selectedNodeId() ?? before.root?.id;
    const read = await readLibraryDocument(path);
    if ('problem' in read) return refuseLibrary(read.problem);
    if (doc.peek() !== before) return refuseLibrary(CHANGED_MEANWHILE);
    const node = insertedView(
      newNodeId(),
      autosave!.path.peek(),
      path,
      read.document,
    );
    const place = (position: 'inside' | 'after') =>
      insertPlacement(before, viewCatalog, node, at!, position, zoneKeys);
    const to =
      at === undefined ? undefined : (place('inside') ?? place('after'));
    if (at !== undefined && !to)
      return refuseLibrary(
        'The selection has no place for it. Select a node that can hold it.',
      );
    batch(() => {
      showDocument(path, read.document);
      commit(
        to
          ? insertNode(before, to.parent, to.zone, node, to.index)
          : replaceRoot(before, node),
      );
      select({ kind: 'node', id: node.id });
      inspectorArea.value = 'properties';
    });
    if (!keep && libraryTransient(root)) librarySurface(root).hidePopover();
  };

  /**
   * KF-Z54E4H: the Library's pinned placement, kept per browser; Shift+Cmd+L
   * (Ctrl+Shift+L) toggles it; it opens with focus in its filter and closes
   * with focus back on the Library button; play mode closes it.
   */
  const wireLibrary = (root: HTMLElement) => {
    const surface = librarySurface(root);
    const button = () =>
      root.querySelector<HTMLElement>('[data-editor-library-button]');
    const remembered = rememberedLibrary();
    const doc = root.ownerDocument;
    /** Closed by a drag or drop rather than by the person: keep focus. */
    let quiet = false;
    const stopPopover = wirePinnablePopover(surface, {
      anchor: () => button(),
      ...(remembered
        ? {
            pinned: remembered.pinned,
            ...(remembered.placement
              ? { placement: remembered.placement }
              : {}),
          }
        : {}),
      onChange: rememberLibrary,
    });
    const onBeforeToggle = (event: Event) => {
      if ((event as ToggleEvent).newState === 'closed') quiet = library.aside;
    };
    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState === 'open') {
        surface
          .querySelector<HTMLElement>('[data-editor-palette-filter]')
          ?.focus();
        listLibraryDocuments();
        return;
      }
      if (quiet || surface.matches(':popover-open')) return;
      const active = doc.activeElement;
      if (!active || active === doc.body || surface.contains(active))
        button()?.focus();
    };
    /** A drop's question was answered: the Library comes back if held. */
    const answered = (event: Event) => {
      if (
        !library.back ||
        (event as ToggleEvent).newState !== 'closed' ||
        !(event.target as Element).closest(`[${DROP_MENU}]`)
      )
        return;
      library.back = false;
      surface.showPopover();
    };
    surface.addEventListener('beforetoggle', onBeforeToggle);
    surface.addEventListener('toggle', onToggle);
    root.addEventListener('toggle', answered, true);
    const stops = [
      stopPopover,
      on(doc, 'keydown', (event) => {
        const key = event as KeyboardEvent;
        if (
          playing.value ||
          key.key.toLowerCase() !== 'l' ||
          !key.shiftKey ||
          key.altKey ||
          !(key.metaKey || key.ctrlKey)
        )
          return;
        key.preventDefault();
        if (surface.matches(':popover-open')) surface.hidePopover();
        else surface.showPopover();
      }),
      effect(() => {
        if (playing.value && surface.matches(':popover-open'))
          surface.hidePopover();
      }),
    ];
    return () => {
      surface.removeEventListener('beforetoggle', onBeforeToggle);
      surface.removeEventListener('toggle', onToggle);
      root.removeEventListener('toggle', answered, true);
      for (const stop of stops) stop();
    };
  };

  /** KF-60BEEJ: enters play mode, with focus on Done. */
  const enterPlay = (root: HTMLElement) => {
    playing.value = true;
    root
      .querySelector<HTMLElement>(`[data-action="${PLAY_DONE_ACTION}"]`)
      ?.focus();
    stopStage = playStage.start(root, () => sendEnvironment(root));
  };

  /** Stops the stage's layout and controls; set while playing. */
  let stopStage: (() => void) | undefined;

  /** The stage's frame window, while playing. */
  const playWindow = (root: HTMLElement) =>
    root.querySelector<HTMLIFrameElement>(hook(HOOK.playFrame))
      ?.contentWindow ?? null;

  /** KF-R7KXSN: tells the played view its device's safe areas. */
  const sendEnvironment = (root: HTMLElement) =>
    playWindow(root)?.postMessage(
      { type: PLAY_ENVIRONMENT, safeArea: playStage.safeArea() },
      root.ownerDocument.defaultView!.location.origin,
    );

  /**
   * Leaves play mode. The editing UI comes back as it was; the played view's
   * frame, and with it every runtime state, is gone.
   */
  const leavePlay = (root: HTMLElement) => {
    stopStage?.();
    stopStage = undefined;
    playing.value = false;
    root.querySelector<HTMLElement>(`[data-action="${PLAY_ACTION}"]`)?.focus();
  };

  /** Sends the document to the stage's play page once it is listening. */
  const wirePlay = (root: HTMLElement) => {
    const view = root.ownerDocument.defaultView!;
    const onMessage = (event: MessageEvent) => {
      const frame = root.querySelector<HTMLIFrameElement>(hook(HOOK.playFrame));
      if (
        !playing.value ||
        !frame?.contentWindow ||
        !fromPeer(event, view, frame.contentWindow)
      )
        return;
      const data = event.data as {
        type?: unknown;
        entry?: ActionLogEntry;
      } | null;
      // KF-RF6RCS: a fired action, for the play bar's action log.
      if (data?.type === PLAY_ACTION_MESSAGE && data.entry) {
        playStage.logAction(data.entry);
        return;
      }
      if (data?.type !== PLAY_READY) return;
      sendEnvironment(root);
      frame.contentWindow.postMessage(
        {
          type: PLAY_DOCUMENT,
          document: doc.value,
          // KF-85SCQD: the stage has no storage, so it gets the loaded
          // composed documents its `#view`s render.
          views: composedDocuments(doc.value, (path) => resolveView(path)),
        },
        view.location.origin,
      );
    };
    const stop = on(view, 'message', (event) =>
      onMessage(event as MessageEvent),
    );
    return () => {
      stop();
      stopStage?.();
      stopStage = undefined;
    };
  };

  const wire = (root: HTMLElement) => {
    wired = root;
    const toggle = (action: string, collapsed: typeof documentCollapsed) =>
      delegate(root, 'click', `[data-action="${action}"]`, () => {
        collapsed.value = !collapsed.value;
      });
    const stops = [
      toggle(DOCUMENT_TOGGLE, documentCollapsed),
      toggle(INSPECTOR_TOGGLE, inspectorCollapsed),
      wireWorkbench(root, {
        id: WORKBENCH_ID,
        panels: {
          leftRail: { size: documentSize, collapsed: documentCollapsed },
          rightRail: { size: inspectorSize, collapsed: inspectorCollapsed },
        },
      }),
      delegate<HTMLElement>(
        root,
        'change',
        `[data-editor-prop]:not(${hook(HOOK.kind, 'tags')})`,
        (_event, field) => editProp(field),
      ),
      delegate<HTMLElement>(
        root,
        'change',
        `[data-editor-field]:not(${hook(HOOK.kind, 'tags')})`,
        (_event, field) => editField(field),
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-attribute]',
        (_event, field) => {
          const index = Number(field.dataset.editorAttribute);
          const raw = String(controlValue(field));
          editDataAttribute(
            field.dataset.editorAttributePart === 'name'
              ? { kind: 'name', index, name: raw.trim() }
              : { kind: 'value', index, value: raw },
          );
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-name]',
        (_event, field) => {
          const id = selectedNodeId();
          if (!id) return;
          const result = renameNode(
            doc.value,
            id,
            controlValue(field) as string,
          );
          if ('error' in result) fieldErrors.value = { '#name': result.error };
          else commit(result.document);
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-text-run]',
        (_event, field) =>
          commit(
            setTextRun(
              doc.value,
              field.dataset.editorTextRun!,
              String(controlValue(field)),
            ),
          ),
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-param]',
        (_event, field) => {
          const from = field.dataset.editorParam!;
          const result = renameParam(
            doc.value,
            from,
            String(controlValue(field)).trim(),
          );
          if ('error' in result)
            fieldErrors.value = { [`#param:${from}`]: result.error };
          else commit(result.document);
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-root]',
        (_event, field) => {
          rootComponent.value = String(controlValue(field));
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-add]',
        (_event, field) => {
          const value = String(controlValue(field));
          // A new zone starts on its own first suggestion.
          if (field.dataset.editorAdd === 'zone') {
            addZone.value = value;
            addComponent.value = '';
          } else addComponent.value = value;
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-bind]',
        (_event, field) => {
          const value = String(controlValue(field));
          if (field.dataset.editorBind === 'prop') {
            bindProp.value = value;
            return;
          }
          if (field.dataset.editorBind === 'field') {
            bindField.value = value;
            return;
          }
          const id = selectedNodeId();
          if (!id) return;
          // KF-3QEZFB: a field's source binds or unbinds just that field.
          if (field.dataset.editorBind === 'field-source') {
            const at = JSON.parse(field.dataset.editorBindPlace!) as FieldPlace;
            const own = findNode(doc.value, id)!.node.props?.[at.prop];
            if (!value && !isParamOrBind(valueAt(own, at.path))) return;
            commit(
              setField(
                doc.value,
                id,
                at.prop,
                at.path,
                value ? (JSON.parse(value) as ViewValue) : undefined,
              ),
            );
            return;
          }
          // Not bound clears a binding; a literal value stays as it is.
          const name = field.dataset.editorBindProp!;
          const current = findNode(doc.value, id)!.node.props?.[name];
          const wasBound =
            current !== null &&
            typeof current === 'object' &&
            ('$param' in current || '$bind' in current);
          if (!value && !wasBound) return;
          commit(
            setProp(
              doc.value,
              id,
              name,
              value ? (JSON.parse(value) as ViewValue) : undefined,
            ),
          );
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-move]',
        (_event, field) => {
          const id = selectedNodeId();
          const value = String(controlValue(field));
          if (!id || !value) return;
          const { parent, zone } = JSON.parse(value) as {
            parent: string;
            zone: string;
          };
          const index =
            findNode(doc.value, parent)!.node.zones?.[zone]?.length ?? 0;
          commit(placeNode(doc.value, id, { parent, zone, index }));
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        hook(HOOK.control),
        (_event, field) => editControl(field),
      ),
      delegate<HTMLElement>(
        root,
        'change',
        hook(HOOK.slotInput),
        (_event, field) => {
          const current = selection.value;
          if (current?.kind !== 'slot') return;
          const value = String(controlValue(field));
          commit(
            setSlotInput(
              doc.value,
              current.address,
              field.dataset.editorSlotInput!,
              value ? (JSON.parse(value) as ViewValue) : undefined,
            ),
          );
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-promote]',
        (_event, field) => {
          promoteProp.value = String(controlValue(field));
        },
      ),
      on(root.ownerDocument, 'keydown', (event) => {
        const key = event as KeyboardEvent;
        // KF-60BEEJ: no editing key works while playing. A key inside the
        // played view stays in its frame; Escape anywhere else leaves.
        if (playing.value) {
          if (key.key === 'Escape') {
            key.preventDefault();
            leavePlay(root);
          }
          return;
        }
        // KF-JV7XW1: Shift+F10 opens the node context menu, as the
        // ContextMenu key does through its contextmenu event.
        if (key.key === 'F10' && key.shiftKey) {
          const at = contextNode(root, key.target as Element);
          if (!at) return;
          key.preventDefault();
          openContextMenu(root, at);
          return;
        }
        const letter = key.key.toLowerCase();
        if (!(key.metaKey || key.ctrlKey) || !'zdcv'.includes(letter)) return;
        const target = key.target as Element | null;
        if (target?.closest('input, textarea, [contenteditable]')) return;
        // KF-QAVK73: copy and paste leave a text selection's own behavior be.
        if (
          (letter === 'c' || letter === 'v') &&
          !root.ownerDocument.getSelection()?.isCollapsed
        )
          return;
        switch (letter) {
          case 'z':
            key.preventDefault();
            if (key.shiftKey) redo();
            else undo();
            return;
          case 'd':
            key.preventDefault();
            duplicate();
            return;
          case 'c': {
            const id = selectedNodeId();
            if (!id) return;
            key.preventDefault();
            clipboard = findNode(doc.value, id)!.node;
            return;
          }
          case 'v':
            if (!clipboard) return;
            key.preventDefault();
            paste(clipboard);
        }
      }),
      delegate<HTMLElement>(
        root,
        'input',
        '[data-editor-embed-search]',
        (_event, editor) => {
          embedQuery.value = readSearchField(editor).query;
        },
      ),
      delegate<HTMLElement>(
        root,
        'input',
        '[data-editor-insert-document-search]',
        (_event, editor) => {
          insertQuery.value = readSearchField(editor).query;
        },
      ),
      delegate<HTMLElement>(
        root,
        'input',
        '[data-editor-icon-search]',
        (_event, editor) => {
          iconQuery.value = readSearchField(editor).query;
        },
      ),
      delegate<HTMLElement>(
        root,
        'input',
        '[data-editor-palette-filter]',
        (_event, editor) => {
          paletteFilter.value = readSearchField(editor).query;
        },
      ),
      delegateActions<HTMLElement>(root, 'click', {
        [PALETTE_VIEW_ACTION]: (_event, target) => {
          const view: PaletteView =
            target.dataset.segmentValue === 'grid' ? 'grid' : 'list';
          paletteView.value = view;
          rememberPaletteView(view);
        },
        [PALETTE_CLEAR_ACTION]: () => {
          paletteFilter.value = '';
          paletteFilterRevision.value += 1;
          root
            .querySelector<HTMLElement>('[data-editor-palette-filter]')
            ?.focus();
        },
        [PLAY_ACTION]: () => enterPlay(root),
        [PLAY_DONE_ACTION]: () => leavePlay(root),
        [UNDO_ACTION]: () => undo(),
        [REDO_ACTION]: () => redo(),
        [MOVE_UP_ACTION]: () => moveSelected(-1),
        [MOVE_DOWN_ACTION]: () => moveSelected(1),
        [DELETE_ACTION]: () => deleteSelected(),
        [DUPLICATE_ACTION]: () => duplicate(),
        [OPEN_VIEW_ACTION]: () => void openView(),
        [VIEW_BACK_ACTION]: () => void viewBack(),
        // KF-JV7XW1: the node context menu's commands.
        [CONTEXT_MOVE_UP_ACTION]: () => moveSelected(-1),
        [CONTEXT_MOVE_DOWN_ACTION]: () => moveSelected(1),
        [CONTEXT_DUPLICATE_ACTION]: () => duplicate(),
        [CONTEXT_DELETE_ACTION]: () => deleteSelected(),
        // KF-WKABP2: the drop menu's choice, and a confirmed replacement.
        [DROP_CHOICE_ACTION]: (_event, target) => {
          const choice =
            dropChoices.value[Number(target.dataset.editorDropChoice)];
          if (choice) applyMove(choice.move);
        },
        [REPLACE_CONFIRM_ACTION]: () => {
          const move = pendingReplace.value;
          pendingReplace.value = null;
          closeDialog(
            root.querySelector<HTMLDialogElement>(`#${REPLACE_DIALOG}`)!,
          );
          if (move) commitReplace(move);
        },
        [CONTEXT_EMBED_ACTION]: (_event, target) =>
          embed(selectedNodeId()!, target.dataset.editorContextEmbed!),
        [CONTEXT_EMBED_OTHER_ACTION]: () => openEmbedDialog(root),
        [ADD_ACTION]: () => addChild(),
        [UNSET_ACTION]: (_event, target) => {
          const field = target.closest<HTMLElement>(
            '[data-editor-prop], [data-editor-field]',
          )!;
          // Pressed means Not set: un-pressing sets it, to the empty string.
          const next =
            target.getAttribute('aria-pressed') === 'true' ? '' : undefined;
          if (field.dataset.editorField) {
            writeField(
              JSON.parse(field.dataset.editorField) as FieldPlace,
              next,
            );
            return;
          }
          const id = selectedNodeId();
          if (id)
            commit(setProp(doc.value, id, field.dataset.editorProp!, next));
        },
        [CONTENT_ADD_ACTION]: (_event, target) => {
          leaveFieldEditor(target);
          const zone = target.dataset.editorContentAdd!;
          const id = selectedNodeId()!;
          const parent = findNode(doc.value, id)!.node;
          const key = suggestionFor(parent, zone);
          if (key) addChild({ zone, key });
          else {
            // Nothing to suggest: choose one in the Children area.
            addZone.value = zone;
            addComponent.value = '';
            inspectorArea.value = 'children';
          }
        },
        [REPLACE_ROOT_ACTION]: () => replaceRootWith(),
        [FIRST_ROOT_ACTION]: () => replaceRootWith(),
        [CONTENT_TO_NODES_ACTION]: (_event, target) => {
          const id = selectedNodeId();
          if (id)
            commit(textToNodes(doc.value, id, target.dataset.editorContent!));
        },
        [CONTENT_TO_TEXT_ACTION]: (_event, target) => {
          const id = selectedNodeId();
          if (id)
            commit(nodesToText(doc.value, id, target.dataset.editorContent!));
        },
        // A list row's action is its inner button; the row carries the place.
        [FIELD_OPEN_ACTION]: (_event, target) =>
          openFieldAt(
            JSON.parse(
              target.closest<HTMLElement>('[data-editor-open]')!.dataset
                .editorOpen!,
            ) as FieldPlace,
          ),
        [FIELD_BACK_ACTION]: fieldBack,
        [FIELD_ADD_ITEM_ACTION]: (_event, target) => {
          const place = JSON.parse(target.dataset.editorStep!) as FieldPlace;
          const { definitions, type, value } = fieldContext(
            findNode(doc.value, selectedNodeId()!)!.node,
            place,
          );
          const items = Array.isArray(value) ? value : [];
          const member = listMembers(type, definitions, stepTitle(place))[
            Number(target.dataset.editorMember)
          ]!;
          // A new item is numbered after the list ("Choice 4"); an object
          // no placeholder can stand for (a required color) starts empty
          // for its form to fill. Text always has one.
          const item =
            exampleValue(
              member.type,
              definitions,
              stepTitle(place),
              slotNamer(usedSlots(doc.value)),
              items.length + 1,
            ) ?? {};
          writeField(place, [...items, item]);
        },
        [FIELD_SET_ACTION]: (_event, target) => {
          const { editorValue } = target.dataset;
          writeField(
            JSON.parse(target.dataset.editorStep!) as FieldPlace,
            editorValue ? (JSON.parse(editorValue) as ViewValue) : undefined,
          );
        },
        [FIELD_REMOVE_ITEM_ACTION]: (_event, target) => {
          writeField(
            JSON.parse(target.dataset.editorItem!) as FieldPlace,
            undefined,
          );
        },
        [ICON_OPEN_ACTION]: (_event, target) => {
          iconPicker.value = JSON.parse(
            target.dataset.editorIconPlace!,
          ) as FieldPlace;
          iconQuery.value = '';
          iconQueryRevision.value += 1;
          openDialog(root.querySelector<HTMLDialogElement>(`#${ICON_DIALOG}`)!);
          // KF-GQHRC0: typing searches at once.
          root.querySelector<HTMLElement>('[data-editor-icon-search]')!.focus();
        },
        // KF-6MGYSG: Embed in, from the Inspector's menu, its Other… dialog,
        // or a hint row's fix (which names the node it is about).
        [EMBED_ACTION]: (_event, target) => {
          // The Flow section and Other… act on the selected node.
          const id =
            target.dataset.editorEmbedNode ??
            embedTarget.value ??
            selectedNodeId()!;
          const dialog = root.querySelector<HTMLDialogElement>(
            `#${EMBED_DIALOG}`,
          )!;
          if (dialog.open) closeDialog(dialog);
          embedTarget.value = null;
          embed(id, target.dataset.editorEmbed!);
        },
        [SHOW_VIEW_ACTION]: (_event, target) => {
          const { id, index } = JSON.parse(target.dataset.editorShowView!) as {
            id: string;
            index: number;
          };
          const next = new Map(canvasViews.value);
          // The top view is the default, so choosing it clears the choice.
          const views = findNode(doc.value, id)!.node.props!.views as unknown[];
          if (index === views.length - 1) next.delete(id);
          else next.set(id, index);
          canvasViews.value = next;
        },
        [EMBED_OTHER_ACTION]: () => openEmbedDialog(root),
        // KF-PX5EVZ: a picked document, or the path field's Insert.
        [INSERT_DOCUMENT_ACTION]: (_event, target) => {
          const dialog = root.querySelector<HTMLDialogElement>(
            `#${INSERT_DOCUMENT_DIALOG}`,
          )!;
          const picked = target.dataset.editorInsertDocument!;
          void insertDocument(
            dialog,
            picked === 'confirm'
              ? dialog.querySelector<HTMLInputElement>(
                  '[data-editor-insert-document="path"] input',
                )!.value
              : picked,
          );
        },
        [INSERT_DOCUMENT_CLEAR_ACTION]: () => {
          insertQuery.value = '';
          insertQueryRevision.value += 1;
          root
            .querySelector<HTMLElement>('[data-editor-insert-document-search]')!
            .focus();
        },
        [EMBED_CLEAR_ACTION]: () => {
          embedQuery.value = '';
          embedQueryRevision.value += 1;
          root
            .querySelector<HTMLElement>('[data-editor-embed-search]')!
            .focus();
        },
        [ICON_CLEAR_ACTION]: () => {
          iconQuery.value = '';
          iconQueryRevision.value += 1;
          root.querySelector<HTMLElement>('[data-editor-icon-search]')!.focus();
        },
        [ICON_CHOOSE_ACTION]: (_event, target) => {
          const place = iconPicker.value!;
          const icon = target.dataset.editorIcon!;
          const id = selectedNodeId()!;
          const node = findNode(doc.value, id)!.node;
          // KF-DQFXWG, KF-3J47BY: a string `name` beside a node's icon, or
          // `iconName` (else `name`) beside an item's, follows the icon until
          // the author names it otherwise.
          const parent = place.path.slice(0, -1);
          const strings = (
            place.path.length
              ? objectFields(
                  fieldContext(node, { prop: place.prop, path: parent }).type,
                  definitionsOf(node.type),
                )
              : propsEntryOf(node)!.props
          )
            .filter((field) => field.type.kind === 'string')
            .map((field) => field.name);
          const current = node.props?.[place.prop] as ViewValue | undefined;
          const named = iconNameEdit(
            strings,
            (place.path.length ? valueAt(current, parent) : node.props) as
              Record<string, ViewValue> | undefined,
            (valueAt(current, place.path) as { $icon?: string } | undefined)
              ?.$icon,
            icon,
            componentNames.get(node.type)!,
          );
          if (!named) writeField(place, { $icon: icon });
          else if (!place.path.length)
            commit(
              setProp(
                setProp(doc.value, id, place.prop, { $icon: icon }),
                id,
                named.key,
                named.value,
              ),
            );
          else
            commit(
              setProp(
                doc.value,
                id,
                place.prop,
                withValueAt(
                  withValueAt(current, place.path, { $icon: icon }),
                  [...parent, named.key],
                  named.value,
                ),
              ),
            );
          closeDialog(
            root.querySelector<HTMLDialogElement>(`#${ICON_DIALOG}`)!,
          );
        },
        [ICON_REMOVE_ACTION]: () => {
          writeField(iconPicker.value!, undefined);
          closeDialog(
            root.querySelector<HTMLDialogElement>(`#${ICON_DIALOG}`)!,
          );
        },
        [FIELD_DONE_ACTION]: () =>
          closeDialog(
            root.querySelector<HTMLDialogElement>(`#${FIELD_DIALOG}`)!,
          ),
        [FIELD_RESET_ACTION]: (_event, target) => {
          writeField(
            JSON.parse(target.dataset.editorStep!) as FieldPlace,
            undefined,
          );
        },
        [FIELD_EXAMPLE_ACTION]: (_event, target) => {
          const place = JSON.parse(target.dataset.editorStep!) as FieldPlace;
          const { definitions, type } = fieldContext(
            findNode(doc.value, selectedNodeId()!)!.node,
            place,
          );
          // The button shows only for a step that has an example.
          writeField(
            place,
            exampleValue(
              type,
              definitions,
              stepTitle(place),
              slotNamer(usedSlots(doc.value)),
            )!,
          );
        },
        [FIELD_JSON_ACTION]: (_event, target) => {
          const key = placeKey(
            JSON.parse(target.dataset.editorStep!) as FieldPlace,
          );
          const next = new Set(jsonSteps.value);
          if (!next.delete(key)) next.add(key);
          jsonSteps.value = next;
        },
        [EXAMPLE_ACTION]: (_event, target) => {
          // The button shows only for the selected node's required prop
          // that has an example.
          const id = selectedNodeId()!;
          const name = target.dataset.editorExample!;
          const node = findNode(doc.value, id)!.node;
          const prop = propsEntryOf(node)!.props.find(
            (item) => item.name === name,
          )!;
          commit(
            setProp(
              doc.value,
              id,
              name,
              exampleValue(
                prop.type as never,
                definitionsOf(node.type),
                name,
                slotNamer(usedSlots(doc.value)),
              )!,
            ),
          );
        },
        [DATA_ATTRIBUTE_ADD_ACTION]: () => {
          const node = findNode(doc.value, selectedNodeId()!)!.node;
          const attributes = dataAttributes(
            node.props?.[DATA_ATTRIBUTES_PROP] as ViewValue | undefined,
          )!;
          const prop = propsByKey
            .get(node.type)!
            .props.find((item) => item.name === DATA_ATTRIBUTES_PROP)!;
          editDataAttribute({
            kind: 'add',
            name: newDataAttributeName(
              attributes,
              protectedDataAttributes(
                prop.type as never,
                definitionsOf(node.type),
              ),
            ),
          });
        },
        [DATA_ATTRIBUTE_REMOVE_ACTION]: (_event, target) =>
          editDataAttribute({
            kind: 'remove',
            index: Number(target.dataset.editorAttributeRemove),
          }),
        [ADD_SLOT_ACTION]: () => addSlot(),
        [ADD_ROW_DESIGN_ACTION]: () => addRow(),
        [ADD_KIND_ACTION]: () => addRowKind(),
        [REMOVE_ROW_DESIGN_ACTION]: () => removeRow(),
        // KF-STBQBG: the moved design stays selected.
        [MOVE_ROW_DESIGN_EARLIER_ACTION]: () =>
          commit(moveRowDesign(doc.value, selectedNodeId()!, -1)),
        [MOVE_ROW_DESIGN_LATER_ACTION]: () =>
          commit(moveRowDesign(doc.value, selectedNodeId()!, 1)),
        [PROMOTE_ACTION]: () => promote(),
        [PROMOTE_PROP_ACTION]: (_event, target) =>
          promote(target.dataset.editorPromoteProp),
        [PROMOTE_FIELD_ACTION]: (_event, target) =>
          promoteField(
            JSON.parse(target.dataset.editorPromoteField!) as FieldPlace,
          ),
        [OUTLINE_ACTION]: (_event, target) => {
          leaveFieldEditor(target);
          const id = target.dataset.itemId!;
          const address = slotRowAddress(id);
          // An item slot row selects the node whose prop holds it (KF-SXDM56).
          select(
            address
              ? { kind: 'slot', address }
              : { kind: 'node', id: itemSlotRowNode(id) ?? id },
          );
        },
        [OUTLINE_TOGGLE_ACTION]: (_event, target) => {
          const next = new Set(collapsed.value);
          const id = target.dataset.itemId!;
          if (!next.delete(id)) next.add(id);
          collapsed.value = next;
        },
        [PROBLEM_ACTION]: (_event, target) =>
          select({ kind: 'node', id: target.dataset.itemId! }),
        [PALETTE_ACTION]: (_event, target) =>
          select({ kind: 'component', key: target.dataset.itemId! }),
        [PALETTE_DOCUMENT_ACTION]: (event, target) =>
          void insertFromLibrary(
            root,
            target.dataset.editorPaletteDocument!,
            (event as MouseEvent).altKey,
          ),
        [EXPORT_MODULE_ACTION]: () => exportAs('module'),
        [EXPORT_DECLARATIONS_ACTION]: () => exportAs('declarations'),
        // KF-QSSTMX: a new empty document; with storage it is a new draft,
        // and the previous document stays in its file.
        [NEW_ACTION]: () => load(emptyDocument()),
        [DOCUMENT_TAB_ACTION]: (_event, target) => {
          documentArea.value = target.dataset.tabId!.slice(
            DOCUMENT_AREAS.length + 1,
          ) as DocumentArea;
        },
        [INSPECTOR_TAB_ACTION]: (_event, target) => {
          inspectorArea.value = target.dataset.tabId!.slice(
            'editor-inspector-areas-'.length,
          ) as InspectorArea;
        },
        [EXTRACT_ACTION]: (_event, target) => {
          const dialog = root.querySelector<HTMLDialogElement>(
            `#${EXTRACT_DIALOG}`,
          )!;
          if (target.dataset.editorExtract === 'confirm') {
            void extract(dialog);
            return;
          }
          const path = autosave!.path.peek();
          extractError.value = '';
          extractPath.value = extractSuggestion(
            doc.value,
            isDraft(path) ? undefined : path,
            selectedNodeId()!,
          );
          // A path typed last time is not this node's: start from the
          // suggestion even when it is the same text as before.
          dialog.querySelector<HTMLInputElement>(
            '[data-editor-extract="path"] input',
          )!.value = extractPath.value;
          openDialog(dialog);
        },
        [SAVE_AS_ACTION]: (_event, target) => {
          const dialog = root.querySelector<HTMLDialogElement>(
            `#${SAVE_AS_DIALOG}`,
          )!;
          if (target.dataset.editorSaveAs !== 'confirm') {
            saveAsError.value = '';
            openDialog(dialog);
            return;
          }
          const path = dialog
            .querySelector<HTMLInputElement>(
              '[data-editor-save-as="path"] input',
            )!
            .value.trim()
            .replace(/^\.\//, '');
          if (!path.endsWith('.kui.json') || isDraft(path)) {
            saveAsError.value =
              'Name a .kui.json file outside the drafts folder.';
            return;
          }
          void autosave!.saveAs(path, fileText(doc.value)).then((failure) => {
            saveAsError.value = failure ?? '';
            if (!failure) closeDialog(dialog);
          });
        },
        [SAVE_ACTION]: () => {
          const document = doc.value;
          (options.save ?? download)(
            documentFileName(document),
            fileText(document),
          );
        },
      }),
      // KF-JV7XW1: a right-click (or the ContextMenu key) on an Outline row
      // or a canvas element selects its node and opens the node context menu
      // at the pointer. Play mode has none; the canvas is hidden then.
      on(root, 'contextmenu', (event) => {
        const mouse = event as MouseEvent;
        const at = playing.value
          ? undefined
          : contextNode(root, mouse.target as Element);
        if (!at) return;
        mouse.preventDefault();
        const box = at.element.getBoundingClientRect();
        const { clientX: x, clientY: y } = mouse;
        // The ContextMenu key's event has no pointer inside the element.
        const pointer =
          x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
        openContextMenu(root, at, pointer ? { x, y } : undefined);
      }),
      // A closing context menu returns focus to its zero-footprint anchor;
      // send it on to where the menu opened: the Outline's selected row
      // (the node, or the container it was embedded in), or the canvas
      // element when it takes focus.
      delegate(
        root,
        'focusin',
        `[${CONTEXT_MENU}] > .kui-popup-menu__context-anchor`,
        () => {
          const invoker = contextInvoker;
          contextInvoker = undefined;
          const outline = invoker?.closest('#editor-outline');
          const target = outline
            ? outline.querySelector<HTMLElement>(
                '[data-item-id][aria-selected="true"]',
              )
            : invoker;
          target?.focus({ preventScroll: true });
        },
      ),
      // Canvas clicks select the innermost node; the previewed document's own
      // links, buttons, and form controls never act.
      delegate(root, 'click', hook(HOOK.canvas), (event) => {
        // KF-PK3GVY: a rootless canvas's picker is the editor's own control.
        if ((event.target as Element).closest(hook(HOOK.empty, 'root'))) return;
        event.preventDefault();
        const placeholder = (event.target as Element).closest<HTMLElement>(
          hook(HOOK.slotAddress),
        );
        if (placeholder) {
          select({
            kind: 'slot',
            address: JSON.parse(
              placeholder.dataset.editorSlotAddress!,
            ) as SlotAddress,
          });
          return;
        }
        const node = (event.target as Element).closest<HTMLElement>(
          '[data-kerf-node]',
        );
        if (node && root.querySelector(hook(HOOK.canvas))!.contains(node)) {
          select({ kind: 'node', id: node.dataset.kerfNode! });
        }
      }),
      // KF-A9ZHGW: a TagField reports its next tags; its root carries the
      // prop or field place it edits. Wired on the Inspector and the field
      // dialog only, so its SearchField mechanics leave the palette's
      // filter alone.
      ...[
        root.querySelector<HTMLElement>('[data-workbench-rail="right"]')!,
        root.querySelector<HTMLElement>(`#${FIELD_DIALOG}`)!,
      ].map((scope) =>
        wireTagFields(scope, {
          onChange: ({ id, tags }) => {
            const host = [
              ...scope.querySelectorAll<HTMLElement>('[data-tag-field-id]'),
            ].find((field) => field.dataset.tagFieldId === id)!;
            const raw = JSON.stringify(tags);
            if (host.dataset.editorField) editField(host, raw);
            else editProp(host, raw);
          },
        }),
      ),
      // KF-EXA2WH: an application's field editors wire their own events;
      // each reads the context of the open value of its type, if any.
      ...Object.entries(options.fieldEditors ?? {}).flatMap(([name, editor]) =>
        editor.wire
          ? [
              editor.wire(root, () => {
                const open = activeField();
                if (!open) return undefined;
                const node = findNode(doc.value, open.node)!.node;
                const { type } = fieldContext(node, open);
                return customFor(type)?.name === name
                  ? editorContext(node, open)
                  : undefined;
              }),
            ]
          : [],
      ),
      // KF-CY1D5W: a list editor's rows reorder by drag or Alt+Shift+Arrow;
      // each list's id is the place of the list it edits.
      ...[
        root.querySelector<HTMLElement>('[data-workbench-rail="right"]')!,
        root.querySelector<HTMLElement>(`#${FIELD_DIALOG}`)!,
      ].map((scope) =>
        wireListReorder(scope, {
          onReorder: ({ listId, sourceIds, target }) => {
            const place = JSON.parse(listId!) as FieldPlace;
            const items = fieldContext(
              findNode(doc.value, selectedNodeId()!)!.node,
              place,
            ).value as ViewValue[];
            const indexed = items.map((item, index) => ({ item, index }));
            writeField(
              place,
              reorderListItems(
                indexed,
                (entry) => `item-${entry.index}`,
                sourceIds,
                target,
              ).map((entry) => entry.item),
            );
          },
        }),
      ),
      // KF-Z9S029: Back pops a field editor's pushed view; closing its
      // dialog closes the editor.
      wireNavStack(root.querySelector(`#${INSPECTOR_STACK}`)!, {
        onBack: fieldBack,
      }),
      (() => {
        const closed = (event: Event) => {
          const { id } = event.target as Element;
          if (id === FIELD_DIALOG) openField.value = null;
          if (id === ICON_DIALOG) iconPicker.value = null;
          if (id === REPLACE_DIALOG) pendingReplace.value = null;
        };
        root.addEventListener('close', closed, true);
        return () => root.removeEventListener('close', closed, true);
      })(),
      wireTreeList(root, {
        canDrop: (move) => dropFor(move) !== undefined,
        // KF-WKABP2: an inside drop with several places asks where.
        onMove: (move) => moveOrAsk(root, move),
      }),
      // KF-WKABP2: a replacing drop of authored content asks first.
      effect(() => {
        if (!pendingReplace.value) return;
        realmOf(root).requestAnimationFrame(() => {
          const dialog = root.querySelector<HTMLDialogElement>(
            `#${REPLACE_DIALOG}`,
          )!;
          if (!dialog.open) openDialog(dialog);
        });
      }),
      // Arrow keys move between a strip's tabs; nothing here reorders.
      wireTabBars(root, { onReorder: () => {} }),
      // KF-JC7WTW: the palette grid's tiles show their components as added.
      wirePaletteThumbnails(root, { htmlOf: thumbnailOf }),
      // KF-67K2VP: a rail's pinned tab strip shows its divider once its
      // area scrolls under it.
      wireScrollDividers(root),
      // KF-XX4Y95: a Form on the canvas (or in play) never navigates the
      // editor away when Enter in a field submits it.
      wireForms(root),
      wireCanvasDrag(root, {
        sourceOf: (element) => {
          const address = element.dataset.editorSlotAddress;
          if (address) {
            const { parent, zone, index } = JSON.parse(address) as SlotAddress;
            return slotRowId(parent, zone, index);
          }
          const id = element.dataset.kerfNode!;
          return isMovable(doc.value, id).placed ? id : undefined;
        },
        targetOf: (element) => {
          // KF-7BB55F: an empty zone's placeholder targets that zone.
          const empty = element.dataset.editorEmpty;
          if (empty === ROOT_EMPTY) return ROOT_TARGET;
          if (empty) return `${EMPTY_ZONE_TARGET}${empty}`;
          const address = element.dataset.editorSlotAddress;
          if (!address) return element.dataset.kerfNode!;
          const { parent, zone, index } = JSON.parse(address) as SlotAddress;
          return slotRowId(parent, zone, index);
        },
        canDrop: (move) => dropFor(move) !== undefined,
        onMove: (move) => moveOrAsk(root, move),
        // KF-WKABP2: a container's zones where they render, replacing a
        // node alone in its zone, and the menu a drop asks with.
        zonesOf: canvasZones,
        replaceOf: (element, sourceId) => {
          const node = canvasNode(element);
          return node ? replaceMove(sourceId, node.id) : undefined;
        },
        choicesOf: (element, sourceId) => {
          const node = canvasNode(element);
          return node
            ? dropChoicesFor(node.id, sourceId)
            : { choices: [], ambiguous: false };
        },
        choose: (choices, point) => askDrop(root, choices, point),
        // KF-WKABP2: a container's untouched seed placeholder ("Main") is
        // part of its container's zones; replacing it is the Main region.
        passesThrough: (element) => {
          const node = canvasNode(element);
          return node
            ? isSeedPlaceholder(doc.value, node.id, (key) =>
                componentNames.get(key)!,
              )
            : false;
        },
        // KF-PK3GVY: a rootless document's blank canvas takes its root.
        rootOf: () => doc.value.root?.id ?? ROOT_TARGET,
        labelOf: (sourceId) =>
          sourceId.startsWith(PALETTE_SOURCE)
            ? componentNames.get(sourceId.slice(PALETTE_SOURCE.length))!
            : sourceId.startsWith(DOCUMENT_SOURCE)
              ? documentName(sourceId.slice(DOCUMENT_SOURCE.length))
              : rowLabel(sourceId),
        captionOf: dropCaption,
        refusalOf: dropRefusal,
        // KF-67K2VP: a drag also drops on the outline's rows, and resting on
        // a Document tab opens it, so a palette drag can reach the outline.
        surfaces: [
          treeListExternalDrop(root, {
            canDrop: (move) => dropFor(move) !== undefined,
          }),
          springTabs(),
        ],
        // KF-FXACB5: a Library document drags as a `#view`.
        external: {
          selector: '[data-editor-palette], [data-editor-palette-document]',
          sourceOf: (element) =>
            element.dataset.editorPalette
              ? `${PALETTE_SOURCE}${element.dataset.editorPalette}`
              : `${DOCUMENT_SOURCE}${element.dataset.editorPaletteDocument}`,
        },
        onDragStart: (sourceId, altKey) => {
          if (!fromLibrary(sourceId)) return;
          // The read answers before most drops; a drop waits for it.
          const path = documentSource(sourceId);
          if (path !== undefined) void readLibraryDocument(path);
          libraryDragStarted(root, altKey);
        },
        onDragEnd: ({ sourceId, dropped, altKey }) => {
          if (fromLibrary(sourceId)) libraryDragEnded(root, dropped, altKey);
        },
      }),
      wireFilePickers(root, {
        onFiles: ({ files, id }) => {
          // wireFilePickers reports a choice only when it has files.
          void files[0]!.text().then((text) => {
            if (id === 'compare-module') {
              const current = contractOf(doc.value, viewCatalog, {
                resolveView,
              });
              lastExport.value = compareWithModule(text, current);
              return;
            }
            const parsed = parseDocument(text);
            // An opened file has no project path, so it becomes a draft.
            if (parsed.ok) load(parsed.document);
            else loadError.value = parsed.error;
          });
        },
      }),
      effect(() => {
        void selection.value;
        void doc.value;
        realmOf(root).requestAnimationFrame(() => placeHighlight(root));
      }),
      // KF-JWD51N: a different selection opens the Inspector at its top; an
      // edit to the same node keeps the place the author was working at.
      (() => {
        let shown = selectionKey(selection.peek());
        return effect(() => {
          const key = selectionKey(selection.value);
          if (key === shown) return;
          shown = key;
          realmOf(root).requestAnimationFrame(() => resetInspectorScroll(root));
        });
      })(),
    ];
    if (autosave) stops.push(...wireAutosave(root));
    stops.push(wirePlay(root), wireLibrary(root));
    const observer = new (realmOf(root).ResizeObserver)(() =>
      placeHighlight(root),
    );
    observer.observe(root.querySelector(hook(HOOK.canvas))!);
    return () => {
      observer.disconnect();
      for (const stop of stops) stop();
    };
  };

  return { render, wire, document: doc, selection, loadError };
}
