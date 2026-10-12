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

/** Serve the UX Review project directory to catalog pages on dev and preview servers. */
export declare function uxReviewPlugin(
  options?: UxReviewPluginOptions,
): UxReviewPlugin;
