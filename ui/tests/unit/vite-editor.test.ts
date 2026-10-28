// @vitest-environment node
// KF-6GT5QY: `@kerfjs/ui/vite-editor` serves the editor page at its route on
// the dev server only, and generates an entry that imports every module the
// catalogs name, the application's catalogs, and an optional registry.
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applicationCatalogs,
  DEFAULT_REGISTRY,
  editorEntry,
  editorPage,
  KERF_UI_EDITOR_ROUTE,
  kerfUiEditor,
  readAppPropsCatalog,
} from '../../vite-editor.mjs';

const uiRoot = resolve(import.meta.dirname, '../..');
const repoRoot = resolve(uiRoot, '..');
const fixture = resolve(repoRoot, 'editor/fixtures/app');
let app: string;

beforeEach(() => {
  app = mkdtempSync(join(tmpdir(), 'kerf-editor-host-'));
  cpSync(fixture, app, { recursive: true });
  mkdirSync(join(app, '.git'));
});
afterEach(() => rmSync(app, { recursive: true, force: true }));

describe('application catalogs', () => {
  it('reads the profile’s catalogs and makes app-source imports absolute', () => {
    const catalogs = applicationCatalogs(app);
    expect(catalogs.composition[0].package).toBe('orders-app');
    expect(catalogs.props[0].components[0].import).toBe(
      join(app, 'src/order-card'),
    );
    const props = readAppPropsCatalog(join(app, 'component-props.json'));
    expect(props.components[0].key).toBe('orders-app:order-card');
  });

  it('keeps package imports as they are', () => {
    writeFileSync(
      join(app, 'component-props.json'),
      JSON.stringify({
        components: [{ key: 'pkg:card', import: 'pkg/card', export: 'Card' }],
      }),
    );
    expect(
      readAppPropsCatalog(join(app, 'component-props.json')).components[0]
        .import,
    ).toBe('pkg/card');
  });
});

describe('the generated entry', () => {
  it('imports each named module once, the app catalogs, and the registry', () => {
    const code = editorEntry({
      app: applicationCatalogs(app),
      registry: '/app/src/kerf-ui-registry.ts',
    });
    expect(code).toContain(
      "import { componentMap, createEditor, createEditorCatalog } from '@kerfjs/ui/editor';",
    );
    expect(code).toContain('import * as module0 from "@kerfjs/ui/');
    expect(code).toContain(
      `from ${JSON.stringify(join(app, 'src/order-card'))};`,
    );
    expect(code.match(/from "@kerfjs\/ui\/button";/g)).toHaveLength(1);
    expect(code).not.toContain('webawesome');
    expect(code).toContain(
      'import registry from "/app/src/kerf-ui-registry.ts";',
    );
    expect(code).toContain('"orders-app:order-card"');
    expect(code).toContain("import '@kerfjs/ui/select/register';");
    expect(editorEntry({ app: { props: [], composition: [] } })).toContain(
      'const registry = {};',
    );
  });

  it('serves a page that mounts the entry', () => {
    expect(editorPage()).toContain(
      '<script type="module" src="/@id/virtual:kerf-ui-editor/entry"></script>',
    );
    expect(editorPage()).toContain('class="kui-app-root"');
  });
});

describe('kerfUiEditor', () => {
  type Middleware = (
    request: { url?: string; originalUrl?: string },
    response: {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (body: string) => void;
    },
    next: (error?: unknown) => void,
  ) => Promise<void>;

  function serve(options?: Parameters<typeof kerfUiEditor>[0]) {
    const plugin = kerfUiEditor(options);
    let middleware: Middleware | undefined;
    const transformIndexHtml = vi.fn(
      async (_url: string, html: string) => `<!-- vite -->${html}`,
    );
    plugin.configResolved({ root: app });
    plugin.configureServer({
      middlewares: { use: (handler: Middleware) => (middleware = handler) },
      transformIndexHtml,
    });
    const request = async (url: string | undefined) => {
      const response = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        body: '',
        setHeader(name: string, value: string) {
          this.headers[name] = value;
        },
        end(body: string) {
          this.body = body;
        },
      };
      const next = vi.fn();
      await middleware!({ url }, response, next);
      return { response, next };
    };
    return { plugin, request, transformIndexHtml };
  }

  it('is a dev-server plugin that resolves and loads its virtual entry', () => {
    const { plugin } = serve();
    expect(plugin).toMatchObject({ name: 'kerf-ui-editor', apply: 'serve' });
    expect(plugin.resolveId('virtual:kerf-ui-editor/entry')).toBe(
      '\0virtual:kerf-ui-editor/entry',
    );
    expect(plugin.resolveId('kerfjs')).toBeNull();
    expect(plugin.load('/src/other.ts')).toBeNull();
    const withoutRegistry = plugin.load('\0virtual:kerf-ui-editor/entry')!;
    expect(withoutRegistry).toContain('const registry = {};');
    mkdirSync(join(app, 'src'), { recursive: true });
    writeFileSync(join(app, DEFAULT_REGISTRY), 'export default {};\n');
    expect(plugin.load('\0virtual:kerf-ui-editor/entry')).toContain(
      `import registry from ${JSON.stringify(join(app, DEFAULT_REGISTRY))};`,
    );
    const named = serve({ registry: join(app, 'missing.ts') }).plugin;
    expect(named.load('\0virtual:kerf-ui-editor/entry')).toContain(
      'const registry = {};',
    );
  });

  it('serves the page at its route, with and without the trailing slash', async () => {
    const { request, transformIndexHtml } = serve();
    for (const url of [KERF_UI_EDITOR_ROUTE, '/__kerf-ui-editor?x=1']) {
      const { response, next } = await request(url);
      expect(next).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('text/html; charset=utf-8');
      expect(response.body.startsWith('<!-- vite -->')).toBe(true);
    }
    expect(transformIndexHtml).toHaveBeenCalledWith(
      KERF_UI_EDITOR_ROUTE,
      editorPage(),
      undefined,
    );
    const other = await request('/');
    expect(other.next).toHaveBeenCalledWith();
    const missing = await request(undefined);
    expect(missing.next).toHaveBeenCalledWith();
  });

  it('serves a custom route and hands a transform failure to Vite', async () => {
    const { request, transformIndexHtml } = serve({ route: '/design/' });
    expect((await request(KERF_UI_EDITOR_ROUTE)).next).toHaveBeenCalledWith();
    const failure = new Error('transform failed');
    transformIndexHtml.mockRejectedValueOnce(failure);
    expect((await request('/design/')).next).toHaveBeenCalledWith(failure);
  });

  it('starts from the working directory until Vite reports its root', () => {
    const plugin = kerfUiEditor();
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(app);
    expect(kerfUiEditor().load('\0virtual:kerf-ui-editor/entry')).toContain(
      '"orders-app:order-card"',
    );
    cwd.mockRestore();
    expect(plugin.name).toBe('kerf-ui-editor');
  });
});
