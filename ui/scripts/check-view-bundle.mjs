// Size gate for the @kerfjs/ui/view runtime entries (KF-CTCNWJ: view bundle
// budget). Bundles each entry with esbuild (minified, kerfjs external, since
// apps already ship the core) and compares gzip bytes with
// view-bundle-budget.json. Budgets ratchet: an entry far under budget fails
// too, so a win is recorded instead of silently eroding. The interpreter entry
// must also never pull in the generator.
import { readFile, writeFile } from 'node:fs/promises';

import {
  ENTRIES,
  GENERATOR_MARKER,
  measureEntry,
} from './lib/view-bundle-budget.mjs';

const budgetUrl = new URL('../view-bundle-budget.json', import.meta.url);
const update = process.argv.includes('--update-budget');
const RATCHET_BYTES = 350;

const budget = JSON.parse(await readFile(budgetUrl, 'utf8'));
const problems = [];
const measured = {};
for (const [name, source] of Object.entries(ENTRIES)) {
  const { gzip, text } = await measureEntry(source);
  measured[name] = gzip;
  if (name === 'interpretView' && text.includes(GENERATOR_MARKER)) {
    problems.push('interpretView pulls in the generator (generate.mjs)');
  }
  const limit = budget.entries[name];
  if (update) continue;
  if (limit === undefined)
    problems.push(`${name}: no budget; run with --update-budget`);
  else if (gzip > limit)
    problems.push(`${name}: ${gzip} B gzip exceeds its ${limit} B budget`);
  else if (limit - gzip > RATCHET_BYTES) {
    problems.push(
      `${name}: ${gzip} B gzip is more than ${RATCHET_BYTES} B under its ${limit} B budget; lower it with --update-budget`,
    );
  }
}

if (update) {
  const entries = Object.fromEntries(
    Object.entries(measured).map(([name, gzip]) => [
      name,
      Math.ceil((gzip + 50) / 100) * 100,
    ]),
  );
  await writeFile(
    budgetUrl,
    `${JSON.stringify({ ...budget, entries, measured }, null, 2)}\n`,
  );
  console.log(
    `[check-view-bundle] budgets updated: ${JSON.stringify(entries)}`,
  );
} else if (problems.length) {
  for (const problem of problems)
    console.error(`[check-view-bundle] ${problem}`);
  process.exitCode = 1;
} else {
  console.log(
    `[check-view-bundle] OK — ${Object.entries(measured)
      .map(([name, gzip]) => `${name} ${gzip} B`)
      .join(', ')} gzip (kerfjs external), no generator in the runtime entry.`,
  );
}
