#!/usr/bin/env node
// KF-165: Build each complete example app under `site/src/examples/complete/`
// to `tests/dist/example-apps/<name>/` with `base: './'` so the emitted HTML
// uses relative paths. This lets the Playwright webServer (which serves the
// repo root on port 5180) reach the apps at `/tests/dist/example-apps/<name>/`
// without the `/kerf/run/<name>/` prefix that production builds bake in.
//
// Kerfjs resolves from `site/node_modules/kerfjs` (a `file:..` symlink to the
// repo root), so this build naturally exercises the latest `dist/`.

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const siteRoot = resolve(repoRoot, 'site');
const outRoot = __dirname;

// Keep this list in sync with `site/scripts/build-examples.mjs` COMPLETE_APPS.
const COMPLETE_APPS = [
  'todomvc',
  'markdown-editor',
  'kanban',
  'chat',
  'dashboard',
  'pomodoro-ai',
];

async function buildOne(name) {
  const appRoot = resolve(siteRoot, 'src/examples/complete', name);
  const outDir = resolve(outRoot, name);
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  await build({
    root: appRoot,
    base: './',
    publicDir: false,
    esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
    cacheDir: resolve(siteRoot, `node_modules/.vite-test-examples/${name}`),
    resolve: { preserveSymlinks: false },
    build: { outDir, emptyOutDir: true },
    logLevel: 'warn',
  });
}

async function main() {
  for (const name of COMPLETE_APPS) await buildOne(name);
  console.log(`[example-apps] built ${COMPLETE_APPS.length} apps → tests/dist/example-apps/`);
}

main().catch((err) => { console.error(err); process.exit(1); });
