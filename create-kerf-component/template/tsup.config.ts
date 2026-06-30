import { defineConfig } from 'tsup';

// One entry per `exports` subpath. tsup emits ESM + `.d.ts` for each.
export default defineConfig({
  entry: ['src/index.ts', 'src/counter.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  // THE hard rule: kerfjs must NEVER be bundled. A component returns `SafeHtml`
  // and reads signals; both rely on the consumer and this package sharing ONE
  // SafeHtml class and ONE signals instance. Bundling a second copy of kerfjs
  // would silently break `isSafeHtml` brand checks and signal identity across the
  // boundary. Keep it external (it's a peerDependency).
  external: ['kerfjs'],
});
