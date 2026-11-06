// KF-5N26H6: the editor loads, renders, validates, and inspects `#view`
// composed documents, and opens one with a way back (row template phase 1).
import type { ViewDiagnostic, ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type EditorStorage,
  rememberedPath,
  rememberPath,
} from '../../../src/editor/autosave.js';
import { exportModule } from '../../../src/editor/model/export.js';
import {
  composesViews,
  explainViewLoads,
  neededViews,
  ownedSource,
  ownedSourceOf,
  ownedViews,
  type ViewLoad,
  viewPath,
  viewPropsEntry,
  viewSources,
} from '../../../src/editor/model/views.js';
import { choose } from './editing-harness.js';
import {
  LIST_PATH,
  listDocument,
  ROW_PATH,
  ROW_VIEW,
  rowDocument,
} from './fixtures-views.js';
import { createEditor, viewCatalog } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  globalThis.localStorage.clear();
});

const text = (document: ViewDocument) => JSON.stringify(document);

function memory(files: Record<string, string>) {
  const stored = new Map(Object.entries(files));
  const failing = new Map<string, string>();
  const storage: EditorStorage = {
    read: vi.fn(async (path: string) => {
      if (failing.has(path)) throw new Error(failing.get(path));
      return stored.get(path);
    }),
    write: vi.fn(async (path: string, value: string) => {
      stored.set(path, value);
    }),
  };
  return { stored, storage, failing };
}

/** Opens the editor on `path`, as the last file this browser had open. */
function open(
  files: Record<string, string>,
  path = LIST_PATH,
  options: Parameters<typeof createEditor>[0] = {},
) {
  const store = memory(files);
  rememberPath(path);
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor({ storage: store.storage, ...options });
  const stop = mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = () => {
    unwire();
    stop();
  };
  return { root, editor, ...store };
}

const files = (list = listDocument(), row: string = text(rowDocument())) => ({
  [LIST_PATH]: text(list),
  [ROW_PATH]: row,
});

const canvas = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-editor-canvas]')!;

const problems = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-editor-node-problem]')].map(
    (banner) => banner.textContent ?? '',
  );

const select = (editor: ReturnType<typeof createEditor>, id = ROW_VIEW) => {
  editor.selection.value = { kind: 'node', id };
};

describe('composed document model', () => {
  it('resolves a source from the composing document’s folder', () => {
    expect(viewPath('views/list.kui.json', './row.kui.json')).toBe(
      'views/row.kui.json',
    );
    expect(viewPath('views/list.kui.json', 'rows/row.kui.json')).toBe(
      'views/rows/row.kui.json',
    );
    expect(viewPath('views/a/list.kui.json', '../row.kui.json')).toBe(
      'views/row.kui.json',
    );
    expect(viewPath('list.kui.json', './/row.kui.json')).toBe('row.kui.json');
    expect(viewPath('list.kui.json', '../row.kui.json')).toBeUndefined();
    expect(viewPath('list.kui.json', '/abs/row.kui.json')).toBeUndefined();
  });

  it('lists each source once, and the documents a load still needs', () => {
    const list = listDocument();
    const nested = {
      ...rowDocument(),
      root: { id: 'r', type: '#view', src: './inner.kui.json' },
    } as ViewDocument;
    expect(viewSources(list)).toEqual(['./message-row.kui.json']);
    expect(viewSources(rowDocument())).toEqual([]);
    expect(composesViews(list)).toBe(true);
    expect(composesViews(rowDocument())).toBe(false);
    const loads = new Map<string, ViewLoad>([
      [ROW_PATH, { state: 'loaded', document: nested }],
      // A cycle back to the row is listed once.
      ['views/inner.kui.json', { state: 'loaded', document: list }],
    ]);
    expect(neededViews(list, LIST_PATH, loads)).toEqual([
      ROW_PATH,
      'views/inner.kui.json',
    ]);
    expect(neededViews(list, LIST_PATH, new Map())).toEqual([ROW_PATH]);
    // A source outside the project is not loaded.
    expect(
      neededViews(listDocument({}, '../../../x.kui.json'), LIST_PATH, loads),
    ).toEqual([]);
  });

  it('makes one Inspector prop per param', () => {
    const row = {
      ...rowDocument(),
      params: {
        ...rowDocument().params,
        size: { type: { kind: 'number' }, default: 2 },
        tags: {
          type: { kind: 'array', items: { kind: 'string' } },
          default: [],
        },
      },
    } as ViewDocument;
    expect(viewPropsEntry('./row.kui.json', row).props).toEqual([
      { name: 'title', type: { kind: 'string' }, required: true },
      {
        name: 'unread',
        type: { kind: 'boolean' },
        required: false,
        default: false,
      },
      { name: 'size', type: { kind: 'number' }, required: false, default: 2 },
      {
        name: 'tags',
        type: { kind: 'array', items: { kind: 'string' } },
        required: false,
      },
    ]);
    expect(
      viewPropsEntry('./x.kui.json', { ...row, params: undefined }).props,
    ).toEqual([]);
  });

  it('marks a composed document as its #view for the canvas', () => {
    const composed = {
      ...rowDocument(),
      root: {
        id: 'a',
        type: '@kerfjs/ui:list',
        zones: {
          children: [
            { id: 'b', type: '#view', src: './x.kui.json' },
            {
              $if: true,
              then: { id: 'c', type: '@kerfjs/ui:text' },
              else: { id: 'd', type: '@kerfjs/ui:text' },
            },
            { $if: true, then: { id: 'e', type: '@kerfjs/ui:text' } },
            {
              $each: [],
              as: 'item',
              key: 'item.id',
              template: {
                $if: true,
                then: { id: 'f', type: '@kerfjs/ui:text' },
                else: { id: 'f', type: '@kerfjs/ui:text' },
              },
            },
            {
              $each: [],
              as: 'item',
              key: 'item.id',
              kind: 'x',
              templates: {
                default: { id: 'f', type: '@kerfjs/ui:text' },
              },
            },
            { $slot: 'more' },
          ],
        },
      },
    } as unknown as ViewDocument;
    const owned = JSON.stringify(ownedViews(composed, 'v'));
    expect(owned).not.toMatch(/"id":"[a-f]"/);
    expect(owned).toContain('"$slot":"more"');
    expect(ownedViews(composed, 'v').root!.zones!.children![0]).toEqual({
      id: 'v',
      type: '#view',
      src: ownedSource('v', './x.kui.json'),
    });
    // Without an owner, ids stay and only sources name their node.
    const top = ownedViews(composed).root!.zones!.children![0] as {
      src: string;
    };
    expect(ownedSourceOf(top.src)).toEqual({ owner: 'b', src: './x.kui.json' });
    const rootless = { ...composed, root: undefined };
    expect(ownedViews(rootless)).toBe(rootless);
  });

  it('says why a #view was not found', () => {
    const missing: ViewDiagnostic = {
      code: 'KUI-V012',
      path: '$.root.zones.children[0].template.src',
      message: '#view "./message-row.kui.json" was not found',
    };
    const other: ViewDiagnostic = { ...missing, code: 'KUI-V001' };
    const why = (
      path: string | undefined,
      loads: Map<string, ViewLoad>,
      diagnostic = missing,
    ) => explainViewLoads([diagnostic], path, loads)[0]!.message;
    expect(why(undefined, new Map())).toBe(
      '#view "./message-row.kui.json" was not found: the editor has no storage to load it from',
    );
    expect(why('list.kui.json', new Map(), other)).toBe(missing.message);
    expect(
      why('list.kui.json', new Map(), {
        ...missing,
        message: '#view "../row.kui.json" was not found',
      }),
    ).toContain('it is outside the project');
    expect(why(LIST_PATH, new Map())).toContain('it is loading');
    expect(
      why(LIST_PATH, new Map([[ROW_PATH, { state: 'loading' }]])),
    ).toContain('it is loading');
    expect(
      why(LIST_PATH, new Map([[ROW_PATH, { state: 'missing' }]])),
    ).toContain(`there is no ${ROW_PATH}`);
    expect(
      why(LIST_PATH, new Map([[ROW_PATH, { state: 'failed', error: 'nope' }]])),
    ).toContain('it could not be read: nope');
  });

  it('exports a composing document’s module', () => {
    const result = exportModule(listDocument(), viewCatalog, 'module', () =>
      rowDocument(),
    );
    expect(result.code).toContain('renderMessageRow');
    expect(result.code).toContain("from './message-row.view.js'");
  });
});

describe('composed documents in the editor', () => {
  it('loads a #view’s document and renders its rows in place', async () => {
    const { root, editor, storage } = open(files());
    await vi.waitFor(() =>
      expect(canvas(root).textContent).toContain('Quarterly report'),
    );
    expect(editor.document.value.name).toBe('Messages');
    expect(canvas(root).textContent).toContain('Lunch on Friday');
    expect(storage.read).toHaveBeenCalledWith(ROW_PATH);
    // Every element of a row selects its #view.
    const row = canvas(root).querySelector<HTMLElement>(
      `[data-kerf-node="${ROW_VIEW}"]`,
    )!;
    expect(row.textContent).toContain('Quarterly report');
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(editor.selection.value).toEqual({ kind: 'node', id: ROW_VIEW });
    expect(root.textContent).toContain('MessageRow');
    expect(root.textContent).toContain(ROW_PATH);
    expect(problems(root)).toEqual([]);
    // Exporting the composing document imports the row's module.
    const save = vi.fn();
    cleanup!();
    const next = open(files(), LIST_PATH, { save });
    await vi.waitFor(() =>
      expect(canvas(next.root).textContent).toContain('Quarterly report'),
    );
    next.root
      .querySelector<HTMLElement>('[data-action="editor-export-module"]')!
      .click();
    expect(save).toHaveBeenLastCalledWith(
      'messages.view.ts',
      expect.stringContaining('renderMessageRow'),
    );
  });

  it('edits the #view’s props as the composed document’s params', async () => {
    const { root, editor } = open(files());
    await vi.waitFor(() =>
      expect(canvas(root).textContent).toContain('Quarterly report'),
    );
    select(editor);
    // The row's params: the bound title reads as its source, unread edits.
    expect(root.textContent).toContain('message.subject');
    const unread = root.querySelector<HTMLElement>(
      '[data-editor-prop="unread"]',
    )!;
    expect(unread.dataset.editorKind).toBe('switch');
    unread.querySelector('input')!.checked = true;
    unread.dispatchEvent(new Event('change', { bubbles: true }));
    const view = () =>
      (
        editor.document.value.root!.zones!.children![0] as {
          template: { props: Record<string, unknown> };
        }
      ).template;
    expect(view().props.unread).toBe(true);
    // Bind a prop offers the item's fields that fit the param's type.
    choose(
      root.querySelector<HTMLElement>('[data-editor-bind="prop"]')!,
      'title',
    );
    const source = root.querySelector<HTMLElement>(
      '[data-editor-bind="source"]',
    )!;
    const offered = source.outerHTML;
    expect(offered).toContain('message.subject');
    expect(offered).toContain('message.id');
    expect(offered).not.toContain('message.count');
    choose(source, JSON.stringify({ $bind: 'message.id' }));
    expect(view().props.title).toEqual({ $bind: 'message.id' });
    await vi.waitFor(() => expect(canvas(root).textContent).toContain('m1'));
  });

  it('shows a missing required param on its field', async () => {
    const { root, editor } = open(files(listDocument({})));
    await vi.waitFor(() => expect(problems(root).join()).toBe(''));
    select(editor);
    await vi.waitFor(() =>
      expect(problems(root).join()).toContain('requires param "title"'),
    );
    expect(
      root.querySelector('[data-editor-prop="title"]')?.outerHTML,
    ).toContain('requires param');
  });

  it('reports a #view it cannot load instead of failing', async () => {
    const cases: [Record<string, string>, string][] = [
      [{ [LIST_PATH]: text(listDocument()) }, `there is no ${ROW_PATH}`],
      [files(listDocument(), '{'), 'it could not be read: Not valid JSON'],
    ];
    for (const [given, message] of cases) {
      const { root, editor } = open(given);
      await vi.waitFor(() =>
        expect(editor.document.value.name).toBe('Messages'),
      );
      select(editor);
      await vi.waitFor(() => expect(problems(root).join()).toContain(message));
      expect(canvas(root).textContent).toContain('cannot render');
      expect(root.textContent).toContain(
        'Its params show once the document loads.',
      );
      cleanup!();
      cleanup = undefined;
    }
  });

  it('says a read failure, and that there is no storage', async () => {
    const store = memory(files());
    store.failing.set(ROW_PATH, 'offline');
    rememberPath(LIST_PATH);
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({ storage: store.storage });
    const stop = mount(root, editor.render);
    const unwire = editor.wire(root);
    cleanup = () => {
      unwire();
      stop();
    };
    await vi.waitFor(() => expect(editor.document.value.name).toBe('Messages'));
    select(editor);
    await vi.waitFor(() =>
      expect(problems(root).join()).toContain('it could not be read: offline'),
    );
    cleanup();
    cleanup = undefined;
    const bare = document.createElement('div');
    document.body.append(bare);
    const local = createEditor({ document: listDocument() });
    const stopLocal = mount(bare, local.render);
    const unwireLocal = local.wire(bare);
    cleanup = () => {
      unwireLocal();
      stopLocal();
    };
    select(local);
    expect(problems(bare).join()).toContain(
      'the editor has no storage to load it from',
    );
    expect(
      bare
        .querySelector('[data-editor-open-view]')
        ?.getAttribute('aria-disabled') ??
        bare.querySelector('[data-editor-open-view]')?.hasAttribute('disabled'),
    ).toBeTruthy();
  });

  it('opens the composed document and goes back to the composing one', async () => {
    const { root, editor, stored } = open(files());
    await vi.waitFor(() =>
      expect(canvas(root).textContent).toContain('Quarterly report'),
    );
    select(editor);
    root
      .querySelector<HTMLElement>('[data-action="editor-open-view"]')!
      .click();
    await vi.waitFor(() =>
      expect(editor.document.value.name).toBe('MessageRow'),
    );
    expect(rememberedPath()).toBe(ROW_PATH);
    const back = () =>
      root.querySelector<HTMLElement>('[data-action="editor-view-back"]');
    expect(back()!.textContent).toContain('Back to messages.kui.json');
    // An edit to the row saves to the row's file.
    editor.selection.value = { kind: 'node', id: rowDocument().root!.id };
    expect(root.querySelector('[data-editor-param="title"]')).not.toBeNull();
    root.querySelector<HTMLInputElement>(
      '[data-editor-name="true"] input',
    )!.value = 'rowItem';
    root
      .querySelector<HTMLElement>('[data-editor-name="true"] input')!
      .dispatchEvent(new Event('change', { bubbles: true }));
    expect(editor.document.value.root!.name).toBe('rowItem');
    back()!.click();
    await vi.waitFor(() => expect(editor.document.value.name).toBe('Messages'));
    expect(JSON.parse(stored.get(ROW_PATH)!).root.name).toBe('rowItem');
    expect(editor.selection.value).toEqual({ kind: 'node', id: ROW_VIEW });
    expect(back()).toBeNull();
    // The row loads again, as it is saved now.
    await vi.waitFor(() =>
      expect(canvas(root).textContent).toContain('Quarterly report'),
    );
  });

  it('keeps the trail when the way back cannot open', async () => {
    const { root, editor, stored, failing } = open(files());
    await vi.waitFor(() =>
      expect(canvas(root).textContent).toContain('Quarterly report'),
    );
    select(editor);
    root
      .querySelector<HTMLElement>('[data-action="editor-open-view"]')!
      .click();
    await vi.waitFor(() =>
      expect(editor.document.value.name).toBe('MessageRow'),
    );
    const back = () =>
      root.querySelector<HTMLElement>('[data-action="editor-view-back"]')!;
    failing.set(LIST_PATH, 'offline');
    back().click();
    await vi.waitFor(() => expect(root.textContent).toContain('offline'));
    failing.delete(LIST_PATH);
    stored.set(LIST_PATH, '{');
    back().click();
    await vi.waitFor(() =>
      expect(root.textContent).toContain('Not valid JSON'),
    );
    stored.delete(LIST_PATH);
    back().click();
    await vi.waitFor(() =>
      expect(root.textContent).toContain(`There is no ${LIST_PATH}.`),
    );
    expect(editor.document.value.name).toBe('MessageRow');
    // The composing document without its #view any more reopens unselected.
    stored.set(LIST_PATH, text({ ...listDocument(), root: undefined }));
    back().click();
    await vi.waitFor(() => expect(editor.document.value.name).toBe('Messages'));
    expect(editor.selection.value).toBeNull();
  });

  it('names a #view bound to a param, one with no source, and one with no params', async () => {
    const bound = listDocument({ title: { $param: 'heading' } }, undefined, {
      heading: { type: { kind: 'string' }, default: 'Hello' },
    });
    const { root, editor } = open(files(bound));
    await vi.waitFor(() => expect(canvas(root).textContent).toContain('Hello'));
    select(editor);
    expect(root.querySelector('[data-editor-param="heading"]')).not.toBeNull();
    cleanup!();
    cleanup = undefined;
    // A #view with no `src` (or props) is a problem with nothing to load.
    const bare = listDocument();
    (bare.root!.zones!.children![0] as { template: unknown }).template = {
      id: ROW_VIEW,
      type: '#view',
    };
    const second = open(files(bare));
    await vi.waitFor(() =>
      expect(second.editor.document.value.name).toBe('Messages'),
    );
    select(second.editor);
    expect(problems(second.root).join()).toContain('names its document');
    cleanup!();
    cleanup = undefined;
    // A composed document without params says so.
    const third = open(
      files(listDocument({}), text({ ...rowDocument(), params: undefined })),
    );
    await vi.waitFor(() =>
      expect(third.root.textContent).not.toContain('it is loading'),
    );
    select(third.editor);
    await vi.waitFor(() =>
      expect(third.root.textContent).toContain(
        'This document takes no params.',
      ),
    );
  });

  it('opens a draft’s composed document and goes back to the draft', async () => {
    const store = memory({
      '.kerf-ui-editor/drafts/message-row.kui.json': text(rowDocument()),
    });
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({
      storage: store.storage,
      document: listDocument(),
    });
    const stop = mount(root, editor.render);
    const unwire = editor.wire(root);
    cleanup = () => {
      unwire();
      stop();
    };
    await vi.waitFor(() =>
      expect(canvas(root).textContent).toContain('Quarterly report'),
    );
    select(editor);
    root
      .querySelector<HTMLElement>('[data-action="editor-open-view"]')!
      .click();
    await vi.waitFor(() =>
      expect(root.textContent).toContain('Back to Unsaved draft'),
    );
  });

  it('drops a load that arrives after another document opened, and a rejection that is not an Error', async () => {
    let release!: () => void;
    const held = new Promise<void>((done) => {
      release = done;
    });
    const store = memory(files());
    const read = store.storage.read;
    store.storage.read = async (path) => {
      if (path === ROW_PATH) await held;
      return read(path);
    };
    rememberPath(LIST_PATH);
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({ storage: store.storage });
    const stop = mount(root, editor.render);
    const unwire = editor.wire(root);
    cleanup = () => {
      unwire();
      stop();
    };
    await vi.waitFor(() => expect(editor.document.value.name).toBe('Messages'));
    select(editor);
    expect(problems(root).join()).toContain('it is loading');
    root.querySelector<HTMLElement>('[data-action="editor-new"]')!.click();
    release();
    await held;
    await new Promise((done) => window.setTimeout(done, 0));
    expect(editor.document.value.root).toBeUndefined();
    cleanup();
    cleanup = undefined;
    const rejecting = memory(files());
    const plain = rejecting.storage.read;
    rejecting.storage.read = (path) =>
      path === ROW_PATH ? Promise.reject('gone') : plain(path);
    rememberPath(LIST_PATH);
    const next = document.createElement('div');
    document.body.append(next);
    const other = createEditor({ storage: rejecting.storage });
    const stopOther = mount(next, other.render);
    const unwireOther = other.wire(next);
    cleanup = () => {
      unwireOther();
      stopOther();
    };
    await vi.waitFor(() => expect(other.document.value.name).toBe('Messages'));
    select(other);
    await vi.waitFor(() =>
      expect(problems(next).join()).toContain('it could not be read: gone'),
    );
  });
});
