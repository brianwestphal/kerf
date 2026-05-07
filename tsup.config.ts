import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/jsx-runtime.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'es2022',
  platform: 'neutral',
  splitting: false,
  clean: true,
  sourcemap: true,
  dts: true,
  minify: false,
  treeshake: true,
  // morphdom + @preact/signals-core stay external — consumers' bundlers pick
  // them up from node_modules. Bundling them would inflate kerf's published
  // size and break dedup if the consumer also depends on them directly.
  external: ['morphdom', '@preact/signals-core'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = '#kerf-self';
    options.alias = {
      '#kerf-self/jsx-runtime': './src/jsx-runtime.ts',
    };
  },
});
