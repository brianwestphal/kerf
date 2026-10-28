// Resolves `@kerfjs/ui` from the sibling `ui/` build and `kerfjs` from the
// repository source, for the editor app and the editor-host fixture app.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { AliasOptions, Plugin } from 'vite';

export const repo = fileURLToPath(new URL('..', import.meta.url));
const ui = `${repo}ui/`;

type ExportTarget = string | { browser?: string; import?: string };
const uiExports = (
  JSON.parse(readFileSync(`${ui}package.json`, 'utf8')) as {
    exports: Record<string, ExportTarget>;
  }
).exports;

/**
 * Resolves `@kerfjs/ui` and its subpaths through the package's own export map
 * (browser condition first, so component CSS loads as it does for consumers),
 * from the sibling `ui/` build. The editor is a private workspace package, so
 * it uses the repository's ui rather than a published copy.
 */
export function kerfUi(): Plugin {
  return {
    name: 'kerf-ui-workspace',
    enforce: 'pre',
    resolveId(source) {
      if (source !== '@kerfjs/ui' && !source.startsWith('@kerfjs/ui/'))
        return null;
      const key =
        source === '@kerfjs/ui'
          ? '.'
          : `./${source.slice('@kerfjs/ui/'.length)}`;
      const target = uiExports[key];
      if (target === undefined) {
        // `./ai/*`-style wildcard exports map straight to files.
        const file = `${ui}${key.slice(2)}`;
        return existsSync(file) ? file : null;
      }
      const path =
        typeof target === 'string' ? target : (target.browser ?? target.import);
      return path ? `${ui}${path.slice(2)}` : null;
    },
  };
}

/** One kerf for the app and `@kerfjs/ui` alike: the repository source. */
export const kerfAliases: AliasOptions = [
  { find: /^kerfjs\/jsx-runtime$/, replacement: `${repo}src/jsx-runtime.ts` },
  { find: /^kerfjs\/actions$/, replacement: `${repo}src/actions.ts` },
  { find: /^kerfjs\/overlay$/, replacement: `${repo}src/overlay.ts` },
  { find: /^kerfjs$/, replacement: `${repo}src/index.ts` },
];
