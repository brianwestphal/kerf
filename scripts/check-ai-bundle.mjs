#!/usr/bin/env node
/**
 * KF-215: verify that the committed `ai/` bundle matches what
 * `scripts/sync-ai-bundle.mjs` would produce from the current root sources.
 * Run by `npm run check:ai-bundle-in-sync`; wired into `npm run check`.
 *
 * Fails when:
 *  - the bundled files diverge from the source-of-truth root files
 *  - a source file is missing the `kerf-skill-version` line or the marker
 *  - the manifest's `kerfjsVersion` doesn't match `package.json` (after a
 *    version bump you must re-run sync)
 *
 * Resolution: `node scripts/sync-ai-bundle.mjs` then commit the result.
 *
 * See `docs/12-ai-assistant-configs.md`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { computeBundle, REPO_ROOT } from './lib/ai-bundle.mjs';

let outputs;
try {
  outputs = computeBundle();
} catch (err) {
  console.error(`\nai-bundle source error: ${err.message}\n`);
  process.exit(1);
}

const drifted = [];
for (const { path, content: expected } of outputs) {
  const abs = join(REPO_ROOT, path);
  let actual;
  try {
    actual = readFileSync(abs, 'utf8');
  } catch {
    drifted.push({ path, reason: 'missing' });
    continue;
  }
  if (actual !== expected) {
    drifted.push({ path, reason: 'content drift' });
  }
}

if (drifted.length === 0) {
  process.exit(0);
}

console.error('\nai/ bundle is out of sync with the source-of-truth root files:\n');
for (const { path, reason } of drifted) {
  console.error(`  - ${path} (${reason})`);
}
console.error(
  '\nRun `node scripts/sync-ai-bundle.mjs` to regenerate, then commit the result.\n'
  + 'See docs/12-ai-assistant-configs.md for the bundle contract.\n',
);
process.exit(1);
