#!/usr/bin/env node
/**
 * KF-109: ensure `docs/ai/code-summary.md` mentions every test file in the
 * `tests/` tree. The audit-driven "test inventory drift" pattern was
 * recurring (4+4 entries behind reality on the last KF-104 audit) — this
 * check fails the pre-commit gate when a new test file lands without a
 * corresponding mention in the doc.
 *
 * Behaviour:
 *  - Walks `tests/unit/`, `tests/integration/`, `tests/browser/`, `tests/dist/`.
 *  - Collects every `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`.
 *  - Skips files starting with `_` (local probes / scratchpads).
 *  - Reads `docs/ai/code-summary.md` and looks for each test's BASENAME
 *    (e.g. `array-signal.test.ts`) anywhere in the file. We don't enforce
 *    a specific section — the entry just has to be mentioned.
 *  - On mismatch: prints the missing files and exits with status 1.
 *
 * Run via:
 *   node scripts/check-doc-test-inventory.mjs
 *
 * Wired into `npm run check`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TEST_DIRS = ['tests/unit', 'tests/integration', 'tests/browser', 'tests/dist'];
const DOC_PATH = 'docs/ai/code-summary.md';
const TEST_FILE_RE = /\.(test|spec)\.tsx?$/;

function listTests() {
  const files = [];
  for (const dir of TEST_DIRS) {
    const abs = join(REPO_ROOT, dir);
    let entries;
    try {
      entries = readdirSync(abs);
    } catch {
      // Directory may not exist (tests/dist is sometimes absent on fresh clones); skip.
      continue;
    }
    for (const name of entries) {
      if (name.startsWith('_')) continue;
      if (!TEST_FILE_RE.test(name)) continue;
      const path = join(abs, name);
      if (!statSync(path).isFile()) continue;
      files.push({ dir, name });
    }
  }
  return files.sort((a, b) => (a.dir + a.name).localeCompare(b.dir + b.name));
}

function main() {
  const tests = listTests();
  const docPath = join(REPO_ROOT, DOC_PATH);
  const doc = readFileSync(docPath, 'utf8');

  const missing = [];
  for (const { dir, name } of tests) {
    if (!doc.includes(name)) {
      missing.push(`${dir}/${name}`);
    }
  }

  if (missing.length === 0) {
    process.exit(0);
  }

  console.error(
    `\n${DOC_PATH} is missing ${missing.length} test file${missing.length === 1 ? '' : 's'}:\n`,
  );
  for (const path of missing) {
    console.error(`  - ${path}`);
  }
  console.error(
    `\nAdd each test file's basename to the directory tree in ${DOC_PATH}\n`
    + '(or to the surrounding prose, with a one-line description of what it covers).\n'
    + 'See KF-109 for context.\n',
  );
  process.exit(1);
}

main();
