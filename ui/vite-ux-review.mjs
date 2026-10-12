/**
 * `@kerfjs/ui/vite-ux-review` — Node-only helpers that tell a local catalog
 * page which project it belongs to, so the catalog can offer a UX Review
 * "Capture region" link (see `wireCatalog`'s `onUxReviewProject` and the
 * Catalog's `uxReview` prop in `@kerfjs/ui/catalog`).
 *
 * The endpoint answers `GET …/__ux-review/project.json` with
 * `{ projectDirectory }`. `uxReviewPlugin()` mounts it on Vite's dev and
 * preview servers; an app that serves its catalog from its own backend mounts
 * `uxReviewProjectResponse()` (Fetch API servers) or `uxReviewMiddleware()`
 * (Node / connect servers) instead, on its development server only. Nothing
 * here imports Vite or reaches a browser bundle; a static build has no
 * endpoint, so the link stays hidden.
 */
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';

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
 * The real path of the UX Review project directory: `projectDirectory`
 * resolved against `root` when given, otherwise the repository holding `root`
 * (the nearest ancestor with `.git`, or `root` itself). `root` defaults to the
 * current working directory.
 */
export function resolveUxReviewProject({
  root = process.cwd(),
  projectDirectory,
} = {}) {
  return realpathSync(
    projectDirectory
      ? resolve(root, projectDirectory)
      : findProjectDirectory(root),
  );
}

const isEndpoint = (path) => path.endsWith(`/${UX_REVIEW_PROJECT_PATH}`);
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

/**
 * Answer a Fetch API request for the endpoint, at any base path: the project
 * JSON for a GET, 405 for another method, or `null` when the request is for
 * some other path so the server handles it as usual.
 */
export function uxReviewProjectResponse(request, projectDirectory) {
  if (!isEndpoint(new URL(request.url).pathname)) return null;
  if (request.method !== 'GET')
    return new globalThis.Response(null, {
      status: 405,
      headers: { Allow: 'GET' },
    });
  return new globalThis.Response(JSON.stringify({ projectDirectory }), {
    headers: JSON_HEADERS,
  });
}

/**
 * A Node / connect-style `(request, response, next)` handler for the
 * endpoint, at any base path; other requests go to `next`.
 */
export function uxReviewMiddleware(projectDirectory) {
  return (request, response, next) => {
    const path = (request.url ?? '').split(/[?#]/)[0];
    if (!isEndpoint(path)) {
      next();
      return;
    }
    if (request.method !== 'GET') {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET');
      response.end();
      return;
    }
    for (const [name, value] of Object.entries(JSON_HEADERS))
      response.setHeader(name, value);
    response.end(JSON.stringify({ projectDirectory }));
  };
}

/**
 * Serve the UX Review project directory to catalog pages on Vite's dev and
 * preview servers. By default it is the repository holding Vite's `root`;
 * `projectDirectory` overrides it, resolved against `root`.
 */
export function uxReviewPlugin(options = {}) {
  let handler = uxReviewMiddleware('');
  const serve = (request, response, next) => handler(request, response, next);
  return {
    name: 'kerf-ux-review',
    configResolved(config) {
      handler = uxReviewMiddleware(
        resolveUxReviewProject({
          root: config.root,
          projectDirectory: options.projectDirectory,
        }),
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
