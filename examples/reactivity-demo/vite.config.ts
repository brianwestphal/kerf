import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kerf/',
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'kerfjs',
  },
  server: {
    port: 5174,
  },
});
