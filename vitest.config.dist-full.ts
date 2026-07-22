/**
 * vitest config that runs the full unit + integration suite against the
 * BUILT `dist/` output instead of `src/`. This is the end-to-end coverage
 * net asked for in KF-16: it proves that the exact bytes we publish pass
 * every test we have, not just the source the bytes were derived from.
 *
 * How it works: a tiny resolve plugin rewrites `../../src/<name>.js`
 * imports to the equivalent dist entry point, picking the right dist
 * file for each module name:
 *   - `jsx-runtime.js`  → `dist/jsx-runtime.js`
 *   - `testing.js`       → `dist/testing.js`
 *   - everything else    → `dist/index.js` (the public barrel)
 *
 * Every test imports kerf via these public entries, so this remap is
 * sufficient — no test reaches into private internals. If a future test
 * does import a non-public helper, the resolver throws below so the gap
 * is loud rather than silent.
 *
 * Run via `npm run test:dist:full` (which builds first).
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, 'dist');
const SRC = resolve(HERE, 'src');

// Modules whose dist home is NOT `dist/index.js`.
const SUBPATH_ENTRIES: Record<string, string> = {
  'jsx-runtime': resolve(DIST, 'jsx-runtime.js'),
  testing: resolve(DIST, 'testing.js'),
  'array-signal': resolve(DIST, 'array-signal.js'),
  html: resolve(DIST, 'html.js'),
};

export function srcToDistPlugin(): Plugin {
  return {
    name: 'kerf-src-to-dist',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null;
      // Only intercept relative source-tree imports written like
      // `../../src/<name>.js`. Anything else (node_modules, vitest
      // internals, etc.) passes straight through.
      if (!source.endsWith('.js')) return null;
      const resolved = resolve(dirname(importer), source);
      if (!resolved.startsWith(`${SRC}/`) && resolved !== SRC) return null;

      const moduleName = resolved
        .slice(SRC.length + 1)        // strip leading "src/"
        .replace(/\.js$/, '');         // strip .js

      // Skip internal helpers — they have no public dist entry, and
      // the test suite shouldn't be reaching them in the first place.
      // If this fires, the test imports something not exposed by the
      // published package and dist-full mode can't honestly verify it.
      //
      // `moduleName` has NO leading slash (it's `src/`-relative, e.g.
      // `utils/syncFormProp`), so an `.includes('/utils/')` check never
      // matches the top-level `src/utils/*` case. Match `utils/` at the
      // start for those, keep the bare-directory (`utils`) import, and
      // still catch any hypothetical nested `.../utils/*` dir.
      if (
        moduleName === 'utils'
        || moduleName.startsWith('utils/')
        || moduleName.includes('/utils/')
      ) {
        throw new Error(
          `dist-full mode: refused to remap private helper "${source}" `
          + `imported by ${importer}. Tests run against dist must use `
          + `the public API surface only. Move this assertion to a `
          + `src-only test, or expose the helper.`,
        );
      }

      const target = SUBPATH_ENTRIES[moduleName] ?? resolve(DIST, 'index.js');
      if (!existsSync(target)) {
        throw new Error(
          `dist-full mode: ${target} not found. Run 'npm run build' first.`,
        );
      }
      return target;
    },
  };
}

export default defineConfig({
  plugins: [srcToDistPlugin()],
  test: {
    environment: 'happy-dom',
    globals: false,
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    // Default exclude blocks `**/dist/**`. We need the include glob to
    // match files we actually have (under `tests/unit/` and
    // `tests/integration/`), so the default is fine — but we explicitly
    // exclude `tests/dist/**` because those tests already target dist
    // directly and would double-up here.
    //
    // `*.internal.test.ts` files exercise non-public modules (e.g.
    // `src/segment.ts`, `src/diff.ts`) whose helpers aren't in the
    // published barrel. dist-full mode can't honestly verify them
    // (the dist surface doesn't expose them), so they're src-only.
    exclude: ['**/node_modules/**', 'tests/dist/**', '**/*.internal.test.ts'],
  },
});
