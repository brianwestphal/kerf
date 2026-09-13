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

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

export function demoInstallEnvironment(parentEnvironment = process.env) {
  const environment = { ...parentEnvironment };

  // Vite's programmatic build sets NODE_ENV=production on the host process.
  // npm treats that inherited value as `--omit=dev`, which would omit this
  // demo's own Vite and TypeScript packages. The explicit CLI include below is
  // the install contract; clearing inherited omit state makes it unambiguous
  // across npm versions.
  delete environment.NODE_ENV;
  delete environment.npm_config_omit;
  delete environment.NPM_CONFIG_OMIT;
  delete environment.npm_config_production;
  delete environment.NPM_CONFIG_PRODUCTION;

  return environment;
}

export function runDemoCommand(phase, command, args, options) {
  console.log(`[build-examples] ${phase}: ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw new Error(`${phase} could not start ${command}: ${result.error.message}`, { cause: result.error });
  }
  if (result.status !== 0) {
    const outcome = result.signal === null ? `exit ${result.status}` : `signal ${result.signal}`;
    throw new Error(`${phase} failed (${outcome}): ${[command, ...args].join(' ')}`);
  }
}

export function assertLocalDemoTool(demoSrc, packageName, binName = packageName) {
  const packagePath = resolve(demoSrc, 'node_modules', packageName, 'package.json');
  if (!existsSync(packagePath)) {
    throw new Error(`reactivity demo install did not provide local ${packageName} at ${packagePath}; refusing an ancestor node_modules fallback`);
  }
  const binPath = resolve(demoSrc, 'node_modules', '.bin', binName);
  if (!existsSync(binPath) && !existsSync(`${binPath}.cmd`)) {
    throw new Error(`reactivity demo install did not provide local ${binName} executable at ${binPath}; refusing an ancestor node_modules fallback`);
  }

  return JSON.parse(readFileSync(packagePath, 'utf8')).version;
}

function npmInvocation(environment) {
  const npmExecPath = environment.npm_execpath;
  return npmExecPath === undefined
    ? { command: 'npm', args: [] }
    : { command: process.execPath, args: [npmExecPath] };
}

export function installDemoDependencies(demoSrc, parentEnvironment = process.env) {
  const environment = demoInstallEnvironment(parentEnvironment);
  const npm = npmInvocation(environment);
  runDemoCommand(
    'installing reactivity demo dependencies',
    npm.command,
    [...npm.args, 'ci', '--include=dev', '--no-audit', '--no-fund'],
    { cwd: demoSrc, env: environment },
  );

  return {
    viteVersion: assertLocalDemoTool(demoSrc, 'vite', 'vite'),
    typescriptVersion: assertLocalDemoTool(demoSrc, 'typescript', 'tsc'),
  };
}

function buildDemo() {
  const demoSrc = resolve(repoRoot, 'examples/reactivity-demo');
  const demoDist = resolve(demoSrc, 'dist');
  const target = resolve(siteRoot, 'public/demo');
  const npm = npmInvocation(process.env);

  // Build the demo via its own Vite config (already set to base /kerf/demo/).
  const { viteVersion } = installDemoDependencies(demoSrc);
  console.log(`[build-examples] reactivity demo local toolchain: vite@${viteVersion}`);
  runDemoCommand(
    'building reactivity demo',
    npm.command,
    [...npm.args, 'run', 'build'],
    { cwd: demoSrc, env: { ...process.env, NODE_ENV: 'production' } },
  );

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

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[build-examples] failed:', err);
    process.exit(1);
  });
}
