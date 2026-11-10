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
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { fileURLToPath } from 'node:url';

import { profileCatalogPaths } from './view/cli.mjs';
import { createViewCatalog } from './view/catalog.mjs';

/** Where the editor is served unless `route` says otherwise. */
export const KERF_UI_EDITOR_ROUTE = '/__kerf-ui-editor/';
/** The registry module the plugin loads when it exists and none is named. */
export const DEFAULT_REGISTRY = 'src/kerf-ui-registry.ts';
/**
 * The field editors module the plugin loads when it exists and none is
 * named (KF-EXA2WH: field editor API).
 */
export const DEFAULT_FIELD_EDITORS = 'src/kerf-ui-field-editors.ts';
/** Library-only registration module loaded when present. */
export const DEFAULT_LIBRARY_PREVIEWS = 'src/kerf-ui-library-previews.ts';

/** Where the editor reads and writes documents (KF-0SY9M6: autosave). */
export const KERF_UI_EDITOR_FILE_API = '/__kerf-ui-editor/api/file';
/**
 * Where the editor lists the project's documents (KF-PX5EVZ: insert an
 * existing document): GET answers a JSON array of `.kui.json` paths.
 */
export const KERF_UI_EDITOR_LIST_API = '/__kerf-ui-editor/api/files';
/** Node-only project language-service endpoint; POST requires the editor header. */
export const KERF_UI_EDITOR_TYPES_API = '/__kerf-ui-editor/api/types';
/** The most documents the list answers. */
export const KERF_UI_EDITOR_LIST_LIMIT = 5000;
/** Folders the list never walks, beside every dot-folder. */
const UNLISTED = new Set(['node_modules', 'dist', 'test-results']);
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
  const composition = paths.composition.map(readJson);
  const libraryPreviewModules = [
    ...new Set(
      composition.flatMap((catalog, index) => {
        if (
          typeof catalog.libraryPreviewModule !== 'string' ||
          !catalog.libraryPreviewModule
        )
          return [];
        try {
          const named = catalog.libraryPreviewModule;
          const file =
            named.startsWith('.') || isAbsolute(named)
              ? resolve(dirname(paths.composition[index]), named)
              : createRequire(paths.composition[index]).resolve(named);
          return existsSync(file) ? [file] : [];
        } catch {
          return [];
        }
      }),
    ),
  ];
  return {
    props: paths.props.map(readAppPropsCatalog),
    composition,
    libraryPreviewModules,
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

/**
 * The project's documents: every `.kui.json` file under `root`, as sorted
 * project-relative POSIX paths, outside `node_modules`, `dist`,
 * `test-results`, and every dot-folder (`.git`, the drafts folder), at most
 * `limit` of them.
 */
export async function editorDocuments(root, limit = KERF_UI_EDITOR_LIST_LIMIT) {
  const found = [];
  const walk = async (folder, prefix) => {
    const entries = await readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !UNLISTED.has(entry.name))
          await walk(join(folder, entry.name), `${prefix}${entry.name}/`);
      } else if (entry.isFile() && entry.name.endsWith('.kui.json'))
        found.push(`${prefix}${entry.name}`);
    }
  };
  await walk(root, '');
  return found.sort().slice(0, limit);
}

const send = (response, status, body, type = 'text/plain; charset=utf-8') => {
  response.statusCode = status;
  response.setHeader('Content-Type', type);
  response.end(body);
};

/**
 * Connect middleware serving `KERF_UI_EDITOR_FILE_API` over `root`: GET reads
 * a document, PUT writes one (creating folders). GET
 * `KERF_UI_EDITOR_LIST_API` lists the project's documents. Writes need the
 * `KERF_UI_EDITOR_HEADER` header, which a cross-site page cannot send without
 * a preflight this middleware never answers. The drafts folder ignores
 * itself in git.
 */
export function editorFileMiddleware(root) {
  let projectTypes;
  const typeService = async () => {
    const { createProjectTypeService } =
      await import('./view/project-types.mjs');
    return (projectTypes ??= createProjectTypeService(root));
  };
  const typeCatalog = () => {
    const app = applicationCatalogs(root);
    return createViewCatalog({
      props: [
        readJson(
          fileURLToPath(new URL('./ai/component-props.json', import.meta.url)),
        ),
        ...app.props,
      ],
      composition: [
        readJson(
          fileURLToPath(
            new URL('./ai/component-composition.json', import.meta.url),
          ),
        ),
        ...app.composition,
      ],
    });
  };
  return async (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname === KERF_UI_EDITOR_TYPES_API) {
      if (request.method !== 'POST') {
        send(response, 405, 'Use POST.');
        return;
      }
      if (request.headers[KERF_UI_EDITOR_HEADER] !== '1') {
        send(response, 403, 'Type requests come from the editor only.');
        return;
      }
      let text = '';
      try {
        for await (const chunk of request) {
          text += chunk;
          if (Buffer.byteLength(text) > 1024 * 1024) {
            send(response, 413, 'Type request is too large.');
            return;
          }
        }
        const body = JSON.parse(text);
        if (
          !editorFilePath(root, body.source) ||
          !['analyze', 'validate'].includes(body.action) ||
          (body.action === 'analyze' &&
            (typeof body.text !== 'string' ||
              (body.cursor !== undefined && !Number.isInteger(body.cursor)))) ||
          (body.action === 'validate' &&
            (!body.document ||
              typeof body.document !== 'object' ||
              Array.isArray(body.document)))
        ) {
          send(
            response,
            400,
            'Name a project document and a valid type request.',
          );
          return;
        }
        const service = await typeService();
        const result =
          body.action === 'analyze'
            ? service.analyze({
                ...body,
                ...(body.declared ? { catalog: typeCatalog() } : {}),
              })
            : service.validateDocument(
                body.document,
                typeCatalog(),
                body.source,
              );
        send(response, 200, JSON.stringify(result), 'application/json');
      } catch (error) {
        send(
          response,
          400,
          error instanceof Error ? error.message : String(error),
        );
      }
      return;
    }
    if (url.pathname === KERF_UI_EDITOR_LIST_API) {
      if (request.method !== 'GET') {
        send(response, 405, 'Use GET.');
        return;
      }
      try {
        send(
          response,
          200,
          JSON.stringify(await editorDocuments(root)),
          'application/json',
        );
      } catch (error) {
        send(
          response,
          500,
          error instanceof Error ? error.message : String(error),
        );
      }
      return;
    }
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
      // Atomically: a read while autosave writes (the editor reading a
      // composed document, a test checking the file) never sees a truncated
      // file. The temp file sits beside the target, so the rename stays on
      // one file system.
      const temp = join(
        dirname(file),
        `.${basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
      );
      await writeFile(temp, text);
      await rename(temp, file);
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
export function editorEntry({
  app,
  registry,
  fieldEditors,
  libraryPreviews,
  devicePresets,
  playHandlers,
}) {
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
    ...(app.libraryPreviewModules ?? []).map(
      (module, index) =>
        `import libraryPreview${index} from ${JSON.stringify(module)};`,
    ),
    libraryPreviews
      ? `import libraryPreviews from ${JSON.stringify(libraryPreviews)};`
      : 'const libraryPreviews = undefined;',
    fieldEditors
      ? `import fieldEditors from ${JSON.stringify(fieldEditors)};`
      : 'const fieldEditors = undefined;',
    devicePresets
      ? `import devicePresets from ${JSON.stringify(devicePresets)};`
      : 'const devicePresets = undefined;',
    playHandlers
      ? `import playHandlers from ${JSON.stringify(playHandlers)};`
      : 'const playHandlers = undefined;',
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
    `  libraryPreviews: { ${(app.libraryPreviewModules ?? []).map((_module, index) => `...libraryPreview${index}`).join(', ')} },`,
    '});',
    "const root = document.getElementById('kerf-ui-editor');",
    'const editor = createEditor({ catalog, storage: devServerStorage(), fieldEditors, devicePresets, playHandlers, libraryPreviews });',
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
      // A module that is named or at its default path, when it exists.
      const found = (named) => {
        const path = isAbsolute(named) ? named : resolve(root, named);
        return existsSync(path) ? path : undefined;
      };
      return editorEntry({
        app: applicationCatalogs(root),
        registry: found(options.registry ?? DEFAULT_REGISTRY),
        fieldEditors: found(options.fieldEditors ?? DEFAULT_FIELD_EDITORS),
        libraryPreviews: found(
          options.libraryPreviews ?? DEFAULT_LIBRARY_PREVIEWS,
        ),
        // KF-R7KXSN: play mode's extra or replacement device presets.
        devicePresets: options.devicePresets
          ? found(options.devicePresets)
          : undefined,
        // KF-RF6RCS: play mode's mock action handlers, run in the play frame.
        playHandlers: options.playHandlers
          ? found(options.playHandlers)
          : undefined,
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
