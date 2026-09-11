import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      { find: /^kerfjs\/actions$/, replacement: fileURLToPath(new URL('../../src/actions.ts', import.meta.url)) },
      { find: /^kerfjs\/jsx-runtime$/, replacement: fileURLToPath(new URL('../../src/jsx-runtime.ts', import.meta.url)) },
      { find: /^kerfjs$/, replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)) },
    ],
  },
  server: { host: '127.0.0.1', port: 42817, strictPort: true },
  preview: { host: '127.0.0.1', port: 42817, strictPort: true },
  build: { outDir: '../dist-demo', emptyOutDir: true },
});
