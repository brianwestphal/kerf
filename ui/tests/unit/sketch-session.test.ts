// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL(
    '../../scripts/sketch/runner.sketchplugin/Contents/Sketch/session.js',
    import.meta.url,
  ),
  'utf8',
);
const createSession = vm.runInNewContext(
  `(function(module){ ${source}; return module.exports; })`,
)({ exports: {} });

function fixture() {
  const documents: Document[] = [];
  const libraries: Array<{ id: string; remove(): void }> = [];
  const writes = new Map<string, Record<string, unknown>>();
  let tick!: () => void;
  let cleanup!: () => void;
  let cancelled = false;
  let saved!: () => void;
  let opened!: (error: unknown, document: Document) => void;
  let id = 0;
  class Document {
    id: string;
    constructor() {
      this.id = `doc-${id++}`;
      documents.push(this);
    }
    close() {
      documents.splice(documents.indexOf(this), 1);
    }
    save(_path: string, _options: unknown, callback: () => void) {
      saved = callback;
    }
    static SaveMode = { SaveTo: 'save-to' };
    static open(_path: string, callback: typeof opened) {
      opened = callback;
    }
  }
  const userDocument = new Document();
  const userLibrary = {
    id: 'user-library',
    remove() {
      libraries.splice(libraries.indexOf(this), 1);
    },
  };
  libraries.push(userLibrary);
  const dom = {
    Document,
    getDocuments: () => documents.slice(),
    Library: {
      getLibraries: () => libraries.slice(),
      getLibraryForDocumentAtPath(path: string) {
        if (path === 'existing') return userLibrary;
        const library = {
          id: `library-${id++}`,
          remove() {
            libraries.splice(libraries.indexOf(this), 1);
          },
        };
        libraries.push(library);
        return library;
      },
    },
  };
  const session = createSession(
    {
      dom,
      processId: 123,
      now: () => 0,
      write: (name: string, value: Record<string, unknown>) =>
        writes.set(name, value),
      cancelled: () => cancelled,
      createFiber: () => ({
        onCleanup(callback: () => void) {
          cleanup = callback;
        },
        cleanup() {
          cleanup();
        },
      }),
      every(callback: () => void) {
        tick = callback;
        return { invalidate() {} };
      },
    },
    { runId: 'run', jobDirectory: 'job', parameters: {}, deadline: 100 },
  );
  return {
    session,
    writes,
    documents,
    libraries,
    userDocument,
    userLibrary,
    Document,
    cancel() {
      cancelled = true;
      tick();
    },
    saveComplete() {
      saved();
    },
    openComplete(document: Document) {
      opened(null, document);
    },
    teardown() {
      cleanup();
    },
  };
}

describe('Sketch session ownership', () => {
  it('allows early close/reopen work only for owned documents', () => {
    const f = fixture();
    expect(() => f.session.closeDocument(f.userDocument)).toThrow('not owned');
    const document = f.session.createDocument();
    f.session.closeDocument(document);
    expect(f.documents).toEqual([f.userDocument]);
    expect(() => f.session.closeDocument(document)).toThrow('not owned');
    f.session.done();
    expect(f.writes.get('status.json')).toMatchObject({
      state: 'succeeded',
      cleanupComplete: true,
    });
  });
  it('closes only acquired documents and temporary Library registrations', () => {
    const f = fixture();
    f.session.createDocument();
    f.session.library('new');
    f.session.library('existing');
    f.session.done(null, { verified: true });
    f.session.done(new Error('late callback'));
    expect(f.documents).toEqual([f.userDocument]);
    expect(f.libraries).toEqual([f.userLibrary]);
    expect(f.writes.get('status.json')).toMatchObject({
      state: 'succeeded',
      cleanupComplete: true,
      result: { verified: true },
    });
    expect(() => f.session.createDocument()).toThrow('finishing');
  });
  it('waits for a pending save callback before cancellation tears down the fiber', () => {
    const f = fixture();
    const doc = f.session.createDocument();
    let callback = false;
    f.session.saveDocument(doc, 'generated.sketch', () => {
      callback = true;
    });
    f.cancel();
    expect(f.documents).toContain(doc);
    expect(f.writes.get('status.json')!.state).toBe('running');
    f.saveComplete();
    expect(callback).toBe(false);
    expect(f.documents).toEqual([f.userDocument]);
    expect(f.writes.get('status.json')).toMatchObject({
      state: 'failed',
      cleanupComplete: true,
    });
  });
  it('registers a late opened document for cleanup after cancellation', () => {
    const f = fixture();
    f.session.openDocument('generated.sketch', () => {
      throw new Error('Should not run');
    });
    f.cancel();
    const opened = new f.Document();
    f.openComplete(opened);
    expect(f.documents).toEqual([f.userDocument]);
    expect(f.writes.get('status.json')!.cleanupComplete).toBe(true);
  });
  it('preserves a document returned by open when it was already open', () => {
    const f = fixture();
    f.session.openDocument('user.sketch', () => f.session.done());
    f.openComplete(f.userDocument);
    expect(f.documents).toEqual([f.userDocument]);
    expect(f.writes.get('status.json')!.state).toBe('succeeded');
  });
  it('cleans owned resources on task failure and unexpected fiber teardown', () => {
    for (const failure of [true, false]) {
      const f = fixture();
      f.session.createDocument();
      f.session.library('new');
      if (failure) f.session.done(new Error('Task failed'));
      else f.teardown();
      expect(f.documents).toEqual([f.userDocument]);
      expect(f.libraries).toEqual([f.userLibrary]);
      expect(f.writes.get('status.json')).toMatchObject({
        state: failure ? 'failed' : 'cancelled',
        cleanupComplete: true,
      });
    }
  });
  it('attempts every cleanup and reports errors without claiming success', () => {
    const f = fixture();
    const doc = f.session.createDocument();
    f.session.library('new');
    doc.close = () => {
      throw new Error('Close failed');
    };
    f.session.done();
    expect(f.libraries).toEqual([f.userLibrary]);
    expect(f.writes.get('status.json')).toMatchObject({
      state: 'failed',
      cleanupComplete: false,
    });
    expect(
      (f.writes.get('status.json')!.cleanupErrors as string[]).join(''),
    ).toContain('Close failed');
  });
});
