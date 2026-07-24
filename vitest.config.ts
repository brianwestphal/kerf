import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '#kerf-self',
  },
  resolve: {
    alias: {
      '#kerf-self/jsx-runtime': new URL('./src/jsx-runtime.ts', import.meta.url).pathname,
      // The JSX transform emits `jsxDEV` calls in dev mode; pointing this
      // alias at the same module exposes the `jsxDEV` re-export, so .tsx
      // tests can use plain JSX syntax without a separate dev runtime.
      '#kerf-self/jsx-dev-runtime': new URL('./src/jsx-runtime.ts', import.meta.url).pathname,
    },
  },
  test: {
    // KF-400: kerf's own suites run the structural invariant checks in THROW
    // mode. A warning inside a passing test is invisible, so anything that
    // corrupts a list binding fails the run at the render that did it rather
    // than surfacing as a wrong assertion somewhere downstream.
    env: { KERF_DEV_INVARIANTS: 'throw' },
    environment: 'happy-dom',
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules/**', 'dist/**', 'tests/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      // `src/jsx-types.ts` is type-only (interfaces + type aliases, no value
      // exports) so it compiles to zero runtime JS and shows a permanent
      // 0/0/0/0 row; exclude it like the type-only `index.ts` barrels.
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/index.ts', 'src/jsx-types.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        // Branches at 99% rather than 100% accommodates a small number of
        // documented-unreachable defensive returns (`c8 ignore` annotated)
        // whose loop-completion branches v8 tracks but cannot be exercised
        // by construction. The lines/statements/functions thresholds at
        // 100% still catch any actual unexercised code.
        branches: 99,
        statements: 100,
      },
    },
  },
});
