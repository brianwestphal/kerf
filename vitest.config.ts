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
    // kerf no longer infers dev mode; the diagnostics install via `kerfjs/dev`.
    // kerf's own suites are development by definition, so install globally —
    // every existing warning/invariant assertion keeps its previous behavior.
    setupFiles: ['./tests/setup-dev-hooks.ts'],
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
        // Lines and functions stay at 100 and are the load-bearing pair: they
        // are what catches genuinely unexercised code, and neither moved when
        // the coverage provider changed.
        lines: 100,
        functions: 100,
        // Branches and statements sit below 100 for one reason — a small,
        // enumerated set of defensive arms that cannot be exercised by
        // construction. These are NOT untested behavior; each is the unused
        // side of a guard on an invariant the caller already established.
        //
        // Both numbers moved when vitest 4 replaced `v8-to-istanbul` with
        // `ast-v8-to-istanbul`. The new provider maps V8's counters onto the
        // AST instead of onto transpiled line ranges, so it can see that a
        // `return` sharing a line with its `if` never ran. Coverage did not
        // get worse — the instrument got sharper, and it now resolves guards
        // the old line-range mapping silently credited as covered. Same
        // source, same tests: branches 99.41 -> 98.71, statements 100 -> 99.75.
        //
        // The seventeen it newly resolves, all of the same shape:
        //
        //   mount.ts 707,711 ................ `parentElement !== null` on a node
        //                                     the reconciler just found attached
        //   morph.ts 455,537,579 ............ nodeType discriminators + an
        //                                     attribute-equality arm
        //   list-reconcile-fast-paths.ts .... 81,90,153,166,251,269,286 —
        //                                     short-circuit bails and
        //                                     loop-completion branches
        //   list-reconcile-snapshot.ts 202 .. `parentElement === liveParent`
        //   list-reconcile-granular.ts 112 .. patch-type discriminator
        //   each.ts 475 .................... patch-type discriminator
        //   dev-rerender-warn.ts 63 ......... nodeType discriminator
        //   urlScreen.ts 118 ............... `?? ''` after a regex that always
        //                                     matches for a `data:` scheme —
        //                                     a TypeScript-only guard
        //
        // Set a little under the measured floor so an ordinary new defensive
        // guard doesn't fail the build, but far enough above it that a real
        // gap — an untested function or an unexercised path — still does:
        // those move these numbers by whole points, not hundredths.
        //
        // Raise these back toward 100 by annotating the arms with
        // `c8 ignore`, which the provider still honors. Do NOT lower them
        // further to make a build pass; if they need to move, name the
        // branches that moved them, the way this comment does.
        branches: 98.5,
        statements: 99.5,
      },
    },
  },
});
