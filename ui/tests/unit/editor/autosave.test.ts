// KF-0SY9M6: every change saves itself after a pause, to a draft until Save
// As chooses a path; a failed save is visible and retried by the next change.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAutosave,
  devServerStorage,
  draftPath,
  EDITOR_FILE_API,
  type EditorStorage,
  isDraft,
  rememberedPath,
  rememberPath,
} from '../../../src/editor/autosave.js';

/** In-memory storage that can be made to fail. */
function memory() {
  const files = new Map<string, string>();
  let failing: string | undefined;
  const storage: EditorStorage = {
    read: async (path) => files.get(path),
    write: vi.fn(async (path: string, text: string) => {
      if (failing) throw new Error(failing);
      files.set(path, text);
    }),
  };
  return {
    files,
    storage,
    fail: (reason?: string) => {
      failing = reason;
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createAutosave', () => {
  it('saves a change after the pause, once, and only when it differs', async () => {
    const { files, storage } = memory();
    const saver = createAutosave(storage, 400);
    saver.adopt('a.kui.json', 'one');
    saver.change('one');
    expect(saver.status.value).toBe('saved');
    saver.change('two');
    saver.change('three');
    expect(saver.status.value).toBe('saving');
    await vi.advanceTimersByTimeAsync(399);
    expect(storage.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(files.get('a.kui.json')).toBe('three');
    expect(storage.write).toHaveBeenCalledTimes(1);
    expect(saver.status.value).toBe('saved');
  });

  it('drops a pending change that returns to what was saved', async () => {
    const { storage } = memory();
    const saver = createAutosave(storage);
    saver.adopt('a.kui.json', 'one');
    saver.change('two');
    saver.change('one');
    expect(saver.status.value).toBe('saved');
    await vi.runAllTimersAsync();
    expect(storage.write).not.toHaveBeenCalled();
  });

  it('shows a failed save and retries on the next change', async () => {
    const { files, storage, fail } = memory();
    const saver = createAutosave(storage);
    saver.adopt('a.kui.json', 'one');
    fail('disk full');
    saver.change('two');
    await vi.runAllTimersAsync();
    expect(saver.status.value).toBe('failed');
    expect(saver.error.value).toBe('disk full');
    fail();
    // The same text again retries, since it never saved.
    saver.change('two');
    await vi.runAllTimersAsync();
    expect(files.get('a.kui.json')).toBe('two');
    expect(saver.status.value).toBe('saved');
    expect(saver.error.value).toBe('');
  });

  it('creates a file at once, and flushes a pending change', async () => {
    const { files, storage } = memory();
    const saver = createAutosave(storage);
    await saver.create('d.kui.json', 'new');
    expect(files.get('d.kui.json')).toBe('new');
    expect(saver.path.value).toBe('d.kui.json');
    saver.change('newer');
    await saver.flush();
    expect(files.get('d.kui.json')).toBe('newer');
    // Nothing pending: flush just waits.
    await saver.flush();
    saver.change('newest');
    saver.dispose();
    await vi.runAllTimersAsync();
    expect(files.get('d.kui.json')).toBe('newer');
  });

  it('saves as a new path only when the write succeeds', async () => {
    const { files, storage, fail } = memory();
    const saver = createAutosave(storage);
    saver.adopt(draftPath('x'), 'one');
    saver.change('two');
    fail('read-only');
    expect(await saver.saveAs('views/a.kui.json', 'two')).toBe('read-only');
    expect(saver.path.value).toBe(draftPath('x'));
    fail();
    expect(await saver.saveAs('views/a.kui.json', 'two')).toBeUndefined();
    expect(saver.path.value).toBe('views/a.kui.json');
    expect(files.get('views/a.kui.json')).toBe('two');
    expect(saver.status.value).toBe('saved');
    saver.change('two');
    expect(saver.status.value).toBe('saved');
  });

  it('ignores the outcome of a write to a path it has left', async () => {
    const { storage, fail } = memory();
    const saver = createAutosave(storage);
    fail('gone');
    const first = saver.create('a.kui.json', 'one');
    saver.adopt('b.kui.json', 'two');
    await first;
    expect(saver.status.value).toBe('saved');
    expect(saver.error.value).toBe('');
    fail();
  });

  it('reports a non-Error failure as text', async () => {
    const saver = createAutosave({
      read: async () => undefined,
      write: () => Promise.reject('nope'),
    });
    await saver.create('a.kui.json', 'x');
    expect(saver.error.value).toBe('nope');
    expect(await saver.saveAs('b.kui.json', 'x')).toBe('nope');
  });
});

describe('drafts and the remembered path', () => {
  it('names drafts inside the drafts folder', () => {
    expect(draftPath('x')).toBe('.kerf-ui-editor/drafts/x.kui.json');
    expect(isDraft(draftPath('x'))).toBe(true);
    expect(isDraft('views/a.kui.json')).toBe(false);
  });

  it('remembers the path in browser storage, and survives without it', () => {
    rememberPath('views/a.kui.json');
    expect(rememberedPath()).toBe('views/a.kui.json');
    globalThis.localStorage.clear();
    expect(rememberedPath()).toBeUndefined();
    // A private window or blocked site data throws from the accessor.
    const blocked = vi
      .spyOn(globalThis, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    expect(() => rememberPath('x.kui.json')).not.toThrow();
    expect(rememberedPath()).toBeUndefined();
    blocked.mockRestore();
  });
});

describe('devServerStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads, writes with the editor header, and reports failures', async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('missing')) return new Response('', { status: 404 });
      if (url.includes('broken'))
        return new Response('', { status: 500, statusText: 'Server Error' });
      if (init?.method === 'PUT' && url.includes('denied'))
        return new Response('Writes come from the editor only.', {
          status: 403,
        });
      return init?.method === 'PUT'
        ? new Response(null, { status: 204 })
        : new Response('{"x":1}');
    });
    vi.stubGlobal('fetch', fetch);
    const storage = devServerStorage();
    expect(await storage.read('a b.kui.json')).toBe('{"x":1}');
    expect(fetch).toHaveBeenLastCalledWith(
      `${EDITOR_FILE_API}?path=a%20b.kui.json`,
    );
    expect(await storage.read('missing.kui.json')).toBeUndefined();
    await expect(storage.read('broken.kui.json')).rejects.toThrow(
      'Server Error',
    );
    await storage.write('a.kui.json', '{}');
    expect(fetch.mock.lastCall![1]).toMatchObject({
      method: 'PUT',
      body: '{}',
      keepalive: true,
      headers: { 'X-Kerf-UI-Editor': '1' },
    });
    await expect(storage.write('denied.kui.json', '{}')).rejects.toThrow(
      'Writes come from the editor only.',
    );
  });
});
