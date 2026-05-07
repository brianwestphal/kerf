import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'kerf',
  },
  server: {
    port: 5174,
  },
});
