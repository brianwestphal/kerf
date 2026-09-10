import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^kerfjs\/jsx-runtime$/, replacement: new URL('../src/jsx-runtime.ts', import.meta.url).pathname },
      { find: /^kerfjs$/, replacement: new URL('../src/index.ts', import.meta.url).pathname },
    ],
  },
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.ts', 'src/select-register.ts'],
      thresholds: { lines: 100, functions: 100, statements: 99.5, branches: 98.5 },
    },
  },
});
