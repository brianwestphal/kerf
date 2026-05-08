#!/usr/bin/env node
/* eslint-disable */
/**
 * Read every per-framework / per-benchmark JSON in
 *   bench/.bench-cache/js-framework-benchmark/webdriver-ts/results/
 * and print a side-by-side comparison table to stdout.
 *
 * No deps, no AI. Runs against the most recent local benchmark output —
 * `bench/run.sh` writes those JSONs.
 *
 * Usage:
 *   node bench/results-table.mjs                # default: kerfjs first
 *   node bench/results-table.mjs --csv          # CSV instead of fixed-width
 *   node bench/results-table.mjs --pin solid    # put `solid*` first instead
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(
  HERE,
  '.bench-cache',
  'js-framework-benchmark',
  'webdriver-ts',
  'results',
);

const args = process.argv.slice(2);
const csvMode = args.includes('--csv');
const pinIdx = args.indexOf('--pin');
const pinPrefix = pinIdx !== -1 ? args[pinIdx + 1] : 'kerfjs';

let files;
try {
  files = readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));
} catch (err) {
  console.error(`Could not read ${RESULTS_DIR}: ${err.message}`);
  console.error('Run bench/run.sh first to populate results.');
  process.exit(1);
}

if (files.length === 0) {
  console.error(`No result JSONs in ${RESULTS_DIR}. Run bench/run.sh first.`);
  process.exit(1);
}

// frameworks[name] = true; benches[id] = { type, byFramework: { fw: mean, ... } }
const frameworks = new Set();
const benches = new Map();

for (const file of files) {
  const raw = readFileSync(join(RESULTS_DIR, file), 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`Skipping unparseable ${file}`);
    continue;
  }
  const fw = parsed.framework;
  const bench = parsed.benchmark;
  const type = parsed.type;
  // CPU benches use values.total; size/memory/startup use values.DEFAULT.
  const slot = parsed.values?.total ?? parsed.values?.DEFAULT;
  if (slot === undefined || slot === null) continue;
  frameworks.add(fw);
  if (!benches.has(bench)) benches.set(bench, { type, byFramework: {} });
  benches.get(bench).byFramework[fw] = {
    mean: slot.mean,
    stddev: slot.stddev,
  };
}

// Order frameworks: pinned-prefix first, then alphabetical.
const fwList = [...frameworks].sort((a, b) => {
  const aPin = a.startsWith(pinPrefix);
  const bPin = b.startsWith(pinPrefix);
  if (aPin && !bPin) return -1;
  if (bPin && !aPin) return 1;
  return a.localeCompare(b);
});

// Order benches: numeric prefix sort matches the upstream display order.
const benchList = [...benches.keys()].sort();

const UNITS = {
  cpu: 'ms',
  startup: 'ms',
  memory: 'MB',
  size: 'KB',
};

// Upstream tags first-paint as type=size for historical reasons but the
// actual measurement is milliseconds. Special-case the unit so readers don't
// think 124.9 means "kilobytes painted".
function unitFor(benchId, type) {
  if (benchId === '43_first-paint') return 'ms';
  return UNITS[type] ?? type;
}

function fmt(n, decimals = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toFixed(decimals);
}

if (csvMode) {
  // CSV: bench, type, then one column per framework.
  const header = ['benchmark', 'unit', ...fwList];
  console.log(header.join(','));
  for (const id of benchList) {
    const row = benches.get(id);
    const unit = unitFor(id, row.type);
    const cells = fwList.map((fw) => {
      const v = row.byFramework[fw];
      return v === undefined ? '' : fmt(v.mean, 2);
    });
    console.log([id, unit, ...cells].join(','));
  }
  process.exit(0);
}

// Fixed-width table mode.

// Compute per-bench winner (lowest mean) for relative annotation.
const winners = new Map();
for (const id of benchList) {
  const row = benches.get(id);
  let best = Infinity;
  let bestFw = null;
  for (const fw of fwList) {
    const v = row.byFramework[fw];
    if (v === undefined) continue;
    if (v.mean < best) { best = v.mean; bestFw = fw; }
  }
  winners.set(id, { best, bestFw });
}

// Build column widths.
const benchHeader = 'benchmark';
const unitHeader = 'unit';
const longestBench = Math.max(benchHeader.length, ...benchList.map((b) => b.length));
const longestUnit = Math.max(unitHeader.length, 4);
const fwWidths = {};
for (const fw of fwList) fwWidths[fw] = fw.length;
for (const id of benchList) {
  const row = benches.get(id);
  const w = winners.get(id);
  for (const fw of fwList) {
    const v = row.byFramework[fw];
    if (v === undefined) continue;
    const ratio = w.best > 0 ? v.mean / w.best : 1;
    const text = fw === w.bestFw
      ? `${fmt(v.mean, 2)} ±${fmt(v.stddev ?? 0, 2)} *`
      : `${fmt(v.mean, 2)} ±${fmt(v.stddev ?? 0, 2)} (${fmt(ratio, 2)}×)`;
    if (text.length > fwWidths[fw]) fwWidths[fw] = text.length;
  }
}

function pad(s, w, left = false) {
  s = String(s);
  if (s.length >= w) return s;
  return left ? s + ' '.repeat(w - s.length) : ' '.repeat(w - s.length) + s;
}

const header = [
  pad(benchHeader, longestBench, true),
  pad(unitHeader, longestUnit, true),
  ...fwList.map((fw) => pad(fw, fwWidths[fw], true)),
].join('  ');
const sep = [
  '-'.repeat(longestBench),
  '-'.repeat(longestUnit),
  ...fwList.map((fw) => '-'.repeat(fwWidths[fw])),
].join('  ');

// Surface the mtime of the newest results file so readers know how stale the data is.
let newestMtime = 0;
for (const f of files) {
  const m = statSync(join(RESULTS_DIR, f)).mtimeMs;
  if (m > newestMtime) newestMtime = m;
}
const dateStr = newestMtime > 0 ? new Date(newestMtime).toISOString().slice(0, 10) : 'unknown';

console.log(`# js-framework-benchmark — local results (newest file: ${dateStr})`);
console.log(`# ${fwList.length} framework(s); * = fastest in row; (N×) = ratio to fastest.`);
console.log();
console.log(header);
console.log(sep);

for (const id of benchList) {
  const row = benches.get(id);
  const w = winners.get(id);
  const unit = unitFor(id, row.type);
  const cells = fwList.map((fw) => {
    const v = row.byFramework[fw];
    if (v === undefined) return pad('—', fwWidths[fw], true);
    const ratio = w.best > 0 ? v.mean / w.best : 1;
    const text = fw === w.bestFw
      ? `${fmt(v.mean, 2)} ±${fmt(v.stddev ?? 0, 2)} *`
      : `${fmt(v.mean, 2)} ±${fmt(v.stddev ?? 0, 2)} (${fmt(ratio, 2)}×)`;
    return pad(text, fwWidths[fw], true);
  });
  console.log([
    pad(id, longestBench, true),
    pad(unit, longestUnit, true),
    ...cells,
  ].join('  '));
}
