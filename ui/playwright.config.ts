import { getPriority, setPriority } from 'node:os';
import { defineConfig } from '@playwright/test';

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

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
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
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
