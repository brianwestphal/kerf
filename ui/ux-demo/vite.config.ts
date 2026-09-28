import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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
    rollupOptions: { output: { manualChunks: startupVendorChunk() } },
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
 * Split the third-party code the catalog loads at startup (Web Awesome and its
 * Lit/Floating UI runtime, pulled in eagerly by the select and popup-menu
 * `register` subpaths) out of the entry chunk into a `vendor` chunk. Both still
 * load eagerly with the page, so behavior and load order are unchanged; the
 * split only keeps either chunk far from the demo's largest-chunk budget
 * (`demo-bundle-budget.json`). Only modules statically reachable from the entry
 * qualify: a dependency used solely by a lazily imported chunk (the Web
 * Awesome component demos, the recipes) stays with that chunk instead of
 * being hoisted into startup.
 */
function startupVendorChunk() {
  let startup: Set<string> | undefined;
  return (id: string, graph: ModuleGraph): string | undefined => {
    if (!id.includes('/node_modules/')) return undefined;
    startup ??= staticallyReachableFromEntries(graph);
    return startup.has(id) ? 'vendor' : undefined;
  };
}

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
