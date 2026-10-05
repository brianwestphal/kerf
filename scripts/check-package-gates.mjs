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
  const deadline = Date.now() + 8000;
  const workflow = 'repos/{owner}/{repo}/actions/workflows/ci.yml/runs';
  let upperBound = Date.now();
  function request(endpoint) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('CI lookup deadline expired');
    const result = spawnSync(
      'gh',
      ['api', '-H', 'Cache-Control: no-cache', endpoint],
      { cwd: root, encoding: 'utf8', timeout: remaining },
    );
    if (result.status !== 0 || !result.stdout)
      throw new Error('CI unavailable');
    return JSON.parse(result.stdout);
  }
  function timestamp(value) {
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    )
      throw new Error('Invalid run creation time');
    const parsed = Date.parse(value);
    const canonical = Number.isFinite(parsed)
      ? new Date(parsed).toISOString()
      : '';
    if (value !== canonical && value !== canonical.replace('.000Z', 'Z'))
      throw new Error('Invalid run creation time');
    return parsed;
  }
  function validate(run, lower, upper) {
    if (
      !run ||
      run.status !== 'completed' ||
      run.head_branch !== 'main' ||
      !Number.isSafeInteger(run.id) ||
      run.id <= 0 ||
      typeof run.conclusion !== 'string' ||
      !run.conclusion ||
      typeof run.head_sha !== 'string' ||
      !/^[a-f0-9]{40}$/.test(run.head_sha) ||
      typeof run.html_url !== 'string' ||
      !run.html_url.startsWith('https://github.com/')
    )
      throw new Error('Invalid completed main run');
    const created = timestamp(run.created_at);
    if (created < lower || created > upper) throw new Error('Out-of-range run');
    return run;
  }
  function list(created, lower, upper, limit = 1) {
    const payload = request(
      `${workflow}?branch=main&status=completed&per_page=${limit}&created=${encodeURIComponent(created)}`,
    );
    if (
      !Array.isArray(payload.workflow_runs) ||
      !Number.isSafeInteger(payload.total_count) ||
      payload.total_count < 0 ||
      payload.workflow_runs.length > limit ||
      payload.workflow_runs.length !== Math.min(payload.total_count, limit)
    )
      throw new Error('Invalid run list');
    return {
      count: payload.total_count,
      runs: payload.workflow_runs.map((run) => validate(run, lower, upper)),
    };
  }
  const unavailable = () =>
    console.warn(
      '[package-gates] WARNING: CI status on main is unavailable; local checks do not verify remote CI.',
    );
  try {
    let latest = list(`<=${new Date(upperBound).toISOString()}`, 0, upperBound)
      .runs[0];
    // Empty lists also need independent confirmation with a moving bound.
    if (!latest) {
      upperBound = Math.max(Date.now(), upperBound + 1);
      latest = list(`<=${new Date(upperBound).toISOString()}`, 0, upperBound)
        .runs[0];
      if (!latest) throw new Error('No completed CI evidence');
    }
    let confirmed = false;
    for (let hop = 0; hop < 5; hop++) {
      const lower = timestamp(latest.created_at) + 1;
      upperBound = Math.max(Date.now(), upperBound + 1);
      // Unlike an unbounded cached list, this response must exclude the old
      // candidate. No fixed age cutoff and no commit-ancestry inference.
      const newer = list(
        `${new Date(lower).toISOString()}..${new Date(upperBound).toISOString()}`,
        lower,
        upperBound,
      ).runs[0];
      if (newer) {
        latest = newer;
        continue;
      }
      confirmed = true;
      break;
    }
    if (!confirmed) throw new Error('CI freshness not established');
    // GitHub creation timestamps have second precision. Resolve same-time
    // runs by ID without assuming commit order or rerun completion order.
    const created = timestamp(latest.created_at);
    const ties = list(
      `${latest.created_at}..${latest.created_at}`,
      created,
      created,
      100,
    );
    if (ties.count > 100 || !ties.runs.some((run) => run.id === latest.id))
      throw new Error('Cannot establish same-time ordering');
    latest = ties.runs.reduce(
      (newest, run) => (run.id > newest.id ? run : newest),
      latest,
    );
    // Re-runs keep their creation timestamp: read the selected run directly
    // so its current conclusion, rather than a cached list conclusion, wins.
    const current = validate(
      request(`repos/{owner}/{repo}/actions/runs/${latest.id}`),
      created,
      created,
    );
    if (current.id !== latest.id || current.head_sha !== latest.head_sha)
      throw new Error('Inconsistent run detail');
    const warning = ciStatusWarning([
      {
        status: current.status,
        conclusion: current.conclusion,
        headSha: current.head_sha,
        url: current.html_url,
      },
    ]);
    if (warning !== null) console.warn(`\n[package-gates] WARNING: ${warning}`);
  } catch {
    unavailable();
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
