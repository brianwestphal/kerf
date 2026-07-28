#!/usr/bin/env node
/**
 * Enforce CLAUDE.md **Design rule 5** — module-level mutable state in `src/` is
 * restricted to the places the rule enumerates.
 *
 * The rule's entire force comes from being exhaustive: "restricted to four
 * documented places" is only useful for judging a NEW mutable while the list is
 * complete. It had quietly stopped being complete — `each.ts:renderingRow` and
 * `item-version.ts:anyVersioned` were both live, both correct, and both
 * unmentioned, which left a reviewer with no way to say whether the next one
 * belonged. Prose can't notice that about itself; this can.
 *
 * A top-level `let` in `src/` is accounted for when either:
 *
 *   1. its identifier is named in the rule-5 paragraph of CLAUDE.md, or
 *   2. it lives in a `dev-*.ts` module — the rule covers those categorically as
 *      dev-only bookkeeping (one-shot dedup flags, the delegate nesting
 *      counter), because naming each one would make the rule churn every time a
 *      warning is added.
 *
 * Anything else fails, **even when the code is right** — that is the point. A
 * hit here means the rule needs updating, which is a decision for a human, not
 * something to silently absorb.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** The text of CLAUDE.md's Design rule 5, so identifiers can be looked up in it. */
function ruleText() {
  const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
  const start = claudeMd.indexOf('5. **Module-level mutable state is restricted');
  if (start === -1) {
    console.error(
      'check-design-rule-5: could not find Design rule 5 in CLAUDE.md.\n'
      + 'If the rule was renumbered or reworded, update the anchor in this script.',
    );
    process.exit(1);
  }
  // The rule runs to the next numbered design rule, or to the end of the list.
  const rest = claudeMd.slice(start + 1);
  const end = rest.search(/\n\s*\d+\. \*\*/);
  return end === -1 ? rest : rest.slice(0, end);
}

/** Every `.ts` file under `src/`, recursively. */
function sourceFiles(dir = SRC) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (entry.name.endsWith('.ts')) out.push(path);
  }
  return out;
}

const rule = ruleText();
const unaccounted = [];

for (const file of sourceFiles()) {
  const rel = relative(ROOT, file);
  // Categorically covered: dev-only bookkeeping in the dev-* modules.
  if (/(^|\/)dev-[\w-]+\.ts$/.test(rel)) continue;

  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Top-level only: a `let` at column 0. Anything indented is function-scoped.
    const match = /^(?:export )?let (\w+)/.exec(line);
    if (!match) return;
    const name = match[1];
    if (rule.includes(name)) return;
    unaccounted.push({ where: `${rel}:${i + 1}`, name });
  });
}

if (unaccounted.length > 0) {
  console.error('\nModule-level mutable state not accounted for by CLAUDE.md Design rule 5:\n');
  for (const hit of unaccounted) console.error(`  ${hit.where}  —  ${hit.name}`);
  console.error(
    '\nThe rule enumerates where module-level mutable state may live, and it is only\n'
    + 'useful for judging a new one while that list is complete. Either fold this into\n'
    + 'an existing clause, add a clause for it, or move the state into an argument.\n'
    + 'Being correct code is not sufficient — the rule has to say so.\n',
  );
  process.exit(1);
}

console.log('[check-design-rule-5] OK — every top-level `let` in src/ maps to a documented clause.');
