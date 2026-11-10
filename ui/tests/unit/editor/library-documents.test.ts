// KF-FXACB5 / KF-BBES58: the Library offers the project's documents in a
// dedicated mode. A click inserts one as a `#view` (inside the selection, else after
// it; inside the root with nothing selected; as the root of an empty
// document); a drag drops it like a component. Either way the `#view` has its
// required params seeded, renders at once, and is one undoable edit.
import type { ViewDocument, ViewNode } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  draftPath,
  type EditorStorage,
  rememberPath,
} from '../../../src/editor/autosave.js';
import { libraryDocumentTree } from '../../../src/editor/model/library-document-tree.js';
import { resetPopovers } from '../helpers/popover.js';
import { ROW_PATH, rowDocument } from './fixtures-views.js';
import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  globalThis.localStorage.clear();
  resetPopovers();
  vi.restoreAllMocks();
});

const MAIN = 'views/main.kui.json';
const SLOTTED = 'views/slotted.kui.json';
const BROKEN = 'views/broken.kui.json';
const ROOT = '01JC0V1EW0000000000000000S';
const TEXT = '01JC0V1EW0000000000000000T';

const main = (): ViewDocument => ({
  schema: 'kerf-ui-document/v1',
  name: 'Main',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: ROOT,
    type: '@kerfjs/ui:list',
    props: { ariaLabel: 'Messages' },
  },
});

/** A Pane holding one Text, for drags. */
const paned = (): ViewDocument => ({
  schema: 'kerf-ui-document/v1',
  name: 'Main',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: ROOT,
    type: '@kerfjs/ui:pane',
    zones: {
      content: [
        { id: TEXT, type: '@kerfjs/ui:text', props: { children: 'Hello' } },
      ],
    },
  },
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
    [SLOTTED, JSON.stringify({ ...rowDocument(), slots: { body: {} } })],
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
        'views/missing.kui.json',
        'views/offline.kui.json',
        draftPath('01JC0V1EW0000000000000000D'),
      ] as readonly string[],
  );
  const storage: EditorStorage = {
    read: vi.fn(async (at: string) => {
      if (at === 'views/offline.kui.json') throw new Error('offline');
      if (at === 'app.kui.json') throw 'refused';
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
  const library = root.querySelector<HTMLElement>('#editor-library')!;
  return { root, editor, storage, library };
}

const documents = (library: HTMLElement) =>
  [
    ...library.querySelectorAll<HTMLElement>('[data-editor-palette-document]'),
  ].map((item) => item.dataset.editorPaletteDocument);
const documentRow = (library: HTMLElement, path: string) =>
  library.querySelector<HTMLElement>(
    `[data-editor-palette-document="${path}"]`,
  )!;
const banner = (library: HTMLElement) =>
  library.querySelector('[data-editor-library-error]')?.textContent ?? '';
const children = (document: ViewDocument) =>
  (document.root!.zones?.children ?? []) as ViewNode[];
const filter = (library: HTMLElement, text: string) => {
  const field = library.querySelector<HTMLElement>(
    '[data-editor-palette-filter]',
  )!;
  field.textContent = text;
  field.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
  );
};
const click = (element: HTMLElement, altKey = false) =>
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey }));

/** Waits for the stored document, then opens the Library and its listing. */
async function showLibrary(
  editor: ReturnType<typeof createEditor>,
  library: HTMLElement,
) {
  await vi.waitFor(() => expect(editor.document.value.name).toBe('Main'));
  library.showPopover();
  click(
    library.querySelector<HTMLElement>(
      '[data-segmented-control-id="editor-library-mode"] [data-segment-value="documents"]',
    )!,
  );
  await vi.waitFor(() => expect(documents(library).length).toBeGreaterThan(0));
}

describe('the Library’s documents', () => {
  it('switches between a folder tree and columns, and remembers the choice', async () => {
    const { editor, library } = open();
    await showLibrary(editor, library);
    expect(
      library.querySelector('#editor-library-documents-tree'),
    ).not.toBeNull();
    click(
      library.querySelector<HTMLElement>(
        '[data-segmented-control-id="editor-document-view"] [data-segment-value="columns"]',
      )!,
    );
    expect(window.localStorage.getItem('kerf-ui-editor:document-view')).toBe(
      'columns',
    );
    expect(
      library.querySelector('#editor-library-documents-columns'),
    ).not.toBeNull();
    expect(documents(library)).toEqual(['app.kui.json']);
    click(
      library.querySelector<HTMLElement>('[data-item-id="folder:views/"]')!,
    );
    expect(documents(library)).toContain(ROW_PATH);
    expect(
      library.querySelector('[data-action="editor-document-back"]'),
    ).toBeNull();
    expect(
      [
        ...library.querySelectorAll('.kui-column-explorer .kui-list-header'),
      ].map((heading) => heading.textContent?.trim()),
    ).toEqual(['Project', 'views']);
  });

  it('collapses and expands a folder without losing its file paths', async () => {
    const { editor, library } = open();
    await showLibrary(editor, library);
    const disclosure = () =>
      library.querySelector<HTMLElement>(
        '[data-item-id="folder:views/"] .kui-list-item__disclosure',
      )!;
    click(disclosure());
    expect(documents(library)).toEqual(['app.kui.json']);
    click(disclosure());
    expect(documents(library)).toContain(ROW_PATH);
  });

  it('keeps sibling folders sorted and preserves their file paths', () => {
    const nodes = libraryDocumentTree([
      'zeta/b.kui.json',
      'alpha/a.kui.json',
      '/alpha/c.kui.json',
    ]);
    expect(nodes.map((node) => node.label)).toEqual(['alpha', 'zeta']);
    expect(nodes[0]?.children?.map((node) => node.id)).toEqual([
      'alpha/a.kui.json',
      '/alpha/c.kui.json',
    ]);
  });

  it('lists the project’s other documents in a folder tree', async () => {
    const { editor, library } = open();
    await showLibrary(editor, library);
    expect(documents(library)).toEqual([
      BROKEN,
      ROW_PATH,
      'views/missing.kui.json',
      'views/offline.kui.json',
      SLOTTED,
      'app.kui.json',
    ]);
    const tree = library.querySelector('[data-component="tree-list"]')!;
    expect(tree.getAttribute('aria-label')).toBe('Documents');
    expect(tree.querySelector('[data-item-id="folder:views/"]')).not.toBeNull();
    expect(library.querySelector('[data-editor-palette]')).toBeNull();
    const row = documentRow(library, ROW_PATH);
    expect(row.textContent).toContain('message-row.kui.json');
    expect(row.getAttribute('aria-level')).toBe('2');
    expect(
      documentRow(library, 'app.kui.json').getAttribute('aria-level'),
    ).toBe('1');
  });

  it('filters documents separately, and a match on Documents keeps them all', async () => {
    const { editor, library } = open();
    await showLibrary(editor, library);
    filter(library, 'row');
    expect(documents(library)).toEqual([ROW_PATH]);
    filter(library, 'Doc');
    expect(documents(library)).toHaveLength(6);
    filter(library, 'button');
    expect(documents(library)).toEqual([]);
    expect(library.querySelector('[data-editor-palette]')).toBeNull();
    filter(library, 'nothing-matches-this');
    expect(library.textContent).toContain('No matching documents');
  });

  it('switches component and document modes without carrying a hidden filter', async () => {
    const { editor, library } = open();
    await showLibrary(editor, library);
    filter(library, 'row');
    expect(documents(library)).toEqual([ROW_PATH]);
    click(
      library.querySelector<HTMLElement>(
        '[data-segmented-control-id="editor-library-mode"] [data-segment-value="components"]',
      )!,
    );
    expect(documents(library)).toEqual([]);
    expect(library.querySelector('[data-editor-palette]')).not.toBeNull();
    expect(
      library.querySelector('[data-editor-palette-filter]')?.textContent,
    ).toBe('');
    click(
      library.querySelector<HTMLElement>(
        '[data-segmented-control-id="editor-library-mode"] [data-segment-value="documents"]',
      )!,
    );
    expect(documents(library)).toHaveLength(6);
  });

  it('keeps document rows when the component view uses a grid', async () => {
    window.localStorage.setItem('kerf-ui-editor:palette-view', 'grid');
    const again = open();
    await showLibrary(again.editor, again.library);
    const tile = documentRow(again.library, ROW_PATH);
    expect(tile.classList.contains('kui-list-item')).toBe(true);
    expect(tile.textContent).toContain('message-row.kui.json');
    expect(tile.getAttribute('aria-level')).toBe('2');
    click(tile);
    await vi.waitFor(() =>
      expect(children(again.editor.document.value)).toHaveLength(1),
    );
  });

  it('shows no documents without storage, without a listing, or when listing fails', async () => {
    const none = open({ storage: false });
    none.library.showPopover();
    click(
      none.library.querySelector<HTMLElement>(
        '[data-segmented-control-id="editor-library-mode"] [data-segment-value="documents"]',
      )!,
    );
    expect(documents(none.library)).toEqual([]);
    cleanup!();
    const unlisted = open({ list: false });
    await vi.waitFor(() =>
      expect(unlisted.editor.document.value.name).toBe('Main'),
    );
    unlisted.library.showPopover();
    click(
      unlisted.library.querySelector<HTMLElement>(
        '[data-segmented-control-id="editor-library-mode"] [data-segment-value="documents"]',
      )!,
    );
    expect(documents(unlisted.library)).toEqual([]);
    expect(unlisted.library.textContent).toContain('No matching documents');
    cleanup!();
    let fail!: (error: unknown) => void;
    const failing = open({
      list: vi
        .fn<() => Promise<readonly string[]>>()
        .mockResolvedValueOnce([ROW_PATH])
        .mockImplementationOnce(
          () =>
            new Promise((_resolve, reject) => {
              fail = reject;
            }),
        ),
    });
    await showLibrary(failing.editor, failing.library);
    // Opening again lists again; a failed listing shows none, quietly.
    failing.library.hidePopover();
    failing.library.showPopover();
    fail(new Error('offline'));
    await vi.waitFor(() => expect(documents(failing.library)).toEqual([]));
    expect(banner(failing.library)).toBe('');
  });

  it('inserts a clicked document into the selection as one edit, rendered at once, and closes', async () => {
    const { root, editor, library } = open();
    await showLibrary(editor, library);
    editor.selection.value = { kind: 'node', id: ROOT };
    click(documentRow(library, ROW_PATH));
    await vi.waitFor(() =>
      expect(children(editor.document.value)).toHaveLength(1),
    );
    const view = children(editor.document.value)[0]!;
    expect(view).toMatchObject({
      type: '#view',
      src: './message-row.kui.json',
      props: { title: 'Title' },
    });
    expect(editor.document.value.catalogs).toEqual(['@kerfjs/ui']);
    expect(editor.selection.value).toEqual({ kind: 'node', id: view.id });
    expect(library.matches(':popover-open')).toBe(false);
    await vi.waitFor(() =>
      expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
        'Title',
      ),
    );
    // One Undo removes it.
    root.querySelector<HTMLElement>('[data-action="editor-undo"]')!.click();
    expect(children(editor.document.value)).toHaveLength(0);
  });

  it('inserts after a selection that cannot hold it, and inside the root with nothing selected', async () => {
    const { editor, library } = open();
    await showLibrary(editor, library);
    editor.selection.value = null;
    click(documentRow(library, ROW_PATH), true);
    await vi.waitFor(() =>
      expect(children(editor.document.value)).toHaveLength(1),
    );
    // Option keeps the Library open.
    expect(library.matches(':popover-open')).toBe(true);
    const first = children(editor.document.value)[0]!;
    // A ListItem holds no `#view`, so the next goes after it.
    editor.selection.value = { kind: 'node', id: first.id };
    library.querySelector<HTMLElement>('[data-pinnable-popover-pin]')!.click();
    click(documentRow(library, ROW_PATH));
    await vi.waitFor(() =>
      expect(children(editor.document.value)).toHaveLength(2),
    );
    expect(children(editor.document.value)[0]!.id).toBe(first.id);
    // A pinned Library stays open.
    expect(library.matches(':popover-open')).toBe(true);
  });

  it('makes a clicked document the root of an empty document', async () => {
    const { editor, library } = open({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Main',
        catalogs: ['@kerfjs/ui'],
      },
    });
    await showLibrary(editor, library);
    click(documentRow(library, ROW_PATH));
    await vi.waitFor(() =>
      expect(editor.document.value.root).toMatchObject({
        type: '#view',
        src: './message-row.kui.json',
      }),
    );
  });

  it('says why a document cannot be inserted, keeping the document and the Library', async () => {
    const { editor, library } = open();
    await showLibrary(editor, library);
    editor.selection.value = { kind: 'node', id: ROOT };
    const refused = async (path: string, message: string) => {
      click(documentRow(library, path));
      await vi.waitFor(() => expect(banner(library)).toContain(message));
      expect(children(editor.document.value)).toHaveLength(0);
      expect(library.matches(':popover-open')).toBe(true);
    };
    await refused(SLOTTED, 'declares slots');
    await refused('views/missing.kui.json', 'There is no views/missing');
    await refused('views/offline.kui.json', 'offline');
    await refused('app.kui.json', 'refused');
    click(documentRow(library, BROKEN));
    await vi.waitFor(() => expect(banner(library)).not.toBe(''));
    expect(banner(library)).not.toContain('refused');
    // The next opening clears the reason.
    library.hidePopover();
    library.showPopover();
    expect(banner(library)).toBe('');
  });

  it('refuses a selection with no place for it', async () => {
    const { editor, library } = open({
      document: {
        ...main(),
        root: { id: ROOT, type: '@kerfjs/ui:text', props: { children: 'x' } },
      },
    });
    await showLibrary(editor, library);
    click(documentRow(library, ROW_PATH));
    await vi.waitFor(() =>
      expect(banner(library)).toContain('The selection has no place for it'),
    );
    expect(editor.document.value.root!.type).toBe('@kerfjs/ui:text');
  });

  it('refuses an insert when the document changed meanwhile', async () => {
    const { editor, library, storage } = open();
    await showLibrary(editor, library);
    let release: (() => void) | undefined;
    vi.mocked(storage.read).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(JSON.stringify(rowDocument()));
        }),
    );
    click(documentRow(library, ROW_PATH));
    await vi.waitFor(() => expect(release).toBeDefined());
    editor.document.value = { ...editor.document.value, name: 'Changed' };
    release!();
    await vi.waitFor(() =>
      expect(banner(library)).toContain('The document changed meanwhile'),
    );
    expect(children(editor.document.value)).toHaveLength(0);
  });
});

/** Places an element at a box, for hit tests. */
function at(element: Element, left: number, top: number, w = 800, h = 40) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      top,
      width: w,
      height: h,
      right: left + w,
      bottom: top + h,
    }),
  });
}

describe('dragging a Library document', () => {
  async function dragSetUp(
    read?: (path: string) => Promise<string | undefined>,
    start: ViewDocument = paned(),
  ) {
    let under: Element | null = null;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => under,
    });
    const opened = open({ document: start });
    if (read) vi.mocked(opened.storage.read).mockImplementation(read);
    await showLibrary(opened.editor, opened.library);
    const { root } = opened;
    const canvas = root.querySelector<HTMLElement>('[data-editor-canvas]')!;
    at(canvas, 0, 0, 800, 600);
    await vi.waitFor(() =>
      expect(canvas.querySelector(`[data-kerf-node="${TEXT}"]`)).not.toBeNull(),
    );
    const text = canvas.querySelector<HTMLElement>(
      `[data-kerf-node="${TEXT}"]`,
    )!;
    at(text, 0, 100, 800, 40);
    const pointer = (type: string, from: Element, x: number, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      for (const [key, value] of Object.entries({
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
      }))
        Object.defineProperty(event, key, { value });
      from.dispatchEvent(event);
    };
    const part = (name: string) =>
      (name === 'drag-chip' ? root : canvas).querySelector<HTMLElement>(
        `.kui-editor__${name}`,
      )!;
    /** Drags `path`'s row onto the bottom half (or middle) of the Text. */
    const drag = (path: string, y = 135) => {
      const row = documentRow(opened.library, path);
      pointer('pointerdown', row, 10, 700);
      under = text;
      pointer('pointermove', row, 50, y);
      return () => pointer('pointerup', row, 50, y);
    };
    const content = () =>
      opened.editor.document.value.root!.zones!.content as ViewNode[];
    return { ...opened, drag, part, content, pointer, text };
  }

  it('drops a `#view` like a component, with its params seeded, and closes the Library', async () => {
    const { editor, library, drag, part, content, root } = await dragSetUp();
    const drop = drag(ROW_PATH);
    expect(part('drag-chip').textContent).toContain('message-row.kui.json');
    expect(part('drop-caption').textContent).toContain('After');
    // The read answers while the drag goes on.
    await vi.waitFor(() =>
      expect(part('drop-caption').textContent).toContain('After'),
    );
    drop();
    await vi.waitFor(() => expect(content()).toHaveLength(2));
    expect(content()[1]).toMatchObject({
      type: '#view',
      src: './message-row.kui.json',
      props: { title: 'Title' },
    });
    expect(editor.selection.value).toEqual({
      kind: 'node',
      id: content()[1]!.id,
    });
    expect(library.matches(':popover-open')).toBe(false);
    await vi.waitFor(() =>
      expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
        'Title',
      ),
    );
  });

  it('waits for a read the drop came before', async () => {
    let release: (() => void) | undefined;
    const { drag, content } = await dragSetUp(
      (path) =>
        new Promise((resolve) => {
          release = () =>
            resolve(
              path === ROW_PATH ? JSON.stringify(rowDocument()) : undefined,
            );
        }),
    );
    drag(ROW_PATH)();
    expect(content()).toHaveLength(1);
    release!();
    await vi.waitFor(() => expect(content()).toHaveLength(2));
    expect(content()[1]).toMatchObject({ props: { title: 'Title' } });
  });

  it('refuses a document that cannot be composed, saying why', async () => {
    const { drag, part, content, library } = await dragSetUp();
    const drop = drag(SLOTTED);
    // Once read, it goes nowhere, and the pointer says why.
    await vi.waitFor(() => {
      drag(SLOTTED);
      expect(part('drop-caption').textContent).toContain('declares slots');
    });
    drop();
    expect(content()).toHaveLength(1);
    expect(library.matches(':popover-open')).toBe(true);
  });

  it('brings the Library back to say why when the read answers after the drop', async () => {
    let release: (() => void) | undefined;
    const { drag, content, library, editor } = await dragSetUp(
      (path) =>
        new Promise((resolve) => {
          release = () =>
            resolve(
              JSON.stringify(
                path === SLOTTED
                  ? { ...rowDocument(), slots: { a: {} } }
                  : rowDocument(),
              ),
            );
        }),
    );
    drag(SLOTTED)();
    expect(library.matches(':popover-open')).toBe(false);
    release!();
    await vi.waitFor(() => expect(banner(library)).toContain('declares slots'));
    expect(library.matches(':popover-open')).toBe(true);
    expect(content()).toHaveLength(1);
    // A drop whose document changed while it was read is refused too.
    library.hidePopover();
    library.showPopover();
    release = undefined;
    drag(ROW_PATH)();
    // The narrowing above does not see the drag's callback set it again.
    const again = release as (() => void) | undefined;
    editor.document.value = { ...editor.document.value, name: 'Changed' };
    again!();
    await vi.waitFor(() =>
      expect(banner(library)).toContain('The document changed meanwhile'),
    );
    expect(content()).toHaveLength(1);
  });

  it('offers no replacing drop for a document that cannot be composed', async () => {
    // The Text is alone in a Workbench's one-child zone, so a drop inside
    // it would replace it.
    const { drag, part, editor } = await dragSetUp(undefined, {
      ...paned(),
      root: {
        id: ROOT,
        type: '@kerfjs/ui:workbench',
        props: { id: 'Shell', label: 'Shell' },
        zones: {
          main: [
            { id: TEXT, type: '@kerfjs/ui:text', props: { children: 'Hello' } },
          ],
        },
      },
    });
    drag(ROW_PATH, 120);
    await vi.waitFor(() => {
      drag(ROW_PATH, 120);
      expect(part('drop-caption').textContent).toBe('Replace Text');
    });
    drag(SLOTTED, 120);
    await vi.waitFor(() => {
      drag(SLOTTED, 120);
      expect(part('drop-caption').textContent).toContain('declares slots');
    });
    expect(editor.document.value.root!.zones!.main).toHaveLength(1);
  });
});
