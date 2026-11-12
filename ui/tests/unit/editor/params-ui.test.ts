import type { ViewDocument, ViewType } from '@kerfjs/ui/view';
import { mount, signal } from 'kerfjs';
import { jsx } from 'kerfjs/jsx-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createParameterEditor,
  PARAMETER_DIALOG,
} from '../../../src/editor/parameter-editor.js';
import {
  type ProjectTypeResult,
  type ProjectTypeService,
} from '../../../src/editor/project-type-service.js';
import { sample, viewCatalog } from './kerf-catalog.js';

const disposers: (() => void)[] = [];
afterEach(() => {
  while (disposers.length) disposers.pop()!();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const project = (text: string, shape: ViewType = { kind: text }): ViewType => ({
  ...shape,
  typescript: { text, source: 'views/inbox.kui.json', references: [] },
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};

function setup(
  options: {
    document?: ViewDocument;
    service?: ProjectTypeService | false;
  } = {},
) {
  const root = document.createElement('div');
  document.body.append(root);
  const doc = signal(globalThis.structuredClone(options.document ?? sample));
  const source = signal('views/inbox.kui.json');
  // Transport fixtures test lifecycle only; actual TS semantics have a real
  // language-service suite in project-types.test.ts.
  const api = vi.fn<ProjectTypeService>(async (request) =>
    request.action === 'validate'
      ? { document: request.document, diagnostics: [] }
      : {
          type: project(request.text, {
            kind: ['number', 'boolean'].includes(request.text)
              ? request.text
              : 'string',
          }),
          diagnostics: [],
        },
  );
  const commit = vi.fn((next: ViewDocument) => {
    doc.value = next;
  });
  const refresh = vi.fn((next: ViewDocument) => {
    doc.value = next;
  });
  const controller = createParameterEditor({
    document: doc,
    source: () => source.value,
    catalog: viewCatalog,
    commit,
    refresh,
    service: options.service === false ? undefined : (options.service ?? api),
  });
  const stop = mount(root, () =>
    jsx('div', { children: [controller.panel(), controller.dialog()] }),
  );
  const unwire = controller.wire(root);
  const dispose = () => {
    const dialog = root.querySelector<HTMLDialogElement>(
      `#${PARAMETER_DIALOG}`,
    )!;
    if (dialog.open) dialog.close();
    unwire();
    stop();
    root.remove();
  };
  disposers.push(dispose);
  const dialog = root.querySelector<HTMLDialogElement>(`#${PARAMETER_DIALOG}`)!;
  const button = (action: string) =>
    root.querySelector<HTMLButtonElement>(
      `[data-action="editor-parameter-${action}"]`,
    )!;
  const field = (part: string) =>
    root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[data-parameter-draft="${part}"] input,[data-parameter-draft="${part}"] textarea`,
    )!;
  const input = (part: string, value: string) => {
    const node = field(part);
    node.value = value;
    node.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const open = async (name?: string) => {
    root
      .querySelector<HTMLElement>(
        name ? `[data-editor-param-row="${name}"]` : '[data-editor-param-add]',
      )!
      .click();
    await vi.waitFor(() =>
      expect(dialog.textContent).not.toContain('Checking type…'),
    );
  };
  const ready = async () => {
    await vi.waitFor(() => expect(button('save').disabled).toBe(false));
  };
  const save = async () => {
    await ready();
    button('save').click();
    await vi.waitFor(() => expect(commit).toHaveBeenCalled());
  };
  return {
    root,
    doc,
    source,
    api,
    commit,
    refresh,
    controller,
    dialog,
    button,
    field,
    input,
    open,
    ready,
    save,
    dispose,
  };
}

describe('compact parameter dialog', () => {
  it('keeps rail rows compact and edits in a modal NavStack', async () => {
    const f = setup();
    expect(
      f.root.querySelector('[data-editor-document-params] input'),
    ).toBeNull();
    expect(
      f.root.querySelector('[data-editor-param-row="title"]')!.textContent,
    ).toContain('string');
    await f.open('title');
    expect(f.dialog.open).toBe(true);
    expect(f.field('name').value).toBe('title');
    expect(f.field('type').value).toBe('string');
    expect(f.dialog.querySelector('[data-nav-stack-id]')).not.toBeNull();
    expect(f.dialog.textContent).not.toContain('Item fields');
  });
  it('reopens on a row chosen while the dialog is still closing (KF-8SPEG7)', async () => {
    const f = setup();
    await f.open('title');
    // A real exit motion, so the native close waits for it.
    f.dialog.style.animationName = 'kui-test-motion';
    f.dialog.style.animationDuration = '200ms';
    f.dialog
      .querySelector<HTMLElement>('[aria-label="Close parameter"]')!
      .click();
    // The exit motion is under way: the native dialog is still open.
    expect(f.dialog.open).toBe(true);
    await f.open('showEmpty');
    // Past the exit motion's end, the reopened dialog and its draft remain.
    await new Promise((resolve) => globalThis.setTimeout(resolve, 400));
    expect(f.dialog.open).toBe(true);
    expect(f.field('name').value).toBe('showEmpty');
  });

  it('creates a typed parameter/default in one document edit', async () => {
    const f = setup();
    await f.open();
    f.input('name', 'showDetails');
    f.input('type', 'boolean');
    await f.ready();
    const toggle = f.field('hasDefault') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    f.input('default', 'true');
    await f.save();
    expect(f.doc.value.params?.showDetails).toMatchObject({
      type: { kind: 'boolean', typescript: { text: 'boolean' } },
      default: true,
    });
    expect(f.commit).toHaveBeenCalledTimes(1);
  });
  it('renames references and preserves unrelated definitions', async () => {
    const f = setup();
    await f.open('title');
    f.input('name', 'heading');
    f.input('default', '"Subject"');
    await f.save();
    expect(f.doc.value.params?.title).toBeUndefined();
    expect(f.doc.value.params?.heading?.default).toBe('Subject');
    expect(JSON.stringify(f.doc.value.root)).toContain('"$param":"heading"');
  });
  it('removes an unused parameter and refuses a referenced one', async () => {
    const f = setup({
      document: {
        ...sample,
        params: { ...sample.params, unused: { type: { kind: 'number' } } },
      },
    });
    await f.open('unused');
    f.button('remove').click();
    expect(f.doc.value.params?.unused).toBeUndefined();
    await f.open('title');
    expect(f.button('remove').disabled).toBe(true);
    f.button('remove').disabled = false;
    f.button('remove').click();
    expect(f.doc.value.params?.title).toBeDefined();
    expect(f.dialog.textContent).toContain('Remove its bindings first');
  });
  it('rejects invalid and duplicate names without mutation', async () => {
    const f = setup();
    await f.open();
    f.input('name', 'Bad Name');
    f.button('save').click();
    expect(f.dialog.textContent).toContain('camelCase');
    f.input('name', 'title');
    f.button('save').click();
    expect(f.dialog.textContent).toContain('already a param');
    expect(f.commit).not.toHaveBeenCalled();
  });
  it('retains refused default drafts for correction', async () => {
    const f = setup();
    await f.open('title');
    f.input('default', 'not json');
    f.button('save').click();
    expect(f.dialog.textContent).toContain('valid JSON');
    f.input('default', '123');
    f.api.mockImplementation(async (request) =>
      request.action === 'validate'
        ? { diagnostics: [{ message: 'number is not assignable to string' }] }
        : { type: project(request.text), diagnostics: [] },
    );
    f.button('save').click();
    await vi.waitFor(() =>
      expect(f.dialog.textContent).toContain('not assignable'),
    );
    expect(f.field('default').value).toBe('123');
    expect(f.commit).not.toHaveBeenCalled();
  });
  it('retains optionality and removes defaults explicitly', async () => {
    const f = setup({
      document: {
        ...sample,
        params: {
          ...sample.params,
          optionalValue: { type: { kind: 'string' }, optional: true },
        },
      },
    });
    await f.open('optionalValue');
    await f.save();
    expect(f.doc.value.params?.optionalValue?.optional).toBe(true);
    f.commit.mockClear();
    await f.open('title');
    const toggle = f.field('hasDefault') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await f.save();
    expect(f.doc.value.params?.title).not.toHaveProperty('default');
  });
  it('traverses array, object and union members in the dialog stack', async () => {
    const shape: ViewType = {
      kind: 'array',
      items: {
        kind: 'object',
        props: [
          {
            name: 'choice',
            required: true,
            type: {
              kind: 'union',
              members: [{ kind: 'string' }, { kind: 'number' }],
            },
          },
        ],
      },
    };
    const api: ProjectTypeService = async (request) =>
      request.action === 'analyze'
        ? { type: project(request.text, shape), diagnostics: [] }
        : { document: request.document, diagnostics: [] };
    const f = setup({ service: api });
    await f.open();
    const navigate = (path: string[]) =>
      f.dialog
        .querySelector<HTMLElement>(
          `[data-action="editor-parameter-navigate"][data-item-id='${JSON.stringify(path)}']`,
        )!
        .click();
    navigate(['items']);
    navigate(['items', 'field:0']);
    navigate(['items', 'field:0', 'member:1']);
    expect(
      f.dialog.querySelector<HTMLTextAreaElement>(
        '[data-nav-active="true"] textarea',
      )!.value,
    ).toBe('number');
    expect(
      f.dialog.querySelector<HTMLTextAreaElement>(
        '[data-nav-active="true"] textarea',
      )!.readOnly,
    ).toBe(true);
    f.dialog.querySelector<HTMLElement>('[data-nav-back]')!.click();
    expect(
      f.dialog.querySelector('[data-nav-active="true"]')!.textContent,
    ).toContain('Member 1');
  });
});

describe('live TypeScript drafts', () => {
  it('reports compiler errors and blocks invalid saves', async () => {
    const f = setup();
    await f.open();
    f.api.mockResolvedValue({
      diagnostics: [
        { message: 'Cannot find name MissingType', start: 0, length: 11 },
      ],
    });
    f.input('type', 'MissingType');
    await vi.waitFor(() =>
      expect(f.dialog.textContent).toContain('Cannot find name'),
    );
    expect(f.button('save').disabled).toBe(true);
  });
  it('ignores out-of-order responses and discarded drafts', async () => {
    const f = setup();
    await f.open();
    const first = deferred<ProjectTypeResult>();
    const second = deferred<ProjectTypeResult>();
    f.api
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    f.input('type', 'number');
    await vi.waitFor(() =>
      expect(f.api.mock.calls.at(-1)![0]).toMatchObject({ text: 'number' }),
    );
    f.input('type', 'boolean');
    await vi.waitFor(() =>
      expect(f.api.mock.calls.at(-1)![0]).toMatchObject({ text: 'boolean' }),
    );
    second.resolve({ type: project('boolean'), diagnostics: [] });
    await f.ready();
    first.resolve({ diagnostics: [{ message: 'Old failure' }] });
    await Promise.resolve();
    expect(f.field('type').value).toBe('boolean');
    expect(f.dialog.textContent).not.toContain('Old failure');
    const late = deferred<ProjectTypeResult>();
    f.api.mockReturnValueOnce(late.promise);
    f.input('type', 'number');
    await vi.waitFor(() =>
      expect(f.api.mock.calls.at(-1)![0]).toMatchObject({ text: 'number' }),
    );
    f.dialog.close();
    late.resolve({ diagnostics: [{ message: 'Discarded failure' }] });
    await Promise.resolve();
    expect(f.root.textContent).not.toContain('Discarded failure');
  });
  it('inserts host completions and makes them keyboard reachable', async () => {
    const f = setup();
    await f.open();
    f.api.mockImplementation(async (request) =>
      request.action === 'analyze'
        ? {
            type: project(request.text),
            diagnostics: [],
            suggestions: [
              {
                name: 'MyType',
                source: './src/types.js',
                text: 'Array<MyType>',
                cursor: 12,
              },
            ],
          }
        : { document: request.document, diagnostics: [] },
    );
    f.input('type', 'Array<My');
    await vi.waitFor(() =>
      expect(f.dialog.querySelector('[data-type-suggestion]')).not.toBeNull(),
    );
    f.field('type').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(document.activeElement).toBe(
      f.dialog.querySelector('[data-type-suggestion]'),
    );
    f.dialog.querySelector<HTMLElement>('[data-type-suggestion]')!.click();
    expect(f.field('type').value).toBe('Array<MyType>');
    expect(f.field('type').selectionStart).toBe(12);
    await vi.waitFor(() =>
      expect(f.dialog.querySelector('[data-type-suggestion]')).not.toBeNull(),
    );
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    f.field('type').dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(f.dialog.querySelector('[data-type-suggestion]')).toBeNull();
  });
  it('formats on blur without a second blocking request', async () => {
    const f = setup();
    await f.open();
    f.api.mockResolvedValue({
      type: project('Array<string | number>', {
        kind: 'array',
        items: { kind: 'string' },
      }),
      diagnostics: [],
    });
    f.input('type', 'Array<string|number>');
    await f.ready();
    f.field('type').dispatchEvent(
      new FocusEvent('focusout', { bubbles: true }),
    );
    expect(f.field('type').value).toBe('Array<string | number>');
    expect(f.button('save').disabled).toBe(false);
  });
  it('finishes a pending type draft with compiler formatting when focus leaves', async () => {
    const f = setup();
    await f.open();
    f.api.mockResolvedValue({
      type: project('Array<string | number>', {
        kind: 'array',
        items: { kind: 'string' },
      }),
      diagnostics: [],
    });
    f.input('type', 'Array<string|number>');
    f.field('type').dispatchEvent(
      new FocusEvent('focusout', { bubbles: true }),
    );
    await f.ready();
    expect(f.field('type').value).toBe('Array<string | number>');
  });
  it('keeps failed network drafts editable', async () => {
    const f = setup();
    await f.open();
    f.api.mockRejectedValue(new Error('Project unavailable'));
    f.input('type', 'number');
    await vi.waitFor(() =>
      expect(f.dialog.textContent).toContain('Project unavailable'),
    );
    expect(f.field('type').value).toBe('number');
    f.field('type').dispatchEvent(
      new FocusEvent('focusout', { bubbles: true }),
    );
    await vi.waitFor(() =>
      expect(f.dialog.textContent).toContain('Project unavailable'),
    );
  });
  it('refuses stale saves after external edits or closing', async () => {
    const f = setup();
    await f.open();
    f.input('name', 'fresh');
    const pending = deferred<ProjectTypeResult>();
    f.api.mockReturnValueOnce(pending.promise);
    f.button('save').click();
    f.doc.value = { ...f.doc.value, name: 'Changed' };
    pending.resolve({ document: f.doc.value, diagnostics: [] });
    await vi.waitFor(() =>
      expect(f.dialog.textContent).toContain('document changed'),
    );
    expect(f.commit).not.toHaveBeenCalled();
    await f.open();
    f.input('name', 'fresh');
    const closed = deferred<ProjectTypeResult>();
    f.api.mockReturnValueOnce(closed.promise);
    f.button('save').click();
    f.dialog.close();
    closed.resolve({ document: f.doc.value, diagnostics: [] });
    await Promise.resolve();
    expect(f.commit).not.toHaveBeenCalled();
  });
  it('reports save transport errors and cancels pending input on disposal', async () => {
    const f = setup();
    await f.open();
    f.input('name', 'fresh');
    f.api.mockRejectedValueOnce('offline');
    f.button('save').click();
    await vi.waitFor(() => expect(f.dialog.textContent).toContain('offline'));
    f.input('type', 'boolean');
    f.dispose();
    expect(() => f.dispose()).not.toThrow();
    disposers.pop();
  });
});

describe('draft boundary cases', () => {
  it('renders authored display text and repairs an incomplete legacy type', async () => {
    const f = setup({
      document: {
        ...sample,
        params: {
          display: { type: { kind: 'unknown', text: 'ExistingProjectType' } },
          broken: { type: { kind: 'array' } },
        },
      },
    });
    expect(f.root.textContent).toContain('ExistingProjectType');
    expect(
      f.root.querySelector('[data-editor-param-row="broken"]')!.textContent,
    ).toContain('unknown[]');
    await f.open('broken');
    f.input('type', 'string');
    await f.save();
    expect(f.doc.value.params!.broken.type.kind).toBe('string');
  });
  it('ignores closed form events and preserves completion through focus transfer', async () => {
    const f = setup();
    // A queued submit delivered after closing must not resurrect a draft.
    f.button('save').disabled = false;
    f.button('save').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await f.open();
    f.api.mockResolvedValue({
      type: project('string'),
      diagnostics: [],
      suggestions: [{ name: 'string', text: 'string', cursor: 6 }],
    });
    f.input('type', 'str');
    await vi.waitFor(() =>
      expect(f.root.querySelector('[data-type-suggestion]')).not.toBeNull(),
    );
    const suggestion = f.root.querySelector<HTMLElement>(
      '[data-type-suggestion]',
    )!;
    f.field('type').dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: suggestion }),
    );
    expect(f.root.querySelector('[data-type-suggestion]')).not.toBeNull();
    suggestion.click();
    await f.ready();
    f.controller.close();
    expect(f.commit).not.toHaveBeenCalled();
  });
  it('retains the parameter when a changed legacy type breaks an existing binding', async () => {
    const f = setup();
    await f.open('title');
    f.api.mockResolvedValue({ type: { kind: 'number' }, diagnostics: [] });
    f.input('type', 'number');
    await f.ready();
    f.button('save').click();
    await vi.waitFor(() =>
      expect(f.dialog.textContent).toContain('not a valid number'),
    );
    expect(f.commit).not.toHaveBeenCalled();
  });
});

describe('project context changes during drafts', () => {
  it('ignores a type result from the previous document path', async () => {
    let resolve!: (value: ProjectTypeResult) => void;
    const pending = new Promise<ProjectTypeResult>((yes) => {
      resolve = yes;
    });
    const f = setup();
    await f.open();
    f.api.mockReturnValueOnce(pending);
    f.input('type', 'OldProjectType');
    await vi.waitFor(() =>
      expect(f.api).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'OldProjectType' }),
      ),
    );
    f.source.value = 'moved/inbox.kui.json';
    resolve({ type: project('OldProjectType'), diagnostics: [] });
    await Promise.resolve();
    expect(f.button('save').disabled).toBe(true);
  });
  it('ignores a closed request failure and handles thrown non-Error values', async () => {
    let reject!: (error: unknown) => void;
    const pending = new Promise<ProjectTypeResult>((_yes, no) => {
      reject = no;
    });
    const f = setup();
    await f.open();
    f.api.mockReturnValueOnce(pending);
    f.input('type', 'ProjectType');
    await vi.waitFor(() =>
      expect(f.api).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'ProjectType' }),
      ),
    );
    f.controller.close();
    reject('old failure');
    await Promise.resolve();
    await f.open();
    f.api.mockRejectedValueOnce('offline');
    f.input('type', 'number');
    await vi.waitFor(() => expect(f.dialog.textContent).toContain('offline'));
  });
  it('supports empty documents and host validators that leave the document unchanged', async () => {
    const f = setup({ document: { ...sample, params: undefined } });
    expect(f.root.querySelectorAll('[data-editor-param-row]')).toHaveLength(0);
    await f.open();
    f.input('name', 'fresh');
    f.api.mockResolvedValueOnce({ diagnostics: [] });
    await f.save();
    expect(f.doc.value.params?.fresh).toBeDefined();
    f.api.mockResolvedValueOnce({ diagnostics: [] });
    expect(await f.controller.validateNow()).toBe(f.doc.peek());
  });
});

describe('compiler projection lifecycle', () => {
  it('accepts opaque object and union projections and discards stale navigation', async () => {
    const f = setup({
      document: {
        ...sample,
        params: {
          list: {
            type: project('ReadonlyArray<string>', {
              kind: 'array',
              items: { kind: 'string' },
            }),
          },
        },
      },
    });
    const pending = deferred<ProjectTypeResult>();
    f.api.mockReturnValueOnce(pending.promise);
    f.root
      .querySelector<HTMLElement>('[data-editor-param-row="list"]')!
      .click();
    f.root
      .querySelector<HTMLElement>('[data-action="editor-parameter-navigate"]')!
      .click();
    pending.resolve({
      type: project('OpaqueObject', { kind: 'object' }),
      diagnostics: [],
    });
    await f.ready();
    expect(
      f.root.querySelector('[data-nav-stack-id]')!.getAttribute('data-depth'),
    ).toBe('1');
    f.api.mockResolvedValueOnce({
      type: project('OpaqueUnion', { kind: 'union' }),
      diagnostics: [],
    });
    f.input('type', 'OpaqueUnion');
    await f.ready();
    expect(
      f.root.querySelector('[data-nav-stack-id]')!.getAttribute('data-depth'),
    ).toBe('1');
  });
  it('ignores failed validation after disposal and failed saves after cancellation', async () => {
    let reject!: (error: unknown) => void;
    const pending = new Promise<ProjectTypeResult>((_yes, no) => {
      reject = no;
    });
    const f = setup();
    await f.open();
    f.input('name', 'fresh');
    f.api.mockReturnValueOnce(pending);
    f.button('save').click();
    f.controller.close();
    reject(new Error('old failure'));
    await Promise.resolve();
    await f.open();
    f.input('name', 'fresh');
    f.api.mockRejectedValueOnce(new Error('save failed'));
    f.button('save').click();
    await vi.waitFor(() =>
      expect(f.dialog.textContent).toContain('save failed'),
    );
    f.controller.close();
    f.doc.value = { ...sample, params: { title: { type: project('string') } } };
    await vi.waitFor(() => expect(f.controller.checking.value).toBe(false));
    let fail!: (error: unknown) => void;
    const late = new Promise<ProjectTypeResult>((_yes, no) => {
      fail = no;
    });
    f.api.mockReturnValueOnce(late);
    const result = f.controller.validateNow();
    f.dispose();
    disposers.pop();
    fail(new Error('disposed failure'));
    expect(await result).toBeUndefined();
  });
});

describe('whole-document semantic validation', () => {
  const typed = (): ViewDocument => ({
    ...sample,
    params: {
      ...sample.params,
      title: { type: project('string'), default: 'Inbox' },
    },
  });
  it('reports project errors, refreshes projections and rechecks on focus', async () => {
    const f = setup({ document: typed() });
    await vi.waitFor(() => expect(f.controller.checking.value).toBe(false));
    f.api.mockResolvedValueOnce({
      diagnostics: [
        {
          code: 'KUI-V018',
          path: '$.params.title.type',
          message: 'Binding mismatch',
        } as never,
      ],
    });
    await f.controller.validateNow();
    expect(f.controller.semanticProblems.value[0].message).toBe(
      'Binding mismatch',
    );
    const next = {
      ...f.doc.value,
      params: {
        ...f.doc.value.params,
        refreshed: { type: { kind: 'boolean' } },
      },
    };
    f.api.mockResolvedValueOnce({ document: next, diagnostics: [] });
    window.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(f.refresh).toHaveBeenCalled());
    expect(f.controller.semanticProblems.value).toEqual([]);
  });
  it('ignores validations for previous sources and disposed controllers', async () => {
    const f = setup({ document: typed() });
    await vi.waitFor(() => expect(f.controller.checking.value).toBe(false));
    const stale = deferred<ProjectTypeResult>();
    f.api.mockReturnValueOnce(stale.promise);
    const result = f.controller.validateNow();
    f.source.value = 'other/inbox.kui.json';
    stale.resolve({ diagnostics: [{ message: 'Stale source' }] });
    expect(await result).toBeUndefined();
    expect(
      f.controller.semanticProblems.value.map((item) => item.message),
    ).not.toContain('Stale source');
    const late = deferred<ProjectTypeResult>();
    f.api.mockReturnValueOnce(late.promise);
    const pending = f.controller.validateNow();
    f.dispose();
    disposers.pop();
    late.resolve({ diagnostics: [] });
    expect(await pending).toBeUndefined();
  });
  it('keeps compiler unavailability visible instead of accepting a cache as proof', async () => {
    const f = setup({ document: typed(), service: false });
    expect(await f.controller.validateNow()).toBeUndefined();
    expect(f.controller.semanticProblems.value[0].message).toContain(
      'unavailable',
    );
    await f.open('title');
    expect(f.dialog.textContent).toContain('unavailable');
    expect(f.button('save').disabled).toBe(true);
  });
  it('reports validation failures and clears them for legacy documents', async () => {
    const f = setup({ document: typed() });
    await vi.waitFor(() => expect(f.controller.checking.value).toBe(false));
    f.api.mockRejectedValueOnce(new Error('No compiler'));
    expect(await f.controller.validateNow()).toBeUndefined();
    expect(f.controller.semanticProblems.value[0].message).toBe('No compiler');
    f.api.mockRejectedValueOnce('offline');
    expect(await f.controller.validateNow()).toBeUndefined();
    expect(f.controller.semanticProblems.value[0].message).toBe('offline');
    f.doc.value = sample;
    expect(await f.controller.validateNow()).toBe(sample);
    expect(f.controller.semanticProblems.value).toEqual([]);
  });
});
