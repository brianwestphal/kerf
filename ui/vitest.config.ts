import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // KF-T8SEX6 (one kerf instance in unit tests): every kerfjs entry, the
    // bare package and each subpath (jsx-runtime, overlay, actions, html, …),
    // resolves to the repository's src/. Aliasing only some of them left the
    // rest on ui/node_modules/kerfjs, a second kerf with its own
    // @preact/signals-core graph, so an overlay's content never re-rendered
    // on a signal written through the first copy. jsx-dev-runtime (what
    // vitest's dev JSX transform imports) is the package's alias of
    // jsx-runtime, as in its exports map.
    alias: [
      {
        find: /^kerfjs\/jsx-dev-runtime$/,
        replacement: new URL('../src/jsx-runtime.ts', import.meta.url).pathname,
      },
      {
        find: /^kerfjs\/([a-z-]+)$/,
        replacement: new URL('../src/$1.ts', import.meta.url).pathname,
      },
      {
        find: /^kerfjs$/,
        replacement: new URL('../src/index.ts', import.meta.url).pathname,
      },
    ],
  },
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.ts', 'src/**/*-register.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 99.5,
        branches: 98.5,
      },
    },
  },
});
