#!/usr/bin/env node
/**
 * Keep `docs/11-dev-warnings.md` in step with the actual dev-warning family.
 *
 * `src/dev-warn-config.ts`'s `ENV_NAME` map is the authority on which
 * individually switched diagnostics exist — every opt-in warner's switch
 * reads through it, while the documented always-on hooks skip it. The doc is
 * the canonical prose. Nothing connected the two, and they drifted in both
 * directions at once: two warnings shipped without ever being counted in the
 * summaries (which said eight, then nine, against a real eleven), and the doc's
 * own section numbers stopped being monotonic because later sections were
 * appended rather than inserted.
 *
 * Five assertions, each targeting one of those failures:
 *
 *   1. every `KERF_DEV_WARN_*` in `ENV_NAME` has a section in the doc;
 *   2. every `KERF_DEV_WARN_*` the doc documents still exists in `ENV_NAME`;
 *   3. the `11.2.N` headings are numbered 1..N in document order.
 *   4. canonical, published, AI-facing, project-guidance, and source prose
 *      does not resurrect the old claim that kerf gates diagnostics on
 *      NODE_ENV or forget the enableWarnings()/always-on split.
 *   5. every canonical diagnostic section also appears in the published guide.
 *
 * Modeled on `check-doc-api-coverage.mjs` — same shape, same reason: a list a
 * human maintains alongside a list the compiler maintains will diverge, and the
 * only question is whether anything notices.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC_PATH = 'docs/11-dev-warnings.md';
const PUBLISHED_DOC_PATH = 'site/src/content/docs/docs/dev-warnings.md';
const GATING_PROSE_PATHS = [
  'CLAUDE.md',
  DOC_PATH,
  'docs/2-reactivity.md',
  'docs/3-stores.md',
  PUBLISHED_DOC_PATH,
  'site/src/content/docs/docs/reactivity.md',
  'site/src/content/docs/docs/stores.md',
  'docs/ai/code-summary.md',
  'docs/ai/requirements-summary.md',
  'docs/ai/usage-guide.md',
  ...readdirSync(join(ROOT, 'src'))
    .filter((name) => name.startsWith('dev-') && name.endsWith('.ts'))
    .map((name) => `src/${name}`),
];

const config = readFileSync(join(ROOT, 'src/dev-warn-config.ts'), 'utf8');
const doc = readFileSync(join(ROOT, DOC_PATH), 'utf8');
const publishedDoc = readFileSync(join(ROOT, PUBLISHED_DOC_PATH), 'utf8');

/** Every `KERF_DEV_WARN_*` name in the ENV_NAME map. */
const envNameBlock = /const ENV_NAME[^=]*=\s*\{([\s\S]*?)\n\};/.exec(
  config,
)?.[1];
if (envNameBlock === undefined) {
  console.error(
    'check-dev-warn-docs: could not find the ENV_NAME map in src/dev-warn-config.ts.\n' +
      'If it was renamed or restructured, update the pattern in this script.',
  );
  process.exit(1);
}
const declared = [...envNameBlock.matchAll(/["'](KERF_DEV_WARN_\w+)["']/g)].map(
  (m) => m[1],
);
if (declared.length === 0) {
  console.error(
    'check-dev-warn-docs: ENV_NAME matched but yielded no KERF_DEV_WARN_* names.',
  );
  process.exit(1);
}

const problems = [];

// 1 + 2 — the doc and ENV_NAME must name the same set.
const documented = new Set(
  [...doc.matchAll(/KERF_DEV_WARN_\w+/g)].map((m) => m[0]),
);
for (const name of declared) {
  if (!documented.has(name)) {
    problems.push(
      `${name} is in ENV_NAME but has no section in ${DOC_PATH}.\n` +
        '    Every diagnostic needs a section: what fires it, why it is opt-in, and the fix it names.',
    );
  }
}
for (const name of documented) {
  if (!declared.includes(name)) {
    problems.push(
      `${DOC_PATH} documents ${name}, which is not in ENV_NAME.\n` +
        '    Either the warning was removed and the doc kept it, or the env var is misspelled in one of the two.',
    );
  }
}

// 3 — headings must run 1..N in document order. Appending a section without
// renumbering is what broke this before; a reader following a cross-reference
// lands by number, so the numbers have to agree with the reading order.
const headingNumbers = [...doc.matchAll(/^### 11\.2\.(\d+)/gm)].map((m) =>
  Number(m[1]),
);
headingNumbers.forEach((num, i) => {
  if (num !== i + 1) {
    problems.push(
      `section heading 11.2.${num} appears at position ${i + 1} in ${DOC_PATH}.\n` +
        '    Headings must be numbered 1..N in document order — other docs cross-reference them by number.',
    );
  }
});

// 4 — the published guide must carry every canonical diagnostic section. The
// canonical headings deliberately cover both the switched warning family and
// the always-on hooks/guards, so a new or renamed section cannot silently stay
// private to the repository-facing design doc.
const canonicalDiagnosticHeadings = [
  ...doc.matchAll(/^### 11\.2\.\d+ (.+)$/gm),
].map((m) => m[1]);
const publishedHeadings = new Set(
  [...publishedDoc.matchAll(/^### (.+)$/gm)].map((m) => m[1]),
);
for (const heading of canonicalDiagnosticHeadings) {
  if (!publishedHeadings.has(heading)) {
    problems.push(
      `${PUBLISHED_DOC_PATH} is missing the canonical diagnostic section ${JSON.stringify(heading)}.\n` +
        `    Mirror every 11.2 diagnostic from ${DOC_PATH}, including always-on diagnostics.`,
    );
  }
}

// 5 — NODE_ENV is a valid example in the consumer-owned import condition and
// in the history explaining why inference was removed. These phrases are the
// narrower stale claims that incorrectly put NODE_ENV inside kerf's warning
// mechanism or describe an uninstalled hook as a runtime mode check.
const staleGatingClaims = [
  /short-circuits? on NODE_ENV\s*\/\s*env var/i,
  /production NODE_ENV short-circuits/i,
  /production(?:-mode| ) short-circuit/i,
  /production-mode silence/i,
  /silent in production mode/i,
  /env-var check short-circuits before any per-set work/i,
  /env read short-circuits everything else/i,
  /each individual warner[\s\S]{0,100}KERF_DEV_WARN_\* env/i,
  /each warner reads only its own `KERF_DEV_WARN_\*` variable/i,
  /(?:a|each) warner's only gate[^.]*KERF_DEV_WARN_/i,
  /the gate is `KERF_DEV_WARN_[^`]+`/i,
  /opt-in env var[\s\S]{0,120}non-production build/i,
  /set `KERF_DEV_WARN_[^`]+` in a non-production build/i,
  /production behavior is unchanged for zero runtime cost/i,
  /always on in development/i,
  /env-gated like the `KERF_DEV_WARN_\*` family/i,
  /covers the env-var gates/i,
  /production silence/i,
  /production callers go through/i,
  /diagnostic enable the env var/i,
  /opt-in via `KERF_DEV_WARN_[^`]+` in dev; production unchanged/i,
];
for (const path of GATING_PROSE_PATHS) {
  const prose = readFileSync(join(ROOT, path), 'utf8');
  for (const pattern of staleGatingClaims) {
    const match = pattern.exec(prose);
    if (match === null) continue;
    const line = prose.slice(0, match.index).split('\n').length;
    problems.push(
      `${path}:${line} repeats a stale or incomplete diagnostic-gating claim: ${JSON.stringify(match[0])}.\n` +
        '    Describe both axes: the dev entry installs nullable hooks; each opt-in warner uses enableWarnings()/its environment fallback, while always-on hooks skip that switch.',
    );
  }
}

if (problems.length > 0) {
  console.error(`\n${DOC_PATH} is out of step with src/dev-warn-config.ts:\n`);
  for (const p of problems) console.error(`  - ${p}\n`);
  process.exit(1);
}

console.log(
  `[check-dev-warn-docs] OK — ${declared.length} KERF_DEV_WARN_* names documented, ` +
    `${headingNumbers.length} diagnostic sections published and numbered in order, ` +
    'and diagnostic-gating prose is current.',
);
