#!/usr/bin/env node
/**
 * Fail if a project skill file under `.claude/skills/` restates a threshold or
 * a path that the real source of truth disagrees with.
 *
 * Three of the repo's skills had silently rotted the same way: each had COPIED
 * a number out of CLAUDE.md / `vitest.config.ts` / `tsup.config.ts` instead of
 * referencing it, the original moved, and the copy stayed. Nothing failed —
 * skills are prose, so drift only surfaces as an agent confidently reporting
 * findings that aren't real. `/check-code-hygiene` was flagging 13 of ~47
 * source files against a file-length rule the project had already relaxed, and
 * `/analyze-code-quality` was verifying four dist entries when the build emits
 * six, so a missing `dist/dev.js` would have passed its check.
 *
 * The durable fix was to make the skills reference rather than restate. This
 * script is what keeps them that way: it re-derives each value from its owner
 * and complains if a skill file contains a contradicting literal.
 *
 * Deliberately narrow. It checks the specific claims that have actually gone
 * stale, not "does this prose agree with reality" in general — a checker that
 * cried wolf would get ignored, which is exactly the failure it exists to fix.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(ROOT, '.claude', 'skills');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Every `SKILL.md` under `.claude/skills/`, as `{ name, path, text }`. */
function skillFiles() {
  let entries;
  try {
    entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  } catch {
    return []; // no skills dir in this checkout — nothing to verify
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const path = join(SKILLS_DIR, entry.name, 'SKILL.md');
    try {
      if (!statSync(path).isFile()) continue;
    } catch {
      continue;
    }
    out.push({ name: entry.name, path: `.claude/skills/${entry.name}/SKILL.md`, text: readFileSync(path, 'utf8') });
  }
  return out;
}

const problems = [];
const add = (file, claim, found, expected, fix) =>
  problems.push({ file, claim, found, expected, fix });

// --- The values, re-derived from whoever owns them ------------------------

const vitestConfig = read('vitest.config.ts');
const thresholdBlock = /thresholds:\s*\{([\s\S]*?)\}/.exec(vitestConfig)?.[1] ?? '';
const branchesThreshold = /branches:\s*(\d+)/.exec(thresholdBlock)?.[1];

const tsupConfig = read('tsup.config.ts');
const entryNames = [...(/entry:\s*\[([^\]]*)\]/.exec(tsupConfig)?.[1] ?? '').matchAll(/src\/([\w-]+)\.ts/g)]
  .map((m) => m[1]);

const linesThreshold = /lines:\s*(\d+)/.exec(thresholdBlock)?.[1];

const claudeMd = read('CLAUDE.md');
const locSmell = /past ~(\d+) LOC is a \*smell\*/.exec(claudeMd)?.[1];

/**
 * Only the claim SHAPES that have actually gone stale are matched — not every
 * mention of a number.
 *
 * A bare `N% branches` rule was tried and cut: it fired twice on correct prose
 * ("several files sit below 100% branches by design") and never once on a real
 * defect, because the claim that actually rotted was the *combined* form
 * `100% lines/branches/functions/statements`. Distinguishing an assertion from
 * a mention by scanning nearby words was not reliable enough, and the failure
 * mode of guessing wrong is worse than the gap: a checker that cries wolf gets
 * ignored or deleted, which is precisely the rot this exists to prevent.
 */
const NUMERIC_CLAIMS = [
  {
    label: 'source-file length rule',
    // "under ~200 LOC", "exceeding ~200 LOC", "past ~500 LOC"
    pattern: /(?:under|exceeding|past|over)\s+~(\d+)\s+LOC/gi,
    expected: () => locSmell,
    owner: 'CLAUDE.md § Code Quality Gates',
    fix: 'Reference the CLAUDE.md rule instead of quoting a number, or update the number to match.',
  },
  {
    label: 'combined lines/branches coverage threshold',
    // "100% lines/branches/functions/statements" — a single number claimed to
    // cover both metrics, which is wrong whenever the two differ.
    pattern: /(\d{2,3})%\s+lines\s*[/,]\s*branches/gi,
    // Only honest if the two thresholds are actually equal.
    expected: () => (linesThreshold === branchesThreshold ? linesThreshold : `separate values — lines ${linesThreshold}, branches ${branchesThreshold}`),
    owner: 'vitest.config.ts coverage.thresholds',
    fix: 'lines and branches have different thresholds; state them separately or point at vitest.config.ts.',
  },
];

for (const skill of skillFiles()) {
  for (const claim of NUMERIC_CLAIMS) {
    const expected = claim.expected();
    if (expected === undefined) continue; // couldn't derive; don't guess
    for (const match of skill.text.matchAll(claim.pattern)) {
      if (match[1] !== expected) {
        add(skill.path, claim.label, match[0], `${expected} (per ${claim.owner})`, claim.fix);
      }
    }
  }

  // A hardcoded dist entry list goes stale every time an entry is added. Any
  // `dist/<name>.js` a skill names must be something the build actually emits.
  for (const match of skill.text.matchAll(/`dist\/([\w-]+)\.js`/g)) {
    if (!entryNames.includes(match[1]) && !match[1].startsWith('chunk-')) {
      add(
        skill.path,
        'dist entry name',
        `dist/${match[1]}.js`,
        `one of: ${entryNames.join(', ')} (per tsup.config.ts entry)`,
        'Derive the entry list from tsup.config.ts rather than hardcoding it.',
      );
    }
  }

  // Every `src/…` path a skill names must exist. Catches a module that was
  // renamed or split out from under the prose.
  for (const match of skill.text.matchAll(/`(src\/[\w./-]+\.ts)`/g)) {
    try {
      statSync(join(ROOT, match[1]));
    } catch {
      add(skill.path, 'source path', match[1], 'a file that exists', 'Update the path, or drop the reference.');
    }
  }
}

if (problems.length > 0) {
  console.error('\nStale claims in project skill files:\n');
  for (const p of problems) {
    console.error(`  ${p.file}`);
    console.error(`    ${p.claim}: skill says ${JSON.stringify(p.found)}, expected ${p.expected}`);
    console.error(`    fix: ${p.fix}\n`);
  }
  console.error(
    'A skill that restates a rule is a copy that silently rots — the agent running it\n'
    + 'then reports findings that are not real. Prefer referencing the source of truth\n'
    + 'over quoting it.\n',
  );
  process.exit(1);
}

console.log(
  `[check-skill-freshness] OK — ${skillFiles().length} skill file(s); `
  + 'no contradicting thresholds, dist entries, or source paths.',
);
