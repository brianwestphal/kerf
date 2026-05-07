import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/jsx-runtime.ts', 'src/testing.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'es2022',
  platform: 'neutral',
  // KF-15 / KF-14: with multiple entries (`index`, `jsx-runtime`, `testing`)
  // and `splitting: false`, esbuild bundles each entry independently. Shared
  // source modules (`store.ts`, `jsx-runtime.ts`) get duplicated — or, worse,
  // tree-shaken into broken stubs (e.g. an empty `clearStoreRegistry` because
  // `REGISTRY` was eliminated as unreferenced in the testing bundle).
  // Splitting promotes shared code into a chunk that all entries import, so
  // there's exactly one copy of every module-level value at runtime.
  splitting: true,
  clean: true,
  sourcemap: true,
  dts: true,
  minify: false,
  treeshake: true,
  // @preact/signals-core stays external — consumers' bundlers pick it up
  // from node_modules. Bundling it would inflate kerf's published size and
  // break dedup if the consumer also depends on it directly.
  external: ['@preact/signals-core'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = '#kerf-self';
    options.alias = {
      '#kerf-self/jsx-runtime': './src/jsx-runtime.ts',
    };
  },
});
