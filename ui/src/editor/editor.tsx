// The Kerf UI editor shell (docs/26-ui-editor.md; KF-4NRZCV: editor
// scaffold), published as `@kerfjs/ui/editor` (KF-6GT5QY: editor host). A
// Workbench with the document rail (problems, outline, and component
// palette), the canvas (the document rendered through interpretView), and
// the inspector that edits it, plus open, save, export, and compare of the
// generated view module. The host registers `@kerfjs/ui/popup-menu/register`
// and `@kerfjs/ui/select/register` and loads the global stylesheets, as for
// any Kerf UI app.

import {
  contractDigest,
  contractOf,
  fieldZoneOf,
  interpretView,
  lucideExportName,
  previewView,
  validateView,
  type ViewContract,
  type ViewDocument,
  type ViewNode,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';
import { delegate, effect, mount, type SafeHtml, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  FileCode,
  FilePlus,
  FolderOpen,
  GitCompare,
  icons as lucideIcons,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { PopupMenu } from '../components/actions/popup-menu/popup-menu.js';
import { Toolbar } from '../components/actions/toolbar/toolbar.js';
import { ToolbarControlGroup } from '../components/actions/toolbar-control-group/toolbar-control-group.js';
import { ToolbarText } from '../components/actions/toolbar-text/toolbar-text.js';
import { List } from '../components/collections/list/list.js';
import { ListActionRow } from '../components/collections/list-action-row/list-action-row.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import {
  TreeList,
  type TreeListNode,
} from '../components/collections/tree-list/tree-list.js';
import {
  treeListExternalDrop,
  type TreeListMove,
  wireTreeList,
} from '../components/collections/tree-list/wiring/wire-tree-list.js';
import {
  ValueTable,
  ValueTableRow,
} from '../components/data-display/value-table/value-table.js';
import { Badge } from '../components/feedback/badge/badge.js';
import { EmptyState } from '../components/feedback/empty-state/empty-state.js';
import { StateBanner } from '../components/feedback/state-banner/state-banner.js';
import { CheckboxGroup } from '../components/forms/checkbox-group/checkbox-group.js';
import { FilePickerTrigger } from '../components/forms/file-picker/file-picker.js';
import { wireFilePickers } from '../components/forms/file-picker/wiring/wire-file-pickers.js';
import {
  readSearchField,
  SearchField,
} from '../components/forms/search-field/search-field.js';
import { Select } from '../components/forms/select/select.js';
import { Switch } from '../components/forms/switch/switch.js';
import { TagField } from '../components/forms/tag-field/tag-field.js';
import { wireTagFields } from '../components/forms/tag-field/wiring/wire-tag-fields.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { Grid } from '../components/layout/grid/grid.js';
import { Row } from '../components/layout/row/row.js';
import { wireWorkbench } from '../components/layout/workbench/wiring/wire-workbench.js';
import { Workbench } from '../components/layout/workbench/workbench.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { wireNavStack } from '../components/navigation/nav-stack/wiring/wire-nav-stack.js';
import { TabBar } from '../components/navigation/tab-bar/tab-bar.js';
import { wireTabBars } from '../components/navigation/tab-bar/wiring/wire-tab-bars.js';
import { TabBarItem } from '../components/navigation/tab-bar-item/tab-bar-item.js';
import {
  closeDialog,
  DialogSurface,
  openDialog,
} from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { Text } from '../components/typography/text/text.js';
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
import { type CanvasDropSurface, wireCanvasDrag } from './canvas-drag.js';
import type { EditorCatalog } from './catalog.js';
import {
  ADD_SLOT_ACTION,
  addSlotFields,
  controlFlowSection,
  slotEditor,
} from './control-flow-section.js';
import {
  type FieldEditorContext,
  fieldEditorFor,
  type FieldEditors,
} from './field-editors.js';
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
  controlFor,
  type ControlKind,
  cssGrammar,
  cssHint,
  cssPlaceholder,
  CUSTOM_SIZE,
  isBinding,
  type SeedCatalog,
  seedNode,
  typeLabel,
  valueFromControl,
} from './model/controls.js';
import {
  documentFileName,
  findNode,
  parseDocument,
  serializeDocument,
  visitNodes,
} from './model/document.js';
import {
  dropPlacement,
  insertPlacement,
  moveDestinations,
  sourceOf,
} from './model/drop.js';
import {
  bindingOptions,
  History,
  insertNode,
  isMovable,
  legalZones,
  moveNode,
  newNodeId,
  paramTypeFor,
  placeChild,
  placeNode,
  promoteToParam,
  removeNode,
  renameNode,
  replaceRoot,
  setProp,
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
  appParamFor,
  containerFor,
  type FieldContainer,
  type FieldEditorKind,
  fieldEditorKind,
  type FieldPath,
  fieldSummary,
  fieldZoneKeys,
  listItemLabel,
  listMembers,
  memberFor,
  objectFields,
  propLabel,
  stepTitle,
  typeAt,
  valueAt,
  withValueAt,
} from './model/fields.js';
import { iconNames, matchIcons } from './model/icons.js';
import {
  groupedProps,
  type InspectorProp,
  inspectorSections,
} from './model/inspector.js';
import {
  itemSlotRowNode,
  nodeTitle,
  type OutlineNode,
  outlineParents,
  outlineRows,
  outlineTree,
  slotRowAddress,
  slotRowId,
  zoneLabel,
} from './model/outline.js';
import { type PreviewSlot, previewSlots } from './model/preview-slots.js';
import { type Problem, problemCounts, problemsOf } from './model/problems.js';
import { sampleInputs } from './model/sample-inputs.js';

export const WORKBENCH_ID = 'kerf-ui-editor';
const OUTLINE_ACTION = 'editor-select-node';
const OUTLINE_TOGGLE_ACTION = 'editor-toggle-node';
const PALETTE_ACTION = 'editor-show-component';
const PALETTE_CLEAR_ACTION = 'editor-clear-palette-filter';
const PROBLEM_ACTION = 'editor-select-problem';
const NEW_ACTION = 'editor-new';
// KF-MHY1GB: each rail switches between focus areas with a segmented tab strip.
const DOCUMENT_TAB_ACTION = 'editor-document-tab';
const INSPECTOR_TAB_ACTION = 'editor-inspector-tab';
/** The Document rail's tab strip id. */
const DOCUMENT_AREAS = 'editor-document-areas';
/** How long a drag rests on a tab before it opens. */
const SPRING_MS = 500;
type DocumentArea = 'outline' | 'components' | 'problems';
type InspectorArea = 'properties' | 'flow' | 'children';
const SAVE_ACTION = 'editor-save';
const SAVE_AS_ACTION = 'editor-save-as';
const SAVE_AS_DIALOG = 'editor-save-as-dialog';
const UNDO_ACTION = 'editor-undo';
const REDO_ACTION = 'editor-redo';
const MOVE_UP_ACTION = 'editor-move-up';
const MOVE_DOWN_ACTION = 'editor-move-down';
const DELETE_ACTION = 'editor-delete';
const ADD_ACTION = 'editor-add-child';
const REPLACE_ROOT_ACTION = 'editor-replace-root';
const CONTENT_TO_NODES_ACTION = 'editor-content-to-nodes';
const CONTENT_TO_TEXT_ACTION = 'editor-content-to-text';
const EXAMPLE_ACTION = 'editor-fill-example';
// KF-Z9S029: object forms in a pushed Inspector view or a dialog.
const FIELD_OPEN_ACTION = 'editor-open-field';
const FIELD_BACK_ACTION = 'editor-field-back';
const FIELD_DONE_ACTION = 'editor-field-done';
const FIELD_RESET_ACTION = 'editor-reset-field';
const FIELD_EXAMPLE_ACTION = 'editor-fill-field-example';
const FIELD_JSON_ACTION = 'editor-field-json';
const FIELD_DIALOG = 'editor-field-dialog';
const INSPECTOR_STACK = 'editor-inspector-stack';
// KF-VYRDDQ: icon data picks a Lucide icon in a searchable dialog.
const ICON_OPEN_ACTION = 'editor-open-icon';
const ICON_CHOOSE_ACTION = 'editor-choose-icon';
const ICON_REMOVE_ACTION = 'editor-remove-icon';
const ICON_CLEAR_ACTION = 'editor-clear-icon-search';
const ICON_DIALOG = 'editor-icon-dialog';
// KF-CY1D5W: a list of objects or union items edits item by item.
const FIELD_ADD_ITEM_ACTION = 'editor-add-item';
const FIELD_REMOVE_ITEM_ACTION = 'editor-remove-item';
// KF-EXA2WH: an application field editor's button sets its value.
const FIELD_SET_ACTION = 'editor-set-field';
const PROMOTE_ACTION = 'editor-promote';
const EXPORT_MODULE_ACTION = 'editor-export-module';
const EXPORT_DECLARATIONS_ACTION = 'editor-export-declarations';
const DOCUMENT_TOGGLE = 'editor-toggle-document';
const INSPECTOR_TOGGLE = 'editor-toggle-inspector';
/** How far the selection ring reaches outside its box: 3px plus 1px offset. */
const RING_REACH = 4;

/** What the inspector shows: a document node or a palette component. */
export type Selection =
  | { readonly kind: 'node'; readonly id: string }
  | { readonly kind: 'component'; readonly key: string }
  | { readonly kind: 'slot'; readonly address: SlotAddress }
  | null;

// interpretView reads `$icon` names; Lucide exports icons by PascalCase name.
const icons = new Proxy({} as Record<string, unknown>, {
  get: (_target, name) =>
    (lucideIcons as Record<string, unknown>)[lucideExportName(String(name))],
});

/** A slot's placeholder on the canvas: the app fills slots at runtime. */
/**
 * The placeholders for one preview's slots, each marked with where its
 * `$slot` sits so the canvas can select it (KF-5RKX3W).
 */
const slotPlaceholders = (placed: ReadonlyMap<string, PreviewSlot>) =>
  new Proxy({} as Record<string, () => SafeHtml>, {
    get: (_target, name) => {
      // previewSlots names every slot placed in a zone; any other name is a
      // slot inside a prop value (KF-SXDM56), which selects with its node.
      const slot = placed.get(String(name));
      return () =>
        slot
          ? Text({
              children: `${slot.name} slot`,
              tone: 'quiet',
              'data-editor-slot-address': JSON.stringify(slot.address),
            })
          : Text({ children: `${String(name)} slot`, tone: 'quiet' });
    },
  });

/** The canvas renderer for one catalog. */
function canvasRenderer(catalog: EditorCatalog) {
  const { viewCatalog, componentNames, components, placeholders } = catalog;
  /** Stands in for a node the preview cannot render; still selectable. */
  const brokenNode = (node: ViewNode): SafeHtml =>
    Badge({
      tone: 'danger',
      children: `${node.name ?? nodeTitle(node, componentNames)} cannot render`,
      rootAttributes: { 'data-kerf-node': node.id },
    });

  /** Renders the document onto the canvas, or explains why it cannot. */
  return (source: ViewDocument, problems: readonly Problem[]): SafeHtml => {
    const { document, slots: placed } = previewSlots(source);
    const preview = {
      catalog: viewCatalog,
      components,
      inputs: sampleInputs(
        document,
        (label) => Text({ children: label }),
        (key) => placeholders[key]?.(),
      ),
      slots: slotPlaceholders(placed),
      icons,
    };
    // A node whose component has no function here (an application component
    // its host did not register) previews as a placeholder too (KF-6GT5QY).
    const unregistered = visitNodes(document).flatMap(({ node }) =>
      node.type.startsWith('#') || node.type in components ? [] : [node.id],
    );
    // A document with problems still previews (KF-F355BF): each node a problem
    // is about renders as a placeholder and everything else renders normally.
    if (problems.length || unregistered.length) {
      return previewView(document, {
        ...preview,
        broken: new Set([
          ...problems.flatMap(({ nodeId }) => (nodeId ? [nodeId] : [])),
          ...unregistered,
        ]),
        placeholder: brokenNode,
      });
    }
    try {
      return interpretView(document, {
        ...preview,
        // The editor previews any document, so it checks it against itself.
        contract: contractDigest(contractOf(document, viewCatalog)),
      });
    } catch (error) {
      return cannotPreview(error);
    }
  };
}

const cannotPreview = (error: unknown) =>
  EmptyState({
    title: 'This document cannot be previewed',
    detail: (error as Error).message,
  });

/**
 * The preview, or why it cannot render (KF-P6FPG2). The canvas is part of
 * the editor's own render, so a preview that fails when mounted (such as a
 * repeated row whose markup the HTML parser splits into two elements) would
 * stop the whole editor from updating. Mounting it once into a detached
 * element first catches that failure here. This must run outside the
 * editor's render: a mount sets kerf's render context for its own pass and
 * clears it afterwards.
 */
function contained(preview: SafeHtml): SafeHtml {
  const probe = globalThis.document.createElement('div');
  try {
    mount(probe, () => preview)();
    return preview;
  } catch (error) {
    return cannotPreview(error);
  }
}

/** A new document: an empty Pane in Kerf UI's catalog. */
export function emptyDocument(): ViewDocument {
  return {
    schema: 'kerf-ui-document/v1',
    name: 'Untitled',
    catalogs: ['@kerfjs/ui'],
    root: { id: newNodeId(), type: '@kerfjs/ui:pane' },
  } as ViewDocument;
}

export {
  devServerStorage,
  EDITOR_FILE_API,
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
}

/** An inspector control's current value: a Select's, a switch's, or a field's. */
function controlValue(field: HTMLElement): string | boolean {
  // The host registers `kui-select`, whose element reports its value.
  if (field.localName === 'kui-select')
    return (field as HTMLElement & { value: string }).value;
  // A CheckboxGroup's checked values, in its choices' order (KF-A9ZHGW).
  if (field.dataset.editorKind === 'enum-set')
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

/** Where an inspector control writes: a prop, or a field inside one. */
interface FieldPlace {
  readonly prop: string;
  readonly path: FieldPath;
}

/** An open field editor (KF-Z9S029): a place in the selected node's prop. */
interface OpenField extends FieldPlace {
  readonly node: string;
  readonly container: FieldContainer;
}

/** A place's key for its error and Custom size state: `gap`, `mainPane.gap`. */
const placeKey = (place: FieldPlace) => [place.prop, ...place.path].join('.');

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
  const canvasContent = canvasRenderer(catalog);
  /** The type table component `key`'s props catalog declares. */
  const definitionsOf = (key: string) =>
    viewCatalog.components.get(key)?.definitions ?? {};
  const doc = signal<ViewDocument>(options.document ?? emptyDocument());
  const selection = signal<Selection>(null);
  const loadError = signal<string | null>(null);
  // Editing (KF-KX77TV): every change goes through commit(), so the
  // document stays the only state and undo/redo restores whole documents.
  const history = new History();
  const historyVersion = signal(0);
  const autosave = options.storage && createAutosave(options.storage);
  const documentArea = signal<DocumentArea>('outline');
  const inspectorArea = signal<InspectorArea>('properties');
  const saveAsError = signal('');
  const fieldErrors = signal<Readonly<Record<string, string>>>({});
  const addZone = signal('');
  const addComponent = signal('');
  const rootComponent = signal('');
  const promoteProp = signal('');
  const bindProp = signal('');
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
  /** Every Lucide icon's document name, listed on first use. */
  let allIcons: readonly string[] | undefined;
  /** The Components filter's text (KF-Y26SKM), and its editor's revision. */
  const paletteFilter = signal('');
  const paletteFilterRevision = signal(0);
  // Every caller passes a changed document (edits clone; moves are checked
  // against isMovable first).
  const commit = (next: ViewDocument) => {
    history.record(doc.value);
    doc.value = ownFilledFields(next);
    fieldErrors.value = {};
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
        ...(slotRowAddress(node.id) || isMovable(document, node.id).remove
          ? { draggable: true }
          : {}),
        ...(node.children ? { children: toTree(node.children) } : {}),
      }));
    const tree = outlineTree(document, componentNames);
    const closed = collapsed.value;
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

  /** One row per diagnostic; a row about a node selects it. */
  const problemRows = (problems: readonly Problem[]) =>
    problems.map(({ diagnostic, nodeId }, index) => (
      <ListItem
        action={PROBLEM_ACTION}
        itemId={nodeId ?? `document-${index}`}
        label={diagnostic.message}
        description={`${diagnostic.code} · ${diagnostic.path}`}
        multiline
        disabled={!nodeId}
      />
    ));

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

  // KF-K2VP9A / KF-YR81M0: each category is its own List under a default
  // ListHeader, spaced apart as the catalog's sidebar sections are.
  const palette = (groups: ReturnType<typeof paletteMatches>) => (
    <List gap="m">
      {groups.map((group) => (
        <List>
          <ListHeader label={group.category} />
          {group.items.map((item) => (
            <ListItem
              action={PALETTE_ACTION}
              itemId={item.key}
              label={item.name}
              // KF-78MHM8: a palette row drags onto the canvas to add one.
              rootAttributes={{ 'data-editor-palette': item.key }}
              selected={
                selection.value?.kind === 'component' &&
                selection.value.key === item.key
              }
            />
          ))}
        </List>
      ))}
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
   * `document` with each filled field zone owning its field (KF-PD6QC5): a
   * placeholder the prop value held there (a seeded item slot, text) gives
   * way to the zone's nodes, so the two never clash.
   */
  const ownFilledFields = (document: ViewDocument): ViewDocument => {
    let next = document;
    for (const { node } of visitNodes(document)) {
      for (const [key, children] of Object.entries(node.zones ?? {})) {
        const component = viewCatalog.components.get(node.type);
        const field =
          component &&
          fieldZoneOf(component.component, component.definitions, key);
        const own = node.props?.[field?.prop ?? ''] as ViewValue | undefined;
        if (
          !field ||
          !children.length ||
          valueAt(own, field.path) === undefined
        )
          continue;
        // An object left with no other field stays, so the prop still
        // reads as set (its rail kind, its toolbar).
        next = setProp(
          next,
          node.id,
          field.prop,
          withValueAt(own, field.path, undefined) ?? {},
        );
      }
    }
    return next;
  };

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

  /** One editable control for a prop, or a read-only row's worth of text. */
  const propControl = (
    prop: (typeof propsByKey extends ReadonlyMap<string, infer C>
      ? C
      : never)['props'][number],
    value: ViewDocument['root']['props'] extends infer P
      ? P extends Record<string, infer V>
        ? V
        : never
      : never,
    /** The node's component key, whose catalog types the prop. */
    type: string,
    /** A field inside a prop (KF-Z9S029: object forms); the prop itself by default. */
    place: FieldPlace = { prop: prop.name, path: [] },
  ): SafeHtml | undefined => {
    const control = controlFor(prop, value, definitionsOf(type));
    const key = placeKey(place);
    const error = fieldErrors.value[key];
    const marker = (kind: ControlKind) =>
      place.path.length
        ? {
            'data-editor-field': JSON.stringify(place),
            'data-editor-kind': kind,
          }
        : { 'data-editor-prop': place.prop, 'data-editor-kind': kind };
    // KF-PE0PTT: a color field suggests color builders, not a length.
    const grammar = cssGrammar(prop.type as never, definitionsOf(type));
    const builderField = (raw: string) => (
      <TextField
        label={`${propLabel(prop.name)} value`}
        value={raw}
        hint={cssHint(prop.cssValue?.helpers, grammar)}
        placeholder={cssPlaceholder(prop.cssValue?.helpers, grammar)}
        error={error}
        rootAttributes={marker('css')}
      />
    );
    switch (control.kind) {
      case 'size': {
        // A keyword Select, and the builder field while the value is custom.
        const custom =
          control.raw === CUSTOM_SIZE ||
          (control.raw === '' &&
            customSize.value === `${selectedNodeId()} ${key}`);
        return (
          <>
            <Select
              name={`prop-${key}`}
              label={propLabel(prop.name)}
              value={custom ? CUSTOM_SIZE : String(control.raw)}
              choices={control.choices!.map((choice) => ({
                value: choice,
                label:
                  choice === ''
                    ? prop.default !== undefined
                      ? `Default (${String(prop.default)})`
                      : 'Not set'
                    : choice === CUSTOM_SIZE
                      ? 'Custom…'
                      : choice,
              }))}
              rootAttributes={marker('size')}
            />
            {custom ? builderField(control.css ?? '') : undefined}
          </>
        );
      }
      case 'select':
        return (
          <Select
            name={`prop-${key}`}
            label={propLabel(prop.name)}
            value={String(control.raw)}
            choices={control.choices!.map((choice) => ({
              value: choice,
              label:
                choice === ''
                  ? prop.default !== undefined
                    ? `Default (${String(prop.default)})`
                    : 'Not set'
                  : choice,
            }))}
            rootAttributes={marker('select')}
          />
        );
      case 'switch':
        return (
          <Switch
            label={propLabel(prop.name)}
            checked={control.raw === true}
            rootAttributes={marker('switch')}
          />
        );
      case 'readonly':
        return undefined;
      case 'icon':
        return iconRow(propLabel(prop.name), String(control.raw), place);
      // KF-3CKTKN: a typed value from a Select, and an open member's own
      // control (text, a number, a list) or form (an object) beneath it.
      case 'choice': {
        const member = control.member && {
          name: `${propLabel(prop.name)} value`,
          type: control.member as InspectorProp['type'],
          required: false,
        };
        return (
          <>
            <Select
              name={`prop-${key}`}
              label={propLabel(prop.name)}
              value={String(control.raw)}
              choices={[
                {
                  value: '',
                  label:
                    prop.default !== undefined
                      ? `Default (${String(prop.default)})`
                      : 'Not set',
                },
                ...control.options!.map(({ value, label }) => ({
                  value,
                  label,
                })),
              ]}
              rootAttributes={marker('choice')}
            />
            {member
              ? fieldEditorKind(member.type as never, definitionsOf(type)) ===
                'object'
                ? configureRow(propLabel(prop.name), value as ViewValue, place)
                : propControl(member, value, type, place)
              : undefined}
          </>
        );
      }
      // KF-A9ZHGW: strings edit inline as tags, enum values as checkboxes.
      case 'tags':
        return (
          <TagField
            id={`editor-tags-${key}`}
            label={propLabel(prop.name)}
            tags={JSON.parse(String(control.raw)) as string[]}
            error={error}
            rootAttributes={marker('tags')}
          />
        );
      case 'enum-set':
        return (
          <CheckboxGroup
            label={propLabel(prop.name)}
            name={`prop-${key}`}
            choices={control.choices!.map((choice) => ({
              value: choice,
              label: choice,
            }))}
            value={JSON.parse(String(control.raw)) as string[]}
            error={error}
            rootAttributes={marker('enum-set')}
          />
        );
      case 'list': {
        // A list or object literal as JSON (KF-HNNWN9), with a placeholder
        // to start from while a required one is unset.
        // Whether there is an example; Fill with example names its slots.
        const example = exampleValue(
          prop.type as never,
          definitionsOf(type),
          prop.name,
          slotNamer(usedSlots(doc.value)),
        );
        return (
          <>
            <TextField
              label={propLabel(prop.name)}
              value={String(control.raw)}
              multiline
              rows={control.raw === '' ? 2 : 4}
              maxRows={12}
              hint={`JSON for ${typeLabel(prop.type.text!)}.`}
              error={error}
              rootAttributes={marker('list')}
            />
            {prop.required &&
            control.raw === '' &&
            example !== undefined &&
            !place.path.length ? (
              <Button
                emphasis="secondary"
                size="compact"
                action={EXAMPLE_ACTION}
                rootAttributes={{ 'data-editor-example': prop.name }}
              >
                Fill with example
              </Button>
            ) : undefined}
          </>
        );
      }
      default:
        return (
          <TextField
            label={propLabel(prop.name)}
            value={String(control.raw)}
            type={control.kind === 'number' ? 'number' : 'text'}
            hint={
              control.kind === 'css'
                ? cssHint(prop.cssValue?.helpers, grammar)
                : undefined
            }
            placeholder={
              control.kind === 'css'
                ? cssPlaceholder(prop.cssValue?.helpers, grammar)
                : prop.default !== undefined
                  ? String(prop.default)
                  : undefined
            }
            error={error}
            rootAttributes={marker(control.kind)}
          />
        );
    }
  };

  /**
   * The row that opens an object's form (KF-Z9S029): its name, what it
   * holds, and a chevron, in place of the JSON field.
   */
  const configureRow = (
    label: string,
    value: ViewValue | undefined,
    place: FieldPlace,
  ) => (
    <ListItem
      label={label}
      status={fieldSummary(value)}
      accessibleLabel={`Configure ${label.toLowerCase()}`}
      action={FIELD_OPEN_ACTION}
      trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
      rootAttributes={{ 'data-editor-open': JSON.stringify(place) }}
    />
  );

  /** A Lucide icon by its document name, or nothing for an unknown name. */
  const iconOf = (name: string) => {
    const node = icons[name] as Parameters<typeof LucideIcon>[0]['icon'];
    return node ? <LucideIcon icon={node} name={name} /> : undefined;
  };

  /**
   * The row that opens the icon picker for icon data (KF-VYRDDQ): the
   * chosen icon and its name, in place of the JSON field.
   */
  const iconRow = (label: string, name: string, place: FieldPlace) => (
    <ListItem
      label={label}
      icon={name ? iconOf(name) : undefined}
      status={name || 'Not set'}
      accessibleLabel={
        /icon$/i.test(label)
          ? `Choose ${label.toLowerCase()}`
          : `Choose ${label.toLowerCase()} icon`
      }
      action={ICON_OPEN_ACTION}
      trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
      rootAttributes={{ 'data-editor-icon-place': JSON.stringify(place) }}
    />
  );

  /**
   * The icon picker: a search over the Lucide names and the matching icons
   * themselves; choosing one writes `{ $icon: name }`.
   */
  const iconDialog = () => {
    const place = iconPicker.value;
    const id = selectedNodeId();
    const open = place && id ? place : undefined;
    const current = open
      ? (
          valueAt(
            findNode(doc.value, id!)!.node.props?.[open.prop] as
              ViewValue | undefined,
            open.path,
          ) as { $icon?: string } | undefined
        )?.$icon
      : undefined;
    if (open) allIcons ??= iconNames(lucideIcons);
    const found = open
      ? matchIcons(allIcons!, iconQuery.value)
      : { names: [], total: 0 };
    return (
      <DialogSurface
        id={ICON_DIALOG}
        label={open ? `Choose ${stepTitle(open)}` : 'Choose an icon'}
        size="medium"
        rootAttributes={{ 'data-key': ICON_DIALOG }}
        footer={
          <>
            {current ? (
              <Button action={ICON_REMOVE_ACTION}>Remove icon</Button>
            ) : undefined}
            <Button rootAttributes={{ 'data-dialog-close': '' }}>Cancel</Button>
          </>
        }
      >
        <List controlInsets="trbl" gap>
          <SearchField
            id="editor-icon-search"
            label="Search icons"
            placeholder="Search icons"
            query={iconQuery.value}
            revision={iconQueryRevision.value}
            clearAction={ICON_CLEAR_ACTION}
            clearLabel="Clear Search"
            editorAttributes={{ 'data-editor-icon-search': '' }}
          />
          <Text tone="quiet">
            {found.total > found.names.length
              ? `Showing ${found.names.length} of ${found.total} icons; search to narrow them.`
              : `${found.total} ${found.total === 1 ? 'icon' : 'icons'}`}
          </Text>
          <Grid minColumnWidth={px(44)} gap="s">
            {found.names.map((name) => (
              <Button
                icon={iconOf(name)!}
                ariaLabel={name}
                title={name}
                emphasis="secondary"
                pressed={name === current}
                action={ICON_CHOOSE_ACTION}
                rootAttributes={{ 'data-editor-icon': name }}
              />
            ))}
          </Grid>
        </List>
      </DialogSurface>
    );
  };

  /** What a field of the selected node's prop is: its type and value. */
  const fieldContext = (node: ViewNode, place: FieldPlace) => {
    const prop = propsByKey
      .get(node.type)!
      .props.find((item) => item.name === place.prop)!;
    const definitions = definitionsOf(node.type);
    const propValue = node.props?.[place.prop] as ViewValue | undefined;
    const value = valueAt(propValue, place.path);
    return {
      definitions,
      // A union's value edits as the member it holds (KF-3CKTKN).
      type: memberFor(
        typeAt(prop.type as never, definitions, place.path, propValue),
        definitions,
        value,
      ),
      value,
    };
  };

  /** Whether a structured kind opens its own editor rather than JSON. */
  const opensEditor = (kind: FieldEditorKind) =>
    kind === 'object' || kind === 'object-list' || kind === 'union-list';

  /** Whether a step's scalar type has a control of its own, not JSON. */
  const opensScalar = (
    prop: InspectorProp,
    value: ViewValue | undefined,
    definitions: Parameters<typeof controlFor>[2],
  ) => {
    const kind = controlFor(prop, value, definitions).kind;
    return kind !== 'list' && kind !== 'readonly';
  };

  /** A step's title: a field's name, or a list item's label ("Choice 2"). */
  const stepLabel = (node: ViewNode, place: FieldPlace) => {
    const index = place.path.at(-1);
    return typeof index === 'number'
      ? listItemLabel(fieldContext(node, place).value, index)
      : stepTitle(place);
  };

  /**
   * A list step (KF-CY1D5W): one row per item, labeled from the item and
   * opening its form, with Remove and drag-reorder; Add appends an item,
   * or for a union list offers each member in an Add menu.
   */
  const listStep = (
    node: ViewNode,
    place: FieldPlace,
    actions: (lead: SafeHtml) => SafeHtml,
  ) => {
    const { definitions, type, value } = fieldContext(node, place);
    const items = Array.isArray(value) ? value : [];
    const members = listMembers(type, definitions, stepTitle(place));
    const union = members.length > 1;
    const itemType = (resolveType(type, definitions) as { items?: ViewType })
      .items;
    const step = JSON.stringify(place);
    const rows = items.map((item, index) => {
      const at = { prop: place.prop, path: [...place.path, index] };
      const label = listItemLabel(item, index);
      const member = memberFor(itemType, definitions, item);
      // A union list's row names its member, unless the label already does.
      const kind = union
        ? members.find((option) => option.type === member)?.label
        : undefined;
      return (
        <ListActionRow
          label={label}
          description={kind === label ? undefined : kind}
          action={FIELD_OPEN_ACTION}
          itemId={`item-${index}`}
          draggable
          rootAttributes={{ 'data-editor-open': JSON.stringify(at) }}
          trailingAction={FIELD_REMOVE_ITEM_ACTION}
          trailingActionLabel={`Remove ${label}`}
          trailingActionIcon={<LucideIcon icon={Trash2} name="trash-2" />}
          trailingActionAttributes={{ 'data-editor-item': JSON.stringify(at) }}
        />
      );
    });
    const add = union ? (
      <PopupMenu
        text="Add"
        emphasis="secondary"
        size="compact"
        icon={<LucideIcon icon={Plus} name="plus" />}
        items={members.map((member, index) => ({
          label: member.label,
          action: FIELD_ADD_ITEM_ACTION,
          attributes: {
            'data-editor-step': step,
            'data-editor-member': String(index),
          },
        }))}
      />
    ) : (
      <Button
        emphasis="secondary"
        size="compact"
        icon={<LucideIcon icon={Plus} name="plus" />}
        action={FIELD_ADD_ITEM_ACTION}
        rootAttributes={{
          'data-editor-step': step,
          'data-editor-member': '0',
        }}
      >
        Add
      </Button>
    );
    return (
      <List>
        {rows.length ? (
          <List rootAttributes={{ 'data-list-id': step }}>{rows}</List>
        ) : (
          <ListInsetText>
            <Text tone="quiet">No items yet.</Text>
          </ListInsetText>
        )}
        {actions(add)}
      </List>
    );
  };

  /**
   * One step of a field editor (KF-Z9S029): an object's form, built from
   * its fields with the Inspector's controls, nested objects opening the
   * same way again; or its typed JSON, the escape hatch. Reset and Fill
   * with example act on the whole step.
   */
  const fieldStep = (node: ViewNode, place: FieldPlace) => {
    const { definitions, type, value } = fieldContext(node, place);
    const key = placeKey(place);
    const step = { 'data-editor-step': JSON.stringify(place) };
    const kind = fieldEditorKind(type, definitions);
    const custom = customFor(type);
    const structured = Boolean(custom) || opensEditor(kind);
    const form = structured && !jsonSteps.value.has(key);
    // A list's text item (a Combobox suggestion) edits in its own control.
    const scalar = { name: stepLabel(node, place), type, required: true };
    if (!structured && opensScalar(scalar as never, value, definitions))
      return (
        <List controlInsets="trbl" gap>
          {propControl(scalar as never, value as never, node.type, place)}
        </List>
      );
    const example = exampleValue(
      type,
      definitions,
      stepTitle(place),
      slotNamer(usedSlots(doc.value)),
    );
    // A list's Add leads the row of actions (KF-CY1D5W).
    const actions = (lead?: SafeHtml) => (
      <List controlInsets="trbl">
        <Row gap="s" wrap>
          {lead}
          <Button
            emphasis="secondary"
            size="compact"
            action={FIELD_JSON_ACTION}
            rootAttributes={step}
          >
            {form
              ? 'Edit as JSON'
              : kind === 'object' || custom
                ? 'Edit as form'
                : 'Edit as list'}
          </Button>
          <Button
            emphasis="secondary"
            size="compact"
            action={FIELD_RESET_ACTION}
            disabled={value === undefined}
            rootAttributes={step}
          >
            Reset
          </Button>
          {/* An object of only optional fields has nothing to fill. */}
          {example !== undefined && JSON.stringify(example) !== '{}' ? (
            <Button
              emphasis="secondary"
              size="compact"
              action={FIELD_EXAMPLE_ACTION}
              rootAttributes={step}
            >
              Fill with example
            </Button>
          ) : undefined}
        </Row>
      </List>
    );
    if (!form) {
      return (
        <List>
          <List controlInsets="trbl" gap>
            <TextField
              label={stepTitle(place)}
              value={value === undefined ? '' : JSON.stringify(value, null, 2)}
              multiline
              rows={value === undefined ? 2 : 6}
              maxRows={20}
              hint={`JSON for ${typeLabel(type!.text!)}.`}
              error={fieldErrors.value[key]}
              rootAttributes={{
                'data-editor-field': JSON.stringify(place),
                'data-editor-kind': 'list',
              }}
            />
          </List>
          {actions()}
        </List>
      );
    }
    // An application's editor for the type replaces the form (KF-EXA2WH).
    if (custom && form)
      return (
        <List>
          {custom.editor.render(editorContext(node, place))}
          {actions()}
        </List>
      );
    if (kind !== 'object') return listStep(node, place, actions);
    return (
      <List>
        {objectForm(node, place)}
        {actions()}
      </List>
    );
  };

  /**
   * An object's type-driven form: its fields with the Inspector's controls,
   * nested objects, lists, icons, and app-edited types as rows that open
   * their own editors, and fields no control edits as a value table.
   */
  const objectForm = (node: ViewNode, place: FieldPlace) => {
    const { definitions, type, value } = fieldContext(node, place);
    const record = (value ?? {}) as Record<string, ViewValue>;
    const editable: SafeHtml[] = [];
    const nested: SafeHtml[] = [];
    const fixed: { name: string; value: string }[] = [];
    for (const field of objectFields(type, definitions)) {
      const at = { prop: place.prop, path: [...place.path, field.name] };
      const fieldValue = record[field.name];
      const control = controlFor(field, fieldValue, definitions);
      if (customFor(field.type as never)) {
        nested.push(configureRow(propLabel(field.name), fieldValue, at));
      } else if (control.kind === 'readonly') {
        fixed.push({
          name: field.name,
          value:
            fieldValue === undefined
              ? typeLabel(field.type.text!)
              : JSON.stringify(fieldValue),
        });
      } else if (control.kind === 'icon') {
        nested.push(iconRow(propLabel(field.name), String(control.raw), at));
      } else if (
        control.kind === 'list' &&
        opensEditor(
          fieldEditorKind(field.type as never, definitions, field.iconSource),
        )
      ) {
        nested.push(configureRow(propLabel(field.name), fieldValue, at));
      } else {
        editable.push(propControl(field, fieldValue as never, node.type, at)!);
      }
    }
    return (
      <List>
        {editable.length ? (
          <List controlInsets="trbl" gap>
            {editable}
          </List>
        ) : undefined}
        {nested.length ? <List>{nested}</List> : undefined}
        {fixed.length ? (
          <ValueTable label={`${stepTitle(place)} fields`} density="compact">
            {fixed.map((row) => (
              <ValueTableRow label={row.name} value={row.value} />
            ))}
          </ValueTable>
        ) : undefined}
      </List>
    );
  };

  /** An application's field editor for `type`, if one is registered. */
  const customFor = (type: ViewType | undefined) =>
    fieldEditorFor(type, options.fieldEditors);

  /**
   * What an application's field editor renders from (KF-EXA2WH): the value
   * at `place` in the selected node's prop, and how to change it.
   */
  const editorContext = (
    node: ViewNode,
    place: FieldPlace,
  ): FieldEditorContext => {
    const { definitions, type, value } = fieldContext(node, place);
    return {
      value,
      type: type!,
      definitions,
      commit: (next) => {
        writeField(place, next);
      },
      setAction: FIELD_SET_ACTION,
      set: (next) => ({
        'data-editor-step': JSON.stringify(place),
        'data-editor-value': next === undefined ? '' : JSON.stringify(next),
      }),
      control: (path, kind) => ({
        'data-editor-field': JSON.stringify({
          prop: place.prop,
          path: [...place.path, ...path],
        }),
        'data-editor-kind': kind,
      }),
      form: (path = []) =>
        objectForm(node, { prop: place.prop, path: [...place.path, ...path] }),
    };
  };

  /**
   * The open field editor, when it still belongs to the selected node: a
   * selection change or an undo that removes the node closes it.
   */
  const activeField = (): OpenField | null => {
    const open = openField.value;
    return open && open.node === selectedNodeId() ? open : null;
  };

  /** Every step of a field editor's path, the prop first. */
  const fieldSteps = (open: FieldPlace): FieldPlace[] =>
    Array.from({ length: open.path.length + 1 }, (_, index) => ({
      prop: open.prop,
      path: open.path.slice(0, index),
    }));

  /** The pushed Inspector views of a field editor open as a subview. */
  const fieldViews = () => {
    const open = activeField();
    if (open?.container !== 'subview') return [];
    const node = findNode(doc.value, open.node)!.node;
    return fieldSteps(open).map((place) => ({
      key: `field-${placeKey(place)}`,
      toolbar: { title: stepLabel(node, place) },
      content: fieldStep(node, place),
    }));
  };

  /** The dialog a field editor opens in when it is too big for the rail. */
  const fieldDialog = () => {
    const open = activeField();
    const place = open?.container === 'dialog' ? open : undefined;
    const node = place && findNode(doc.value, place.node)!.node;
    return (
      <DialogSurface
        id={FIELD_DIALOG}
        label={place ? stepLabel(node!, place) : 'Field'}
        size="medium"
        rootAttributes={{ 'data-key': FIELD_DIALOG }}
        footer={
          <>
            {place?.path.length ? (
              <Button action={FIELD_BACK_ACTION}>Back</Button>
            ) : undefined}
            <Button tone="brand" action={FIELD_DONE_ACTION}>
              Done
            </Button>
          </>
        }
      >
        {node
          ? fieldStep(node, { prop: place!.prop, path: place!.path })
          : undefined}
      </DialogSurface>
    );
  };

  /**
   * A text-accepting content prop (KF-YR91FA): its text field with Use as
   * nodes, or, while its zone holds nodes, a note with Use as text when
   * those nodes are one text run. Undefined for every other prop.
   */
  const contentControl = (
    node: ViewDocument['root'],
    prop: (typeof propsByKey extends ReadonlyMap<string, infer C>
      ? C
      : never)['props'][number],
  ) => {
    if (!prop.slot || !(prop.type as { acceptsText?: true }).acceptsText)
      return undefined;
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
    return { up: index > 0, down: index < count - 1, remove: true };
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
          <LucideIcon icon={Trash2} name="trash-2" />
        </button>
      </ToolbarControlGroup>
    );
  };

  /**
   * Bind a prop to a document param or an in-scope `$each` item field
   * (KF-K5TKCV): the sources the validator accepts for the chosen prop.
   */
  const bindSection = (
    node: ViewDocument['root'],
    component: NonNullable<ReturnType<typeof propsByKey.get>>,
  ) => {
    const bindable = component.props.filter(
      (prop) => prop.control !== 'hidden' && !prop.zone,
    );
    const prop =
      bindable.find((item) => item.name === bindProp.value) ?? bindable[0];
    if (!prop) return undefined;
    const options = bindingOptions(doc.value, viewCatalog, node.id, prop.name);
    const current = node.props?.[prop.name];
    const bound =
      current !== null &&
      typeof current === 'object' &&
      ('$param' in current || '$bind' in current)
        ? JSON.stringify(current)
        : '';
    const choices = [
      { value: '', label: 'Not bound' },
      ...options.map((option) => ({
        value: JSON.stringify(option.value),
        label: option.label,
      })),
    ];
    return (
      <>
        <ListHeader label="Bind a prop" size="xs" />
        <List controlInsets="trbl" gap>
          <Select
            name="bind-prop"
            label="Prop"
            value={prop.name}
            choices={bindable.map((item) => ({
              value: item.name,
              label: item.name,
            }))}
            rootAttributes={{ 'data-editor-bind': 'prop' }}
          />
          <Select
            name="bind-source"
            label="Source"
            value={
              choices.some((choice) => choice.value === bound) ? bound : ''
            }
            choices={choices}
            hint={
              options.length
                ? undefined
                : 'No param or item field in scope fits this prop.'
            }
            rootAttributes={{
              'data-editor-bind': 'source',
              'data-editor-bind-prop': prop.name,
            }}
          />
        </List>
      </>
    );
  };

  /**
   * Applies a legal drag move from the outline or the canvas and keeps the
   * moved node or slot selected.
   */
  /** The id a palette drag of component `key` carries. */
  const PALETTE_SOURCE = 'component:';
  /**
   * The node a palette drag adds, made once per drag so its id, and so the
   * cached drop results, stay the same while it moves.
   */
  let dragged: ViewNode | undefined;
  const draggedNode = (sourceId: string) => {
    const key = sourceId.slice(PALETTE_SOURCE.length);
    if (dragged?.type !== key) dragged = seededNode(key);
    return dragged;
  };

  const applyMove = (move: TreeListMove) => {
    if (move.sourceId.startsWith(PALETTE_SOURCE)) {
      const to = dropFor(move);
      if (!to) return;
      const node = draggedNode(move.sourceId);
      dragged = undefined;
      commit(
        withCatalog(
          insertNode(doc.value, to.parent, to.zone, node, to.index),
          node.type,
        ),
      );
      select({ kind: 'node', id: node.id });
      // A new node opens on its Properties, ready to fill in.
      inspectorArea.value = 'properties';
      return;
    }
    const to = dropFor(move);
    const from = sourceOf(doc.value, move.sourceId);
    if (!to || !from) return;
    const moved = placeChild(doc.value, from, to);
    commit(moved.document);
    select(
      slotRowAddress(move.sourceId)
        ? { kind: 'slot', address: moved.at }
        : { kind: 'node', id: move.sourceId },
    );
  };

  /**
   * An outline row's label by id (a node's name or component, or a slot),
   * kept per document while a drag passes over the same rows.
   */
  let rowLabels: { document: ViewDocument; labels: Map<string, string> } = {
    document: doc.value,
    labels: new Map(),
  };
  const rowLabel = (id: string): string => {
    if (rowLabels.document !== doc.value || !rowLabels.labels.size) {
      const labels = new Map<string, string>();
      const add = (nodes: readonly OutlineNode[]) => {
        for (const node of nodes) {
          labels.set(node.id, node.label);
          if (node.children) add(node.children);
        }
      };
      add(outlineTree(doc.value, componentNames));
      rowLabels = { document: doc.value, labels };
    }
    // Every drag source and target is an outline row.
    return rowLabels.labels.get(id)!;
  };

  /**
   * Where a legal drag move lands, in words (KF-Y4GHQV): beside its target,
   * or inside it, naming the zone when the target has more than one.
   */
  const dropCaption = (move: TreeListMove): string => {
    const target = rowLabel(move.target.id);
    if (move.target.position === 'before') return `Before ${target}`;
    if (move.target.position === 'after') return `After ${target}`;
    const zone = dropFor(move)?.zone;
    const node = findNode(doc.value, move.target.id)?.node;
    return node && zone && zoneKeys(node).length > 1
      ? `Inside ${target} › ${zone}`
      : `Inside ${target}`;
  };

  /**
   * A drop surface that opens the Document tab a drag rests on for
   * `SPRING_MS` (spring-loading, KF-67K2VP), so a drag from the palette can
   * go on to the outline. It never offers a drop itself.
   */
  const springTabs = (): CanvasDropSurface => {
    let pending: { tab: string; timer: number } | undefined;
    const clear = () => {
      if (pending) window.clearTimeout(pending.timer);
      pending = undefined;
    };
    return {
      over: (hit) => {
        const tab = hit
          ?.closest<HTMLElement>(`[data-tab-id^="${DOCUMENT_AREAS}-"]`)
          ?.dataset.tabId?.slice(DOCUMENT_AREAS.length + 1) as
          DocumentArea | undefined;
        if (tab === pending?.tab) return undefined;
        clear();
        if (tab && tab !== documentArea.value)
          pending = {
            tab,
            timer: window.setTimeout(() => {
              documentArea.value = tab;
              pending = undefined;
            }, SPRING_MS),
          };
        return undefined;
      },
      clear,
    };
  };

  /** Zone keys a node offers, for moving a node into it. */
  const zoneKeys = (node: ViewNode) => zonesOf(node).map((zone) => zone.key);

  /**
   * The placement a drop on an outline row asks for, if legal. Validating
   * a drop runs the validator, so results are kept per document while a
   * drag passes over the same rows.
   */
  let dropCache: { document: ViewDocument; drops: Map<string, unknown> } = {
    document: doc.value,
    drops: new Map(),
  };
  const dropFor = (move: TreeListMove) => {
    if (dropCache.document !== doc.value)
      dropCache = { document: doc.value, drops: new Map() };
    const key = `${move.sourceId} ${move.target.id} ${move.target.position}`;
    if (!dropCache.drops.has(key))
      dropCache.drops.set(
        key,
        move.sourceId.startsWith(PALETTE_SOURCE)
          ? insertPlacement(
              doc.value,
              viewCatalog,
              draggedNode(move.sourceId),
              move.target.id,
              move.target.position,
              zoneKeys,
            )
          : dropPlacement(
              doc.value,
              viewCatalog,
              move.sourceId,
              move.target.id,
              move.target.position,
              zoneKeys,
            ),
      );
    return dropCache.drops.get(key) as ReturnType<typeof dropPlacement>;
  };

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
  const zonesOf = (node: ViewDocument['root']) => {
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
    return [...zones, ...fields];
  };

  /** The components a zone takes, as Select choices. */
  const addableIn = (
    zone: { readonly accepts?: readonly string[] } | undefined,
  ) =>
    [...propsByKey.values()]
      .filter(
        (candidate) =>
          // Kerf UI's and an application's own components; Web Awesome
          // elements are placed through their Kerf wrappers.
          candidate.source !== 'webawesome' &&
          (!zone?.accepts || zone.accepts.includes(candidate.key)),
      )
      .map((candidate) => ({
        value: candidate.key,
        label: componentNames.get(candidate.key)!,
      }));

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

  /** The inspector for a selected node: name, editable props, add child. */
  const nodeEditor = (
    node: ViewDocument['root'],
    component: NonNullable<ReturnType<typeof propsByKey.get>>,
    title: string,
  ) => {
    const props = node.props ?? {};
    const promotable = component.props.filter(
      (prop) =>
        prop.control !== 'hidden' &&
        !prop.zone &&
        (paramTypeFor(prop.type as never) ??
          appParamFor(node.type, prop, definitionsOf(node.type))) !==
          undefined &&
        // A literal promotes; a bound prop is already a param.
        !isBinding(props[prop.name]),
    );
    const zones = zonesOf(node);
    const zone =
      zones.find(
        (option) => option.key === addZone.value && !option.disabledReason,
      ) ?? zones.find((option) => !option.disabledReason);
    const addable = addableIn(zone);
    // What can show otherwise: what the zone holding this node accepts.
    const parent = findNode(doc.value, node.id)?.ancestors.at(-1);
    const otherwiseChoices = parent
      ? addableIn(
          zonesOf(parent.node).find((option) => option.key === parent.zone),
        )
      : [];
    const chosen =
      addable.find((item) => item.value === addComponent.value) ?? addable[0];
    const properties = (
      <List>
        <List controlInsets="trbl">
          <TextField
            label="Name"
            value={node.name ?? ''}
            hint="A name makes the node a typed ref in the generated module."
            error={fieldErrors.value['#name']}
            rootAttributes={{ 'data-editor-name': 'true' }}
          />
        </List>
        {groupedProps(component).map((section) => {
          // An object prop opens its form from a Configure row (KF-Z9S029).
          // Icon data opens the icon picker from its row (KF-VYRDDQ).
          // An app's editor for the type opens the same way (KF-EXA2WH).
          const opens = (prop: (typeof section.props)[number]) =>
            (!isBinding(props[prop.name]) &&
              (Boolean(customFor(prop.type as never)) ||
                opensEditor(
                  fieldEditorKind(
                    prop.type as never,
                    definitionsOf(node.type),
                    prop.iconSource,
                  ),
                ))) ||
            controlFor(prop, props[prop.name], definitionsOf(node.type))
              .kind === 'icon';
          const editable = section.props
            .filter((prop) => !opens(prop))
            .map(
              (prop) =>
                contentControl(node, prop) ??
                propControl(prop, props[prop.name] as never, node.type),
            )
            .filter(Boolean);
          const configured = section.props.filter(opens).map((prop) => {
            const value = props[prop.name] as never;
            return controlFor(prop, value, definitionsOf(node.type)).kind ===
              'icon'
              ? propControl(prop, value, node.type)!
              : configureRow(propLabel(prop.name), value, {
                  prop: prop.name,
                  path: [],
                });
          });
          const fixed = section.props.filter(
            (prop) =>
              !opens(prop) &&
              controlFor(
                prop,
                props[prop.name] as never,
                definitionsOf(node.type),
              ).kind === 'readonly',
          );
          return [
            <ListHeader label={section.title} size="xs" />,
            editable.length ? (
              <List controlInsets="trbl" gap>
                {editable}
              </List>
            ) : undefined,
            configured.length ? <List>{configured}</List> : undefined,
            fixed.length ? (
              <ValueTable label={`${title} ${section.title}`} density="compact">
                {fixed.map((prop) => (
                  <ValueTableRow
                    label={propLabel(prop.name)}
                    value={
                      inspectorSections(node, {
                        ...component,
                        props: [prop],
                        groups: [],
                      })[0]!.rows[0]!.value
                    }
                  />
                ))}
              </ValueTable>
            ) : undefined,
          ];
        })}
        {promotable.length ? (
          <>
            <ListHeader label="Promote to a param" size="xs" />
            <List controlInsets="trbl" gap>
              <Select
                name="promote-prop"
                label="Prop"
                value={
                  promotable.some((prop) => prop.name === promoteProp.value)
                    ? promoteProp.value
                    : promotable[0]!.name
                }
                choices={promotable.map((prop) => ({
                  value: prop.name,
                  label: prop.name,
                }))}
                rootAttributes={{ 'data-editor-promote': 'true' }}
              />
              <Button
                emphasis="secondary"
                size="compact"
                action={PROMOTE_ACTION}
              >
                Promote
              </Button>
            </List>
          </>
        ) : undefined}
        {bindSection(node, component)}
      </List>
    );
    const flow = (
      <List>
        {controlFlowSection(
          doc.value,
          viewCatalog,
          node.id,
          fieldErrors.value['#item'],
          otherwiseChoices,
        )}
        {moveSection(node)}
      </List>
    );
    const children = (
      <List>
        <ListHeader label="Add a child" size="xs" />
        {zones.length && zone ? (
          <List controlInsets="trbl" gap>
            <Select
              name="add-zone"
              label="Zone"
              value={zone.key}
              choices={zones.map((option) => ({
                value: option.key,
                label: zoneLabel(option.key),
                ...(option.disabledReason
                  ? { disabled: true, disabledReason: option.disabledReason }
                  : {}),
              }))}
              rootAttributes={{ 'data-editor-add': 'zone' }}
            />
            <Select
              name="add-component"
              label="Component"
              value={chosen?.value ?? ''}
              choices={addable}
              rootAttributes={{ 'data-editor-add': 'component' }}
            />
            <Button emphasis="secondary" size="compact" action={ADD_ACTION}>
              Add
            </Button>
          </List>
        ) : (
          <ListInsetText>
            <Text tone="quiet">
              {zones.length
                ? 'Every zone of this component is full.'
                : 'This component takes no children.'}
            </Text>
          </ListInsetText>
        )}
        {zones.length && zone
          ? addSlotFields(doc.value, node.id, fieldErrors.value['#slot'])
          : undefined}
        {node.id === doc.value.root.id ? replaceRootSection() : undefined}
      </List>
    );
    const [strip, ...panels] = areaTabs(
      'editor-inspector-areas',
      'Inspector areas',
      INSPECTOR_TAB_ACTION,
      inspectorArea.value,
      'fill',
      [
        { area: 'properties', name: 'Properties', panel: properties },
        { area: 'flow', name: 'Flow', panel: flow },
        { area: 'children', name: 'Children', panel: children },
      ],
    );
    // KF-5QXNWS: the node's title and its tab strip stay pinned under the
    // rail's toolbar while a long area scrolls.
    return {
      header: (
        <List>
          <ListHeader
            label={node.name ? `${node.name} · ${title}` : title}
            count={component.props.length}
            countLabel="props"
          />
          {strip}
        </List>
      ),
      content: <List>{panels}</List>,
    };
  };

  /** The canvas: the previewed document under the selection highlight. */
  /**
   * The canvas preview, rendered and checked by `contained` in an effect,
   * outside the editor's render pass, whenever the document changes; the
   * render only reads it. The effect lives as long as the editor.
   */
  const preview = signal<SafeHtml | undefined>(undefined);
  effect(() => {
    const document = doc.value;
    preview.value = contained(
      canvasContent(
        document,
        problemsOf(document, validateView(document, viewCatalog).diagnostics),
      ),
    );
  });

  const canvas = () => (
    <div class="kui-editor__canvas" data-editor-canvas>
      {preview.value}
      <div
        class="kui-editor__selection"
        data-morph-skip
        aria-hidden="true"
        hidden
      />
      <div class="kui-editor__drop" data-morph-skip aria-hidden="true" hidden />
      {/* KF-Y4GHQV: the drag's caption, dimmed source, and pointer chip. */}
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
      <div
        class="kui-editor__drag-chip"
        data-morph-skip
        aria-hidden="true"
        hidden
      />
    </div>
  );

  /**
   * Shows `document` as a fresh session: no history or selection. With
   * storage it becomes the file at `path`, or a new draft saved right away.
   */
  const load = (document: ViewDocument, path?: string) => {
    doc.value = document;
    history.clear();
    historyVersion.value += 1;
    selection.value = null;
    loadError.value = null;
    if (!autosave) return;
    const text = serializeDocument(document);
    if (path) autosave.adopt(path, text);
    else void autosave.create(draftPath(newNodeId()), text);
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

  const render = () => {
    const document = doc.value;
    const validation = validateView(document, viewCatalog);
    const nodes = outlineRows(document, componentNames).length;
    const problemList = problemsOf(document, validation.diagnostics);
    const problems = problemList.length;
    // KF-PR8MA6: the Components filter sits in the rail's pinned header,
    // under the strip, so it stays in reach while the list scrolls.
    const paletteFilterField =
      documentArea.value === 'components' ? (
        <List controlInsets="trbl">
          <SearchField
            id="editor-palette-filter"
            label="Filter Components"
            placeholder="Filter components"
            query={paletteFilter.value}
            revision={paletteFilterRevision.value}
            clearAction={PALETTE_CLEAR_ACTION}
            clearLabel="Clear Filter"
            editorAttributes={{ 'data-editor-palette-filter': '' }}
          />
        </List>
      ) : undefined;
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
          area: 'components',
          name: 'Components',
          panel: (() => {
            const groups = paletteMatches();
            return (
              <>
                {groups.length ? (
                  palette(groups)
                ) : (
                  <EmptyState
                    title="No matching components"
                    detail="No component name or category holds that text."
                  />
                )}
              </>
            );
          })(),
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
          ) : undefined,
          panel: problems ? (
            <List>{problemRows(problemList)}</List>
          ) : (
            <EmptyState title="No problems" detail="The document is valid." />
          ),
        },
      ],
    );
    return (
      <List fill rootAttributes={{ 'data-editor': 'kerf-ui-editor' }}>
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
        {fieldDialog()}
        {iconDialog()}
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
              header: (
                <>
                  {documentStrip}
                  {paletteFilterField}
                </>
              ),
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
              trailing: (
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
                </ToolbarControlGroup>
              ),
            }}
            mainHeader={
              loadError.value ? (
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
              ) : problems ? (
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
                    ...inspector(document),
                  },
                  ...fieldViews(),
                ],
              },
            }}
          />
        </List>
      </List>
    );
  };

  /** Draws the selection highlight over the selected node on the canvas. */
  const placeHighlight = (root: HTMLElement) => {
    const canvas = root.querySelector<HTMLElement>('[data-editor-canvas]');
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
              ...canvas.querySelectorAll<HTMLElement>(
                '[data-editor-slot-address]',
              ),
            ].find(
              (element) =>
                element.dataset.editorSlotAddress ===
                JSON.stringify(current.address),
            ) ?? null)
          : null;
    if (!target) {
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
    const result = exportModule(doc.value, viewCatalog, kind);
    lastExport.value = {
      contract: result.contract,
      report: describeExport(result.contract, lastExport.value?.contract),
    };
    (options.save ?? download)(result.fileName, result.code);
  };

  const selectedNodeId = () => {
    const current = selection.value;
    return current?.kind === 'node' && findNode(doc.value, current.id)
      ? current.id
      : undefined;
  };

  const undo = () => {
    if (!history.canUndo) return;
    doc.value = history.undo(doc.value);
    fieldErrors.value = {};
    historyVersion.value += 1;
  };
  const redo = () => {
    if (!history.canRedo) return;
    doc.value = history.redo(doc.value);
    fieldErrors.value = {};
    historyVersion.value += 1;
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
    const prop = propsByKey
      .get(node.type)!
      .props.find((item) => item.name === name)!;
    const result = valueFromControl(kind, raw, prop.cssValue?.helpers, {
      type: prop.type as never,
      definitions: definitionsOf(node.type),
      // A typed choice's new member names its slots and keeps the fields it
      // shares with the old one (KF-907BXY).
      name,
      slot: slotNamer(usedSlots(doc.value)),
      current: node.props?.[name] as ViewValue | undefined,
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
    commit(setProp(doc.value, id, name, result.value));
  };

  /** Writes `next` at a field editor's place in the selected node's prop. */
  const writeField = (place: FieldPlace, next: ViewValue | undefined) => {
    const id = selectedNodeId()!;
    const current = findNode(doc.value, id)!.node.props?.[place.prop] as
      ViewValue | undefined;
    const value = withValueAt(current, place.path, next);
    if (JSON.stringify(current) === JSON.stringify(value)) return false;
    commit(setProp(doc.value, id, place.prop, value));
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
    const { definitions, type } = fieldContext(
      findNode(doc.value, id)!.node,
      place,
    );
    const result = valueFromControl(
      kind,
      raw,
      undefined,
      type && { type, definitions },
    );
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
    const prop = propsByKey
      .get(node.type)!
      .props.find((item) => item.name === place.prop)!;
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
      },
      newNodeId,
      slotNamer(usedSlots(doc.value)),
    );

  /** Adds the chosen component to the chosen zone and selects it. */
  /** Makes a new node of the chosen component the document's root. */
  const replaceRootWith = () => {
    // The picker renders beside Replace and offers only cataloged components.
    const picker = document.querySelector<HTMLElement>(
      '[data-editor-root="component"]',
    )!;
    const root = seededNode(String(controlValue(picker)));
    commit(replaceRoot(doc.value, root));
    select({ kind: 'node', id: root.id });
    inspectorArea.value = 'properties';
  };

  const addChild = () => {
    const id = selectedNodeId();
    if (!id) return;
    const root = document.querySelector<HTMLElement>(
      `[data-editor-add="zone"]`,
    );
    const zone = root ? String(controlValue(root)) : addZone.value;
    const picker = document.querySelector<HTMLElement>(
      `[data-editor-add="component"]`,
    );
    const key = picker ? String(controlValue(picker)) : addComponent.value;
    const component = propsByKey.get(key);
    if (!zone || !component) return;
    // A content prop holds text or nodes, never both: a child added to a
    // prop that holds text takes the text into the zone first (KF-YR91FA).
    const parent = findNode(doc.value, id)!.node;
    const base = propsByKey
      .get(parent.type)
      ?.props.some((prop) => prop.name === zone && prop.slot)
      ? textToNodes(doc.value, id, zone)
      : doc.value;
    const child = seededNode(key);
    commit(withCatalog(insertNode(base, id, zone, child), key));
    select({ kind: 'node', id: child.id });
    inspectorArea.value = 'properties';
    // The new node's form opens at its top; take keyboard focus there too,
    // so it does not stay on the Add button at the bottom of the old form.
    window.requestAnimationFrame(() =>
      wired
        ?.querySelector<HTMLInputElement>('[data-editor-name] input')
        ?.focus(),
    );
  };

  /** Promotes the chosen prop to a document param named after it. */
  const promote = () => {
    const id = selectedNodeId();
    if (!id) return;
    const node = findNode(doc.value, id)!.node;
    const component = propsByKey.get(node.type);
    const picker = document.querySelector<HTMLElement>('[data-editor-promote]');
    const name = picker ? String(controlValue(picker)) : promoteProp.value;
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

  /** Adds a `$slot` to the chosen zone of the selected node (KF-90GTJN). */
  const addSlot = () => {
    const id = selectedNodeId();
    const root = document.querySelector<HTMLElement>(
      `[data-editor-add="zone"]`,
    );
    const field = document.querySelector<HTMLElement>(
      '[data-editor-slot="name"]',
    );
    if (!id || !field) return;
    const zone = root ? String(controlValue(root)) : addZone.value;
    const pass = document.querySelector<HTMLElement>(
      '[data-editor-slot="pass-item"]',
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
  let wired: HTMLElement | undefined;

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
      saver.adopt(draftPath(newNodeId()), serializeDocument(doc.peek()));
    if (last)
      void options.storage!.read(last).then(
        (text) => {
          // An edit made while the file loaded wins: it saves to a draft.
          if (historyVersion.peek() !== start) {
            void saver.create(
              draftPath(newNodeId()),
              serializeDocument(doc.peek()),
            );
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
        const text = serializeDocument(doc.value);
        if (saver.path.peek()) saver.change(text);
      }),
      effect(() => {
        const path = saver.path.value;
        if (path && (!isDraft(path) || saver.status.value === 'saved'))
          rememberPath(path);
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
        '[data-editor-prop]:not([data-editor-kind="tags"])',
        (_event, field) => editProp(field),
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-field]:not([data-editor-kind="tags"])',
        (_event, field) => editField(field),
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
          if (field.dataset.editorAdd === 'zone') addZone.value = value;
          else addComponent.value = value;
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
          const id = selectedNodeId();
          if (!id) return;
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
        '[data-editor-control]',
        (_event, field) => editControl(field),
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-editor-slot-input]',
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
        if (!(key.metaKey || key.ctrlKey) || key.key.toLowerCase() !== 'z')
          return;
        const target = key.target as Element | null;
        if (target?.closest('input, textarea, [contenteditable]')) return;
        key.preventDefault();
        if (key.shiftKey) redo();
        else undo();
      }),
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
        [PALETTE_CLEAR_ACTION]: () => {
          paletteFilter.value = '';
          paletteFilterRevision.value += 1;
          root
            .querySelector<HTMLElement>('[data-editor-palette-filter]')
            ?.focus();
        },
        [UNDO_ACTION]: () => undo(),
        [REDO_ACTION]: () => redo(),
        [MOVE_UP_ACTION]: () => moveSelected(-1),
        [MOVE_DOWN_ACTION]: () => moveSelected(1),
        [DELETE_ACTION]: () => {
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
        },
        [ADD_ACTION]: () => addChild(),
        [REPLACE_ROOT_ACTION]: () => replaceRootWith(),
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
        },
        [ICON_CLEAR_ACTION]: () => {
          iconQuery.value = '';
          iconQueryRevision.value += 1;
          root.querySelector<HTMLElement>('[data-editor-icon-search]')!.focus();
        },
        [ICON_CHOOSE_ACTION]: (_event, target) => {
          writeField(iconPicker.value!, { $icon: target.dataset.editorIcon! });
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
          const prop = propsByKey
            .get(node.type)!
            .props.find((item) => item.name === name)!;
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
        [ADD_SLOT_ACTION]: () => addSlot(),
        [PROMOTE_ACTION]: () => promote(),
        [OUTLINE_ACTION]: (_event, target) => {
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
          void autosave!
            .saveAs(path, serializeDocument(doc.value))
            .then((failure) => {
              saveAsError.value = failure ?? '';
              if (!failure) closeDialog(dialog);
            });
        },
        [SAVE_ACTION]: () => {
          const document = doc.value;
          (options.save ?? download)(
            documentFileName(document),
            serializeDocument(document),
          );
        },
      }),
      // Canvas clicks select the innermost node; the previewed document's own
      // links, buttons, and form controls never act.
      delegate(root, 'click', '[data-editor-canvas]', (event) => {
        event.preventDefault();
        const placeholder = (event.target as Element).closest<HTMLElement>(
          '[data-editor-slot-address]',
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
        if (
          node &&
          root.querySelector('[data-editor-canvas]')!.contains(node)
        ) {
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
        };
        root.addEventListener('close', closed, true);
        return () => root.removeEventListener('close', closed, true);
      })(),
      wireTreeList(root, {
        canDrop: (move) => dropFor(move) !== undefined,
        onMove: applyMove,
      }),
      // Arrow keys move between a strip's tabs; nothing here reorders.
      wireTabBars(root, { onReorder: () => {} }),
      // KF-67K2VP: a rail's pinned tab strip shows its divider once its
      // area scrolls under it.
      wireScrollDividers(root),
      wireCanvasDrag(root, {
        sourceOf: (element) => {
          const address = element.dataset.editorSlotAddress;
          if (address) {
            const { parent, zone, index } = JSON.parse(address) as SlotAddress;
            return slotRowId(parent, zone, index);
          }
          const id = element.dataset.kerfNode!;
          return isMovable(doc.value, id).remove ? id : undefined;
        },
        targetOf: (element) => {
          const address = element.dataset.editorSlotAddress;
          if (!address) return element.dataset.kerfNode!;
          const { parent, zone, index } = JSON.parse(address) as SlotAddress;
          return slotRowId(parent, zone, index);
        },
        canDrop: (move) => dropFor(move) !== undefined,
        onMove: applyMove,
        rootOf: () => doc.value.root.id,
        labelOf: (sourceId) =>
          sourceId.startsWith(PALETTE_SOURCE)
            ? componentNames.get(sourceId.slice(PALETTE_SOURCE.length))!
            : rowLabel(sourceId),
        captionOf: dropCaption,
        // KF-67K2VP: a drag also drops on the outline's rows, and resting on
        // a Document tab opens it, so a palette drag can reach the outline.
        surfaces: [
          treeListExternalDrop(root, {
            canDrop: (move) => dropFor(move) !== undefined,
          }),
          springTabs(),
        ],
        external: {
          selector: '[data-editor-palette]',
          sourceOf: (element) =>
            `${PALETTE_SOURCE}${element.dataset.editorPalette}`,
        },
      }),
      wireFilePickers(root, {
        onFiles: ({ files, id }) => {
          // wireFilePickers reports a choice only when it has files.
          void files[0]!.text().then((text) => {
            if (id === 'compare-module') {
              const current = contractOf(doc.value, viewCatalog);
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
        window.requestAnimationFrame(() => placeHighlight(root));
      }),
      // KF-JWD51N: a different selection opens the Inspector at its top; an
      // edit to the same node keeps the place the author was working at.
      (() => {
        let shown = selectionKey(selection.peek());
        return effect(() => {
          const key = selectionKey(selection.value);
          if (key === shown) return;
          shown = key;
          window.requestAnimationFrame(() => resetInspectorScroll(root));
        });
      })(),
    ];
    if (autosave) stops.push(...wireAutosave(root));
    const observer = new ResizeObserver(() => placeHighlight(root));
    observer.observe(root.querySelector('[data-editor-canvas]')!);
    return () => {
      observer.disconnect();
      for (const stop of stops) stop();
    };
  };

  return { render, wire, document: doc, selection, loadError };
}
