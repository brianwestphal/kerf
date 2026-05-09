/**
 * Aggregate webdriver-ts result JSON files into a markdown table for kerfjs +
 * the reference frameworks. Run after `bench/run.sh` completes:
 *
 *   node bench/aggregate-results.mjs
 *
 * Produces a table per benchmark category (CPU / memory / size) ranked by
 * median, with kerfjs highlighted. Output is stdout — pipe to a file, or
 * paste into bench/results.md.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RESULTS_DIR = new URL('./.bench-cache/js-framework-benchmark/webdriver-ts/results/', import.meta.url).pathname;

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

const byFramework = loadAll();
console.log('# kerfjs vs reference frameworks — krausest js-framework-benchmark');
console.log('');
console.log(`Frameworks measured: ${[...byFramework.keys()].join(', ')}`);
console.log('');
console.log('All numbers are medians across the iterations the benchmark ran (per `--count`). Lower is better. Sorted by the first column.');
console.log(table('CPU benchmarks (ms)', CPU_BENCHMARKS, byFramework));
console.log(table('Memory benchmarks', MEM_BENCHMARKS, byFramework));
console.log(table('Size + first-paint', SIZE_BENCHMARKS, byFramework));
