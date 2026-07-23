// Shared copy step for the no-build example app (live-poll).
//
// Unlike the other complete apps, the no-build app is NOT built by Vite — its
// whole point is that the source is what ships. "Building" it means copying
// three things into the output directory:
//
//   1. the app's own files (index.html + main.js), verbatim;
//   2. the repo's built `dist/` → `<out>/vendor/kerfjs/` (the importmap in
//      index.html maps `kerfjs` / `kerfjs/html` to these files; dist's
//      chunk imports are relative, so a plain copy keeps them working);
//   3. `@preact/signals-core`'s ESM build → `<out>/vendor/signals-core.mjs`
//      (dist keeps signals-core external, so the importmap must resolve it).
//
// Every path inside the app is relative, so the same copied output serves
// correctly under any base (/kerf/run/<name>/, /<name>/, or ./ for tests).
// Used by site/scripts/build-examples.mjs, site/scripts/build-demos-for-capture.mjs,
// and tests/dist/example-apps/build.mjs — keep those three in sync via this one
// helper.

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

export const NO_BUILD_APPS = new Set(['live-poll']);

/**
 * Copy the no-build app at `appRoot` into `outDir`, vendoring kerf's built
 * dist + signals-core so the page's importmap resolves.
 *
 * @param {string} appRoot  site/src/examples/complete/<name>
 * @param {string} outDir   destination directory (created/emptied)
 * @param {string} repoRoot repository root (locates dist/ + node_modules)
 */
export function copyNoBuildApp(appRoot, outDir, repoRoot) {
  const dist = resolve(repoRoot, 'dist');
  if (!existsSync(resolve(dist, 'index.js')) || !existsSync(resolve(dist, 'html.js'))) {
    throw new Error(
      `[copy-no-build-app] built dist/ not found at ${dist} — run \`npm run build\` first`,
    );
  }
  const signalsCore = resolve(repoRoot, 'node_modules/@preact/signals-core/dist/signals-core.mjs');
  if (!existsSync(signalsCore)) {
    throw new Error(`[copy-no-build-app] signals-core ESM build not found at ${signalsCore}`);
  }

  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  cpSync(appRoot, outDir, { recursive: true });
  cpSync(dist, resolve(outDir, 'vendor/kerfjs'), { recursive: true });
  cpSync(signalsCore, resolve(outDir, 'vendor/signals-core.mjs'));
}
