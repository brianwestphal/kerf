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

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
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

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with ${result.status ?? result.signal} in ${cwd}`,
    );
  }
}

// node_modules is current when npm's hidden lockfile (written by every
// install) agrees with the package's own lockfile: every installed package is
// at the locked version, and every locked package is installed except
// optional ones (platform-specific binaries are legitimately absent). This
// compares contents rather than mtimes, which a fresh clone resets.
function depsAreCurrent(pkgDir) {
  const hiddenPath = resolve(pkgDir, 'node_modules/.package-lock.json');
  if (!existsSync(hiddenPath)) return false;
  const readPackages = (path) =>
    JSON.parse(readFileSync(path, 'utf8')).packages ?? {};
  const locked = readPackages(resolve(pkgDir, 'package-lock.json'));
  const installed = readPackages(hiddenPath);
  for (const [path, meta] of Object.entries(installed)) {
    if (locked[path]?.version !== meta.version) return false;
  }
  for (const [path, meta] of Object.entries(locked)) {
    if (path === '' || meta.optional || meta.link) continue;
    if (!installed[path]) return false;
  }
  return true;
}

function buildDemo() {
  const demoSrc = resolve(repoRoot, 'examples/reactivity-demo');
  const demoDist = resolve(demoSrc, 'dist');
  const target = resolve(siteRoot, 'public/demo');

  // Install only when needed, and lockfile-strict: `npm ci` never rewrites
  // package-lock.json, and a current install needs no network at all.
  if (!depsAreCurrent(demoSrc)) {
    console.log('[build-examples] installing reactivity-demo deps (npm ci)');
    run('npm', ['ci', '--no-audit', '--no-fund', '--silent'], demoSrc);
  }
  // Build the demo via its own Vite config (already set to base /kerf/demo/).
  run('npm', ['run', 'build', '--silent'], demoSrc);

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
