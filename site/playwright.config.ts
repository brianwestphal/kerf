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

// The preview server's port (see scripts/serve-visual-preview.mjs, which reads
// the same variable). Give each parallel worktree its own, for example
// `KERF_SITE_PLAYWRIGHT_PORT=4323 npm run test:visual`.
const port = Number(process.env.KERF_SITE_PLAYWRIGHT_PORT || 4322);

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}/kerf/`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview:visual',
    port,
    // This gate audits the dist/ output built by pretest:visual. Reusing an
    // arbitrary process on this port could silently validate stale content.
    reuseExistingServer: false,
  },
});
