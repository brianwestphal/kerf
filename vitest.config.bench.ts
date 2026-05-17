/**
 * KF-202: micro-bench config (separate from the unit/integration vitest config).
 *
 * Vitest's bench mode uses `tinybench` under the hood — same nanosecond-
 * resolution timing, same warmup phase, but integrated with the existing
 * vitest setup (happy-dom env, JSX support, etc.) so kerf doesn't need a
 * second toolchain.
 *
 * Files in `bench/micro/*.bench.ts` use `bench()` and `describe()` from
 * vitest. Run with `npm run bench:micro` (which calls `vitest bench --run`).
 *
 * NOT part of `npm run check`. Microbench numbers are noisy and host-
 * dependent; gating commits on them would produce false failures. The
 * output is informational, for human judgment, before committing to a
 * primitive-level change.
 *
 * KF-208: when CodSpeed is running this suite (CI per-PR via
 * `CodSpeedHQ/action@v4` with `mode: simulation`), the `@codspeed/vitest-
 * plugin` swaps tinybench's wall-clock timing for instruction-count
 * measurement via Valgrind/cachegrind. That makes the numbers deterministic
 * regardless of the runner's noise and lets CodSpeed flag regressions per-
 * PR. Outside CodSpeed (`CODSPEED_ENV` unset), the plugin is a no-op and
 * the suite runs with normal tinybench wall-clock timing — so
 * `npm run bench:micro` locally is unchanged.
 */

import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [codspeedPlugin()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '#kerf-self',
  },
  resolve: {
    alias: {
      '#kerf-self/jsx-runtime': new URL('./src/jsx-runtime.ts', import.meta.url).pathname,
      '#kerf-self/jsx-dev-runtime': new URL('./src/jsx-runtime.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['bench/micro/**/*.bench.ts', 'bench/micro/**/*.bench.tsx'],
    exclude: ['node_modules/**', 'dist/**'],
    benchmark: {
      reporters: ['default'],
    },
  },
});
