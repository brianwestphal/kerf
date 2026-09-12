import { resolve } from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kerf/',
  publicDir: false,
  esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
  build: {
    emptyOutDir: true,
    lib: { entry: resolve(import.meta.dirname, 'src/scripts/site.tsx'), formats: ['es'], cssFileName: 'site' },
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/site.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
