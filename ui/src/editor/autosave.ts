// KF-0SY9M6: every change saves itself. A document without a chosen path
// saves to a draft in the project's `.kerf-ui-editor/drafts/` folder; Save as
// moves it to a real path, where later changes go. The host's dev server does
// the writing (`@kerfjs/ui/vite-editor`'s file middleware).
import { type ReadonlySignal, signal } from 'kerfjs';

/** Reads and writes documents by project-relative path. */
export interface EditorStorage {
  /** The document's text, or undefined when there is none at `path`. */
  read(path: string): Promise<string | undefined>;
  write(path: string, text: string): Promise<void>;
}

/** Where the dev server's file middleware answers. */
export const EDITOR_FILE_API = '/__kerf-ui-editor/api/file';
/** Where unsaved documents autosave. */
export const DRAFTS_FOLDER = '.kerf-ui-editor/drafts/';

/** Whether `path` is an autosaved draft rather than a chosen file. */
export const isDraft = (path: string) => path.startsWith(DRAFTS_FOLDER);

/** A fresh draft path. */
export const draftPath = (id: string) => `${DRAFTS_FOLDER}${id}.kui.json`;

/** Storage over the dev server that hosts the editor. */
export function devServerStorage(api = EDITOR_FILE_API): EditorStorage {
  const url = (path: string) => `${api}?path=${encodeURIComponent(path)}`;
  const failure = async (response: Response) =>
    new Error((await response.text()) || response.statusText);
  return {
    async read(path) {
      const response = await globalThis.fetch(url(path));
      if (response.status === 404) return undefined;
      if (!response.ok) throw await failure(response);
      return response.text();
    },
    async write(path, text) {
      const response = await globalThis.fetch(url(path), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Kerf-UI-Editor': '1',
        },
        body: text,
        // A change saved as the page closes still arrives.
        keepalive: true,
      });
      if (!response.ok) throw await failure(response);
    },
  };
}

export type SaveStatus = 'saved' | 'saving' | 'failed';

export interface Autosave {
  /** The path changes save to. */
  readonly path: ReadonlySignal<string>;
  readonly status: ReadonlySignal<SaveStatus>;
  /** Why the last save failed. */
  readonly error: ReadonlySignal<string>;
  /** Takes `path` as the current file, whose content is `text`, unsaved. */
  adopt(path: string, text: string): void;
  /** Saves `text` after a pause, unless it is what `path` already holds. */
  change(text: string): void;
  /** Makes `path` the current file and saves `text` there now. */
  create(path: string, text: string): Promise<void>;
  /**
   * Saves `text` to `path` and, once that succeeds, makes it the current
   * file. Resolves to why it failed, leaving the current file as it was.
   */
  saveAs(path: string, text: string): Promise<string | undefined>;
  /** Saves a pending change now. */
  flush(): Promise<void>;
  dispose(): void;
}

/** Saves the document's text to `storage`, `delay` ms after it changes. */
export function createAutosave(storage: EditorStorage, delay = 400): Autosave {
  const path = signal('');
  const status = signal<SaveStatus>('saved');
  const error = signal('');
  // The text last handed to a write (or adopted), and a change waiting on
  // the pause; a change back to `queued` needs no write.
  let queued: string | undefined;
  let pending: string | undefined;
  let active = 0;
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let writing = Promise.resolve();

  const settle = () => {
    if (active === 0 && pending === undefined && status.peek() === 'saving')
      status.value = 'saved';
  };
  const write = (target: string, text: string) => {
    queued = text;
    active += 1;
    status.value = 'saving';
    writing = writing.then(async () => {
      try {
        await storage.write(target, text);
        if (path.peek() === target && status.peek() !== 'failed')
          error.value = '';
      } catch (failure) {
        if (path.peek() !== target) return;
        status.value = 'failed';
        error.value =
          failure instanceof Error ? failure.message : String(failure);
      } finally {
        active -= 1;
        settle();
      }
    });
    return writing;
  };
  const cancel = () => {
    globalThis.clearTimeout(timer);
    timer = undefined;
  };
  const flush = () => {
    cancel();
    const text = pending;
    pending = undefined;
    return text === undefined ? writing : write(path.peek(), text);
  };

  return {
    path,
    status,
    error,
    adopt(next, text) {
      cancel();
      pending = undefined;
      path.value = next;
      queued = text;
      status.value = active ? 'saving' : 'saved';
      error.value = '';
    },
    change(text) {
      if (text === queued && status.peek() !== 'failed') {
        cancel();
        pending = undefined;
        settle();
        return;
      }
      pending = text;
      status.value = 'saving';
      cancel();
      timer = globalThis.setTimeout(() => void flush(), delay);
    },
    create(next, text) {
      cancel();
      pending = undefined;
      path.value = next;
      error.value = '';
      return write(next, text);
    },
    async saveAs(next, text) {
      await flush();
      try {
        await storage.write(next, text);
      } catch (failure) {
        return failure instanceof Error ? failure.message : String(failure);
      }
      path.value = next;
      queued = text;
      status.value = 'saved';
      error.value = '';
      return undefined;
    },
    flush,
    dispose: cancel,
  };
}

const REMEMBERED = 'kerf-ui-editor:path';

/** The path the editor last had open in this browser, if any. */
export function rememberedPath(): string | undefined {
  try {
    return globalThis.localStorage.getItem(REMEMBERED) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Remembers `path` so the next visit reopens it. */
export function rememberPath(path: string): void {
  try {
    globalThis.localStorage.setItem(REMEMBERED, path);
  } catch {
    // Without storage the next visit starts from the host's document.
  }
}
