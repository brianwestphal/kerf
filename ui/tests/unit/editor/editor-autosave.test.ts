// KF-0SY9M6: with storage, the editor saves every change (to a draft until
// Save As chooses a path), shows the save state, and reopens the last file.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type EditorStorage,
  isDraft,
  rememberedPath,
  rememberPath,
} from '../../../src/editor/autosave.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { createEditor } from './kerf-catalog.js';

const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  globalThis.localStorage.clear();
});

const settle = () => new Promise((done) => window.setTimeout(done, 0));

function memory(files: Record<string, string> = {}) {
  const stored = new Map(Object.entries(files));
  let failing: string | undefined;
  let reading: Promise<void> | undefined;
  const storage: EditorStorage = {
    read: async (path) => {
      await reading;
      if (failing) throw new Error(failing);
      return stored.get(path);
    },
    write: vi.fn(async (path: string, text: string) => {
      if (failing) throw new Error(failing);
      stored.set(path, text);
    }),
  };
  return {
    stored,
    storage,
    fail: (reason?: string) => {
      failing = reason;
    },
    hold: () => {
      let release!: () => void;
      reading = new Promise((done) => {
        release = done;
      });
      return release;
    },
  };
}

function open(storage: EditorStorage) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor({ storage });
  mount(root, editor.render);
  cleanup = editor.wire(root);
  return { root, editor };
}

/** Deletes the Compose button: one committed edit. */
function edit(root: HTMLElement, editor: ReturnType<typeof createEditor>) {
  editor.selection.value = { kind: 'node', id: COMPOSE };
  root.querySelector<HTMLElement>('[data-action="editor-delete"]')!.click();
}

const header = (root: HTMLElement) =>
  root.querySelector('[data-workbench-main] .kui-toolbar-text__description')
    ?.textContent ??
  root.textContent ??
  '';

describe('editor autosave', () => {
  it('starts a draft, saves an edit to it, and remembers it', async () => {
    const { stored, storage } = memory();
    const { root, editor } = open(storage);
    expect(header(root)).toContain('Unsaved draft · autosaved · 7 nodes');
    // Nothing is written until something changes.
    await settle();
    expect(storage.write).not.toHaveBeenCalled();
    edit(root, editor);
    expect(header(root)).toContain('Unsaved draft · saving…');
    await vi.waitFor(() => expect(stored.size).toBe(1));
    const [[path, text]] = [...stored];
    expect(isDraft(path!)).toBe(true);
    expect(JSON.parse(text!).root).toEqual(editor.document.value.root);
    await vi.waitFor(() =>
      expect(header(root)).toContain('Unsaved draft · autosaved · 6 nodes'),
    );
    expect(rememberedPath()).toBe(path);
  });

  it('reopens the remembered file and saves edits there', async () => {
    const changed = { ...sample, name: 'Mail' } as unknown as ViewDocument;
    const { stored, storage } = memory({
      'views/mail.kui.json': JSON.stringify(changed),
    });
    rememberPath('views/mail.kui.json');
    const { root, editor } = open(storage);
    await vi.waitFor(() => expect(editor.document.value.name).toBe('Mail'));
    expect(header(root)).toContain('views/mail.kui.json · saved');
    edit(root, editor);
    await vi.waitFor(() =>
      expect(JSON.parse(stored.get('views/mail.kui.json')!).root).toEqual(
        editor.document.value.root,
      ),
    );
  });

  it('starts a draft when the remembered file is missing, invalid, or unreadable', async () => {
    const cases: Record<string, string>[] = [
      {},
      { 'gone.kui.json': '{"schema":"x"}' },
    ];
    for (const files of cases) {
      rememberPath('gone.kui.json');
      const { root, editor } = open(memory(files).storage);
      await settle();
      expect(editor.document.value.name).toBe('Inbox');
      expect(header(root)).toContain('Unsaved draft · autosaved');
      cleanup!();
      cleanup = undefined;
    }
    rememberPath('gone.kui.json');
    const failing = memory();
    failing.fail('offline');
    const { root } = open(failing.storage);
    await settle();
    expect(header(root)).toContain('Unsaved draft · autosaved');
  });

  it('keeps an edit made while the remembered file loads, in a new draft', async () => {
    const { stored, storage, hold } = memory({
      'views/mail.kui.json': JSON.stringify(sample),
    });
    rememberPath('views/mail.kui.json');
    const release = hold();
    const { root, editor } = open(storage);
    edit(root, editor);
    release();
    await vi.waitFor(() => expect(stored.size).toBe(2));
    const draft = [...stored.keys()].find(isDraft)!;
    expect(JSON.parse(stored.get(draft)!).root).toEqual(
      editor.document.value.root,
    );
  });

  it('shows a save that failed', async () => {
    const { storage, fail } = memory();
    const { root, editor } = open(storage);
    fail('disk full');
    edit(root, editor);
    await vi.waitFor(() =>
      expect(header(root)).toContain('Unsaved draft · not saved: disk full'),
    );
  });

  it('saves as a project path from the Save As dialog', async () => {
    const { stored, storage, fail } = memory();
    const { root } = open(storage);
    const dialog = root.querySelector<HTMLDialogElement>(
      '#editor-save-as-dialog',
    )!;
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    dialog.showModal = showModal;
    const button = root.querySelector<HTMLElement>(
      '[data-action="editor-save-as"]:not([data-editor-save-as])',
    )!;
    expect(button.textContent).toContain('Save As…');
    button.click();
    expect(showModal).toHaveBeenCalled();
    const input = dialog.querySelector<HTMLInputElement>(
      '[data-editor-save-as="path"] input',
    )!;
    expect(input.value).toBe('inbox.kui.json');
    const confirm = dialog.querySelector<HTMLElement>(
      '[data-editor-save-as="confirm"]',
    )!;
    input.value = 'views/inbox.json';
    confirm.click();
    await settle();
    expect(dialog.textContent).toContain(
      'Name a .kui.json file outside the drafts folder.',
    );
    input.value = './views/inbox.kui.json';
    fail('read-only');
    confirm.click();
    await vi.waitFor(() => expect(dialog.textContent).toContain('read-only'));
    expect(header(root)).toContain('Unsaved draft');
    fail();
    confirm.click();
    await vi.waitFor(() =>
      expect(header(root)).toContain('views/inbox.kui.json · saved'),
    );
    expect(stored.has('views/inbox.kui.json')).toBe(true);
    expect(rememberedPath()).toBe('views/inbox.kui.json');
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-editor-save-as="path"] input',
      )!.value,
    ).toBe('views/inbox.kui.json');
  });

  it('opens a file into a new draft, saved at once', async () => {
    const { stored, storage } = memory();
    const { root, editor } = open(storage);
    const input = root.querySelector<HTMLInputElement>(
      '[data-file-picker-id="open-document"] input[type="file"]',
    )!;
    const next = { ...sample, name: 'Opened' };
    const file = new File([JSON.stringify(next)], 'chosen.json');
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(editor.document.value.name).toBe('Opened'));
    await vi.waitFor(() => expect(stored.size).toBe(1));
    expect(JSON.parse([...stored.values()][0]!).name).toBe('Opened');
  });

  // KF-QSSTMX: New starts an empty document in a new draft, leaving the
  // previous document in its own file.
  it('starts a new empty document in a new draft', async () => {
    const { stored, storage } = memory();
    const { root, editor } = open(storage);
    edit(root, editor);
    await vi.waitFor(() => expect(stored.size).toBe(1));
    const [first] = [...stored.keys()];
    editor.selection.value = { kind: 'node', id: COMPOSE };
    root.querySelector<HTMLElement>('[data-action="editor-new"]')!.click();
    expect(editor.document.value.root.type).toBe('@kerfjs/ui:pane');
    expect(editor.document.value.root.zones).toBeUndefined();
    expect(editor.selection.value).toBeNull();
    await vi.waitFor(() => expect(stored.size).toBe(2));
    const second = [...stored.keys()].find((path) => path !== first)!;
    expect(isDraft(second)).toBe(true);
    expect(JSON.parse(stored.get(second)!).name).toBe('Untitled');
    expect(JSON.parse(stored.get(first!)!).name).toBe('Inbox');
    await vi.waitFor(() =>
      expect(header(root)).toContain('Unsaved draft · autosaved · 1 node'),
    );
    // Undo has nothing to go back to: the new document starts fresh.
    expect(
      root
        .querySelector('[data-action="editor-undo"]')!
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('saves a pending change as the page hides and when unwired', async () => {
    const { storage } = memory();
    const { root, editor } = open(storage);
    edit(root, editor);
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    expect(storage.write).toHaveBeenCalledTimes(1);
    editor.selection.value = {
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5E',
    };
    root.querySelector<HTMLElement>('[data-action="editor-delete"]')!.click();
    cleanup!();
    cleanup = undefined;
    await settle();
    expect(storage.write).toHaveBeenCalledTimes(2);
  });
});
