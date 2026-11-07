#!/usr/bin/env node
// Build the runnable example artifacts the docs site serves.
//
// 1. Each complete app under src/examples/complete/<name>/ → public/run/<name>/.
//    The docs page for each app links to /kerf/run/<name>/ as 'Run live →'.
// 2. The nine-section reactivity demo (separate Vite project at
//    examples/reactivity-demo/) → public/demo/. Both `npm run site:dev` and
//    `npm run site:build` read public/demo and serve it at /kerf/demo/.
//
// The basic examples are NOT built here — they're inlined into their docs
// pages via per-example Astro wrapper components, bundled by Astro itself.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompleteApp, COMPLETE_APPS } from './lib/complete-apps.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');
const repoRoot = resolve(siteRoot, '..');

async function buildCompleteApps() {
  const outDir = resolve(siteRoot, 'public/run');

  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Run each app as its own build so the output preserves the per-app
  // directory shape (public/run/<name>/index.html + assets).
  for (const name of COMPLETE_APPS) {
    await buildCompleteApp(name, {
      base: `/kerf/run/${name}/`,
      outDir: resolve(outDir, name),
      cacheDir: resolve(siteRoot, `node_modules/.vite-examples/${name}`),
    });
  }

  console.log(
    `[build-examples] built ${COMPLETE_APPS.length} complete apps → public/run/`,
  );
}

function buildDemo() {
  const demoSrc = resolve(repoRoot, 'examples/reactivity-demo');
  const demoDist = resolve(demoSrc, 'dist');
  const target = resolve(siteRoot, 'public/demo');

  // Build the demo via its own Vite config (already set to base /kerf/demo/).
  execSync('npm install --no-audit --no-fund --silent', {
    cwd: demoSrc,
    stdio: 'inherit',
  });
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
