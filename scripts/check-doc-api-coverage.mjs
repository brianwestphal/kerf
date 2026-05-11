#!/usr/bin/env node
/**
 * KF-162: ensure `docs/8-api-reference.md` mentions every public export
 * reachable from the `kerfjs` barrel and its subpaths. The KF-119 widening
 * of `mount()`'s return type to `MountResult` landed in the code but was
 * never reflected in the api reference — the bug shipped for months because
 * nothing checked that the doc named every export.
 *
 * Behaviour:
 *  - Parses `src/index.ts` for re-exports → main-barrel public names.
 *  - Parses `src/array-signal.ts` for `export ` declarations → subpath
 *    public names.
 *  - Parses `src/testing.ts` for re-exports → testing-subpath public names.
 *  - Reads `docs/8-api-reference.md` and asserts each public name appears
 *    at least once (anywhere — heading, prose, code block).
 *  - On mismatch: prints the missing identifiers and exits with status 1.
 *
 * This is the *inverse* of `scripts/check-doc-test-inventory.mjs`: that
 * script ensures docs mention every test file; this one ensures the api
 * reference mentions every public export.
 *
 * Run via:
 *   node scripts/check-doc-api-coverage.mjs
 *
 * Wired into `npm run check`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const API_DOC = resolve(REPO_ROOT, 'docs/8-api-reference.md');

// Files whose `export { ... }` blocks define the public surface that the
// api reference is contractually required to name.
const PUBLIC_EXPORT_SOURCES = [
  { path: 'src/index.ts', label: 'kerfjs (main barrel)' },
  { path: 'src/array-signal.ts', label: 'kerfjs/array-signal' },
  { path: 'src/testing.ts', label: 'kerfjs/testing' },
];

// JSX-runtime subpath exports (`jsx`, `jsxs`, `jsxDEV`) are consumed by the
// JSX transform, not by hand-written user code — they're documented at the
// "import 'kerfjs/jsx-runtime'" subsection level rather than per-symbol.
// `Fragment` IS user-facing and IS re-exported from the main barrel, so it
// gets covered by the main-barrel pass.
const EXEMPT = new Set([
  'jsx',
  'jsxs',
  'jsxDEV',
  // Internal type-only re-exports for declaration merging — documented as
  // a cluster in §8.5, not per-symbol.
  'AttrLike',
  'AttrValue',
  'DataAriaAttrs',
  'KerfBaseAttrs',
  'KerfCustomElement',
]);

function collectExports(absPath) {
  const src = readFileSync(absPath, 'utf8');
  const names = new Set();

  // 1. `export { foo, type Bar, baz as qux } from '...'` re-exports.
  //    Captures the inner brace group and splits on commas.
  for (const m of src.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g)) {
    for (const raw of m[1].split(',')) {
      const piece = raw.trim();
      if (piece === '') continue;
      // `type Foo` → `Foo`; `Foo as Bar` → `Bar` (the exported name).
      const cleaned = piece.replace(/^type\s+/, '');
      const finalName = cleaned.includes(' as ')
        ? cleaned.split(' as ')[1].trim()
        : cleaned;
      names.add(finalName);
    }
  }

  // 2. Inline `export { foo, type Bar }` (no `from`) — pulls re-exports from
  //    the local scope.
  for (const m of src.matchAll(/export\s*\{([^}]+)\}\s*;?/g)) {
    // Skip the `... from '...'` form we already captured.
    if (/from\s*['"]/.test(m[0])) continue;
    for (const raw of m[1].split(',')) {
      const piece = raw.trim();
      if (piece === '') continue;
      const cleaned = piece.replace(/^type\s+/, '');
      const finalName = cleaned.includes(' as ')
        ? cleaned.split(' as ')[1].trim()
        : cleaned;
      names.add(finalName);
    }
  }

  // 3. `export const Foo`, `export function foo`, `export class Foo`,
  //    `export type Foo`, `export interface Foo`.
  for (const m of src.matchAll(/^export\s+(?:declare\s+)?(?:const|let|var|function|class|type|interface)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }

  return names;
}

function main() {
  const doc = readFileSync(API_DOC, 'utf8');
  const missing = [];

  for (const { path, label } of PUBLIC_EXPORT_SOURCES) {
    const abs = resolve(REPO_ROOT, path);
    const exports = collectExports(abs);
    for (const name of exports) {
      if (EXEMPT.has(name)) continue;
      // Word-boundary check so `each` doesn't get false-matched by `reach`.
      const re = new RegExp(`\\b${name}\\b`);
      if (!re.test(doc)) {
        missing.push({ name, source: path, label });
      }
    }
  }

  if (missing.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[check-doc-api-coverage] OK — docs/8-api-reference.md mentions every public export.`);
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[check-doc-api-coverage] docs/8-api-reference.md is missing entries for:');
  for (const { name, source, label } of missing) {
    // eslint-disable-next-line no-console
    console.error(`  - ${name}  (exported from ${source}, surface: ${label})`);
  }
  // eslint-disable-next-line no-console
  console.error('\nAdd a heading or at least a prose mention in docs/8-api-reference.md, then re-run.');
  process.exit(1);
}

main();
