#!/usr/bin/env node
// Build the runnable example artifacts the docs site serves.
//
// 1. Each complete app under src/examples/complete/<name>/ → public/run/<name>/.
//    The docs page for each app links to /kerf/run/<name>/ as 'Run live →'.
// 2. The seven-section reactivity demo (separate Vite project at
//    examples/reactivity-demo/) → public/demo/. Both `npm run site:dev` and
//    `npm run site:build` read public/demo and serve it at /kerf/demo/.
//
// The basic examples are NOT built here — they're inlined into their docs
// pages via per-example Astro wrapper components, bundled by Astro itself.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

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
];

async function buildCompleteApps() {
  const outDir = resolve(siteRoot, 'public/run');

  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Run each app as its own Vite build so the output preserves the per-app
  // directory shape (public/run/<name>/index.html + assets), and so each
  // app's resolution starts from the site root (where kerfjs is installed).
  for (const name of COMPLETE_APPS) {
    const appRoot = resolve(siteRoot, 'src/examples/complete', name);
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
  buildDemo();
}

main().catch((err) => {
  console.error('[build-examples] failed:', err);
  process.exit(1);
});
