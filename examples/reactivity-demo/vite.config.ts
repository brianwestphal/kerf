import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kerf/',
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'kerf',
  },
  server: {
    port: 5174,
  },
});
