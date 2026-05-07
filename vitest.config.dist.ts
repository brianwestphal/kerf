/**
 * Separate vitest config for tests that exercise the built `dist/` output.
 *
 * These tests run against the *published* bundles (`dist/index.js`,
 * `dist/jsx-runtime.js`, `dist/testing.js`) rather than the source. They
 * catch regressions like KF-14 — the kind of bug that only manifests after
 * tsup bundles each entry point separately.
 *
 * Run via `npm run test:dist` (which builds first).
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/dist/**/*.test.ts'],
    // Default exclude has `**/dist/**` which would skip our tests directory.
    // Override with just node_modules.
    exclude: ['**/node_modules/**'],
    // No coverage thresholds here — these are smoke tests against built
    // artefacts, not source coverage.
  },
});
