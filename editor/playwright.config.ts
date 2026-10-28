import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 2,
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
