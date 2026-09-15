import { defineConfig, devices } from '@playwright/test';

// Playwright forces color in its web-server and worker children. Translate
// NO_COLOR before those processes are spawned so Node does not warn about the
// conflicting variables; an explicit FORCE_COLOR still wins.
if (process.env.NO_COLOR !== undefined) {
  const forceColor = process.env.FORCE_COLOR;
  delete process.env.NO_COLOR;
  process.env.FORCE_COLOR = forceColor ?? '0';
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4322/kerf/',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview:visual',
    port: 4322,
    // This gate audits the dist/ output built by pretest:visual. Reusing an
    // arbitrary process on this port could silently validate stale content.
    reuseExistingServer: false,
  },
});
