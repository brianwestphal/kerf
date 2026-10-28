/** Where the editor is served unless `route` says otherwise. */
export declare const KERF_UI_EDITOR_ROUTE: '/__kerf-ui-editor/';
/** The registry module the plugin loads when it exists and none is named. */
export declare const DEFAULT_REGISTRY: 'src/kerf-ui-registry.ts';

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
/** The editor page the route serves. */
export declare function editorPage(): string;
/** The generated entry module that mounts the editor. */
export declare function editorEntry(options: {
  app: ApplicationCatalogs;
  registry?: string;
}): string;
/** Run the Kerf UI editor in this Vite dev server. */
export declare function kerfUiEditor(
  options?: KerfUiEditorOptions,
): KerfUiEditorPlugin;
