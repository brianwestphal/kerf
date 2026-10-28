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
} from '@kerfjs/ui/view';
import { delegate, effect, type SafeHtml, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import {
  ArrowDown,
  ArrowUp,
  FileCode,
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
import { wireTreeList } from '../components/collections/tree-list/wiring/wire-tree-list.js';
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
import { Text } from '../components/typography/text/text.js';
import type { EditorCatalog } from './catalog.js';
import {
  controlFor,
  type ControlKind,
  seedProps,
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
  History,
  insertNode,
  isMovable,
  legalZones,
  moveNode,
  newNodeId,
  paramTypeFor,
  promoteToParam,
  removeNode,
  renameNode,
  setProp,
  withCatalog,
} from './model/edits.js';
import {
  compareWithModule,
  describeExport,
  type ExportKind,
  exportModule,
  type ExportReport,
} from './model/export.js';
import { groupedProps, inspectorSections } from './model/inspector.js';
import {
  nodeTitle,
  type OutlineNode,
  outlineParents,
  outlineRows,
  outlineTree,
} from './model/outline.js';
import { type Problem, problemCounts, problemsOf } from './model/problems.js';
import { sampleInputs } from './model/sample-inputs.js';

export const WORKBENCH_ID = 'kerf-ui-editor';
const OUTLINE_ACTION = 'editor-select-node';
const OUTLINE_TOGGLE_ACTION = 'editor-toggle-node';
const PALETTE_ACTION = 'editor-show-component';
const PROBLEM_ACTION = 'editor-select-problem';
const SAVE_ACTION = 'editor-save';
const UNDO_ACTION = 'editor-undo';
const REDO_ACTION = 'editor-redo';
const MOVE_UP_ACTION = 'editor-move-up';
const MOVE_DOWN_ACTION = 'editor-move-down';
const DELETE_ACTION = 'editor-delete';
const ADD_ACTION = 'editor-add-child';
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
  | null;

// interpretView reads `$icon` names; Lucide exports icons by PascalCase name.
const icons = new Proxy({} as Record<string, unknown>, {
  get: (_target, name) =>
    (lucideIcons as Record<string, unknown>)[lucideExportName(String(name))],
});

/** A slot's placeholder on the canvas: the app fills slots at runtime. */
const slotPlaceholder = (name: string) => () =>
  Text({ children: `${name} slot`, tone: 'quiet' });
const slots = new Proxy({} as Record<string, () => SafeHtml>, {
  get: (_target, name) => slotPlaceholder(String(name)),
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
  return (document: ViewDocument, problems: readonly Problem[]): SafeHtml => {
    const preview = {
      catalog: viewCatalog,
      components,
      inputs: sampleInputs(document, (label) => Text({ children: label })),
      slots,
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
      return EmptyState({
        title: 'This document cannot be previewed',
        detail: (error as Error).message,
      });
    }
  };
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
  return selection.kind === 'node'
    ? `node:${selection.id}`
    : `component:${selection.key}`;
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
  const doc = signal<ViewDocument>(options.document ?? emptyDocument());
  const selection = signal<Selection>(null);
  const loadError = signal<string | null>(null);
  // Editing (KF-KX77TV): every change goes through commit(), so the
  // document stays the only state and undo/redo restores whole documents.
  const history = new History();
  const historyVersion = signal(0);
  const fieldErrors = signal<Readonly<Record<string, string>>>({});
  const addZone = signal('');
  const addComponent = signal('');
  const promoteProp = signal('');
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
    if (next?.kind !== 'node') return;
    const path = findNode(doc.value, next.id)!.ancestors;
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
        selected={current?.kind === 'node' ? current.id : undefined}
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
    catalog
      .paletteGroups()
      .map((group) => [
        <ListHeader label={group.category} size="xs" />,
        ...group.items.map((item) => (
          <ListItem
            action={PALETTE_ACTION}
            itemId={item.key}
            label={item.name}
            selected={
              selection.value?.kind === 'component' &&
              selection.value.key === item.key
            }
          />
        )),
      ]);

  const inspector = (document: ViewDocument) => {
    const current = selection.value;
    const visit =
      current?.kind === 'node' ? findNode(document, current.id) : undefined;
    const key = visit
      ? visit.node.type
      : current?.kind === 'component'
        ? current.key
        : undefined;
    const component = key ? propsByKey.get(key) : undefined;
    if (!current || (current.kind === 'node' && !visit)) {
      return (
        <EmptyState
          title="Nothing selected"
          detail="Select a node on the canvas or in the outline to inspect its props."
        />
      );
    }
    const title = visit
      ? nodeTitle(visit.node, componentNames)
      : componentNames.get(key!)!;
    if (!component) {
      return (
        <List>
          <ListHeader label={title} />
          <Text>This node has no props to inspect.</Text>
        </List>
      );
    }
    if (visit) return nodeEditor(visit.node, component, title);
    return (
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
    );
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
  ) => {
    const control = controlFor(prop, value);
    const error = fieldErrors.value[prop.name];
    const marker = (kind: ControlKind) => ({
      'data-editor-prop': prop.name,
      'data-editor-kind': kind,
    });
    switch (control.kind) {
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
      default:
        return (
          <TextField
            label={prop.name}
            value={String(control.raw)}
            type={control.kind === 'number' ? 'number' : 'text'}
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

  /** Move and delete controls for the selected node, when it can move. */
  const nodeActions = (document: ViewDocument) => {
    const current = selection.value;
    if (current?.kind !== 'node' || !findNode(document, current.id))
      return undefined;
    const movable = isMovable(document, current.id);
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
    const zones = legalZones(
      node,
      viewCatalog.entries.get(node.type) as Parameters<typeof legalZones>[1],
      component.props,
      new Set(viewCatalog.components.keys()),
    );
    const zone =
      zones.find(
        (option) => option.key === addZone.value && !option.disabledReason,
      ) ?? zones.find((option) => !option.disabledReason);
    const addable = [...propsByKey.values()]
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
    const chosen =
      addable.find((item) => item.value === addComponent.value) ?? addable[0];
    return (
      <List>
        <ListHeader
          label={node.name ? `${node.name} · ${title}` : title}
          count={component.props.length}
          countLabel="props"
        />
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
            .map((prop) => propControl(prop, props[prop.name] as never))
            .filter(Boolean);
          const fixed = section.props.filter(
            (prop) =>
              controlFor(prop, props[prop.name] as never).kind === 'readonly',
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
      </List>
    );
  };

  /** The canvas: the previewed document under the selection highlight. */
  const canvas = (document: ViewDocument, problemList: readonly Problem[]) => (
    <div class="kui-editor__canvas" data-editor-canvas>
      {canvasContent(document, problemList)}
      <div
        class="kui-editor__selection"
        data-morph-skip
        aria-hidden="true"
        hidden
      />
    </div>
  );

  const render = () => {
    const document = doc.value;
    const validation = validateView(document, viewCatalog);
    const nodes = outlineRows(document, componentNames).length;
    const problemList = problemsOf(document, validation.diagnostics);
    const problems = problemList.length;
    return (
      <List fill rootAttributes={{ 'data-editor': 'kerf-ui-editor' }}>
        <Toolbar
          label="Kerf UI Editor"
          safeAreaEdges={['block-start', 'inline-start', 'inline-end']}
          responsive="wrap"
          dividerSides="b"
          leading={<ToolbarText text="Kerf UI Editor" />}
          trailing={[
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
              action={SAVE_ACTION}
              icon={<LucideIcon icon={Save} name="save" />}
            >
              Save
            </Button>,
          ]}
        />
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
              content: (
                <List>
                  {problems
                    ? [
                        <ListHeader
                          label="Problems"
                          count={problems}
                          countLabel="problems"
                        />,
                        problemRows(problemList),
                      ]
                    : undefined}
                  <ListHeader
                    label="Outline"
                    count={nodes}
                    countLabel="nodes"
                  />
                  {outline(document, problemCounts(problemList))}
                  <ListHeader label="Components" />
                  {palette()}
                </List>
              ),
            }}
            mainToolbar={{
              label: 'Canvas',
              // The previewed document draws its own title; the editor's main
              // toolbar names the region and the document's state instead.
              title: (
                <ToolbarText
                  text="Preview"
                  description={`${documentFileName(document)} · ${nodes} nodes · ${problems === 0 ? 'valid' : `${problems} problems`}`}
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
            main={canvas(document, problemList)}
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
              content: inspector(document),
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
    const result = valueFromControl(kind, controlValue(field));
    if ('error' in result) {
      fieldErrors.value = { ...fieldErrors.value, [name]: result.error };
      return;
    }
    const current = findNode(doc.value, id)!.node.props?.[name];
    if (JSON.stringify(current) === JSON.stringify(result.value)) {
      if (fieldErrors.value[name]) fieldErrors.value = {};
      return;
    }
    commit(setProp(doc.value, id, name, result.value));
  };

  /** Adds the chosen component to the chosen zone and selects it. */
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
    const child = {
      id: newNodeId(),
      type: key,
      ...(() => {
        const props = seedProps(
          component.props,
          componentNames.get(key)!,
          component.variants,
        );
        return Object.keys(props).length ? { props } : {};
      })(),
    };
    commit(withCatalog(insertNode(doc.value, id, zone, child), key));
    select({ kind: 'node', id: child.id });
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

  /** The element the editor is wired to, for focus after an edit. */
  let wired: HTMLElement | undefined;

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
          const id = selectedNodeId();
          if (!id || !isMovable(doc.value, id).remove) return;
          commit(removeNode(doc.value, id));
          selection.value = null;
        },
        [ADD_ACTION]: () => addChild(),
        [PROMOTE_ACTION]: () => promote(),
        [OUTLINE_ACTION]: (_event, target) =>
          select({ kind: 'node', id: target.dataset.itemId! }),
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
      wireTreeList(root),
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
            if (parsed.ok) {
              doc.value = parsed.document;
              history.clear();
              historyVersion.value += 1;
              selection.value = null;
              loadError.value = null;
            } else loadError.value = parsed.error;
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
    const observer = new ResizeObserver(() => placeHighlight(root));
    observer.observe(root.querySelector('[data-editor-canvas]')!);
    return () => {
      observer.disconnect();
      for (const stop of stops) stop();
    };
  };

  return { render, wire, document: doc, selection, loadError };
}
