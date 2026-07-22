/**
 * Import the OFFICIAL cross-framework benchmark numbers from the upstream
 * krausest/js-framework-benchmark published results into `bench/results.json`
 * (+ `bench/results.md`).
 *
 * kerf is a merged upstream entry (`frameworks/keyed/kerfjs`, pinned to the
 * current published kerfjs version), so krausest measures kerf alongside every
 * competitor on ONE reference machine — the canonical, comparable, official
 * source. This is the source of truth for the numbers the site publishes; the
 * local `bench/run.sh` harness (+ `aggregate-results.mjs`) stays as a dev-time
 * verification / profiling tool and no longer feeds the published snapshot.
 *
 *   node bench/import-krausest.mjs            # fetch the live published data
 *   node bench/import-krausest.mjs <file.ts>  # parse a local results.ts copy
 *
 * Writes:
 *   - bench/results.json — CPU snapshot the homepage `PerfTable.astro` imports
 *     at build time (same schema as before, plus a `source` block).
 *   - bench/results.md   — full human-readable CPU / memory / size tables.
 *
 * Refresh + commit both whenever krausest republishes (e.g. after a kerf
 * release bumps the pinned version upstream, or on a reference-framework bump).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// The published data behind https://krausest.github.io/js-framework-benchmark/current.html
const DATA_URL =
  'https://raw.githubusercontent.com/krausest/js-framework-benchmark/master/webdriver-ts-results/src/results.ts';
const SITE_URL = 'https://krausest.github.io/js-framework-benchmark/current.html';

const JSON_OUT = new URL('./results.json', import.meta.url).pathname;
const MD_OUT = new URL('./results.md', import.meta.url).pathname;

// The frameworks we publish, matched by their exact upstream `dir` (unambiguous
// — `name`/version drift across runs, `dir` doesn't). Edit this list to change
// the tracked set; the importer picks up whatever version krausest currently
// ships for each dir.
const TRACKED_DIRS = [
  'keyed/kerfjs',
  'keyed/solid',
  'keyed/lit',
  'keyed/vue',
  'keyed/react-hooks',
  'keyed/vanjs',
  'keyed/preact-signals',
  'non-keyed/vanillajs',
];

// Benchmark id → friendly label, in display order (mirrors aggregate-results.mjs).
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

/** Extract `export const <name> = [ ... ]` as parsed JSON (tolerates TS trailing commas). */
function extractArray(src, name) {
  const decl = src.indexOf('export const ' + name);
  if (decl === -1) throw new Error(`import-krausest: could not find "export const ${name}" in the data`);
  const start = src.indexOf('[', src.indexOf('=', decl));
  let depth = 0;
  let end = start;
  for (; end < src.length; end++) {
    const c = src[end];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) { end++; break; }
    }
  }
  return JSON.parse(src.slice(start, end).replace(/,(\s*[\]}])/g, '$1'));
}

function median(arr) {
  if (!arr || arr.length === 0) return null;
  const b = [...arr].sort((x, y) => x - y);
  const n = b.length;
  return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2;
}

// Parse an upstream framework key (`kerfjs-v0.16.0-keyed`, `vanillajs-non-keyed`)
// into `{ name, version }` — identical convention to aggregate-results.mjs so
// results.json stays byte-comparable in shape.
function parseFrameworkKey(key) {
  const m = key.match(/^(.+)-v([^-]+(?:-[^-]+)*?)-(keyed|non-keyed)$/);
  if (m === null) return { name: key, version: '' };
  return { name: m[1], version: m[2] };
}

async function loadSource() {
  const localArg = process.argv[2];
  if (localArg) return readFileSync(localArg, 'utf8');
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    // Some sandboxes allow `curl` but not node's fetch DNS — fall back to it.
    try {
      return execFileSync('curl', ['-fsSL', DATA_URL], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch {
      throw new Error(`import-krausest: could not fetch ${DATA_URL} (fetch: ${err.message}); pass a local results.ts path as an argument to parse offline`);
    }
  }
}

const src = await loadSource();
const frameworks = extractArray(src, 'frameworks');
const benchmarks = extractArray(src, 'benchmarks');
const results = extractArray(src, 'results');

const benchIdxById = new Map(benchmarks.map((b, i) => [b.id, i]));
const fwByDir = new Map(frameworks.map((f, i) => [f.dir, { ...f, index: i }]));

// framework index → { benchmark id → median }
const medianByFwBench = new Map();
for (const r of results) {
  const per = medianByFwBench.get(r.f) ?? new Map();
  for (const bb of r.b) {
    const v = bb.v?.total ?? bb.v?.DEFAULT;
    per.set(bb.b, median(v));
  }
  medianByFwBench.set(r.f, per);
}

function valueFor(fwIndex, benchId) {
  const bi = benchIdxById.get(benchId);
  if (bi === undefined) return null;
  return medianByFwBench.get(fwIndex)?.get(bi) ?? null;
}

// Resolve the tracked frameworks (error loudly if upstream renamed a dir).
const tracked = TRACKED_DIRS.map((dir) => {
  const f = fwByDir.get(dir);
  if (!f) throw new Error(`import-krausest: tracked dir "${dir}" not found upstream — update TRACKED_DIRS`);
  const { name, version } = parseFrameworkKey(f.name);
  return { key: f.name, name, version, keyed: f.keyed, index: f.index };
});

const importedAt = new Date().toISOString();

// ── results.json — CPU snapshot for PerfTable.astro ────────────────────────
const snapshot = {
  capturedAt: importedAt,
  source: {
    benchmark: 'krausest/js-framework-benchmark',
    site: SITE_URL,
    data: DATA_URL,
    statistic: 'median of per-iteration totals',
    note: 'Official numbers measured on the krausest reference machine; kerf is a merged upstream entry (frameworks/keyed/kerfjs).',
    importedAt,
  },
  scenarios: CPU_BENCHMARKS.map(([id, label]) => ({ id, label })),
  frameworks: [...tracked]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.version.localeCompare(b.version)))
    .map(({ key, name, version, keyed, index }) => ({
      key,
      name,
      version,
      keyed,
      values: CPU_BENCHMARKS.map(([id]) => valueFor(index, id)),
    })),
};
writeFileSync(JSON_OUT, JSON.stringify(snapshot, null, 2) + '\n');

// ── results.md — full human-readable tables ────────────────────────────────
function table(title, benches) {
  const headers = ['framework', ...benches.map(([, label]) => label)];
  const rows = tracked
    .map((f) => ({
      key: f.key,
      cells: benches.map(([id]) => valueFor(f.index, id)),
    }))
    .filter((r) => r.cells.some((v) => v !== null))
    .sort((a, b) => {
      const av = a.cells[0]; const bv = b.cells[0];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av - bv;
    });
  let out = `\n### ${title}\n\n`;
  out += `| ${headers.join(' | ')} |\n`;
  out += `| ${headers.map(() => '---').join(' | ')} |\n`;
  for (const r of rows) {
    const label = r.key.startsWith('kerfjs') ? `**${r.key}**` : r.key;
    out += `| ${label} | ${r.cells.map((v) => (v === null ? '—' : v.toFixed(1))).join(' | ')} |\n`;
  }
  return out;
}

const md =
  '# kerfjs vs reference frameworks — krausest js-framework-benchmark\n\n' +
  `**Source of truth:** the official [krausest js-framework-benchmark](${SITE_URL}), ` +
  'measured on the maintainer\'s reference machine. kerf is a merged upstream entry ' +
  '(`frameworks/keyed/kerfjs`), so it is measured alongside every competitor on the same ' +
  'hardware in the same run — the numbers below are therefore directly comparable and ' +
  'independently reproducible.\n\n' +
  `Imported from krausest\'s published results via \`node bench/import-krausest.mjs\` on ${importedAt.slice(0, 10)}. ` +
  'Re-run + commit to refresh.\n\n' +
  `Frameworks: ${tracked.map((f) => f.key).join(', ')}\n\n` +
  'All numbers are medians of the per-iteration totals krausest published. Lower is better. ' +
  'Sorted by the first column.\n' +
  table('CPU benchmarks (ms)', CPU_BENCHMARKS) +
  table('Memory benchmarks', MEM_BENCHMARKS) +
  table('Size + first-paint', SIZE_BENCHMARKS);
writeFileSync(MD_OUT, md);

console.error(`[import-krausest] wrote ${JSON_OUT} and ${MD_OUT} (${tracked.length} frameworks, imported ${importedAt.slice(0, 10)})`);
