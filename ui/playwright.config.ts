import { getPriority, setPriority } from 'node:os';
import { defineConfig } from '@playwright/test';

import { guardWebkitRun } from '../scripts/playwright-webkit-guard.mjs';
import { createFirefoxAppData } from './evaluator/firefox-app-data.mjs';

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

const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
// KF-YN8JNT: refuse a local repeated WebKit run, and warn on any local
// WebKit run, until a machine-wide browser slot pool exists.
guardWebkitRun([...BROWSERS]);

const firefoxAppData = createFirefoxAppData();

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  // The full three-engine local run can starve visual tests at Playwright's
  // five-worker default. Match the two-worker CI browser jobs.
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:42817',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run test:e2e:serve',
    url: 'http://127.0.0.1:42817',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: BROWSERS.map((browserName) => ({
    name: browserName,
    use: {
      browserName,
      ...(browserName === 'firefox'
        ? { launchOptions: { env: firefoxAppData.env } }
        : {}),
    },
  })),
});
