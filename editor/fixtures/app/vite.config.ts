// An application with one component of its own (OrderCard) whose dev server
// hosts the Kerf UI editor through `@kerfjs/ui/vite-editor` (KF-6GT5QY).
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import { kerfUiEditor } from '../../../ui/vite-editor.mjs';
import { FIXTURE_APP_PORT, HOST } from '../../ports.js';
import { kerfAliases, kerfUi, repo } from '../../vite.workspace.js';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
    kerfUi(),
    kerfUiEditor({
      fieldEditors: 'src/kerf-ui-field-editors.tsx',
      // KF-RF6RCS: play mode's mock action handlers.
      playHandlers: 'src/kerf-ui-play-handlers.ts',
    }),
  ],
  resolve: { alias: kerfAliases },
  esbuild: { jsx: 'automatic', jsxImportSource: 'kerfjs' },
  server: {
    host: HOST,
    port: FIXTURE_APP_PORT,
    strictPort: true,
    fs: { allow: [repo] },
  },
});
