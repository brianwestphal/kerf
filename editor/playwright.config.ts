import { defineConfig } from '@playwright/test';

import { guardWebkitRun } from '../scripts/playwright-webkit-guard.mjs';
import { EDITOR_URL, FIXTURE_EDITOR_URL } from './ports.js';

const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
// KF-YN8JNT: refuse a local repeated WebKit run, and warn on any local
// WebKit run, until a machine-wide browser slot pool exists.
guardWebkitRun([...BROWSERS]);

export default defineConfig({
  testDir: './tests/browser',
  // KF-PW9DA7: every build starts from a new document, so tests run in
  // parallel across workers (the demo-builds group files hold hundreds);
  // CI runs one engine per job.
  fullyParallel: true,
  // CI runners are slower than a developer machine; a build's step-by-step
  // drive needs twice the default there (test.slow() still triples it).
  workers: process.env.CI ? 3 : 2,
  timeout: process.env.CI ? 60_000 : 30_000,
  reporter: [['list']],
  use: {
    baseURL: EDITOR_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run build && npm run preview',
      url: EDITOR_URL,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    // An application's dev server hosting the editor through
    // `@kerfjs/ui/vite-editor` (KF-6GT5QY: editor host).
    {
      command: 'npx vite --config fixtures/app/vite.config.ts',
      url: FIXTURE_EDITOR_URL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: BROWSERS.map((browserName) => ({
    name: browserName,
    use: { browserName },
  })),
});
