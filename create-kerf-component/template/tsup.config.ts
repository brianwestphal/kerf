import { defineConfig } from 'tsup';
import ts from 'typescript';

// tsup injects `baseUrl` into declaration builds. TypeScript 6 reports that
// option as a TS 7 deprecation error, while TypeScript 5 rejects the future
// "6.0" threshold itself. Keep the workaround local to tsup and only enable it
// for the compiler generation that needs it.
const dtsCompilerOptions = ts.versionMajorMinor.startsWith('6.')
  ? { ignoreDeprecations: '6.0' }
  : {};

// One entry per `exports` subpath. tsup emits ESM + `.d.ts` for each.
export default defineConfig({
  entry: ['src/index.ts', 'src/counter.tsx'],
  format: ['esm'],
  dts: { compilerOptions: dtsCompilerOptions },
  clean: true,
  // THE hard rule: kerfjs must NEVER be bundled. A component returns `SafeHtml`
  // and reads signals; both rely on the consumer and this package sharing ONE
  // SafeHtml class and ONE signals instance. Bundling a second copy of kerfjs
  // would silently break `isSafeHtml` brand checks and signal identity across the
  // boundary. Keep it external (it's a peerDependency).
  external: ['kerfjs'],
});
