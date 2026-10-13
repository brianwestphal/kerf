import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { uxReviewPlugin } from '@kerfjs/ui/vite-ux-review';
import { defineConfig } from 'vite';

import { computeDemoSourceFreshness } from '../scripts/lib/demo-source-freshness.mjs';
import remifyCss from '../scripts/remify-css.mjs';

const uiRoot = fileURLToPath(new URL('..', import.meta.url));
const browserEntryDirectory = fileURLToPath(
  new URL('../dist/browser/', import.meta.url),
);

function sourceStyle(file: string) {
  return fileURLToPath(new URL(`../src/${file}`, import.meta.url));
}

/** `src/<module>.tsx` or `src/<module>.ts`, whichever exists. */
function sourceModule(module: string): string | null {
  for (const extension of ['tsx', 'ts']) {
    const path = fileURLToPath(
      new URL(`../src/${module}.${extension}`, import.meta.url),
    );
    if (existsSync(path)) return path;
  }
  return null;
}

const packageExports = (
  JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as {
    exports: Record<string, string | { browser?: string; import?: string }>;
  }
).exports;

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Keep the standalone catalog relocatable when it is hosted below a preview or proxy path.
  base: './',
  plugins: [
    // The catalog's "Capture region" link: the same published plugin consumers use.
    uxReviewPlugin(),
    {
      // Dev server only: serve component JS from src so edits hot-reload
      // instead of waiting for a rebuild. Browser-condition entries still load
      // from dist/browser so their component-reachable CSS imports stay
      // exercised; only the JS module they re-export is redirected. Every other
      // @kerfjs/ui export maps to its src module too, so the page never mixes
      // src modules with dist chunks. Builds, previews, and tests use dist.
      name: 'kerf-ui-source-modules',
      apply: 'serve',
      enforce: 'pre',
      resolveId(source, importer) {
        const reexport = /^\.\.\/([a-z0-9-]+)\.js$/.exec(source);
        if (reexport && importer?.startsWith(browserEntryDirectory))
          return sourceModule(reexport[1]);

        const subpath = /^@kerfjs\/ui(\/[a-z0-9/-]+)?$/.exec(source);
        if (!subpath) return null;
        const target = packageExports[`.${subpath[1] ?? ''}`];
        if (typeof target !== 'object' || target.browser) return null;
        const built = /^\.\/dist\/([a-z0-9-]+)\.js$/.exec(target.import ?? '');
        return built ? sourceModule(built[1]) : null;
      },
    },
    {
      name: 'kerf-ui-source-freshness',
      async closeBundle() {
        const freshness = await computeDemoSourceFreshness(uiRoot);
        await writeFile(
          new URL('../dist-demo/source-freshness.json', import.meta.url),
          `${JSON.stringify(freshness, null, 2)}\n`,
        );
      },
    },
    {
      name: 'kerf-ui-source-styles',
      enforce: 'pre',
      resolveId(source, importer) {
        const publicStyle = /^@kerfjs\/ui\/([a-z0-9-]+\.css)$/.exec(source);
        if (publicStyle) return sourceStyle(publicStyle[1]);

        const browserStyle = /^\.\.\/styles\/([a-z0-9-]+\.css)$/.exec(source);
        if (browserStyle && importer?.startsWith(browserEntryDirectory))
          return sourceStyle(browserStyle[1]);
        return null;
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: /^kerfjs\/overlay$/,
        replacement: fileURLToPath(
          new URL('../../src/overlay.ts', import.meta.url),
        ),
      },
      {
        find: /^kerfjs\/actions$/,
        replacement: fileURLToPath(
          new URL('../../src/actions.ts', import.meta.url),
        ),
      },
      {
        find: /^kerfjs\/jsx-runtime$/,
        replacement: fileURLToPath(
          new URL('../../src/jsx-runtime.ts', import.meta.url),
        ),
      },
      {
        find: /^kerfjs$/,
        replacement: fileURLToPath(
          new URL('../../src/index.ts', import.meta.url),
        ),
      },
    ],
  },
  css: { postcss: { plugins: [remifyCss()] } },
  server: {
    host: '127.0.0.1',
    port: 42817,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] },
  },
  preview: { host: '127.0.0.1', port: 42817, strictPort: true },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: { output: { manualChunks: startupChunks() } },
  },
});

type ModuleGraph = {
  getModuleIds(): IterableIterator<string>;
  getModuleInfo(id: string): {
    isEntry: boolean;
    importedIds: readonly string[];
  } | null;
};

/**
 * Split the startup code out of the entry chunk into chunks that still load
 * eagerly with the page (`modulepreload`), so behavior and load order are
 * unchanged; the split only keeps every chunk far from the demo's
 * largest-chunk budget (`demo-bundle-budget.json`).
 *
 * - `vendor`: third-party code (Web Awesome and its Lit/Floating UI runtime,
 *   pulled in eagerly by the select and popup-menu `register` subpaths).
 * - `kerf`: the published code the catalog demonstrates — the built
 *   `@kerfjs/ui` modules and the kerf core the aliases point at — plus every
 *   startup stylesheet. A chunk carries the CSS of the modules in it, so
 *   collecting all startup CSS modules in one chunk keeps the stylesheet
 *   whole and its cascade order exactly as a single-chunk build emits it;
 *   putting them beside the library modules that import most of them keeps
 *   the chunk graph acyclic (`catalog` imports `kerf`, never the reverse).
 * - `catalog`: the catalog's own demo and shell modules.
 *
 * Only modules statically reachable from the entry qualify: a dependency used
 * solely by a lazily imported chunk (the Web Awesome component demos, the
 * recipes) stays with that chunk instead of being hoisted into startup.
 */
function startupChunks() {
  let startup: Set<string> | undefined;
  return (id: string, graph: ModuleGraph): string | undefined => {
    startup ??= staticallyReachableFromEntries(graph);
    if (!startup.has(id) || graph.getModuleInfo(id)?.isEntry) return undefined;
    if (/\.css(?:\?|$)/.test(id)) return 'kerf';
    if (id.includes('/node_modules/')) return 'vendor';
    if (
      id.startsWith(builtPackageDirectory) ||
      id.startsWith(coreSourceDirectory)
    )
      return 'kerf';
    if (id.startsWith(catalogSourceDirectory)) return 'catalog';
    return undefined;
  };
}

const builtPackageDirectory = fileURLToPath(
  new URL('../dist/', import.meta.url),
);
const coreSourceDirectory = fileURLToPath(
  new URL('../../src/', import.meta.url),
);
const catalogSourceDirectory = fileURLToPath(new URL('.', import.meta.url));

function staticallyReachableFromEntries(graph: ModuleGraph): Set<string> {
  const pending = [...graph.getModuleIds()].filter(
    (id) => graph.getModuleInfo(id)?.isEntry,
  );
  const reached = new Set(pending);
  while (pending.length > 0) {
    const info = graph.getModuleInfo(pending.pop()!);
    for (const imported of info?.importedIds ?? []) {
      if (reached.has(imported)) continue;
      reached.add(imported);
      pending.push(imported);
    }
  }
  return reached;
}
