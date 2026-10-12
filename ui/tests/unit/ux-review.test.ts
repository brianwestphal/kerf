import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadUxReviewProject,
  UX_REVIEW_PROJECT_PATH,
  uxReviewCaptureUrl,
} from '../../src/catalog/ux-review.js';
import {
  findProjectDirectory,
  resolveUxReviewProject,
  UX_REVIEW_PROJECT_PATH as PLUGIN_PATH,
  uxReviewMiddleware,
  uxReviewPlugin,
  uxReviewProjectResponse,
} from '../../vite-ux-review.mjs';

describe('uxReviewCaptureUrl', () => {
  it('presets a region screenshot for a project, title, and context', () => {
    const link = new URL(
      uxReviewCaptureUrl({
        projectDirectory: '/Users/test/My Project',
        title: 'Kerf UI: Badge',
        context: 'Kerf UI catalog\nSelected Display: Badge (badge)',
      }),
    );
    expect(`${link.protocol}//${link.host}`).toBe('uxreview://capture');
    expect(Object.fromEntries(link.searchParams)).toEqual({
      kind: 'screenshot',
      target: 'region',
      project: '/Users/test/My Project',
      title: 'Kerf UI: Badge',
      context: 'Kerf UI catalog\nSelected Display: Badge (badge)',
    });
  });
});

describe('loadUxReviewProject', () => {
  const respond = (body: unknown, ok = true) =>
    vi.fn(
      async (_input: unknown) => ({ ok, json: async () => body }) as Response,
    );

  it('asks the page server, relative to the page, for an absolute directory', async () => {
    const fetchImpl = respond({ projectDirectory: '/repo' });
    await expect(
      loadUxReviewProject('http://127.0.0.1:5173/demo/?component=x', fetchImpl),
    ).resolves.toBe('/repo');
    expect(String(vi.mocked(fetchImpl).mock.calls[0]![0])).toBe(
      `http://127.0.0.1:5173/demo/${UX_REVIEW_PROJECT_PATH}`,
    );
    await expect(
      loadUxReviewProject(
        'http://h/',
        respond({ projectDirectory: 'C:\\repo' }),
      ),
    ).resolves.toBe('C:\\repo');
  });

  it('resolves null for every answer that is not a usable directory', async () => {
    for (const fetchImpl of [
      respond({ projectDirectory: '/repo' }, false),
      respond({ projectDirectory: 'relative/repo' }),
      respond({ projectDirectory: 42 }),
      respond({}),
      respond(null),
      respond('nope'),
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    ])
      await expect(
        loadUxReviewProject('http://h/', fetchImpl as typeof globalThis.fetch),
      ).resolves.toBeNull();
  });
});

describe('uxReviewPlugin (@kerfjs/ui/vite-ux-review)', () => {
  const made: string[] = [];
  afterEach(() => {
    for (const dir of made.splice(0)) rmSync(dir, { recursive: true });
  });
  function tree() {
    const top = realpathSync(mkdtempSync(join(tmpdir(), 'kui-ux-review-')));
    made.push(top);
    mkdirSync(join(top, '.git'));
    const root = join(top, 'apps', 'catalog');
    mkdirSync(root, { recursive: true });
    return { top, root };
  }
  type Handler = Parameters<
    Parameters<
      ReturnType<typeof uxReviewPlugin>['configureServer']
    >[0]['middlewares']['use']
  >[0];
  function handlerOf(
    plugin: ReturnType<typeof uxReviewPlugin>,
    server: 'configureServer' | 'configurePreviewServer',
  ): Handler {
    let handler: Handler | undefined;
    plugin[server]({ middlewares: { use: (fn) => (handler = fn) } });
    return handler!;
  }
  function request(handler: Handler, url: string, method = 'GET') {
    const headers: Record<string, string> = {};
    const response = {
      statusCode: 200,
      body: undefined as string | undefined,
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
      end(body?: string) {
        this.body = body;
      },
    };
    const next = vi.fn();
    handler({ url, method }, response, next);
    return { response, headers, next };
  }

  it('finds the repository above the root, or keeps the root', () => {
    const { top, root } = tree();
    expect(findProjectDirectory(root)).toBe(top);
    expect(findProjectDirectory(top)).toBe(top);
    const loose = realpathSync(mkdtempSync(join(tmpdir(), 'kui-no-git-')));
    made.push(loose);
    expect(findProjectDirectory(loose)).toBe(loose);
  });

  it('serves the project on the dev and preview servers, at any base path', () => {
    const { top, root } = tree();
    const plugin = uxReviewPlugin();
    expect(plugin.name).toBe('kerf-ux-review');
    plugin.configResolved({ root });
    for (const server of [
      'configureServer',
      'configurePreviewServer',
    ] as const) {
      const handler = handlerOf(plugin, server);
      for (const url of [
        `/${PLUGIN_PATH}`,
        `/nested/base/${PLUGIN_PATH}?t=1`,
      ]) {
        const { response, headers, next } = request(handler, url);
        expect(next).not.toHaveBeenCalled();
        expect(JSON.parse(response.body!)).toEqual({ projectDirectory: top });
        expect(headers['Content-Type']).toBe('application/json; charset=utf-8');
        expect(headers['Cache-Control']).toBe('no-store');
      }
    }
  });

  it('passes other requests on and refuses non-GET methods', () => {
    const { root } = tree();
    const plugin = uxReviewPlugin();
    plugin.configResolved({ root });
    const handler = handlerOf(plugin, 'configureServer');
    expect(request(handler, '/index.html').next).toHaveBeenCalledOnce();
    expect(request(handler, `/x${PLUGIN_PATH}`).next).toHaveBeenCalledOnce();
    const post = request(handler, `/${PLUGIN_PATH}`, 'POST');
    expect(post.response.statusCode).toBe(405);
    expect(post.headers.Allow).toBe('GET');
    expect(post.response.body).toBeUndefined();
  });

  it('takes an explicit project directory, resolved against the root', () => {
    const { top, root } = tree();
    mkdirSync(join(top, 'packages'));
    const plugin = uxReviewPlugin({ projectDirectory: '../../packages' });
    plugin.configResolved({ root });
    const { response } = request(
      handlerOf(plugin, 'configureServer'),
      `/${PLUGIN_PATH}`,
    );
    expect(JSON.parse(response.body!)).toEqual({
      projectDirectory: join(top, 'packages'),
    });
  });

  it('resolves the project directory for any server, defaulting to the working directory', () => {
    const { top, root } = tree();
    mkdirSync(join(top, 'packages'));
    expect(resolveUxReviewProject({ root })).toBe(top);
    expect(
      resolveUxReviewProject({ root, projectDirectory: '../../packages' }),
    ).toBe(join(top, 'packages'));
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
    expect(resolveUxReviewProject()).toBe(top);
    cwd.mockRestore();
  });

  it('answers Fetch API requests at any base path and leaves others to the server', async () => {
    const at = (path: string, method = 'GET') =>
      uxReviewProjectResponse(
        new Request(`http://127.0.0.1:3000${path}`, { method }),
        '/repo',
      );
    for (const path of [`/${PLUGIN_PATH}`, `/ux-demo/${PLUGIN_PATH}?t=1`]) {
      const response = at(path)!;
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      await expect(response.json()).resolves.toEqual({
        projectDirectory: '/repo',
      });
    }
    expect(at('/ux-demo')).toBeNull();
    expect(at(`/x${PLUGIN_PATH}`)).toBeNull();
    const post = at(`/${PLUGIN_PATH}`, 'POST')!;
    expect(post.status).toBe(405);
    expect(post.headers.get('Allow')).toBe('GET');
    await expect(post.text()).resolves.toBe('');
  });

  it('serves the endpoint from a Node / connect middleware stack', () => {
    const handler = uxReviewMiddleware('/repo');
    const ok = request(handler, `/base/${PLUGIN_PATH}#x`);
    expect(ok.next).not.toHaveBeenCalled();
    expect(JSON.parse(ok.response.body!)).toEqual({
      projectDirectory: '/repo',
    });
    expect(ok.headers['Cache-Control']).toBe('no-store');
    expect(request(handler, '/other').next).toHaveBeenCalledOnce();
    expect(request(handler, `/${PLUGIN_PATH}`, 'PUT').response.statusCode).toBe(
      405,
    );
  });

  it('shares its endpoint path with the browser helpers', () => {
    expect(PLUGIN_PATH).toBe(UX_REVIEW_PROJECT_PATH);
  });
});
