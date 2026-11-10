/** Where the editor is served unless `route` says otherwise. */
export declare const KERF_UI_EDITOR_ROUTE: '/__kerf-ui-editor/';
/** The registry module the plugin loads when it exists and none is named. */
export declare const DEFAULT_REGISTRY: 'src/kerf-ui-registry.ts';
/** The field editors module the plugin loads when it exists and none is named. */
export declare const DEFAULT_FIELD_EDITORS: 'src/kerf-ui-field-editors.ts';
/** Where the editor reads and writes documents. */
export declare const KERF_UI_EDITOR_FILE_API: '/__kerf-ui-editor/api/file';
/** Where the editor lists the project's documents (GET: a JSON array of paths). */
export declare const KERF_UI_EDITOR_LIST_API: '/__kerf-ui-editor/api/files';
/** Project TypeScript service; POST requires the editor header. */
export declare const KERF_UI_EDITOR_TYPES_API: '/__kerf-ui-editor/api/types';
/** The most documents the list answers. */
export declare const KERF_UI_EDITOR_LIST_LIMIT: 5000;
/** The project folder unsaved drafts autosave into; it ignores itself in git. */
export declare const KERF_UI_EDITOR_FOLDER: '.kerf-ui-editor';
/** The header every write must carry. */
export declare const KERF_UI_EDITOR_HEADER: 'x-kerf-ui-editor';

/** A `component-props.json` catalog, as the plugin reads it. */
export interface EditorPropsCatalog {
  readonly components: readonly {
    readonly key: string;
    readonly source?: string;
    readonly import?: string;
    readonly export?: string;
    readonly [field: string]: unknown;
  }[];
  readonly [field: string]: unknown;
}

/** The catalogs an application declares for the editor. */
export interface ApplicationCatalogs {
  readonly props: readonly EditorPropsCatalog[];
  readonly composition: readonly {
    readonly package?: string;
    readonly [field: string]: unknown;
  }[];
}

export interface KerfUiEditorOptions {
  /** Where the editor is served (default `/__kerf-ui-editor/`). */
  route?: string;
  /**
   * A module, resolved against Vite's `root`, whose default export maps
   * catalog keys to component functions that add to or replace the ones the
   * catalogs' imports provide. Default: `src/kerf-ui-registry.ts` when it
   * exists.
   */
  registry?: string;
  /**
   * A module, resolved against Vite's `root`, whose default export maps type
   * names to field editors (`FieldEditors` from `@kerfjs/ui/editor`) that
   * replace the editor's type-driven form for those types. Default:
   * `src/kerf-ui-field-editors.ts` when it exists.
   */
  fieldEditors?: string;
  /**
   * A module, resolved against Vite's `root`, whose default export is play
   * mode's device presets (`DevicePresetsOption` from `@kerfjs/ui/editor`):
   * an array added to the shipped presets (replacing any with the same id),
   * or a function of the shipped list that returns the whole list.
   */
  devicePresets?: string;
  /**
   * A module, resolved against Vite's `root`, whose default export maps
   * action names to play mode's mock handlers (`PlayHandlers` from
   * `@kerfjs/ui/editor`). They run inside the play frame when the played
   * view fires that action.
   */
  playHandlers?: string;
}

/** The connect-style middleware stack and HTML transform of a Vite dev server. */
export interface KerfUiEditorServer {
  middlewares: {
    use(
      handler: (
        request: { url?: string; originalUrl?: string },
        response: {
          statusCode: number;
          setHeader(name: string, value: string): void;
          end(body?: string): void;
        },
        next: (error?: unknown) => void,
      ) => void | Promise<void>,
    ): unknown;
  };
  transformIndexHtml(
    url: string,
    html: string,
    originalUrl?: string,
  ): Promise<string>;
}

/** A Vite plugin; structurally typed so this module needs no `vite` import. */
export interface KerfUiEditorPlugin {
  name: 'kerf-ui-editor';
  apply: 'serve';
  configResolved(config: { root: string }): void;
  resolveId(id: string): string | null;
  load(id: string): string | null;
  configureServer(server: KerfUiEditorServer): void;
}

/** Reads a props catalog, making app-source component imports absolute. */
export declare function readAppPropsCatalog(path: string): EditorPropsCatalog;
/** The catalogs the application's `.kerf-ui-profile.json` declares. */
export declare function applicationCatalogs(root: string): ApplicationCatalogs;
/** The absolute `.kui.json` file inside `root` a path names, or undefined. */
export declare function editorFilePath(
  root: string,
  path: string | null | undefined,
): string | undefined;
/**
 * The `.kui.json` files under `root`: sorted project-relative POSIX paths,
 * outside `node_modules`, `dist`, `test-results`, and every dot-folder.
 */
export declare function editorDocuments(
  root: string,
  limit?: number,
): Promise<string[]>;
/**
 * Connect middleware reading (GET) and writing (PUT) documents under `root`,
 * and listing them (GET `KERF_UI_EDITOR_LIST_API`).
 */
export declare function editorFileMiddleware(
  root: string,
): (
  request: import('node:http').IncomingMessage,
  response: import('node:http').ServerResponse,
  next: (error?: unknown) => void,
) => Promise<void>;
/** The editor page the route serves. */
export declare function editorPage(): string;
/** The generated entry module that mounts the editor. */
export declare function editorEntry(options: {
  app: ApplicationCatalogs;
  registry?: string;
  fieldEditors?: string;
  devicePresets?: string;
  playHandlers?: string;
}): string;
/** Run the Kerf UI editor in this Vite dev server. */
export declare function kerfUiEditor(
  options?: KerfUiEditorOptions,
): KerfUiEditorPlugin;
