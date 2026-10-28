// The Kerf UI editor shell (docs/26-ui-editor.md; KF-4NRZCV: editor
// scaffold). A Workbench with the document rail (problems, outline, and
// component palette), the canvas (the document rendered through
// interpretView), and the read-only inspector, plus open, save, and export of
// the generated view module (KF-Y38YRT). Editing is a later slice.
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/styles.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/workbench.css';
import './editor.css';
import '@kerfjs/ui/popup-menu/register';

import { Badge } from '@kerfjs/ui/badge';
import { Button } from '@kerfjs/ui/button';
import { EmptyState } from '@kerfjs/ui/empty-state';
import { FilePickerTrigger } from '@kerfjs/ui/file-picker';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
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
import { wireFilePickers } from '@kerfjs/ui/wire-file-pickers';
import { wireWorkbench } from '@kerfjs/ui/wire-workbench';
import { Workbench } from '@kerfjs/ui/workbench';
import { delegate, effect, type SafeHtml, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { FileCode, FolderOpen, icons as lucideIcons, Save } from 'lucide';

import {
  componentNames,
  paletteGroups,
  propsByKey,
  viewCatalog,
} from './catalog.js';
import { componentFunctions } from './components.js';
import {
  documentFileName,
  findNode,
  parseDocument,
  serializeDocument,
} from './model/document.js';
import {
  describeExport,
  type ExportKind,
  exportModule,
} from './model/export.js';
import { inspectorSections } from './model/inspector.js';
import { nodeTitle, outlineRows } from './model/outline.js';
import { type Problem, problemCounts, problemsOf } from './model/problems.js';
import { sampleInputs } from './model/sample-inputs.js';
import sample from './sample.kui.json';

export const WORKBENCH_ID = 'kerf-ui-editor';
const OUTLINE_ACTION = 'editor-select-node';
const PALETTE_ACTION = 'editor-show-component';
const PROBLEM_ACTION = 'editor-select-problem';
const SAVE_ACTION = 'editor-save';
const EXPORT_MODULE_ACTION = 'editor-export-module';
const EXPORT_DECLARATIONS_ACTION = 'editor-export-declarations';
const DOCUMENT_TOGGLE = 'editor-toggle-document';
const INSPECTOR_TOGGLE = 'editor-toggle-inspector';

/** What the inspector shows: a document node or a palette component. */
export type Selection =
  | { readonly kind: 'node'; readonly id: string }
  | { readonly kind: 'component'; readonly key: string }
  | null;

const components = componentFunctions();
// interpretView reads `$icon` names; Lucide exports icons by PascalCase name.
const icons = new Proxy({} as Record<string, unknown>, {
  get: (_target, name) =>
    typeof name === 'string'
      ? (lucideIcons as Record<string, unknown>)[lucideExportName(name)]
      : undefined,
});

/** A slot's placeholder on the canvas: the app fills slots at runtime. */
const slotPlaceholder = (name: string) => () =>
  Text({ children: `${name} slot`, tone: 'quiet' });
const slots = new Proxy({} as Record<string, () => SafeHtml>, {
  get: (_target, name) => slotPlaceholder(String(name)),
});

/** Renders the document onto the canvas, or explains why it cannot. */
/** Stands in for a node the preview cannot render; still selectable. */
function brokenNode(node: ViewNode): SafeHtml {
  return Badge({
    tone: 'danger',
    children: `${node.name ?? nodeTitle(node, componentNames)} cannot render`,
    rootAttributes: { 'data-kerf-node': node.id },
  });
}

function canvasContent(
  document: ViewDocument,
  problems: readonly Problem[],
): SafeHtml {
  const preview = {
    catalog: viewCatalog,
    components,
    inputs: sampleInputs(document, (label) => Text({ children: label })),
    slots,
    icons,
  };
  // A document with problems still previews (KF-F355BF): each node a problem
  // is about renders as a placeholder and everything else renders normally.
  if (problems.length) {
    return previewView(document, {
      ...preview,
      broken: new Set(
        problems.flatMap(({ nodeId }) => (nodeId ? [nodeId] : [])),
      ),
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
}

export interface EditorOptions {
  /** Starts with this document instead of the bundled sample. */
  readonly document?: ViewDocument;
  /** Saves a file; the default downloads it through a temporary link. */
  readonly save?: (fileName: string, text: string) => void;
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

export function createEditor(options: EditorOptions = {}) {
  const doc = signal<ViewDocument>(
    options.document ?? (sample as unknown as ViewDocument),
  );
  const selection = signal<Selection>(null);
  const loadError = signal<string | null>(null);
  /** The last export's contract and how the one before it changed. */
  const lastExport = signal<
    | { contract: ViewContract; report: ReturnType<typeof describeExport> }
    | undefined
  >(undefined);
  const documentSize = signal(280);
  const inspectorSize = signal(300);
  const documentCollapsed = signal(false);
  const inspectorCollapsed = signal(false);

  const select = (next: Selection) => {
    selection.value = next;
  };

  const outline = (
    document: ViewDocument,
    counts: ReadonlyMap<string, number>,
  ) => {
    const current = selection.value;
    return outlineRows(document, componentNames).map((row) => {
      const count = counts.get(row.id);
      return (
        <ListItem
          action={OUTLINE_ACTION}
          itemId={row.id}
          label={row.label}
          description={row.detail}
          selected={current?.kind === 'node' && current.id === row.id}
          status={
            count ? (
              <Badge
                tone="danger"
                label={`${count} ${count === 1 ? 'problem' : 'problems'}`}
              >
                {count}
              </Badge>
            ) : undefined
          }
        />
      );
    });
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
    paletteGroups().map((group) => [
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
    return (
      <List>
        <ListHeader
          label={visit?.node.name ? `${visit.node.name} · ${title}` : title}
          count={component.props.length}
          countLabel="props"
        />
        {inspectorSections(visit?.node, component).map((section) => [
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
          dividerSides="b"
          leading={<ToolbarText text="Kerf UI Editor" />}
          trailing={[
            <FilePickerTrigger
              label="Open"
              accessibleLabel="Open a view document"
              accept=".json,application/json"
              pickerId="open-document"
              icon={<LucideIcon icon={FolderOpen} name="folder-open" />}
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
              size="compact"
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
            main={
              <div class="editor-canvas" data-editor-canvas>
                {canvasContent(document, problemList)}
                <div
                  class="editor-selection"
                  data-morph-skip
                  aria-hidden="true"
                  hidden
                />
              </div>
            }
            rightRail={{
              label: 'Inspector',
              size: inspectorSize.value,
              resizable: { min: 240, max: 480 },
              collapsed: inspectorCollapsed.value,
              toolbar: {
                label: 'Inspector',
                title: <ToolbarText text="Inspector" />,
                toggle: { action: INSPECTOR_TOGGLE, name: 'Inspector' },
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
    const highlight = canvas?.querySelector<HTMLElement>('.editor-selection');
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
    highlight.hidden = false;
    highlight.style.inset = `${box.top - outer.top}px auto auto ${box.left - outer.left}px`;
    highlight.style.width = `${box.width}px`;
    highlight.style.height = `${box.height}px`;
  };

  const exportAs = (kind: ExportKind) => {
    const result = exportModule(doc.value, viewCatalog, kind);
    lastExport.value = {
      contract: result.contract,
      report: describeExport(result.contract, lastExport.value?.contract),
    };
    (options.save ?? download)(result.fileName, result.code);
  };

  const wire = (root: HTMLElement) => {
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
      delegateActions<HTMLElement>(root, 'click', {
        [OUTLINE_ACTION]: (_event, target) =>
          select({ kind: 'node', id: target.dataset.itemId! }),
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
      wireFilePickers(root, {
        onFiles: ({ files }) => {
          const [file] = files;
          if (!file) return;
          void file.text().then((text) => {
            const parsed = parseDocument(text);
            if (parsed.ok) {
              doc.value = parsed.document;
              selection.value = null;
              loadError.value = null;
            } else loadError.value = parsed.error;
          });
        },
      }),
      effect(() => {
        void selection.value;
        void doc.value;
        requestAnimationFrame(() => placeHighlight(root));
      }),
    ];
    const observer = new ResizeObserver(() => placeHighlight(root));
    const canvas = root.querySelector('[data-editor-canvas]');
    if (canvas) observer.observe(canvas);
    return () => {
      observer.disconnect();
      for (const stop of stops) stop();
    };
  };

  return { render, wire, document: doc, selection, loadError };
}
