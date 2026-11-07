import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { editorFileMiddleware } from '../ui/vite-editor.mjs';
import { EDITOR_PORT, HOST } from './ports.js';
import { kerfAliases, kerfUi, repo } from './vite.workspace.js';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [
    kerfUi(),
    // KF-0SY9M6: the editor autosaves through the dev (and preview) server.
    {
      name: 'kerf-ui-editor-files',
      configureServer(server) {
        server.middlewares.use(editorFileMiddleware(server.config.root));
      },
      configurePreviewServer(server) {
        server.middlewares.use(editorFileMiddleware(server.config.root));
      },
    },
  ],
  resolve: { alias: kerfAliases },
  esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
  server: {
    host: HOST,
    port: EDITOR_PORT,
    strictPort: true,
    fs: { allow: [repo] },
  },
  preview: { host: HOST, port: EDITOR_PORT, strictPort: true },
  // The editor bundles every Lucide icon so documents can name any of them.
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4096 },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
  },
});
