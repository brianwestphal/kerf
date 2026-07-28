#!/usr/bin/env node
/**
 * Run the rule suite against every ESLint major the plugin claims to support,
 * and fail if the claim and the evidence have come apart.
 *
 * The `peerDependencies.eslint` range is a **tested** range, not an aspiration:
 * it names only majors this script has actually executed against. That is the
 * whole point — the range it replaced was `>=8`, which promised every ESLint
 * that would ever exist, while the suite only ever ran on 9. A consumer on a
 * major we had never tried would have installed cleanly and found out for
 * themselves.
 *
 * Two things are checked here, and the second matters as much as the first:
 *
 *   1. The suite passes on each major in `SUPPORTED`.
 *   2. `SUPPORTED`, the declared peer range, and the CI matrix all name the
 *      same set. Three copies of one fact drift; this refuses to let them.
 *
 * Adding a major is therefore a deliberate act: add it here, widen the range,
 * add it to the matrix, and only then does anything go green.
 *
 * Run: `npm run test:eslint-matrix` (from eslint-plugin/)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = resolve(HERE, '..');
const REPO = resolve(PLUGIN, '..');

/**
 * The latest release of each supported major. Pinned rather than floating:
 * a matrix that silently starts testing something else is not a record of what
 * was verified. Bump these deliberately when a new patch lands.
 */
const SUPPORTED = ['8.57.1', '9.39.5', '10.8.0'];

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: PLUGIN, encoding: 'utf8', stdio: 'pipe', ...opts });

function fail(lines) {
  console.error(`\n[eslint-matrix] FAILED:\n`);
  for (const l of lines) console.error(`  - ${l}`);
  console.error('');
  process.exit(1);
}

// --- 1. The three declarations must agree -----------------------------------

const problems = [];
const majors = SUPPORTED.map((v) => v.split('.')[0]);

const peerRange = JSON.parse(readFileSync(resolve(PLUGIN, 'package.json'), 'utf8'))
  .peerDependencies.eslint;

// Both directions. Checking only "every tested major is named" would let
// someone widen the range to an untested major and stay green — which is the
// precise failure this replaced, just spelled differently.
for (const major of majors) {
  if (!peerRange.includes(`^${major}.`)) {
    problems.push(
      `peerDependencies.eslint is ${JSON.stringify(peerRange)}, which does not name ESLint ${major}. `
      + 'The declared range must be exactly the tested set.',
    );
  }
}
const namedMajors = [...peerRange.matchAll(/\^(\d+)\./g)].map((m) => m[1]);
for (const major of namedMajors) {
  if (!majors.includes(major)) {
    problems.push(
      `peerDependencies.eslint promises ESLint ${major}, which is not in SUPPORTED and has never been run. `
      + 'Add it to SUPPORTED and the CI matrix and let the suite prove it, or drop it from the range.',
    );
  }
}
// An open-ended range defeats the entire policy, so refuse it outright.
if (/>=|\*/.test(peerRange)) {
  problems.push(
    `peerDependencies.eslint is ${JSON.stringify(peerRange)} — an open range promises majors that do not `
    + 'exist yet and cannot have been tested. Name the supported majors explicitly.',
  );
}

const ci = readFileSync(resolve(REPO, '.github/workflows/ci.yml'), 'utf8');
const matrixLine = /eslint:\s*\[([^\]]*)\]/.exec(ci);
if (matrixLine === null) {
  problems.push('could not find the `eslint:` matrix in .github/workflows/ci.yml.');
} else {
  const inCi = [...matrixLine[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const missing = SUPPORTED.filter((v) => !inCi.includes(v));
  const extra = inCi.filter((v) => !SUPPORTED.includes(v));
  if (missing.length) problems.push(`CI matrix is missing: ${missing.join(', ')}`);
  if (extra.length) problems.push(`CI matrix tests versions this script does not: ${extra.join(', ')}`);
}

if (problems.length) fail(problems);

// --- 2. The suite must pass on each ----------------------------------------

const installed = JSON.parse(readFileSync(resolve(PLUGIN, 'package.json'), 'utf8'))
  .devDependencies.eslint;
console.log(`[eslint-matrix] peer range ${peerRange}\n`);

const failures = [];
for (const version of SUPPORTED) {
  process.stdout.write(`  eslint ${version.padEnd(9)} `);
  try {
    run('npm', ['install', '--no-save', '--no-audit', '--no-fund', `eslint@${version}`]);
    const out = run('npm', ['test']);
    const pass = /# pass (\d+)/.exec(out)?.[1] ?? '?';
    console.log(`ok — ${pass} assertions`);
  } catch (err) {
    console.log('FAILED');
    failures.push(`${version}: ${(err.stdout ?? err.message ?? '').toString().slice(-600)}`);
  }
}

// Put the working tree back the way the lockfile describes it.
run('npm', ['install', '--no-save', '--no-audit', '--no-fund', `eslint@${installed}`]);

if (failures.length) {
  fail([
    ...failures,
    'Either fix the plugin for that major, or drop it from SUPPORTED, the peer range and the CI matrix together. '
    + 'Do not leave a major in the range that the suite cannot pass on.',
  ]);
}

console.log(`\n[eslint-matrix] OK — ${SUPPORTED.length} ESLint majors verified, and the peer range names exactly those.`);
