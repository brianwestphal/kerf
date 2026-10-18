import { getPriority, setPriority } from 'node:os';
import { defineConfig, devices } from '@playwright/test';

// Run local Playwright at a lower CPU priority so several parallel suites can't starve the
// machine; its workers, browsers, and web server inherit it. PLAYWRIGHT_NICE overrides the
// default of 10 (0 opts out), and CI keeps its priority unless overridden.
{
  const requested = Number.parseInt(process.env.PLAYWRIGHT_NICE ?? '', 10);
  if ((process.env.CI ?? '') === '' || Number.isFinite(requested)) {
    const target = Math.min(19, Number.isFinite(requested) ? requested : 10);
    try {
      if (target > getPriority()) setPriority(target);
    } catch {
      // Unsupported platform or permission: keep the inherited priority.
    }
  }
}

// Playwright forces color in its web-server and worker children. Translate
// NO_COLOR before those processes are spawned so Node does not warn about the
// conflicting variables; an explicit FORCE_COLOR still wins.
if (process.env.NO_COLOR !== undefined) {
  const forceColor = process.env.FORCE_COLOR;
  delete process.env.NO_COLOR;
  process.env.FORCE_COLOR = forceColor ?? '0';
}

/**
 * Playwright configuration for kerf real-browser tests (`tests/browser/`).
 *
 * Real-browser tests cover scenarios that happy-dom can't exercise truthfully:
 * SVG/MathML namespacing, IME composition, MutationObserver mutation counts,
 * and stateful element behavior on real engines (KF-78, KF-79, KF-83).
 *
 * The tests run against a static fixture page served by Playwright's
 * `webServer`. Run with `npm run test:browser`.
 *
 * The fixture server listens on `KERF_PLAYWRIGHT_PORT` (default 5180), and
 * Playwright starts its own server for every run: an existing server on that
 * port is reused only with `KERF_PLAYWRIGHT_REUSE_SERVER=1`. Reusing by
 * default let parallel worktrees silently run their tests against another
 * checkout's server (and `dist/`); now a busy port fails the run instead. Give
 * each parallel worktree its own port, for example
 * `KERF_PLAYWRIGHT_PORT=5181 npm run test:browser`.
 */
const port = Number(process.env.KERF_PLAYWRIGHT_PORT || 5180);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(
    `KERF_PLAYWRIGHT_PORT must be a TCP port number, got "${process.env.KERF_PLAYWRIGHT_PORT}"`,
  );
}

export default defineConfig({
  testDir: './tests/browser',
  globalSetup: './tests/browser/global-setup.mjs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
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
    command: `npx http-server . -p ${port} -c-1 --silent`,
    port,
    reuseExistingServer: process.env.KERF_PLAYWRIGHT_REUSE_SERVER === '1',
  },
});
