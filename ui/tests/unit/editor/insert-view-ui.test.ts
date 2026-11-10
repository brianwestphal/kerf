// KF-PX5EVZ: insert an existing document as a `#view` from Add a child's
// "Existing document…" choice. A storage that lists the project's documents
// gets a filtered pick list; one without `list()` gets a path field. Either
// way the `#view` lands as one undoable edit and renders at once.
import type { ViewDocument, ViewNode } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  draftPath,
  type EditorStorage,
  rememberPath,
} from '../../../src/editor/autosave.js';
import { choose } from './editing-harness.js';
import { ROW_PATH, rowDocument } from './fixtures-views.js';
import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  globalThis.localStorage.clear();
});

const MAIN = 'views/main.kui.json';
const SLOTTED = 'views/slotted.kui.json';
const BROKEN = 'views/broken.kui.json';
const LIST_ROOT = '01JC0V1EW0000000000000000S';

const main = (): ViewDocument => ({
  schema: 'kerf-ui-document/v1',
  name: 'Main',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: LIST_ROOT,
    type: '@kerfjs/ui:list',
    props: { ariaLabel: 'Messages' },
  },
});

const slotted = (): ViewDocument => ({
  ...rowDocument(),
  name: 'Slotted',
  slots: { body: {} },
});

function open(
  options: {
    list?: false | (() => Promise<readonly string[]>);
    storage?: boolean;
    document?: ViewDocument;
  } = {},
) {
  const stored = new Map([
    [MAIN, JSON.stringify(options.document ?? main())],
    [ROW_PATH, JSON.stringify(rowDocument())],
    [SLOTTED, JSON.stringify(slotted())],
    [BROKEN, '{ not json'],
  ]);
  const listing = vi.fn(
    async () =>
      [
        MAIN,
        ROW_PATH,
        'app.kui.json',
        SLOTTED,
        BROKEN,
        draftPath('01JC0V1EW0000000000000000D'),
      ] as readonly string[],
  );
  const storage: EditorStorage = {
    read: vi.fn(async (at: string) => {
      if (at === 'views/offline.kui.json') throw new Error('offline');
      return stored.get(at);
    }),
    write: vi.fn(async (at: string, text: string) => {
      stored.set(at, text);
    }),
    ...(options.list === false ? {} : { list: options.list ?? listing }),
  };
  rememberPath(MAIN);
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const editor = createEditor(
    options.storage === false ? { document: main() } : { storage },
  );
  const stop = mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = () => {
    unwire();
    stop();
  };
  return { root, editor, stored, storage, listing };
}

const dialog = (root: HTMLElement) =>
  root.querySelector<HTMLDialogElement>('#editor-insert-document-dialog')!;
const picks = (root: HTMLElement) =>
  [
    ...dialog(root).querySelectorAll<HTMLElement>(
      '[data-action="editor-insert-document"][data-editor-insert-document]',
    ),
  ].map((item) => item.dataset.editorInsertDocument);
const pick = (root: HTMLElement, path: string) =>
  dialog(root)
    .querySelector<HTMLElement>(`[data-editor-insert-document="${path}"]`)!
    .click();
const banner = (root: HTMLElement) =>
  dialog(root).querySelector('[data-editor-insert-document-error]')
    ?.textContent ?? '';
const children = (document: ViewDocument) =>
  (document.root!.zones?.children ?? []) as ViewNode[];
const componentChoices = (root: HTMLElement) =>
  root.querySelector('[data-editor-add="component"]')!.innerHTML;

/** Selects the root List and presses Add with Existing document… chosen. */
async function start(
  root: HTMLElement,
  editor: ReturnType<typeof createEditor>,
  zone?: string,
) {
  await vi.waitFor(() => expect(editor.document.value.name).toBe('Main'));
  editor.selection.value = { kind: 'node', id: LIST_ROOT };
  root.querySelector<HTMLElement>('[data-tab-id$="-children"]')!.click();
  if (zone) choose(root.querySelector('[data-editor-add="zone"]')!, zone);
  expect(componentChoices(root)).toContain('Existing document…');
  choose(root.querySelector('[data-editor-add="component"]')!, '#view');
  root.querySelector<HTMLElement>('[data-action="editor-add-child"]')!.click();
  expect(dialog(root).open).toBe(true);
}

describe('Insert Document from a picker', () => {
  it('lists other documents, filters them, and inserts the picked one as one edit', async () => {
    const { root, editor } = open();
    await start(root, editor);
    await vi.waitFor(() =>
      expect(picks(root)).toEqual(['app.kui.json', BROKEN, ROW_PATH, SLOTTED]),
    );
    // A row leads with its file name, under its folder.
    expect(dialog(root).textContent).toContain('message-row.kui.jsonviews/');
    expect(dialog(root).textContent).toContain('app.kui.json./');
    const search = dialog(root).querySelector<HTMLElement>(
      '[data-editor-insert-document-search]',
    )!;
    search.textContent = 'row';
    search.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    expect(picks(root)).toEqual([ROW_PATH]);
    search.textContent = 'nothing-matches';
    search.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    expect(dialog(root).textContent).toContain('No matching document');
    search.innerHTML = '<br>';
    search.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'deleteContentBackward',
      }),
    );
    expect(search.textContent).toBe('');
    expect(search.querySelector('br')).toBeNull();
    expect(
      search
        .closest('[data-search-field-id]')
        ?.getAttribute('data-placeholder-visible'),
    ).toBe('true');
    expect(picks(root)).toEqual(['app.kui.json', BROKEN, ROW_PATH, SLOTTED]);
    search.textContent = 'nothing-matches';
    search.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    dialog(root)
      .querySelector<HTMLElement>(
        '[data-action="editor-insert-document-clear"]',
      )!
      .click();
    expect(picks(root)).toEqual(['app.kui.json', BROKEN, ROW_PATH, SLOTTED]);

    pick(root, ROW_PATH);
    await vi.waitFor(() =>
      expect(children(editor.document.value)).toHaveLength(1),
    );
    const view = children(editor.document.value)[0]!;
    expect(view).toMatchObject({
      type: '#view',
      src: './message-row.kui.json',
      props: { title: 'Title' },
    });
    expect(editor.selection.value).toEqual({ kind: 'node', id: view.id });
    expect(dialog(root).open).toBe(false);
    // The composed document renders at once, with no load to wait for.
    await vi.waitFor(() =>
      expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
        'Title',
      ),
    );
    expect(root.querySelectorAll('[data-editor-node-problem]').length).toBe(0);
    // One Undo removes it.
    root.querySelector<HTMLElement>('[data-action="editor-undo"]')!.click();
    expect(children(editor.document.value)).toHaveLength(0);
  });

  it('refuses a document with slots and one that does not parse, keeping the document', async () => {
    const { root, editor } = open();
    await start(root, editor);
    await vi.waitFor(() => expect(picks(root)).toContain(SLOTTED));
    pick(root, SLOTTED);
    await vi.waitFor(() => expect(banner(root)).toContain('declares slots'));
    pick(root, BROKEN);
    await vi.waitFor(() =>
      expect(banner(root)).not.toContain('declares slots'),
    );
    expect(banner(root)).not.toBe('');
    expect(children(editor.document.value)).toHaveLength(0);
    expect(dialog(root).open).toBe(true);
  });

  it('says when the listing fails or finds nothing, and keeps only the latest listing', async () => {
    let fail!: (error: unknown) => void;
    const first = open({
      list: () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    });
    await start(first.root, first.editor);
    // Loading shows a quiet line until the listing answers.
    expect(dialog(first.root).textContent).toContain('Listing the project');
    fail('The dev server is offline.');
    await vi.waitFor(() =>
      expect(dialog(first.root).textContent).toContain(
        'The dev server is offline.',
      ),
    );
    expect(dialog(first.root).textContent).toContain(
      'The documents could not be listed',
    );
    // Opening again lists again; an Error says its message.
    dialog(first.root).close();
    first.root
      .querySelector<HTMLElement>('[data-action="editor-add-child"]')!
      .click();
    expect(dialog(first.root).textContent).toContain('Listing the project');
    fail(new Error('Gone.'));
    await vi.waitFor(() =>
      expect(dialog(first.root).textContent).toContain('Gone.'),
    );
    cleanup!();
    cleanup = undefined;

    const answers: ((paths: readonly string[]) => void)[] = [];
    const rejections: ((error: unknown) => void)[] = [];
    const second = open({
      list: () =>
        new Promise((resolve, reject) => {
          answers.push(resolve);
          rejections.push(reject);
        }),
    });
    await start(second.root, second.editor);
    dialog(second.root).close();
    second.root
      .querySelector<HTMLElement>('[data-action="editor-add-child"]')!
      .click();
    // The first opening's late answers are ignored.
    answers[0]!([ROW_PATH]);
    rejections[0]!('late');
    answers[1]!([MAIN]);
    await vi.waitFor(() =>
      expect(dialog(second.root).textContent).toContain('No other documents'),
    );
    expect(picks(second.root)).toEqual([]);
    rejections[1]!('ignored once answered');
  });

  it('asks for a path when the storage cannot list documents', async () => {
    const { root, editor, storage } = open({ list: false });
    await start(root, editor);
    const path = dialog(root).querySelector<HTMLInputElement>(
      '[data-editor-insert-document="path"] input',
    )!;
    const field = () =>
      dialog(root).querySelector('[data-editor-insert-document="path"]')!
        .textContent ?? '';
    const tryPath = async (value: string, message: string) => {
      path.value = value;
      dialog(root)
        .querySelector<HTMLElement>('[data-editor-insert-document="confirm"]')!
        .click();
      await vi.waitFor(() => expect(field()).toContain(message));
      expect(children(editor.document.value)).toHaveLength(0);
    };
    await tryPath('', 'a .kui.json file');
    await tryPath('../x.kui.json', 'inside the project');
    await tryPath(draftPath('x'), 'outside the drafts folder');
    await tryPath(MAIN, 'own file');
    await tryPath('views/missing.kui.json', 'There is no views/missing');
    await tryPath('views/offline.kui.json', 'offline');
    vi.mocked(storage.read).mockRejectedValueOnce('refused');
    await tryPath(ROW_PATH, 'refused');
    // Opening again starts with an empty path and no error.
    dialog(root).close();
    root
      .querySelector<HTMLElement>('[data-action="editor-add-child"]')!
      .click();
    expect(path.value).toBe('');
    expect(field()).not.toContain('refused');
    path.value = ` ./${ROW_PATH} `;
    dialog(root)
      .querySelector<HTMLElement>('[data-editor-insert-document="confirm"]')!
      .click();
    await vi.waitFor(() =>
      expect(children(editor.document.value)[0]).toMatchObject({
        type: '#view',
        src: './message-row.kui.json',
      }),
    );
  });

  it('takes a content prop’s text into its zone beside the inserted view', async () => {
    const { root, editor } = open({
      list: false,
      document: {
        ...main(),
        root: {
          id: LIST_ROOT,
          type: '@kerfjs/ui:button',
          props: { children: 'Go' },
        },
      },
    });
    await start(root, editor, 'children');
    dialog(root).querySelector<HTMLInputElement>(
      '[data-editor-insert-document="path"] input',
    )!.value = ROW_PATH;
    dialog(root)
      .querySelector<HTMLElement>('[data-editor-insert-document="confirm"]')!
      .click();
    await vi.waitFor(() =>
      expect(
        children(editor.document.value).map((child) => child.type),
      ).toEqual(['#text', '#view']),
    );
    expect(editor.document.value.root!.props?.children).toBeUndefined();
  });

  it('refuses an insert when the document changed meanwhile', async () => {
    const { root, editor, storage } = open({ list: false });
    await start(root, editor);
    let release: (() => void) | undefined;
    vi.mocked(storage.read).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(JSON.stringify(rowDocument()));
        }),
    );
    dialog(root).querySelector<HTMLInputElement>(
      '[data-editor-insert-document="path"] input',
    )!.value = ROW_PATH;
    dialog(root)
      .querySelector<HTMLElement>('[data-editor-insert-document="confirm"]')!
      .click();
    await vi.waitFor(() => expect(release).toBeDefined());
    root.querySelector<HTMLElement>('[data-tab-id$="-properties"]')!.click();
    const name = root.querySelector<HTMLInputElement>(
      '[data-editor-name="true"] input',
    )!;
    name.value = 'messages';
    name.dispatchEvent(new Event('change', { bubbles: true }));
    expect(editor.document.value.root!.name).toBe('messages');
    release!();
    await vi.waitFor(() =>
      expect(
        dialog(root).querySelector('[data-editor-insert-document="path"]')!
          .textContent,
      ).toContain('The document changed meanwhile'),
    );
    expect(children(editor.document.value)).toHaveLength(0);
  });

  it('offers no document without storage', async () => {
    const { root, editor } = open({ storage: false });
    editor.selection.value = { kind: 'node', id: LIST_ROOT };
    expect(componentChoices(root)).not.toContain('Existing document…');
    expect(dialog(root)).toBeNull();
  });
});
