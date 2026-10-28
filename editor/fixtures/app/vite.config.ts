// An application with one component of its own (OrderCard) whose dev server
// hosts the Kerf UI editor through `@kerfjs/ui/vite-editor` (KF-6GT5QY).
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import { kerfUiEditor } from '../../../ui/vite-editor.mjs';
import { kerfAliases, kerfUi, repo } from '../../vite.workspace.js';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [kerfUi(), kerfUiEditor()],
  resolve: { alias: kerfAliases },
  esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
  server: {
    host: '127.0.0.1',
    port: 42918,
    strictPort: true,
    fs: { allow: [repo] },
  },
});
