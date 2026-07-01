#!/usr/bin/env node
/**
 * KF-284: feature-coverage guard. Asserts that every behavior in the feature
 * index (`docs/14-feature-coverage.md`) maps to a live guarding test — a test
 * axis orthogonal to v8 line/branch coverage.
 *
 * Line coverage proves every line executed; it cannot see a *missing behavior*
 * or a *missing state transition* (two critical KF-125 reconciler bugs shipped
 * under 100% coverage for exactly this reason). This script closes the loop in
 * the other direction: it can't force a behavior to be tested, but it makes the
 * index → test mapping *load-bearing*, so a renamed or deleted guarding test
 * trips the gate instead of silently un-covering the feature.
 *
 * Behaviour:
 *  - Parses every Markdown table in `docs/14-feature-coverage.md` whose header
 *    row names a "Guarding test(s)" column.
 *  - For each data row, reads the last cell (the guarding-test references) and
 *    extracts (a) backticked test-file paths (`*.test.ts` / `*.test.tsx`) and
 *    (b) double-quoted test titles.
 *  - Fails if a row has no test file / no title, if a referenced file is
 *    missing, or if a referenced title no longer appears in any of the row's
 *    referenced files (backslash-normalized so escaped quotes/apostrophes in
 *    the source match the plain title in the doc).
 *  - On success prints a one-line OK with the row count.
 *
 * Run via:  node scripts/check-feature-coverage.mjs   (wired into `npm run check`)
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const INDEX_DOC = resolve(REPO_ROOT, 'docs/14-feature-coverage.md');

/** Normalize so `today\'s` in a source string matches `today's` in the doc. */
const norm = (s) => s.replace(/\\/g, '');

/** Split a Markdown table row into trimmed cells (drops the outer empties). */
function cells(line) {
  const parts = line.split('|').map((c) => c.trim());
  if (parts.length && parts[0] === '') parts.shift();
  if (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

const isSeparator = (line) => /^\s*\|?\s*:?-{2,}/.test(line) && /-\s*\|/.test(line + '|');

/** Collect index rows from every "Guarding test(s)" table in the doc. */
function collectRows(docText) {
  const lines = docText.split('\n');
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) continue;
    const header = cells(line).map((c) => c.toLowerCase());
    const guardCol = header.findIndex((c) => c.includes('guarding test'));
    if (guardCol === -1) continue;
    // Expect a separator on the next line, then data rows.
    if (i + 1 >= lines.length || !isSeparator(lines[i + 1])) continue;
    const idCol = header.findIndex((c) => c === 'id');
    let j = i + 2;
    for (; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      const c = cells(lines[j]);
      rows.push({
        line: j + 1,
        id: idCol >= 0 ? (c[idCol] ?? '') : (c[0] ?? ''),
        guarding: c[c.length - 1] ?? '',
      });
    }
    i = j - 1;
  }
  return rows;
}

function main() {
  if (!existsSync(INDEX_DOC)) {
    console.error(`[check-feature-coverage] missing index doc: docs/14-feature-coverage.md`);
    process.exit(1);
  }
  const rows = collectRows(readFileSync(INDEX_DOC, 'utf8'));
  const errors = [];

  if (rows.length === 0) {
    errors.push('no feature-index rows found (expected at least one "Guarding test(s)" table)');
  }

  const fileCache = new Map();
  const readNorm = (rel) => {
    if (!fileCache.has(rel)) {
      const abs = resolve(REPO_ROOT, rel);
      fileCache.set(rel, existsSync(abs) ? norm(readFileSync(abs, 'utf8')) : null);
    }
    return fileCache.get(rel);
  };

  for (const row of rows) {
    const files = [...row.guarding.matchAll(/`([^`]+\.tsx?)`/g)].map((m) => m[1]);
    // Titles: double-quoted strings, plus backtick spans that are NOT file
    // paths (so a title containing `<svg>`/`<details>` can be written in a
    // code span and won't be mangled by Markdown's HTML parsing).
    const titles = [
      ...[...row.guarding.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
      ...[...row.guarding.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((t) => !/\.tsx?$/.test(t)),
    ];
    const where = `${row.id || '(no id)'} @ docs/14-feature-coverage.md:${row.line}`;

    if (files.length === 0) { errors.push(`${where}: no guarding test file referenced`); continue; }
    if (titles.length === 0) { errors.push(`${where}: no guarding test title referenced`); continue; }

    const contents = [];
    for (const f of files) {
      const txt = readNorm(f);
      if (txt === null) errors.push(`${where}: referenced test file not found: ${f}`);
      else contents.push({ f, txt });
    }
    for (const title of titles) {
      const needle = norm(title);
      if (!contents.some(({ txt }) => txt.includes(needle))) {
        errors.push(`${where}: title not found in any referenced file: "${title}"`);
      }
    }
  }

  if (errors.length === 0) {
    console.log(`[check-feature-coverage] OK — ${rows.length} feature-index rows all map to live guarding tests.`);
    return;
  }
  console.error('[check-feature-coverage] feature index has broken mappings:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nUpdate docs/14-feature-coverage.md (fix the row) or restore/rename the guarding test, then re-run.');
  process.exit(1);
}

main();
