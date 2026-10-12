/** Where the endpoint lives, relative to the catalog page. */
export declare const UX_REVIEW_PROJECT_PATH: '__ux-review/project.json';

export interface UxReviewPluginOptions {
  /**
   * The project directory UX Review files captures under, resolved against
   * Vite's `root`. Default: the nearest ancestor of `root` holding `.git`,
   * or `root` itself.
   */
  projectDirectory?: string;
}

/** The connect-style middleware stack of a Vite dev or preview server. */
export interface UxReviewMiddlewareServer {
  middlewares: {
    use(
      handler: (
        request: { url?: string; method?: string },
        response: {
          statusCode: number;
          setHeader(name: string, value: string): void;
          end(body?: string): void;
        },
        next: () => void,
      ) => void,
    ): unknown;
  };
}

/** A Vite plugin; structurally typed so this module needs no `vite` import. */
export interface UxReviewPlugin {
  name: 'kerf-ux-review';
  configResolved(config: { root: string }): void;
  configureServer(server: UxReviewMiddlewareServer): void;
  configurePreviewServer(server: UxReviewMiddlewareServer): void;
}

/** The nearest directory at or above `start` that holds `.git`, else `start`. */
export declare function findProjectDirectory(start: string): string;

export interface ResolveUxReviewProjectOptions {
  /** The directory to start from. Default: `process.cwd()`. */
  root?: string;
  /**
   * An explicit project directory, resolved against `root`. Default: the
   * nearest ancestor of `root` holding `.git`, or `root` itself.
   */
  projectDirectory?: string;
}

/** The real path of the UX Review project directory for a server. */
export declare function resolveUxReviewProject(
  options?: ResolveUxReviewProjectOptions,
): string;

/**
 * Answer a Fetch API request for `…/__ux-review/project.json` at any base
 * path: the project JSON for a GET, 405 for another method, or `null` for any
 * other path so the server handles it as usual. Mount it on a development
 * server only.
 */
export declare function uxReviewProjectResponse(
  request: Request,
  projectDirectory: string,
): Response | null;

/** A Node / connect `(request, response, next)` handler for a server's middleware stack. */
export type UxReviewMiddleware = Parameters<
  UxReviewMiddlewareServer['middlewares']['use']
>[0];

/**
 * A Node / connect-style handler for `…/__ux-review/project.json` at any base
 * path; other requests go to `next`. Mount it on a development server only.
 */
export declare function uxReviewMiddleware(
  projectDirectory: string,
): UxReviewMiddleware;

/** Serve the UX Review project directory to catalog pages on dev and preview servers. */
export declare function uxReviewPlugin(
  options?: UxReviewPluginOptions,
): UxReviewPlugin;
