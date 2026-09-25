#!/usr/bin/env node
// Run the sibling-package gates CI runs as separate jobs, scoped to what this
// branch changed, and warn when CI on main is already red. The selection logic
// lives in scripts/lib/package-gates.mjs (unit-tested); this file is the I/O.
//
//   KERF_SKIP_PACKAGE_GATES=1  skip the package gates (CI runs them anyway)
//   KERF_SKIP_CI_STATUS=1      skip the `gh` CI-status lookup

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { ciStatusWarning, selectPackageGates } from './lib/package-gates.mjs';

const root = process.cwd();

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

/** Paths changed since the upstream merge-base, incl. uncommitted + untracked; `null` if unknown. */
function changedPaths() {
  const base = git(['merge-base', 'HEAD', '@{upstream}']);
  if (base === null) return null;
  const diff = git(['diff', '--name-only', base]);
  const untracked = git(['ls-files', '--others', '--exclude-standard']);
  if (diff === null || untracked === null) return null;
  return [...diff.split('\n'), ...untracked.split('\n')].filter(Boolean);
}

function reportCiStatus() {
  if (process.env.KERF_SKIP_CI_STATUS === '1') return;
  const result = spawnSync(
    'gh',
    [
      'run',
      'list',
      '--branch',
      'main',
      '--workflow',
      'CI',
      '--limit',
      '3',
      '--json',
      'status,conclusion,headSha,url',
    ],
    { cwd: root, encoding: 'utf8', timeout: 8000 },
  );
  // No gh, no auth, or offline: the status is advisory, so stay silent.
  if (result.status !== 0 || !result.stdout) return;
  try {
    const warning = ciStatusWarning(JSON.parse(result.stdout));
    if (warning !== null) console.warn(`\n[package-gates] WARNING: ${warning}`);
  } catch {
    /* unparseable output is treated like an unavailable gh */
  }
}

reportCiStatus();

if (process.env.KERF_SKIP_PACKAGE_GATES === '1') {
  console.log('[package-gates] skipped (KERF_SKIP_PACKAGE_GATES=1)');
  process.exit(0);
}

const changed = changedPaths();
const gates = selectPackageGates(changed);
if (gates.length === 0) {
  console.log('[package-gates] no sibling-package changes — nothing to run');
  process.exit(0);
}
console.log(
  `[package-gates] running ${gates.map((gate) => gate.name).join(', ')}${
    changed === null ? ' (no upstream to diff against — running all)' : ''
  }`,
);

for (const gate of gates) {
  if (!existsSync(join(root, gate.dir, 'node_modules'))) {
    console.error(
      `[package-gates] ${gate.name}: ${gate.dir}/node_modules is missing — run \`npm --prefix ${gate.dir} ci\` (or set KERF_SKIP_PACKAGE_GATES=1 and rely on CI).`,
    );
    process.exit(1);
  }
  console.log(`\n[package-gates] ${gate.name}`);
  const result = spawnSync('npm', gate.args, {
    cwd: join(root, gate.dir),
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`[package-gates] ${gate.name} failed`);
    process.exit(result.status ?? 1);
  }
}
