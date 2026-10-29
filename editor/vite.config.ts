import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { editorFileMiddleware } from '../ui/vite-editor.mjs';
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
  // Bind IPv4 explicitly: on Linux CI `localhost` can resolve to ::1 only,
  // which Playwright's 127.0.0.1 readiness probe never reaches.
  server: {
    host: '127.0.0.1',
    port: 42917,
    strictPort: true,
    fs: { allow: [repo] },
  },
  // The editor bundles every Lucide icon so documents can name any of them.
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4096 },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
  },
});
