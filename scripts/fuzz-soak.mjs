#!/usr/bin/env node
/**
 * Long-running soak for the reconciler fuzz harness (`npm run fuzz:soak`).
 *
 * A single process cannot run an unbounded number of cases, and the reason is
 * not kerf and not the harness: **happy-dom retains detached DOM trees.** A
 * loop that only does `createElement` → `innerHTML` → `appendChild` →
 * `remove()`, with no kerf involved at all, retains roughly 1.5 MB per
 * iteration of a 200-node tree — perfectly linearly, and it OOMs under a
 * 400 MB cap. Every case the harness runs mounts at least one tree, and the
 * differential invariant mounts another per mutation, so the ceiling arrives
 * somewhere between 6k and 15k cases however the harness is written.
 *
 * So this runner sidesteps it rather than fighting it: each window of seeds
 * runs in a **fresh process**, which starts with a clean heap. Total case count
 * is then unbounded — an overnight or nightly run is just a bigger `--total`.
 *
 * Usage:
 *   node scripts/fuzz-soak.mjs                       # 20k cases in 2.5k windows
 *   node scripts/fuzz-soak.mjs --total 200000        # overnight
 *   node scripts/fuzz-soak.mjs --window 1000         # smaller windows
 *   node scripts/fuzz-soak.mjs --seed 12345          # start elsewhere
 *
 * Exits non-zero on the first failing window and prints its output verbatim,
 * including the shrunk reproduction the harness produces.
 */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SPEC = 'tests/unit/reconciler-fuzz.test.ts';

/** Window size that comfortably fits a default Node heap, measured not guessed. */
const DEFAULT_WINDOW = 2500;
const DEFAULT_TOTAL = 20_000;
const DEFAULT_SEED = 20_260_724;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = Number(process.argv[i + 1]);
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`fuzz-soak: --${name} needs a positive number`);
    process.exit(2);
  }
  return value;
}

const total = arg('total', DEFAULT_TOTAL);
const window = arg('window', DEFAULT_WINDOW);
const baseSeed = arg('seed', DEFAULT_SEED);
const windows = Math.ceil(total / window);

console.log(
  `fuzz-soak: ${total} cases in ${windows} window(s) of ${window}, `
  + `seeds ${baseSeed}–${baseSeed + total - 1}, one process each.`,
);

const startedAt = Date.now();
for (let w = 0; w < windows; w++) {
  const seed = baseSeed + w * window;
  const runs = Math.min(window, total - w * window);
  const label = `window ${w + 1}/${windows} (seed ${seed}, ${runs} cases)`;
  process.stdout.write(`  ${label} … `);

  const result = spawnSync(
    'npx',
    ['vitest', 'run', SPEC, '--coverage.enabled=false'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        KERF_FUZZ_SEED: String(seed),
        KERF_FUZZ_RUNS: String(runs),
      },
    },
  );

  if (result.status !== 0) {
    console.log('FAILED\n');
    console.log(result.stdout ?? '');
    console.error(result.stderr ?? '');
    console.error(`\nfuzz-soak: ${label} failed. Reproduce it alone with:`);
    console.error(`  KERF_FUZZ_SEED=${seed} KERF_FUZZ_RUNS=${runs} npx vitest run ${SPEC}`);
    process.exit(1);
  }
  console.log('ok');
}

const mins = ((Date.now() - startedAt) / 60_000).toFixed(1);
console.log(`fuzz-soak: ${total} cases clean in ${mins} min.`);
