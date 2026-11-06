// KF-D9P3NP: Extract to document in the editor. A Save As–style dialog asks
// for the new document's path; the subtree moves there and a `#view` takes
// its place, one Undo away from the original.
import type { ViewDocument, ViewNode } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  draftPath,
  type EditorStorage,
  rememberPath,
} from '../../../src/editor/autosave.js';
import { LIST_PATH, listDocument } from './fixtures-views.js';
import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  globalThis.localStorage.clear();
});

const ROW = '01JC0V1EW0000000000000000T';
const ROW_FILE = 'views/messages-list-item.kui.json';

/** A list document whose rows are a ListItem reading the message. */
const list = (): ViewDocument => {
  const base = listDocument();
  return {
    ...base,
    root: {
      ...base.root!,
      zones: {
        children: [
          {
            $each: { $param: 'messages' },
            as: 'message',
            key: 'message.id',
            template: {
              id: ROW,
              type: '@kerfjs/ui:list-item',
              props: {
                label: { $bind: 'message.subject' },
                action: { $action: 'open-message' },
              },
            },
          },
        ],
      },
    },
  } as ViewDocument;
};

function open(path = LIST_PATH, document = list()) {
  const stored = new Map([[path, JSON.stringify(document)]]);
  const failing = new Map<string, string>();
  const storage: EditorStorage = {
    read: vi.fn(async (at: string) => {
      if (failing.has(`read ${at}`)) throw new Error(failing.get(`read ${at}`));
      return stored.get(at);
    }),
    write: vi.fn(async (at: string, text: string) => {
      if (failing.has(`write ${at}`))
        throw failing.get(`write ${at}`) === 'string'
          ? 'refused'
          : new Error(failing.get(`write ${at}`));
      stored.set(at, text);
    }),
  };
  rememberPath(path);
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const editor = createEditor({ storage });
  const stop = mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = () => {
    unwire();
    stop();
  };
  return { root, editor, stored, storage, failing };
}

const canvas = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-editor-canvas]')!;
const dialog = (root: HTMLElement) =>
  root.querySelector<HTMLDialogElement>('#editor-extract-dialog')!;
const pathInput = (root: HTMLElement) =>
  dialog(root).querySelector<HTMLInputElement>(
    '[data-editor-extract="path"] input',
  )!;
const confirm = (root: HTMLElement) =>
  dialog(root)
    .querySelector<HTMLElement>('[data-editor-extract="confirm"]')!
    .click();
const errorText = (root: HTMLElement) =>
  dialog(root).querySelector('[data-editor-extract="path"]')!.textContent ?? '';
const template = (document: ViewDocument) =>
  (document.root!.zones!.children![0] as { template: ViewNode }).template;

/** Selects the row and opens the Extract dialog from the Flow area. */
async function start(
  root: HTMLElement,
  editor: ReturnType<typeof createEditor>,
) {
  await vi.waitFor(() => expect(editor.document.value.name).toBe('Messages'));
  editor.selection.value = { kind: 'node', id: ROW };
  root.querySelector<HTMLElement>('[data-editor-extract="open"]')!.click();
  expect(dialog(root).open).toBe(true);
}

describe('Extract to document', () => {
  it('asks for a path, writes the row document, and composes it in place', async () => {
    const { root, editor, stored } = open();
    await start(root, editor);
    // Always asked, starting from a name beside this document.
    expect(pathInput(root).value).toBe(ROW_FILE);
    confirm(root);
    await vi.waitFor(() =>
      expect(template(editor.document.value).type).toBe('#view'),
    );
    expect(dialog(root).open).toBe(false);
    const view = template(editor.document.value);
    expect(view).toMatchObject({
      src: './messages-list-item.kui.json',
      props: { subject: { $bind: 'message.subject' } },
    });
    expect(editor.selection.value).toEqual({ kind: 'node', id: view.id });
    const written = JSON.parse(stored.get(ROW_FILE)!) as ViewDocument;
    expect(written.name).toBe('MessagesListItem');
    expect(written.params).toEqual({ subject: { type: { kind: 'string' } } });
    expect(written.root).toMatchObject({
      id: ROW,
      props: { label: { $param: 'subject' } },
    });
    // The composed rows render on the canvas, with no problems.
    await vi.waitFor(() =>
      expect(canvas(root).textContent).toContain('Quarterly report'),
    );
    expect(root.querySelectorAll('[data-editor-node-problem]').length).toBe(0);
    // One Undo restores the row; the written file stays.
    root.querySelector<HTMLElement>('[data-action="editor-undo"]')!.click();
    expect(template(editor.document.value).id).toBe(ROW);
    expect(stored.has(ROW_FILE)).toBe(true);
  });

  it('says why a path or a write is refused, and keeps the document', async () => {
    const { root, editor, stored, failing } = open();
    await start(root, editor);
    const tryPath = async (path: string, message: string) => {
      pathInput(root).value = path;
      confirm(root);
      await vi.waitFor(() => expect(errorText(root)).toContain(message));
      expect(template(editor.document.value).id).toBe(ROW);
    };
    await tryPath('../row.kui.json', 'inside the project');
    await tryPath('views/row.json', 'a .kui.json file');
    await tryPath(draftPath('x'), 'outside the drafts folder');
    await tryPath(`./${LIST_PATH}`, 'own file');
    stored.set('views/taken.kui.json', '{}');
    await tryPath('views/taken.kui.json', 'There is already a file at');
    failing.set('read views/offline.kui.json', 'offline');
    await tryPath('views/offline.kui.json', 'offline');
    failing.set('write views/locked.kui.json', 'locked');
    await tryPath('views/locked.kui.json', 'locked');
    failing.set('write views/odd.kui.json', 'string');
    await tryPath('views/odd.kui.json', 'refused');
    // Opening again starts clean, with the suggestion.
    dialog(root).close();
    root.querySelector<HTMLElement>('[data-editor-extract="open"]')!.click();
    expect(errorText(root)).not.toContain('refused');
    expect(pathInput(root).value).toBe(ROW_FILE);
  });

  it('refuses what extraction would break, and a document changed meanwhile', async () => {
    // A row that repeats itself cannot become a document composed into a row
    // (KUI-V016). (A row design sharing an action with another is no longer
    // refused: a composed row's actions are row actions, KF-RDZ7N7.)
    const tagged = list();
    const messages = tagged.params!.messages as {
      type: { items: { props: unknown[] } };
    };
    messages.type.items.props.push({
      name: 'parts',
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [{ name: 'id', type: { kind: 'string' }, required: true }],
        },
      },
      required: true,
    });
    const repeat = tagged.root!.zones!.children![0] as { template: unknown };
    repeat.template = {
      id: ROW,
      type: '@kerfjs/ui:list',
      props: { ariaLabel: { $bind: 'message.subject' } },
      zones: {
        children: [
          {
            $each: { $bind: 'message.parts' },
            as: 'part',
            key: 'part.id',
            template: {
              id: '01JC0V1EW0000000000000000U',
              type: '@kerfjs/ui:list-item',
              props: { label: { $bind: 'part.id' } },
            },
          },
        ],
      },
    };
    const { root, editor } = open(LIST_PATH, tagged);
    await start(root, editor);
    confirm(root);
    await vi.waitFor(() => expect(errorText(root)).toContain('cannot repeat'));
    // An edit made while the file is being checked wins over the extraction.
    cleanup!();
    cleanup = undefined;
    const fresh = open();
    let release: (() => void) | undefined;
    vi.mocked(fresh.storage.read).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(undefined);
        }),
    );
    await start(fresh.root, fresh.editor);
    confirm(fresh.root);
    await vi.waitFor(() => expect(release).toBeDefined());
    const name = fresh.root.querySelector<HTMLInputElement>(
      '[data-editor-name="true"] input',
    )!;
    name.value = 'messageRow';
    name.dispatchEvent(new Event('change', { bubbles: true }));
    expect(template(fresh.editor.document.value).name).toBe('messageRow');
    release!();
    await vi.waitFor(() =>
      expect(errorText(fresh.root)).toContain('The document changed meanwhile'),
    );
    expect(template(fresh.editor.document.value).id).toBe(ROW);
  });

  it('suggests a draft’s name, and is disabled on the root and without storage', async () => {
    const draft = draftPath('01JC0V1EW0000000000000000D');
    const { root, editor } = open(draft);
    await start(root, editor);
    expect(pathInput(root).value).toBe(ROW_FILE.slice('views/'.length));
    // The root cannot leave its document.
    editor.selection.value = {
      kind: 'node',
      id: editor.document.value.root!.id,
    };
    const item = () =>
      root.querySelector<HTMLElement>('[data-editor-extract="open"]')!;
    expect(item().hasAttribute('disabled')).toBe(true);
    expect(
      item().closest('[data-editor-extract-section]')!.textContent,
    ).toContain('Save As copies it');
    cleanup!();
    cleanup = undefined;
    const bare = window.document.createElement('div');
    window.document.body.append(bare);
    const local = createEditor({ document: list() });
    const stop = mount(bare, local.render);
    const unwire = local.wire(bare);
    cleanup = () => {
      unwire();
      stop();
    };
    local.selection.value = { kind: 'node', id: ROW };
    const blocked = bare.querySelector<HTMLElement>(
      '[data-editor-extract="open"]',
    )!;
    expect(blocked.hasAttribute('disabled')).toBe(true);
    expect(
      blocked.closest('[data-editor-extract-section]')!.textContent,
    ).toContain('needs the editor’s storage');
    expect(bare.querySelector('#editor-extract-dialog')).toBeNull();
    // The node context menu offers it too, disabled the same way.
    bare
      .querySelector<HTMLElement>(
        `[data-editor-canvas] [data-kerf-node="${ROW}"]`,
      )!
      .dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      );
    const menu = bare.querySelector<HTMLElement>('[data-editor-context-menu]')!;
    expect(menu.textContent).toContain('Extract to Document…');
    expect(menu.outerHTML).toContain('needs the editor’s storage');
  });
});
