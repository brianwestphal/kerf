import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for kerf real-browser tests (`tests/browser/`).
 *
 * Real-browser tests cover scenarios that happy-dom can't exercise truthfully:
 * SVG/MathML namespacing, IME composition, MutationObserver mutation counts,
 * and stateful element behaviour on real engines (KF-78, KF-79, KF-83).
 *
 * The tests run against a static fixture page served by Playwright's
 * `webServer`. Run with `npm run test:browser`.
 */
export default defineConfig({
  testDir: './tests/browser',
  globalSetup: './tests/browser/global-setup.mjs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5180',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    // Serve from the repo root so the fixture page can pull `dist/` and
    // `node_modules/@preact/signals-core/dist/signals-core.mjs` via importmap.
    command: 'npx http-server . -p 5180 -c-1 --silent',
    port: 5180,
    reuseExistingServer: !process.env.CI,
  },
});
