/**
 * `@kerfjs/ui/vite-editor` — run the Kerf UI editor inside an application's
 * own Vite dev server (KF-6GT5QY: editor host), so the application's
 * components preview with its real functions, CSS, and aliases.
 *
 * `kerfUiEditor()` serves the editor page at a dev-only route (default
 * `/__kerf-ui-editor/`). Its generated entry imports `@kerfjs/ui/editor`,
 * Kerf UI's catalogs, the catalogs the application's `.kerf-ui-profile.json`
 * declares, and every module those catalogs name as a component's `import`,
 * so each catalog key previews with its component function. An optional
 * registry module (`export default { 'pkg:key': Component }`) adds or
 * replaces functions. Nothing here imports Vite; it never runs in a
 * production build.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';

import { profileCatalogPaths } from './view/cli.mjs';

/** Where the editor is served unless `route` says otherwise. */
export const KERF_UI_EDITOR_ROUTE = '/__kerf-ui-editor/';
/** The registry module the plugin loads when it exists and none is named. */
export const DEFAULT_REGISTRY = 'src/kerf-ui-registry.ts';

/** Where the editor reads and writes documents (KF-0SY9M6: autosave). */
export const KERF_UI_EDITOR_FILE_API = '/__kerf-ui-editor/api/file';
/** The project folder unsaved drafts autosave into. */
export const KERF_UI_EDITOR_FOLDER = '.kerf-ui-editor';
/** The header every write carries; a cross-site page cannot send it. */
export const KERF_UI_EDITOR_HEADER = 'x-kerf-ui-editor';

const ENTRY_ID = 'virtual:kerf-ui-editor/entry';
const RESOLVED_ENTRY_ID = `\0${ENTRY_ID}`;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/**
 * Reads a props catalog and makes its relative component imports (app source
 * components, `./src/x.js`) absolute against the catalog's folder, without
 * the `.js` a TypeScript source keeps, so Vite resolves the source file.
 */
export function readAppPropsCatalog(path) {
  const catalog = readJson(path);
  const folder = dirname(path);
  return {
    ...catalog,
    components: catalog.components.map((component) =>
      component.import?.startsWith('.')
        ? {
            ...component,
            import: resolve(folder, component.import).replace(/\.js$/, ''),
          }
        : component,
    ),
  };
}

/**
 * The catalogs an application declares for the editor: the props and
 * composition catalogs its `.kerf-ui-profile.json` names (Kerf UI's own come
 * from the package).
 */
export function applicationCatalogs(root) {
  const paths = profileCatalogPaths(join(root, 'index.html'));
  return {
    props: paths.props.map(readAppPropsCatalog),
    composition: paths.composition.map(readJson),
  };
}

/**
 * The absolute file a request names: a `.kui.json` path inside `root`, outside
 * `node_modules` and `.git`, or undefined for anything else.
 */
export function editorFilePath(root, path) {
  if (typeof path !== 'string' || !path.endsWith('.kui.json')) return;
  const file = resolve(root, path);
  const inside = relative(root, file);
  if (!inside || inside.startsWith('..') || isAbsolute(inside)) return;
  const parts = inside.split(sep);
  if (parts.includes('node_modules') || parts.includes('.git')) return;
  return file;
}

const send = (response, status, body, type = 'text/plain; charset=utf-8') => {
  response.statusCode = status;
  response.setHeader('Content-Type', type);
  response.end(body);
};

/**
 * Connect middleware serving `KERF_UI_EDITOR_FILE_API` over `root`: GET reads
 * a document, PUT writes one (creating folders). Writes need the
 * `KERF_UI_EDITOR_HEADER` header, which a cross-site page cannot send without
 * a preflight this middleware never answers. The drafts folder ignores
 * itself in git.
 */
export function editorFileMiddleware(root) {
  return async (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== KERF_UI_EDITOR_FILE_API) {
      next();
      return;
    }
    const file = editorFilePath(root, url.searchParams.get('path'));
    if (!file) {
      send(response, 400, 'Name a .kui.json file inside the project.');
      return;
    }
    try {
      if (request.method === 'GET') {
        if (!existsSync(file)) {
          send(response, 404, 'No such document.');
          return;
        }
        send(response, 200, await readFile(file, 'utf8'), 'application/json');
        return;
      }
      if (request.method !== 'PUT') {
        send(response, 405, 'Use GET or PUT.');
        return;
      }
      if (request.headers[KERF_UI_EDITOR_HEADER] !== '1') {
        send(response, 403, 'Writes come from the editor only.');
        return;
      }
      let text = '';
      for await (const chunk of request) text += chunk;
      await mkdir(dirname(file), { recursive: true });
      const folder = join(root, KERF_UI_EDITOR_FOLDER);
      if (
        file.startsWith(folder + sep) &&
        !existsSync(join(folder, '.gitignore'))
      )
        await writeFile(join(folder, '.gitignore'), '*\n');
      await writeFile(file, text);
      send(response, 204, '');
    } catch (error) {
      send(
        response,
        500,
        error instanceof Error ? error.message : String(error),
      );
    }
  };
}

/** The page the route serves; Vite injects its client into it. */
export function editorPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <title>Kerf UI Editor</title>
  </head>
  <body>
    <div id="kerf-ui-editor" class="kui-app-root"></div>
    <script type="module" src="/@id/${ENTRY_ID}"></script>
  </body>
</html>
`;
}

/**
 * The generated entry: imports the editor, the catalogs, and each module a
 * catalog names, then mounts the editor over all of them.
 */
export function editorEntry({ app, registry }) {
  const kerfProps = readJson(
    resolve(import.meta.dirname, 'ai/component-props.json'),
  );
  const specifiers = [
    ...new Set(
      [kerfProps, ...app.props].flatMap((catalog) =>
        catalog.components.flatMap((component) =>
          component.source !== 'webawesome' && component.import
            ? [component.import]
            : [],
        ),
      ),
    ),
  ];
  const lines = [
    "import '@kerfjs/ui/document.css';",
    "import '@kerfjs/ui/styles.css';",
    "import '@kerfjs/ui/layout.css';",
    "import '@kerfjs/ui/workbench.css';",
    "import '@kerfjs/ui/editor.css';",
    "import '@kerfjs/ui/popup-menu/register';",
    "import '@kerfjs/ui/select/register';",
    "import '@kerfjs/ui/surface-scaffold/register';",
    "import { componentMap, createEditor, createEditorCatalog, devServerStorage } from '@kerfjs/ui/editor';",
    "import kerfProps from '@kerfjs/ui/ai/component-props.json';",
    "import kerfComposition from '@kerfjs/ui/ai/component-composition.json';",
    "import kerfSelection from '@kerfjs/ui/ai/component-catalog.json';",
    "import { mount } from 'kerfjs';",
    ...specifiers.map(
      (specifier, index) =>
        `import * as module${index} from ${JSON.stringify(specifier)};`,
    ),
    registry
      ? `import registry from ${JSON.stringify(registry)};`
      : 'const registry = {};',
    `const appProps = ${JSON.stringify(app.props)};`,
    `const appComposition = ${JSON.stringify(app.composition)};`,
    'const props = [kerfProps, ...appProps];',
    `const modules = { ${specifiers
      .map((specifier, index) => `${JSON.stringify(specifier)}: module${index}`)
      .join(', ')} };`,
    'const catalog = createEditorCatalog({',
    '  props,',
    '  composition: [kerfComposition, ...appComposition],',
    '  selection: [kerfSelection],',
    '  components: { ...componentMap(props, modules), ...registry },',
    '});',
    "const root = document.getElementById('kerf-ui-editor');",
    'const editor = createEditor({ catalog, storage: devServerStorage() });',
    'mount(root, editor.render);',
    'editor.wire(root);',
    '',
  ];
  return lines.join('\n');
}

/**
 * The Vite plugin. `route` is where the editor is served; `registry` names a
 * module (resolved against Vite's `root`) whose default export adds or
 * replaces component functions, defaulting to `src/kerf-ui-registry.ts` when
 * that file exists.
 */
export function kerfUiEditor(options = {}) {
  const route = options.route ?? KERF_UI_EDITOR_ROUTE;
  let root = process.cwd();
  return {
    name: 'kerf-ui-editor',
    apply: 'serve',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === ENTRY_ID ? RESOLVED_ENTRY_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ENTRY_ID) return null;
      const named = options.registry ?? DEFAULT_REGISTRY;
      const path = isAbsolute(named) ? named : resolve(root, named);
      return editorEntry({
        app: applicationCatalogs(root),
        registry: existsSync(path) ? path : undefined,
      });
    },
    configureServer(server) {
      server.middlewares.use(editorFileMiddleware(root));
      server.middlewares.use(async (request, response, next) => {
        const path = (request.url ?? '').split(/[?#]/)[0];
        if (path !== route && `${path}/` !== route) {
          next();
          return;
        }
        try {
          const html = await server.transformIndexHtml(
            route,
            editorPage(),
            request.originalUrl,
          );
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(html);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
