// @vitest-environment node
// KF-0SY9M6: the dev server reads and writes the editor's documents. Only a
// `.kui.json` file inside the project, outside node_modules and .git, and
// only a write that carries the editor's header; drafts ignore themselves.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  editorDocuments,
  editorFileMiddleware,
  editorFilePath,
  KERF_UI_EDITOR_FILE_API,
  KERF_UI_EDITOR_LIST_API,
  KERF_UI_EDITOR_TYPES_API,
  projectTypeWorker,
} from '../../vite-editor.mjs';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kerf-editor-files-'));
});
const middlewares: Array<ReturnType<typeof editorFileMiddleware>> = [];
const middleware = () => {
  const created = editorFileMiddleware(root);
  middlewares.push(created);
  return created;
};
afterEach(async () => {
  await Promise.all(middlewares.splice(0).map((created) => created.dispose()));
  rmSync(root, { recursive: true, force: true });
});

async function call(
  method: string,
  path: string | null,
  options: {
    body?: string;
    header?: boolean;
    url?: string;
    via?: ReturnType<typeof editorFileMiddleware>;
  } = {},
) {
  const query = path === null ? '' : `?path=${encodeURIComponent(path)}`;
  const request = {
    method,
    url: options.url ?? `${KERF_UI_EDITOR_FILE_API}${query}`,
    headers: options.header === false ? {} : { 'x-kerf-ui-editor': '1' },
    async *[Symbol.asyncIterator]() {
      if (options.body) yield options.body;
    },
  };
  const response = {
    statusCode: 0,
    body: '',
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(body: string) {
      this.body = body;
    },
  };
  const next = vi.fn();
  await (options.via ?? middleware())(
    request as never,
    response as never,
    next,
  );
  return { response, next };
}

describe('editorFilePath', () => {
  it('accepts .kui.json files inside the project only', () => {
    expect(editorFilePath(root, 'views/inbox.kui.json')).toBe(
      join(root, 'views/inbox.kui.json'),
    );
    for (const path of [
      undefined,
      null,
      '',
      'views/inbox.json',
      '../outside.kui.json',
      '/etc/inbox.kui.json',
      'node_modules/pkg/a.kui.json',
      '.git/a.kui.json',
      '.kui.json/..',
    ])
      expect(editorFilePath(root, path)).toBeUndefined();
  });
});

describe('editorFileMiddleware', () => {
  it('writes and reads a document, creating its folders', async () => {
    const put = await call('PUT', 'views/inbox.kui.json', { body: '{"a":1}' });
    expect(put.response.statusCode).toBe(204);
    expect(readFileSync(join(root, 'views/inbox.kui.json'), 'utf8')).toBe(
      '{"a":1}',
    );
    const get = await call('GET', 'views/inbox.kui.json');
    expect(get.response).toMatchObject({ statusCode: 200, body: '{"a":1}' });
    expect(get.response.headers['Content-Type']).toBe('application/json');
    expect(existsSync(join(root, '.kerf-ui-editor'))).toBe(false);
    // The write lands whole, by rename: no temp file stays beside it, and an
    // overwrite replaces the content in one step.
    await call('PUT', 'views/inbox.kui.json', { body: '{"a":2}' });
    expect(readdirSync(join(root, 'views'))).toEqual(['inbox.kui.json']);
    expect(readFileSync(join(root, 'views/inbox.kui.json'), 'utf8')).toBe(
      '{"a":2}',
    );
  });

  it('makes the drafts folder ignore itself, once', async () => {
    await call('PUT', '.kerf-ui-editor/drafts/a.kui.json', { body: '{}' });
    const ignore = join(root, '.kerf-ui-editor/.gitignore');
    expect(readFileSync(ignore, 'utf8')).toBe('*\n');
    writeFileSync(ignore, 'kept\n');
    await call('PUT', '.kerf-ui-editor/drafts/b.kui.json', { body: '{}' });
    expect(readFileSync(ignore, 'utf8')).toBe('kept\n');
  });

  it('refuses other paths, methods, missing files, and writes without the header', async () => {
    expect((await call('GET', '../x.kui.json')).response.statusCode).toBe(400);
    expect((await call('GET', null)).response.statusCode).toBe(400);
    expect((await call('GET', 'missing.kui.json')).response.statusCode).toBe(
      404,
    );
    expect((await call('DELETE', 'a.kui.json')).response.statusCode).toBe(405);
    const forged = await call('PUT', 'a.kui.json', {
      body: '{}',
      header: false,
    });
    expect(forged.response.statusCode).toBe(403);
    expect(existsSync(join(root, 'a.kui.json'))).toBe(false);
  });

  it('reports a failed write and passes other requests on', async () => {
    writeFileSync(join(root, 'file'), '');
    const failed = await call('PUT', 'file/a.kui.json', { body: '{}' });
    expect(failed.response.statusCode).toBe(500);
    expect(failed.response.body).toMatch(/EEXIST|ENOTDIR/);
    const other = await call('GET', null, { url: '/src/main.ts' });
    expect(other.next).toHaveBeenCalled();
  });
});

// KF-PX5EVZ: the editor's Insert Document picker lists the project's
// documents through the dev server.
describe('editorDocuments and the list endpoint', () => {
  const file = (path: string) => {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), '{}');
  };

  it('lists .kui.json files as sorted POSIX paths, skipping build and dot folders', async () => {
    for (const path of [
      'views/row.kui.json',
      'app.kui.json',
      'views/nested/deep.kui.json',
      'views/notes.json',
      'node_modules/pkg/a.kui.json',
      '.git/b.kui.json',
      '.kerf-ui-editor/drafts/c.kui.json',
      '.hidden/d.kui.json',
      'dist/e.kui.json',
      'test-results/f.kui.json',
      'src/dist-like/g.kui.json',
    ])
      file(path);
    expect(await editorDocuments(root)).toEqual([
      'app.kui.json',
      'src/dist-like/g.kui.json',
      'views/nested/deep.kui.json',
      'views/row.kui.json',
    ]);
    expect(await editorDocuments(root, 2)).toEqual([
      'app.kui.json',
      'src/dist-like/g.kui.json',
    ]);
  });

  it('answers GET with a JSON array and refuses other methods', async () => {
    file('views/row.kui.json');
    const get = await call('GET', null, { url: KERF_UI_EDITOR_LIST_API });
    expect(get.response.statusCode).toBe(200);
    expect(get.response.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(get.response.body)).toEqual(['views/row.kui.json']);
    expect(get.next).not.toHaveBeenCalled();
    const put = await call('PUT', null, { url: KERF_UI_EDITOR_LIST_API });
    expect(put.response.statusCode).toBe(405);
  });

  it('reports a listing that fails', async () => {
    rmSync(root, { recursive: true, force: true });
    const get = await call('GET', null, { url: KERF_UI_EDITOR_LIST_API });
    expect(get.response.statusCode).toBe(500);
    expect(get.response.body).toMatch(/ENOENT/);
  });
});

describe('project type endpoint', () => {
  it('resolves actual project types and enforces editor request boundaries', async () => {
    writeFileSync(
      join(root, 'types.ts'),
      'export interface MyCustomType { id: string }',
    );
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true }, include: ['*.ts'] }),
    );
    const body = JSON.stringify({
      action: 'analyze',
      source: 'card.kui.json',
      text: 'Array<MyCustomType>',
    });
    const request = (body: string, header = true, method = 'POST') =>
      call(method, null, { url: KERF_UI_EDITOR_TYPES_API, body, header });
    const result = await request(body);
    expect(result.response.statusCode).toBe(200);
    expect(JSON.parse(result.response.body).type.typescript.text).toContain(
      'MyCustomType',
    );
    expect((await request(body, false)).response.statusCode).toBe(403);
    expect((await request(body, true, 'GET')).response.statusCode).toBe(405);
    expect((await request('{')).response.statusCode).toBe(400);
    expect(
      (
        await request(
          JSON.stringify({
            action: 'analyze',
            source: '../outside.kui.json',
            text: 'string',
          }),
        )
      ).response.statusCode,
    ).toBe(400);
    expect(
      (
        await request(
          JSON.stringify({
            action: 'analyze',
            source: 'card.kui.json',
            text: 'string',
            cursor: 'bad',
          }),
        )
      ).response.statusCode,
    ).toBe(400);
    const invalid = await request(
      JSON.stringify({
        action: 'analyze',
        source: 'card.kui.json',
        text: 'MissingType',
      }),
    );
    expect(JSON.parse(invalid.response.body).diagnostics[0].message).toContain(
      'Cannot find name',
    );
  });
});

describe('project type worker', () => {
  // KF-EQFF9K: TypeScript runs in a worker thread, so the server answers
  // other requests while an analysis is in flight.
  it('answers an unrelated request while a cold analysis is in flight', async () => {
    writeFileSync(join(root, 'card.kui.json'), '{}');
    const via = middleware();
    let analyzed = false;
    const analysis = call('POST', null, {
      url: KERF_UI_EDITOR_TYPES_API,
      via,
      body: JSON.stringify({
        action: 'analyze',
        source: 'card.kui.json',
        text: '{ id: string; count: number }',
      }),
    }).then((result) => {
      analyzed = true;
      return result;
    });
    const started = performance.now();
    const list = await call('GET', null, { url: KERF_UI_EDITOR_LIST_API, via });
    expect(list.response.statusCode).toBe(200);
    expect(JSON.parse(list.response.body)).toEqual(['card.kui.json']);
    expect(analyzed).toBe(false);
    expect(performance.now() - started).toBeLessThan(200);
    const result = await analysis;
    expect(result.response.statusCode).toBe(200);
    expect(JSON.parse(result.response.body).type.typescript.text).toContain(
      'count',
    );
  });

  it('fails the requests in flight when the worker crashes, then starts a new one', async () => {
    // A stand-in worker: it crashes on `crash`, else echoes the request.
    const entry = join(root, 'stand-in-worker.mjs');
    writeFileSync(
      entry,
      `import { parentPort } from 'node:worker_threads';
parentPort.on('message', ({ id, body }) => {
  if (body.action === 'crash') process.exit(3);
  if (body.action === 'reject') parentPort.postMessage({ id, error: 'Bad type.' });
  else parentPort.postMessage({ id, result: body });
});`,
    );
    const types = projectTypeWorker(root, new URL(`file://${entry}`));
    try {
      expect(await types.request({ action: 'echo' })).toEqual({
        result: { action: 'echo' },
      });
      expect(await types.request({ action: 'reject' })).toEqual({
        status: 400,
        error: 'Bad type.',
      });
      expect(await types.request({ action: 'crash' })).toEqual({
        status: 500,
        error: 'The type service stopped (exit code 3).',
      });
      // The next request gets a fresh worker.
      expect(await types.request({ action: 'echo' })).toEqual({
        result: { action: 'echo' },
      });
      // A worker that fails to load reports its error.
      const broken = projectTypeWorker(
        root,
        new URL(`file://${join(root, 'missing-worker.mjs')}`),
      );
      const reply = await broken.request({ action: 'echo' });
      expect(reply).toMatchObject({ status: 500 });
      expect('error' in reply && reply.error).toMatch(
        /^The type service failed: /,
      );
    } finally {
      await types.dispose();
    }
  });

  it('fails the requests in flight on disposal', async () => {
    const entry = join(root, 'silent-worker.mjs');
    writeFileSync(entry, 'setInterval(() => {}, 1000);');
    const types = projectTypeWorker(root, new URL(`file://${entry}`));
    const reply = types.request({ action: 'analyze' });
    await types.dispose();
    expect(await reply).toEqual({
      status: 500,
      error: 'The type service was disposed.',
    });
    // Disposing an idle client is a no-op.
    expect(types.dispose()).toBeUndefined();
  });
});
