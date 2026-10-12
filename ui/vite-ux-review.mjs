/**
 * `@kerfjs/ui/vite-ux-review` — a Node-only Vite plugin that tells a local
 * catalog page which project it belongs to, so the catalog can offer a UX
 * Review "Capture region" link (see `wireCatalog`'s `onUxReviewProject` and
 * the Catalog's `uxReview` prop in `@kerfjs/ui/catalog`).
 *
 * It answers `GET …/__ux-review/project.json` with `{ projectDirectory }` on
 * the dev and preview servers. It imports nothing from Vite and never reaches
 * a browser bundle; a static build has no endpoint, so the link stays hidden.
 */
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Where the endpoint lives, relative to the catalog page. */
export const UX_REVIEW_PROJECT_PATH = '__ux-review/project.json';

/** The nearest directory at or above `start` that holds `.git`, else `start`. */
export function findProjectDirectory(start) {
  const from = resolve(start);
  for (let directory = from; ; directory = dirname(directory)) {
    if (existsSync(join(directory, '.git'))) return directory;
    if (dirname(directory) === directory) return from;
  }
}

/**
 * Serve the UX Review project directory to catalog pages. By default it is
 * the repository holding Vite's `root` (the nearest ancestor with `.git`, or
 * `root` itself); `projectDirectory` overrides it, resolved against `root`.
 */
export function uxReviewPlugin(options = {}) {
  let projectDirectory = '';
  const serve = (request, response, next) => {
    const path = (request.url ?? '').split(/[?#]/)[0];
    if (!path.endsWith(`/${UX_REVIEW_PROJECT_PATH}`)) {
      next();
      return;
    }
    if (request.method !== 'GET') {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET');
      response.end();
      return;
    }
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ projectDirectory }));
  };
  return {
    name: 'kerf-ux-review',
    configResolved(config) {
      projectDirectory = realpathSync(
        options.projectDirectory
          ? resolve(config.root, options.projectDirectory)
          : findProjectDirectory(config.root),
      );
    },
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
  };
}
