/**
 * Bundle the consumer-app against the repo's `dist/` build the same way a
 * downstream `npm install kerfjs` consumer would: `import 'kerfjs'` resolves
 * via Node's normal resolution to the repo's own package.json, which points
 * at `dist/index.js`. esbuild's JSX transform uses `kerfjs/jsx-runtime` per
 * the `jsxImportSource` setting — exactly what `tsconfig.json:jsx="react-jsx"`
 * + `jsxImportSource:"kerfjs"` produces in a real consumer.
 *
 * Run via `node tests/dist/consumer-app/build.mjs` or `npm run test:browser`
 * (which invokes this before Playwright starts).
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

await build({
  entryPoints: [resolve(here, 'src/main.tsx')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  sourcemap: 'inline',
  outfile: resolve(here, 'dist/main.js'),
  jsx: 'automatic',
  jsxImportSource: 'kerfjs',
  // No `external: [...]` — bundle kerfjs in like a Vite/esbuild app build
  // would, so the Playwright spec exercises the same byte-for-byte runtime
  // a downstream user ships. The repo's own `package.json` provides the
  // `kerfjs` resolution because esbuild walks up from the entry point.
  absWorkingDir: repoRoot,
  logLevel: 'info',
});
