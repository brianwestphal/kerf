#!/usr/bin/env node
// One-off build helper for KF-244: build each complete example app with a
// per-app absolute base into a single shared serve root so a static file
// server can host them all at `http://host/<name>/` and domotion-svg can
// capture animated demos from them. Not part of the regular build — invoked
// manually when regenerating the demo SVGs in site/public/demos/.

import { rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');

const COMPLETE_APPS = [
  'todomvc',
  'markdown-editor',
  'kanban',
  'chat',
  'dashboard',
  'cart-htmx',
  'counter-store',
];

const outRoot = process.argv[2] || '/tmp/claude/kerf-demos';

async function buildOne(name) {
  const appRoot = resolve(siteRoot, 'src/examples/complete', name);
  const outDir = resolve(outRoot, name);
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  await build({
    root: appRoot,
    base: `/${name}/`,
    publicDir: false,
    esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
    cacheDir: resolve(siteRoot, `node_modules/.vite-demos/${name}`),
    resolve: { preserveSymlinks: false },
    build: { outDir, emptyOutDir: true },
    logLevel: 'warn',
  });
  console.log(`[demos] built ${name} → ${outDir}`);
}

async function main() {
  mkdirSync(outRoot, { recursive: true });
  for (const name of COMPLETE_APPS) await buildOne(name);
  console.log(`[demos] built ${COMPLETE_APPS.length} apps → ${outRoot}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
