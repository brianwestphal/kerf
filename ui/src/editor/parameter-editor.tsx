// Parameter drafts live in one modal editor. TypeScript stays on the project
// server; this controller owns async drafts, navigation and stale-response guards.
import {
  typeText,
  type ViewCatalog,
  type ViewDiagnostic,
  type ViewDocument,
  type ViewType,
} from '@kerfjs/ui/view';
import { delegate, effect, type Signal, signal } from 'kerfjs';
import { ChevronRight, X } from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { ToolbarControlGroup } from '../components/actions/toolbar-control-group/toolbar-control-group.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { StateBanner } from '../components/feedback/state-banner/state-banner.js';
import { Switch } from '../components/forms/switch/switch.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { NavStack } from '../components/navigation/nav-stack/nav-stack.js';
import { wireNavStack } from '../components/navigation/nav-stack/wiring/wire-nav-stack.js';
import {
  closeDialog,
  DialogSurface,
  openDialog,
} from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { Text } from '../components/typography/text/text.js';
import { realmOf } from '../shared/dom/realm.js';
import { px } from '../shared/styles/css-values.js';
import { renameParam } from './model/edits.js';
import {
  checkedParamEdit,
  createParam,
  paramIsReferenced,
  removeParam,
} from './model/params.js';
import {
  type ProjectTypeResult,
  type ProjectTypeService,
  TYPE_SERVICE_REQUIRED,
  type TypeSuggestion,
} from './project-type-service.js';

export const PARAMETER_DIALOG = 'editor-parameter-dialog';
const STACK = 'editor-parameter-stack';
const OPEN = 'editor-parameter-open';
const SAVE = 'editor-parameter-save';
const REMOVE = 'editor-parameter-remove';
const NAVIGATE = 'editor-parameter-navigate';
const COMPLETE = 'editor-parameter-complete';

interface Draft {
  readonly original?: string;
  readonly name: string;
  readonly text: string;
  readonly type?: ViewType;
  readonly hasDefault: boolean;
  readonly defaultText: string;
  readonly error: string;
  readonly pending: boolean;
  readonly suggestions: readonly TypeSuggestion[];
  readonly path: readonly string[];
}

const describe = (type: ViewType) => {
  if (type.typescript) return type.typescript.text;
  if (type.text) return type.text;
  return typeText(type);
};
const hasProjectTypes = (document: ViewDocument) =>
  Object.values(document.params ?? {}).some((param) => param.type.typescript);
const diagnostic = (
  item: ProjectTypeResult['diagnostics'][number],
): ViewDiagnostic => ({
  code: 'code' in item ? String(item.code) : 'KUI-V018',
  path: 'path' in item ? String(item.path) : '$.params',
  message: item.message,
});

const children = (type: ViewType) =>
  type.kind === 'array' && type.items
    ? [{ key: 'items', name: 'Item', type: type.items }]
    : type.kind === 'object'
      ? (type.props ?? []).map((item, index) => ({
          key: `field:${index}`,
          name: item.name,
          type: item.type,
        }))
      : type.kind === 'union'
        ? (type.members ?? []).map((item, index) => ({
            key: `member:${index}`,
            name: `Member ${index + 1}`,
            type: item,
          }))
        : [];

export interface ParameterEditorOptions {
  readonly document: Signal<ViewDocument>;
  readonly catalog: ViewCatalog;
  readonly commit: (document: ViewDocument) => void;
  /** Refresh compiler-derived projections without adding a user undo step. */
  readonly refresh: (document: ViewDocument) => void;
  readonly source: () => string;
  readonly service?: ProjectTypeService;
}

export function createParameterEditor(options: ParameterEditorOptions) {
  const draft = signal<Draft | null>(null);
  const semanticProblems = signal<readonly ViewDiagnostic[]>([]);
  const checking = signal(false);
  let root: HTMLElement | undefined;
  let draftRevision = 0;
  let semanticRevision = 0;
  let timer: number | undefined;
  let focused = false;
  const clearTimer = () => {
    if (timer !== undefined && root) realmOf(root).clearTimeout(timer);
    timer = undefined;
  };
  const setError = (error: string) => {
    draft.value = { ...draft.peek()!, error, pending: false };
  };
  const analyze = async (format = false, cursor?: number) => {
    clearTimer();
    const current = draft.peek()!;
    const revision = ++draftRevision;
    const source = options.source();
    if (!options.service) {
      setError(TYPE_SERVICE_REQUIRED.message);
      return;
    }
    draft.value = { ...current, pending: true, error: '' };
    try {
      const result = await options.service({
        action: 'analyze',
        source,
        text: current.text,
        cursor,
        declared: current.type?.typescript ? undefined : current.type,
      });
      if (
        revision !== draftRevision ||
        !draft.peek() ||
        source !== options.source()
      )
        return;
      const next = draft.peek()!;
      const text =
        format && result.type?.typescript
          ? result.type.typescript.text
          : next.text;
      draft.value = {
        ...next,
        text,
        type: result.type,
        pending: false,
        error: result.diagnostics.map((item) => item.message).join('\n'),
        suggestions:
          focused && !format ? (result.suggestions ?? []).slice(0, 8) : [],
      };
      if (format && text !== next.text && root) {
        const input = root.querySelector<HTMLTextAreaElement>(
          '[data-parameter-draft="type"] textarea',
        );
        input!.value = text;
      }
    } catch (error) {
      if (revision === draftRevision && source === options.source())
        setError(error instanceof Error ? error.message : String(error));
    }
  };
  const schedule = (cursor?: number) => {
    clearTimer();
    draftRevision += 1;
    draft.value = {
      ...draft.peek()!,
      type: undefined,
      pending: true,
      error: '',
    };
    timer = realmOf(root!).setTimeout(() => {
      void analyze(false, cursor);
    }, 120);
  };
  const validateNow = async (): Promise<ViewDocument | undefined> => {
    const document = options.document.peek();
    if (!hasProjectTypes(document)) {
      semanticProblems.value = [];
      checking.value = false;
      return document;
    }
    const revision = ++semanticRevision;
    const source = options.source();
    checking.value = true;
    if (!options.service) {
      semanticProblems.value = [TYPE_SERVICE_REQUIRED];
      checking.value = false;
      return undefined;
    }
    try {
      const result = await options.service({
        action: 'validate',
        source,
        document,
      });
      if (
        revision !== semanticRevision ||
        document !== options.document.peek() ||
        source !== options.source()
      )
        return undefined;
      semanticProblems.value = result.diagnostics.map(diagnostic);
      checking.value = false;
      if (result.diagnostics.length) return undefined;
      const next = result.document ?? document;
      if (JSON.stringify(next) !== JSON.stringify(document))
        options.refresh(next);
      return next;
    } catch (error) {
      if (
        revision === semanticRevision &&
        document === options.document.peek() &&
        source === options.source()
      ) {
        semanticProblems.value = [
          {
            ...TYPE_SERVICE_REQUIRED,
            message: error instanceof Error ? error.message : String(error),
          },
        ];
        checking.value = false;
      }
      return undefined;
    }
  };
  const open = (name?: string) => {
    const param = name ? options.document.peek().params?.[name] : undefined;
    draftRevision += 1;
    draft.value = {
      original: name,
      name: name ?? '',
      text: param ? describe(param.type) : 'string',
      type: param?.type,
      hasDefault: param ? Object.hasOwn(param, 'default') : false,
      defaultText: JSON.stringify(param?.default ?? ''),
      error: '',
      pending: false,
      suggestions: [],
      path: [],
    };
    focused = false;
    void analyze(true);
    const dialog = root!.querySelector<HTMLDialogElement>(
      `#${PARAMETER_DIALOG}`,
    )!;
    if (!dialog.open) openDialog(dialog);
  };
  const close = () => {
    const dialog = root?.querySelector<HTMLDialogElement>(
      `#${PARAMETER_DIALOG}`,
    );
    if (dialog?.open) closeDialog(dialog);
    clearTimer();
    draftRevision += 1;
    draft.value = null;
    focused = false;
  };
  const save = async () => {
    const current = draft.peek();
    if (!current || current.pending || !current.type || !options.service)
      return;
    const document = options.document.peek();
    const param = current.original
      ? document.params?.[current.original]
      : undefined;
    const definition = { ...param, type: current.type };
    delete definition.default;
    if (current.hasDefault) {
      try {
        definition.default = JSON.parse(current.defaultText);
        delete definition.optional;
      } catch {
        setError('Enter a valid JSON default value.');
        return;
      }
    }
    const name = current.name.trim();
    let edited;
    if (!current.original)
      edited = createParam(document, options.catalog, name, current.type);
    else edited = renameParam(document, current.original, name);
    if ('error' in edited) {
      setError(edited.error);
      return;
    }
    const checked = checkedParamEdit(
      document,
      {
        ...edited.document,
        params: { ...edited.document.params, [name]: definition },
      },
      options.catalog,
    );
    if ('error' in checked) {
      setError(checked.error);
      return;
    }
    const revision = ++draftRevision;
    const source = options.source();
    draft.value = { ...current, pending: true, error: '', suggestions: [] };
    try {
      const result = await options.service({
        action: 'validate',
        source,
        document: checked.document,
      });
      if (revision !== draftRevision || !draft.peek()) return;
      if (document !== options.document.peek() || source !== options.source()) {
        setError('The document changed. Review the parameter and save again.');
        return;
      }
      if (result.diagnostics.length) {
        setError(result.diagnostics.map((item) => item.message).join('\n'));
        return;
      }
      options.commit(result.document ?? checked.document);
      close();
    } catch (error) {
      if (revision === draftRevision)
        setError(error instanceof Error ? error.message : String(error));
    }
  };
  const panel = () => (
    <List rootAttributes={{ 'data-editor-document-params': '' }}>
      <ListHeader label="Parameters" />
      {Object.entries(options.document.value.params ?? {}).map(
        ([name, param]) => (
          <ListItem
            label={name}
            description={describe(param.type)}
            action={OPEN}
            itemId={name}
            trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
            rootAttributes={{ 'data-editor-param-row': name }}
          />
        ),
      )}
      <ListItem
        label="Add parameter"
        action={OPEN}
        rootAttributes={{ 'data-editor-param-add': '' }}
      />
    </List>
  );
  const input = (part: string) => ({ 'data-parameter-draft': part });
  const rootFields = (value: Draft) => (
    <List gap controlInsets="trbl">
      <TextField
        label="Name"
        value={value.name}
        rootAttributes={input('name')}
      />
      <TextField
        label="Type"
        value={value.text}
        multiline
        rows={4}
        maxRows={10}
        spellcheck={false}
        autocapitalize="off"
        autocorrect="off"
        autocomplete="off"
        error={!value.type ? value.error || undefined : undefined}
        rootAttributes={input('type')}
      />
      {value.type && value.error ? (
        <StateBanner tone="warning" title={value.error} />
      ) : undefined}
      {value.pending ? <Text tone="quiet">Checking type…</Text> : undefined}
      {value.suggestions.length ? (
        <List>
          {value.suggestions.map((item, index) => (
            <ListItem
              label={item.name}
              description={item.source}
              action={COMPLETE}
              itemId={String(index)}
              rootAttributes={{ 'data-type-suggestion': String(index) }}
            />
          ))}
        </List>
      ) : undefined}
      <Switch
        label="Use default"
        checked={value.hasDefault}
        rootAttributes={input('hasDefault')}
      />
      {value.hasDefault ? (
        <TextField
          label="Default value (JSON)"
          value={value.defaultText}
          multiline
          rootAttributes={input('default')}
        />
      ) : undefined}
    </List>
  );
  const members = (type: ViewType, path: readonly string[]) => (
    <List>
      {children(type).map((item) => (
        <ListItem
          label={item.name}
          description={describe(item.type)}
          action={NAVIGATE}
          itemId={JSON.stringify([...path, item.key])}
          trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
        />
      ))}
    </List>
  );
  const dialog = () => {
    const value = draft.value;
    const views = value
      ? [
          {
            key: 'parameter',
            toolbar: { title: value.original ?? 'Add parameter' },
            content: (
              <>
                {rootFields(value)}
                {value.type ? members(value.type, []) : undefined}
              </>
            ),
          },
        ]
      : [];
    let type = value?.type;
    const path: string[] = [];
    for (const key of value?.path ?? []) {
      const item = type && children(type).find((child) => child.key === key);
      if (!item) break;
      path.push(key);
      type = item.type;
      views.push({
        key: `parameter:${path.join('/')}`,
        toolbar: { title: item.name },
        content: (
          <>
            <List controlInsets="trbl">
              <TextField
                label="Type"
                value={describe(item.type)}
                multiline
                readOnly
              />
            </List>
            {members(item.type, [...path])}
          </>
        ),
      });
    }
    return (
      <DialogSurface
        id={PARAMETER_DIALOG}
        label="Parameter"
        size="medium"
        withoutHeader
        bodyInset="none"
        bodyLayout="fill"
        height={px(560)}
        rootAttributes={{ 'data-key': PARAMETER_DIALOG }}
        footer={
          <>
            {value?.original ? (
              <Button
                action={REMOVE}
                emphasis="secondary"
                disabled={paramIsReferenced(
                  options.document.value,
                  value.original,
                )}
                title={
                  paramIsReferenced(options.document.value, value.original)
                    ? 'Remove this parameter’s bindings before deleting it.'
                    : undefined
                }
              >
                Remove parameter
              </Button>
            ) : undefined}
            <Button rootAttributes={{ 'data-dialog-close': '' }}>Cancel</Button>
            <Button
              action={SAVE}
              tone="brand"
              disabled={!value?.type || value.pending || !options.service}
            >
              {value?.original ? 'Save' : 'Add parameter'}
            </Button>
          </>
        }
      >
        <NavStack
          id={STACK}
          label="Parameter type"
          views={views.map((view) => ({
            ...view,
            toolbar: {
              ...view.toolbar,
              trailing: (
                <ToolbarControlGroup>
                  <Button
                    ariaLabel="Close parameter"
                    icon={<LucideIcon icon={X} name="x" />}
                    rootAttributes={{ 'data-dialog-close': '' }}
                  />
                </ToolbarControlGroup>
              ),
            },
          }))}
        />
      </DialogSurface>
    );
  };
  const wire = (element: HTMLElement) => {
    root = element;
    const stops = [
      delegate<HTMLElement>(
        root,
        'click',
        `[data-action="${OPEN}"]`,
        (_event, target) => open(target.dataset.itemId),
      ),
      delegate<HTMLElement>(root, 'click', `[data-action="${SAVE}"]`, () => {
        void save();
      }),
      delegate<HTMLElement>(root, 'click', `[data-action="${REMOVE}"]`, () => {
        const name = draft.peek()!.original!;
        const result = removeParam(
          options.document.peek(),
          options.catalog,
          name,
        );
        if ('error' in result) setError(result.error);
        else {
          options.commit(result.document);
          close();
        }
      }),
      delegate<HTMLElement>(
        root,
        'click',
        `[data-action="${NAVIGATE}"]`,
        (_event, target) => {
          draft.value = {
            ...draft.peek()!,
            path: JSON.parse(target.dataset.itemId!) as string[],
          };
        },
      ),
      delegate<HTMLElement>(
        root,
        'click',
        `[data-action="${COMPLETE}"]`,
        (_event, target) => {
          const suggestion =
            draft.peek()?.suggestions[Number(target.dataset.itemId)];
          if (!suggestion || !draft.peek()) return;
          draft.value = {
            ...draft.peek()!,
            text: suggestion.text,
            suggestions: [],
            path: [],
          };
          const field = root!.querySelector<HTMLTextAreaElement>(
            '[data-parameter-draft="type"] textarea',
          )!;
          field.value = suggestion.text;
          field.focus();
          field.setSelectionRange(suggestion.cursor, suggestion.cursor);
          focused = true;
          schedule(suggestion.cursor);
        },
      ),
      delegate<HTMLElement>(
        root,
        'input',
        '[data-parameter-draft]',
        (_event, target) => {
          const current = draft.peek()!;
          const field = target.querySelector<
            HTMLInputElement | HTMLTextAreaElement
          >('input,textarea')!;
          switch (target.dataset.parameterDraft) {
            case 'name':
              draft.value = { ...current, name: field.value, error: '' };
              break;
            case 'default':
              draft.value = { ...current, defaultText: field.value };
              break;
            case 'type':
              draft.value = { ...current, text: field.value, path: [] };
              focused = true;
              schedule(field.selectionStart!);
              break;
          }
        },
      ),
      delegate<HTMLElement>(
        root,
        'change',
        '[data-parameter-draft="hasDefault"]',
        (_event, target) => {
          draft.value = {
            ...draft.peek()!,
            hasDefault:
              target.querySelector<HTMLInputElement>('input')!.checked,
          };
        },
      ),
      delegate<HTMLElement>(
        root,
        'focusin',
        '[data-parameter-draft="type"]',
        () => {
          focused = true;
        },
      ),
      delegate<HTMLElement>(
        root,
        'focusout',
        '[data-parameter-draft="type"]',
        (event) => {
          if (
            (event as FocusEvent).relatedTarget instanceof Element &&
            ((event as FocusEvent).relatedTarget as Element).closest(
              '[data-type-suggestion]',
            )
          )
            return;
          focused = false;
          const value = draft.peek();
          if (value?.type?.typescript) {
            draft.value = {
              ...value,
              text: value.type.typescript.text,
              suggestions: [],
            };
            const field = root!.querySelector<HTMLTextAreaElement>(
              '[data-parameter-draft="type"] textarea',
            );
            field!.value = value.type.typescript.text;
          } else if (value) void analyze(true);
        },
      ),
      delegate<HTMLElement>(
        root,
        'keydown',
        '[data-parameter-draft="type"]',
        (event) => {
          const key = event as KeyboardEvent;
          if (key.key === 'ArrowDown' && draft.peek()?.suggestions.length) {
            key.preventDefault();
            root!.querySelector<HTMLElement>('[data-type-suggestion]')?.focus();
          }
          if (key.key === 'Escape' && draft.peek()?.suggestions.length) {
            key.preventDefault();
            key.stopPropagation();
            draft.value = { ...draft.peek()!, suggestions: [] };
          }
        },
      ),
      wireNavStack(root.querySelector<HTMLElement>(`#${STACK}`)!, {
        onBack: () => {
          draft.value = {
            ...draft.peek()!,
            path: draft.peek()!.path.slice(0, -1),
          };
        },
      }),
      effect(() => {
        void options.document.value;
        void options.source();
        void validateNow();
      }),
    ];
    const onClose = (event: Event) => {
      if ((event.target as Element).id === PARAMETER_DIALOG) close();
    };
    const onFocus = () => {
      void validateNow();
    };
    root.addEventListener('close', onClose, true);
    realmOf(root).addEventListener('focus', onFocus);
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      clearTimer();
      draftRevision += 1;
      semanticRevision += 1;
      element.removeEventListener('close', onClose, true);
      realmOf(element).removeEventListener('focus', onFocus);
      for (const stop of stops) stop();
      root = undefined;
    };
  };
  return {
    panel,
    dialog,
    wire,
    semanticProblems,
    checking,
    validateNow,
    close,
  };
}
