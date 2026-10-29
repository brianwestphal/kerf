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
  interpretView,
  lucideExportName,
  previewView,
  validateView,
  type ViewContract,
  type ViewDocument,
  type ViewNode,
  type ViewValue,
} from '@kerfjs/ui/view';
import { delegate, effect, mount, type SafeHtml, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import {
  ArrowDown,
  ArrowUp,
  FileCode,
  FilePlus,
  FolderOpen,
  GitCompare,
  icons as lucideIcons,
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
import { FilePickerTrigger } from '../components/forms/file-picker/file-picker.js';
import { wireFilePickers } from '../components/forms/file-picker/wiring/wire-file-pickers.js';
import { Select } from '../components/forms/select/select.js';
import { Switch } from '../components/forms/switch/switch.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { wireWorkbench } from '../components/layout/workbench/wiring/wire-workbench.js';
import { Workbench } from '../components/layout/workbench/workbench.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { TabBar } from '../components/navigation/tab-bar/tab-bar.js';
import { wireTabBars } from '../components/navigation/tab-bar/wiring/wire-tab-bars.js';
import { TabBarItem } from '../components/navigation/tab-bar-item/tab-bar-item.js';
import {
  closeDialog,
  DialogSurface,
  openDialog,
} from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { Text } from '../components/typography/text/text.js';
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
  cssHint,
  CUSTOM_SIZE,
  seedProps,
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
} from './model/edits.js';
import { exampleValue, slotNamer, usedSlots } from './model/examples.js';
import {
  compareWithModule,
  describeExport,
  type ExportKind,
  exportModule,
  type ExportReport,
} from './model/export.js';
import { groupedProps, inspectorSections } from './model/inspector.js';
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
import { type PreviewSlot, previewSlots } from './model/preview-slots.js';
import { type Problem, problemCounts, problemsOf } from './model/problems.js';
import { sampleInputs } from './model/sample-inputs.js';

export const WORKBENCH_ID = 'kerf-ui-editor';
const OUTLINE_ACTION = 'editor-select-node';
const OUTLINE_TOGGLE_ACTION = 'editor-toggle-node';
const PALETTE_ACTION = 'editor-show-component';
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
  const { viewCatalog, componentNames, components } = catalog;
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
      inputs: sampleInputs(document, (label) => Text({ children: label })),
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
}

/** An inspector control's current value: a Select's, a switch's, or a field's. */
function controlValue(field: HTMLElement): string | boolean {
  // The host registers `kui-select`, whose element reports its value.
  if (field.localName === 'kui-select')
    return (field as HTMLElement & { value: string }).value;
  // Every other inspector control wraps one native input.
  const input = field.querySelector<HTMLInputElement | HTMLTextAreaElement>(
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
  // Every caller passes a changed document (edits clone; moves are checked
  // against isMovable first).
  const commit = (next: ViewDocument) => {
    history.record(doc.value);
    doc.value = next;
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

  const palette = () =>
    catalog.paletteGroups().map((group) => [
      <ListHeader label={group.category} size="xs" />,
      ...group.items.map((item) => (
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
      )),
    ]);

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
  ) => {
    const control = controlFor(prop, value, definitionsOf(type));
    const error = fieldErrors.value[prop.name];
    const marker = (kind: ControlKind) => ({
      'data-editor-prop': prop.name,
      'data-editor-kind': kind,
    });
    const builderField = (raw: string) => (
      <TextField
        label={`${prop.name} value`}
        value={raw}
        hint={cssHint(prop.cssValue?.helpers)}
        placeholder={
          prop.cssValue?.helpers?.[0] === 'flex' ? 'flex(1)' : 'px(8)'
        }
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
            customSize.value === `${selectedNodeId()} ${prop.name}`);
        return (
          <>
            <Select
              name={`prop-${prop.name}`}
              label={prop.name}
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
            name={`prop-${prop.name}`}
            label={prop.name}
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
            label={prop.name}
            checked={control.raw === true}
            rootAttributes={marker('switch')}
          />
        );
      case 'readonly':
        return undefined;
      case 'list': {
        // A list or object literal as JSON (KF-HNNWN9), with a placeholder
        // to start from while a required one is unset.
        // Whether there is an example; Fill with example names its slots.
        const example = exampleValue(
          prop.type as never,
          definitionsOf(type),
          prop.name,
          (hint) => hint,
        );
        return (
          <>
            <TextField
              label={prop.name}
              value={String(control.raw)}
              multiline
              rows={control.raw === '' ? 2 : 4}
              maxRows={12}
              hint={`JSON for ${typeLabel(prop.type.text!)}.`}
              error={error}
              rootAttributes={marker('list')}
            />
            {prop.required && control.raw === '' && example !== undefined ? (
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
            label={prop.name}
            value={String(control.raw)}
            type={control.kind === 'number' ? 'number' : 'text'}
            hint={
              control.kind === 'css'
                ? cssHint(prop.cssValue?.helpers)
                : undefined
            }
            placeholder={
              control.kind === 'css'
                ? 'px(8)'
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
          label={prop.name}
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
  const zonesOf = (node: ViewDocument['root']) =>
    legalZones(
      node,
      viewCatalog.entries.get(node.type) as Parameters<typeof legalZones>[1],
      propsByKey.get(node.type)?.props ?? [],
      new Set(viewCatalog.components.keys()),
    );

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
        paramTypeFor(prop.type as never) !== undefined &&
        !(
          props[prop.name] !== null &&
          typeof props[prop.name] === 'object' &&
          !Array.isArray(props[prop.name])
        ),
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
          const editable = section.props
            .map(
              (prop) =>
                contentControl(node, prop) ??
                propControl(prop, props[prop.name] as never, node.type),
            )
            .filter(Boolean);
          const fixed = section.props.filter(
            (prop) =>
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
            fixed.length ? (
              <ValueTable label={`${title} ${section.title}`} density="compact">
                {fixed.map((prop) => (
                  <ValueTableRow
                    label={prop.name}
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
                label: option.key,
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
          panel: <List>{palette()}</List>,
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
                title: <ToolbarText text="Inspector" />,
                toggle: { action: INSPECTOR_TOGGLE, name: 'Inspector' },
                trailing: nodeActions(document),
              },
              ...inspector(document),
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
  const editProp = (field: HTMLElement) => {
    const id = selectedNodeId();
    const name = field.dataset.editorProp!;
    const kind = field.dataset.editorKind as ControlKind;
    if (!id) return;
    // Custom shows the builder field; a keyword or the default hides it.
    if (kind === 'size')
      customSize.value =
        controlValue(field) === CUSTOM_SIZE ? `${id} ${name}` : '';
    const node = findNode(doc.value, id)!.node;
    // A field renders only for a prop of the node's props entry.
    const prop = propsByKey
      .get(node.type)!
      .props.find((item) => item.name === name)!;
    const result = valueFromControl(
      kind,
      controlValue(field),
      prop.cssValue?.helpers,
      { type: prop.type as never, definitions: definitionsOf(node.type) },
    );
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

  /** A new node of component `key` with its required props filled in. */
  const seededNode = (key: string): ViewNode => {
    const component = propsByKey.get(key)!;
    const props = seedProps(
      component.props,
      componentNames.get(key)!,
      component.variants,
      definitionsOf(key),
      slotNamer(usedSlots(doc.value)),
    );
    return {
      id: newNodeId(),
      type: key,
      ...(Object.keys(props).length ? { props } : {}),
    };
  };

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
    const type = prop && paramTypeFor(prop.type as never);
    const current = node.props?.[name];
    // Only a literal (or unset) prop promotes; one already bound stays as is.
    if (!prop || !type || (current !== null && typeof current === 'object'))
      return;
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
        '[data-editor-prop]',
        (_event, field) => editProp(field),
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
      delegateActions<HTMLElement>(root, 'click', {
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
