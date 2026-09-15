import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import remifyCss from '../scripts/remify-css.mjs';

const browserEntryDirectory = fileURLToPath(new URL('../dist/browser/', import.meta.url));

function sourceStyle(file: string) {
  return fileURLToPath(new URL(`../src/${file}`, import.meta.url));
}

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Keep the standalone catalog relocatable when it is hosted below a preview or proxy path.
  base: './',
  plugins: [{
    name: 'kerf-ui-source-styles',
    enforce: 'pre',
    resolveId(source, importer) {
      const publicStyle = /^@kerfjs\/ui\/([a-z0-9-]+\.css)$/.exec(source);
      if (publicStyle) return sourceStyle(publicStyle[1]);

      const browserStyle = /^\.\.\/styles\/([a-z0-9-]+\.css)$/.exec(source);
      if (browserStyle && importer?.startsWith(browserEntryDirectory)) return sourceStyle(browserStyle[1]);
      return null;
    },
  }],
  resolve: {
    alias: [
      { find: /^kerfjs\/actions$/, replacement: fileURLToPath(new URL('../../src/actions.ts', import.meta.url)) },
      { find: /^kerfjs\/jsx-runtime$/, replacement: fileURLToPath(new URL('../../src/jsx-runtime.ts', import.meta.url)) },
      { find: /^kerfjs$/, replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)) },
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
  },
});
