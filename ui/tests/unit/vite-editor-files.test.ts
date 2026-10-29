// @vitest-environment node
// KF-0SY9M6: the dev server reads and writes the editor's documents. Only a
// `.kui.json` file inside the project, outside node_modules and .git, and
// only a write that carries the editor's header; drafts ignore themselves.
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  editorFileMiddleware,
  editorFilePath,
  KERF_UI_EDITOR_FILE_API,
} from '../../vite-editor.mjs';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kerf-editor-files-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

async function call(
  method: string,
  path: string | null,
  options: { body?: string; header?: boolean; url?: string } = {},
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
  await editorFileMiddleware(root)(request as never, response as never, next);
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
