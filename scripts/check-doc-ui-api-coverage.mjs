#!/usr/bin/env node
/**
 * KF-AJED0M: ensure `docs/21-ui-package.md` names every value export of the
 * `@kerfjs/ui` main entry (`ui/src/index.ts`). The §21.3 inventory had
 * silently fallen a dozen component families behind the package, because
 * nothing checked that the doc named each export. Modeled on
 * `check-doc-api-coverage.mjs`, which does the same for `kerfjs` and
 * `docs/8-api-reference.md`.
 *
 * Behavior:
 *  - Parses every `export { … }` block in `ui/src/index.ts` and keeps the
 *    value exports (a `type Foo` specifier is skipped: types are documented
 *    with the value they describe, not per symbol).
 *  - Reads `docs/21-ui-package.md` and asserts each value name appears at
 *    least once as a whole word (heading, table, prose, or code).
 *  - On mismatch: prints the missing names and exits with status 1.
 *
 * Subpath-only exports (the app layouts, the editor, view tooling) are not
 * in the main entry; their own docs (docs/23, docs/26) cover them.
 *
 * Run via:
 *   node scripts/check-doc-ui-api-coverage.mjs
 *
 * Wired into `npm run check`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const UI_DOC = resolve(REPO_ROOT, 'docs/21-ui-package.md');
const UI_ENTRY = resolve(REPO_ROOT, 'ui/src/index.ts');

/** The value (non-type) names the entry's `export { … }` blocks publish. */
export function valueExports(source) {
  const names = new Set();
  for (const block of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const raw of block[1].split(',')) {
      const piece = raw.trim();
      if (piece === '' || piece.startsWith('type ')) continue;
      names.add(piece.includes(' as ') ? piece.split(' as ')[1].trim() : piece);
    }
  }
  // `export type { … }` blocks carry only types.
  for (const block of source.matchAll(/export\s+type\s*\{([^}]+)\}/g)) {
    for (const raw of block[1].split(',')) {
      const piece = raw.trim();
      names.delete(
        piece.includes(' as ') ? piece.split(' as ')[1].trim() : piece,
      );
    }
  }
  // `export const|function|class Foo` declarations.
  for (const match of source.matchAll(
    /^export\s+(?:declare\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm,
  ))
    names.add(match[1]);
  return [...names].sort();
}

function main() {
  const doc = readFileSync(UI_DOC, 'utf8');
  const missing = valueExports(readFileSync(UI_ENTRY, 'utf8')).filter(
    (name) =>
      !new RegExp(`(?<![\\w$])${name.replace(/\$/g, '\\$')}(?![\\w$])`).test(
        doc,
      ),
  );
  if (missing.length === 0) {
    console.log(
      '[check-doc-ui-api-coverage] OK — docs/21-ui-package.md names every value export of @kerfjs/ui.',
    );
    return;
  }
  console.error(
    '[check-doc-ui-api-coverage] docs/21-ui-package.md is missing these @kerfjs/ui value exports (ui/src/index.ts):',
  );
  for (const name of missing) console.error(`  - ${name}`);
  console.error(
    '\nAdd each to the §21.3 inventory (or the section that owns it) in docs/21-ui-package.md.',
  );
  process.exit(1);
}

main();
