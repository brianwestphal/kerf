#!/usr/bin/env node
// Build the runnable example artifacts the docs site serves.
//
// 1. Each complete app under src/examples/complete/<name>/ → public/run/<name>/.
//    The docs page for each app links to /kerf/run/<name>/ as 'Run live →'.
// 2. The seven-section reactivity demo (separate Vite project at
//    examples/reactivity-demo/) → public/demo/. Both `npm run site:dev` and
//    `npm run site:build` read public/demo and serve it at /kerf/demo/.
//
// Basic examples are emitted as isolated pages under run/basics/. The docs
// generator embeds them in responsive iframes so each example keeps an
// independent #app root and lifecycle across client-side page navigation.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

import { copyNoBuildApp, NO_BUILD_APPS } from './lib/copy-no-build-app.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');
const repoRoot = resolve(siteRoot, '..');

const COMPLETE_APPS = [
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
];

const BASIC_APPS = [
  '01-counter',
  '02-computed-totals',
  '03-store',
  '04-mount-delegate',
  '05-keyed-list',
  '06-capture-delegate',
  '07-morph-skip',
  '08-svg-toelement',
  '09-raw-sanitize',
];

async function buildBasicApps() {
  const outRoot = resolve(siteRoot, 'public/run/basics');
  if (existsSync(outRoot)) rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });

  for (const name of BASIC_APPS) {
    const appRoot = resolve(siteRoot, 'src/examples/basics', name);
    const outDir = resolve(outRoot, name);
    await build({
      root: appRoot,
      base: `/kerf/run/basics/${name}/`,
      publicDir: false,
      esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
      build: {
        outDir,
        emptyOutDir: true,
        lib: { entry: resolve(appRoot, 'main.tsx'), formats: ['es'] },
        rollupOptions: { output: { entryFileNames: 'app.js' } },
      },
      logLevel: 'warn',
    });
    writeFileSync(resolve(outDir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/kerf/assets/site.css"></head><body class="basic-example-body"><div id="app" class="kerf-live-example"></div><script type="module" src="./app.js"></script></body></html>`);
  }
  console.log(`[build-examples] built ${BASIC_APPS.length} basic apps → public/run/basics/`);
}

async function buildCompleteApps() {
  const outDir = resolve(siteRoot, 'public/run');

  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Run each app as its own Vite build so the output preserves the per-app
  // directory shape (public/run/<name>/index.html + assets), and so each
  // app's resolution starts from the site root (where kerfjs is installed).
  for (const name of COMPLETE_APPS) {
    const appRoot = resolve(siteRoot, 'src/examples/complete', name);
    if (NO_BUILD_APPS.has(name)) {
      // The no-build app ships its source verbatim + a vendored kerf dist —
      // no Vite involved (that's its whole story). Relative paths only, so
      // it serves correctly under /kerf/run/<name>/ without a base rewrite.
      copyNoBuildApp(appRoot, resolve(outDir, name), repoRoot);
      continue;
    }
    await build({
      root: appRoot,
      base: `/kerf/run/${name}/`,
      publicDir: false,
      esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
      cacheDir: resolve(siteRoot, `node_modules/.vite-examples/${name}`),
      resolve: {
        // Anchor module resolution at the site root so kerfjs (file:../..) and
        // marked / dompurify resolve from site/node_modules.
        preserveSymlinks: false,
      },
      build: {
        outDir: resolve(outDir, name),
        emptyOutDir: true,
      },
      logLevel: 'warn',
    });
  }

  console.log(`[build-examples] built ${COMPLETE_APPS.length} complete apps → public/run/`);
}

function buildDemo() {
  const demoSrc = resolve(repoRoot, 'examples/reactivity-demo');
  const demoDist = resolve(demoSrc, 'dist');
  const target = resolve(siteRoot, 'public/demo');

  // Build the demo via its own Vite config (already set to base /kerf/demo/).
  execSync('npm install --no-audit --no-fund --silent', { cwd: demoSrc, stdio: 'inherit' });
  execSync('npm run build --silent', { cwd: demoSrc, stdio: 'inherit' });

  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(demoDist, target, { recursive: true });

  console.log('[build-examples] copied reactivity-demo → public/demo/');
}

async function main() {
  await buildCompleteApps();
  await buildBasicApps();
  buildDemo();
}

main().catch((err) => {
  console.error('[build-examples] failed:', err);
  process.exit(1);
});
