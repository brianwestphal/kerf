import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kerf/demo/',
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'kerfjs',
  },
  server: {
    port: 5174,
  },
});
