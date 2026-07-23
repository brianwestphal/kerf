import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/jsx-runtime.ts', 'src/testing.ts', 'src/array-signal.ts', 'src/html.ts'],
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
  // The .d.ts build runs on typescript@6 (the JS-API bridge release — the
  // native typescript@7 ships no JS API, so rollup-plugin-dts can't use it).
  // tsup hardcodes `baseUrl: "."` into the dts compiler options, and TS 6
  // enforces the TS 7 deprecations as errors (TS5101) — `ignoreDeprecations`
  // waives exactly that. Kept here, NOT in tsconfig.json, so the repo's own
  // configs stay clean for the native TS 7 `tsc` that runs every typecheck
  // gate (see the `typescript7` npm alias in package.json).
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
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
