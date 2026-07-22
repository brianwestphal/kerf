/**
 * Aggregate LOCAL webdriver-ts result JSON files into a markdown table for
 * kerfjs + the reference frameworks. Run after `bench/run.sh` completes:
 *
 *   node bench/aggregate-results.mjs > bench/results.local.md
 *
 * Produces a table per benchmark category (CPU / memory / size) ranked by
 * median, with kerfjs highlighted. Output is stdout.
 *
 * DEV-ONLY (KF-291): this reads the LOCAL M1-Pro bench cache and is for
 * "did my change move the needle?" verification/profiling. It is NOT the
 * source of the site's published numbers — those come from the official
 * upstream krausest run via `bench/import-krausest.mjs`, which writes the
 * git-tracked `bench/results.json` + `bench/results.md`. To avoid clobbering
 * that published snapshot, this script's JSON side effect writes the
 * gitignored `bench/results.local.json` instead.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RESULTS_DIR = new URL('./.bench-cache/js-framework-benchmark/webdriver-ts/results/', import.meta.url).pathname;
// DEV-ONLY output path — the PUBLISHED bench/results.json comes from
// import-krausest.mjs. See the header note (KF-291).
const JSON_OUT = new URL('./results.local.json', import.meta.url).pathname;

// CPU benchmarks in display order with friendly labels.
const CPU_BENCHMARKS = [
  ['01_run1k', 'create 1k'],
  ['02_replace1k', 'replace 1k'],
  ['03_update10th1k_x16', 'partial update'],
  ['04_select1k', 'select row'],
  ['05_swap1k', 'swap rows'],
  ['06_remove-one-1k', 'remove row'],
  ['07_create10k', 'create 10k'],
  ['08_create1k-after1k_x2', 'append 1k'],
  ['09_clear1k_x8', 'clear 1k'],
];
const MEM_BENCHMARKS = [
  ['21_ready-memory', 'ready memory (MB)'],
  ['22_run-memory', 'run memory (MB)'],
  ['25_run-clear-memory', 'cleared memory (MB)'],
];
const SIZE_BENCHMARKS = [
  ['42_size-compressed', 'gzipped bundle (KB)'],
  ['41_size-uncompressed', 'uncompressed (KB)'],
  ['43_first-paint', 'first paint (ms)'],
];

function loadAll() {
  const byFramework = new Map();
  for (const file of readdirSync(RESULTS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(readFileSync(join(RESULTS_DIR, file), 'utf8'));
    if (!data.framework || !data.benchmark) continue;
    if (!byFramework.has(data.framework)) byFramework.set(data.framework, {});
    byFramework.get(data.framework)[data.benchmark] = data;
  }
  return byFramework;
}

function median(d) {
  const v = d?.values?.total ?? d?.values?.DEFAULT;
  return v?.median ?? null;
}

function table(title, benchmarks, byFramework) {
  const headers = ['framework', ...benchmarks.map(([, label]) => label)];
  const rows = [];
  for (const [fw, results] of byFramework) {
    const row = [fw];
    let any = false;
    for (const [bench] of benchmarks) {
      const v = median(results[bench]);
      if (v !== null) any = true;
      row.push(v === null ? '—' : v.toFixed(1));
    }
    if (any) rows.push(row);
  }
  // Sort by the first numeric column (lower is better).
  rows.sort((a, b) => {
    const av = parseFloat(a[1]); const bv = parseFloat(b[1]);
    if (Number.isNaN(av) && Number.isNaN(bv)) return 0;
    if (Number.isNaN(av)) return 1;
    if (Number.isNaN(bv)) return -1;
    return av - bv;
  });
  let out = `\n### ${title}\n\n`;
  out += `| ${headers.join(' | ')} |\n`;
  out += `| ${headers.map(() => '---').join(' | ')} |\n`;
  for (const row of rows) {
    const fw = row[0];
    const isKerf = fw.startsWith('kerfjs');
    const fwLabel = isKerf ? `**${fw}**` : fw;
    out += `| ${fwLabel} | ${row.slice(1).join(' | ')} |\n`;
  }
  return out;
}

function newestResultMtime() {
  let newest = 0;
  for (const file of readdirSync(RESULTS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const m = statSync(join(RESULTS_DIR, file)).mtimeMs;
    if (m > newest) newest = m;
  }
  return newest === 0 ? null : new Date(newest).toISOString();
}

// Parse the webdriver-ts framework key (e.g. `kerfjs-v0.4.2-keyed`,
// `react-hooks-v19.2-keyed`, `vanillajs-v1.0.0-non-keyed`) into a
// display-friendly `{ name, version, keyed }`. The pattern is
// `<name>-v<version>-<keyed|non-keyed>`.
function parseFrameworkKey(key) {
  const m = key.match(/^(.+)-v([^-]+(?:-[^-]+)*?)-(keyed|non-keyed)$/);
  if (m === null) return { name: key, version: '', keyed: null };
  return { name: m[1], version: m[2], keyed: m[3] === 'keyed' };
}

function buildJsonSnapshot(byFramework) {
  const scenarios = CPU_BENCHMARKS.map(([id, label]) => ({ id, label }));
  const frameworks = [];
  for (const [key, results] of byFramework) {
    const { name, version, keyed } = parseFrameworkKey(key);
    const values = CPU_BENCHMARKS.map(([bench]) => median(results[bench]));
    if (values.every((v) => v === null)) continue;
    frameworks.push({ key, name, version, keyed, values });
  }
  // Stable sort by name, then version — consumers (PerfTable, etc.) can
  // re-sort by their own preferred axis.
  frameworks.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.version.localeCompare(b.version)));
  return {
    capturedAt: newestResultMtime(),
    scenarios,
    frameworks,
  };
}

const byFramework = loadAll();
console.log('# kerfjs vs reference frameworks — krausest js-framework-benchmark');
console.log('');
console.log(`Frameworks measured: ${[...byFramework.keys()].join(', ')}`);
console.log('');
console.log('All numbers are medians across the iterations the benchmark ran (per `--count`). Lower is better. Sorted by the first column.');
console.log(table('CPU benchmarks (ms)', CPU_BENCHMARKS, byFramework));
console.log(table('Memory benchmarks', MEM_BENCHMARKS, byFramework));
console.log(table('Size + first-paint', SIZE_BENCHMARKS, byFramework));

writeFileSync(JSON_OUT, JSON.stringify(buildJsonSnapshot(byFramework), null, 2) + '\n');
console.error(`\n[aggregate-results] wrote ${JSON_OUT}`);
