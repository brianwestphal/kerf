#!/usr/bin/env node
/**
 * Keep `docs/11-dev-warnings.md` in step with the actual dev-warning family.
 *
 * `src/dev-warn-config.ts`'s `ENV_NAME` map is the authority on which
 * diagnostics exist — every warner's gate reads through it. The doc is the
 * canonical prose. Nothing connected the two, and they drifted in both
 * directions at once: two warnings shipped without ever being counted in the
 * summaries (which said eight, then nine, against a real eleven), and the doc's
 * own section numbers stopped being monotonic because later sections were
 * appended rather than inserted.
 *
 * Three assertions, each targeting one of those failures:
 *
 *   1. every `KERF_DEV_WARN_*` in `ENV_NAME` has a section in the doc;
 *   2. every `KERF_DEV_WARN_*` the doc documents still exists in `ENV_NAME`;
 *   3. the `11.2.N` headings are numbered 1..N in document order.
 *
 * Modeled on `check-doc-api-coverage.mjs` — same shape, same reason: a list a
 * human maintains alongside a list the compiler maintains will diverge, and the
 * only question is whether anything notices.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC_PATH = 'docs/11-dev-warnings.md';

const config = readFileSync(join(ROOT, 'src/dev-warn-config.ts'), 'utf8');
const doc = readFileSync(join(ROOT, DOC_PATH), 'utf8');

/** Every `KERF_DEV_WARN_*` name in the ENV_NAME map. */
const envNameBlock = /const ENV_NAME[^=]*=\s*\{([\s\S]*?)\n\};/.exec(config)?.[1];
if (envNameBlock === undefined) {
  console.error(
    'check-dev-warn-docs: could not find the ENV_NAME map in src/dev-warn-config.ts.\n'
    + 'If it was renamed or restructured, update the pattern in this script.',
  );
  process.exit(1);
}
const declared = [...envNameBlock.matchAll(/'(KERF_DEV_WARN_\w+)'/g)].map((m) => m[1]);
if (declared.length === 0) {
  console.error('check-dev-warn-docs: ENV_NAME matched but yielded no KERF_DEV_WARN_* names.');
  process.exit(1);
}

const problems = [];

// 1 + 2 — the doc and ENV_NAME must name the same set.
const documented = new Set([...doc.matchAll(/KERF_DEV_WARN_\w+/g)].map((m) => m[0]));
for (const name of declared) {
  if (!documented.has(name)) {
    problems.push(
      `${name} is in ENV_NAME but has no section in ${DOC_PATH}.\n`
      + '    Every diagnostic needs a section: what fires it, why it is opt-in, and the fix it names.',
    );
  }
}
for (const name of documented) {
  if (!declared.includes(name)) {
    problems.push(
      `${DOC_PATH} documents ${name}, which is not in ENV_NAME.\n`
      + '    Either the warning was removed and the doc kept it, or the env var is misspelled in one of the two.',
    );
  }
}

// 3 — headings must run 1..N in document order. Appending a section without
// renumbering is what broke this before; a reader following a cross-reference
// lands by number, so the numbers have to agree with the reading order.
const headingNumbers = [...doc.matchAll(/^### 11\.2\.(\d+)/gm)].map((m) => Number(m[1]));
headingNumbers.forEach((num, i) => {
  if (num !== i + 1) {
    problems.push(
      `section heading 11.2.${num} appears at position ${i + 1} in ${DOC_PATH}.\n`
      + '    Headings must be numbered 1..N in document order — other docs cross-reference them by number.',
    );
  }
});

if (problems.length > 0) {
  console.error(`\n${DOC_PATH} is out of step with src/dev-warn-config.ts:\n`);
  for (const p of problems) console.error(`  - ${p}\n`);
  process.exit(1);
}

console.log(
  `[check-dev-warn-docs] OK — ${declared.length} KERF_DEV_WARN_* names documented, `
  + `${headingNumbers.length} sections numbered in order.`,
);
