import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '#kerf-self',
  },
  resolve: {
    alias: {
      '#kerf-self/jsx-runtime': new URL('./src/jsx-runtime.ts', import.meta.url)
        .pathname,
      // The JSX transform emits `jsxDEV` calls in dev mode; pointing this
      // alias at the same module exposes the `jsxDEV` re-export, so .tsx
      // tests can use plain JSX syntax without a separate dev runtime.
      '#kerf-self/jsx-dev-runtime': new URL(
        './src/jsx-runtime.ts',
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    // KF-400: kerf's own suites run the structural invariant checks in THROW
    // mode. A warning inside a passing test is invisible, so anything that
    // corrupts a list binding fails the run at the render that did it rather
    // than surfacing as a wrong assertion somewhere downstream.
    env: { KERF_DEV_INVARIANTS: 'throw' },
    // kerf no longer infers dev mode; the diagnostics install via `kerfjs/dev`.
    // kerf's own suites are development by definition, so install globally —
    // every existing warning/invariant assertion keeps its previous behavior.
    // KF-9XZ6XQ: strip Git hook variables before any test spawns git.
    setupFiles: [
      './tests/setup-git-environment.ts',
      './tests/setup-dev-hooks.ts',
    ],
    environment: 'happy-dom',
    globals: false,
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    exclude: ['node_modules/**', 'dist/**', 'tests/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      // `src/jsx-types.ts` is type-only (interfaces + type aliases, no value
      // exports) so it compiles to zero runtime JS and shows a permanent
      // 0/0/0/0 row; exclude it like the type-only `index.ts` barrels.
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/index.ts',
        'src/jsx-types.ts',
      ],
      thresholds: {
        // All four axes are 100% after KF-08XCMP tested seven reachable arms
        // and KF-STDHB7 annotated eighteen unreachable defensive arms with
        // local c8 ignore reasons. A new untested path now fails the gate.
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
