// The one list of complete example apps, plus the one way to build them.
//
// Every app under site/src/examples/complete/<name>/ is built by three
// scripts that differ only in where the output goes and which base URL it is
// served under:
//
//   - site/scripts/build-examples.mjs          → site/public/run/<name>/, base /kerf/run/<name>/
//   - site/scripts/build-demos-for-capture.mjs → <serve root>/<name>/,   base /<name>/
//   - tests/dist/example-apps/build.mjs        → tests/dist/example-apps/<name>/, base ./
//
// The capture shell script (site/scripts/demo-captures/capture-demos.sh), the
// docs-examples gate (scripts/check-docs-examples.mjs), and the site's
// complete-apps grid read COMPLETE_APPS from here too, so adding an app is
// one edit.
//
// This module imports only Node built-ins at the top level: Vite is loaded
// lazily inside buildCompleteApp(), so callers can import the list before
// site dependencies are installed (the test build installs them first).

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyNoBuildApp, NO_BUILD_APPS } from './copy-no-build-app.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = resolve(siteRoot, '..');

/** Complete example app directory names, in display and build order. */
export const COMPLETE_APPS = /** @type {const} */ ([
  'todomvc',
  'markdown-editor',
  'kanban',
  'chat',
  'dashboard',
  'cart-htmx',
  'counter-store',
  'row-selector',
  'live-poll',
  'virtual-list',
  'router',
]);

/**
 * Build one complete app into `outDir`. Vite apps are bundled with the shared
 * options below; the no-build app is copied verbatim with a vendored kerf dist
 * (its paths are relative, so `base` does not apply to it).
 *
 * @param {string} name     an entry of COMPLETE_APPS
 * @param {{ base: string, outDir: string, cacheDir: string }} options
 *   `base` is the public URL prefix, `outDir` the destination (emptied first),
 *   and `cacheDir` a per-caller Vite cache directory.
 * @returns {Promise<void>}
 */
export async function buildCompleteApp(name, { base, outDir, cacheDir }) {
  const appRoot = resolve(siteRoot, 'src/examples/complete', name);
  if (NO_BUILD_APPS.has(name)) {
    copyNoBuildApp(appRoot, outDir, repoRoot);
    return;
  }
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const { build } = await import('vite');
  await build({
    root: appRoot,
    base,
    publicDir: false,
    esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
    cacheDir,
    // Resolve kerfjs (a file: link to the repo root) and the apps' other
    // dependencies from site/node_modules.
    resolve: { preserveSymlinks: false },
    // outDir was emptied above. Saying so explicitly also silences Vite's
    // "outDir is not inside project root" warning.
    build: { outDir, emptyOutDir: false },
    logLevel: 'warn',
  });
}
