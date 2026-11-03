import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  // KF-PW9DA7: every build starts from a new document, so tests run in
  // parallel across workers (the demo-builds file alone holds hundreds);
  // CI runs one engine per job.
  fullyParallel: true,
  // CI runners are slower than a developer machine; a build's step-by-step
  // drive needs twice the default there (test.slow() still triples it).
  workers: process.env.CI ? 3 : 2,
  timeout: process.env.CI ? 60_000 : 30_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:42917',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run build && npm run preview',
      url: 'http://127.0.0.1:42917',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    // An application's dev server hosting the editor through
    // `@kerfjs/ui/vite-editor` (KF-6GT5QY: editor host).
    {
      command: 'npx vite --config fixtures/app/vite.config.ts',
      url: 'http://127.0.0.1:42918/__kerf-ui-editor/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: ['chromium', 'firefox', 'webkit'].map((browserName) => ({
    name: browserName,
    use: { browserName: browserName as 'chromium' | 'firefox' | 'webkit' },
  })),
});
