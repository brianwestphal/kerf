/**
 * Property-based (fuzz) testing for `bindList` — see `fuzz/bindlist.ts` for the
 * model, the mutation alphabet, and the invariants (KF-YVMSEK).
 *
 * `reconciler-fuzz.test.ts` drives `each()` through `mount()`; this sweep
 * drives the OTHER keyed list — per-row mounts, the granular patch path, the
 * latched snapshot recovery, every virtualization height model, a second
 * consumer on one `arraySignal`, and `dispose()` — through random mutation
 * sequences and holds each step to a from-scratch `bindList` of the same state.
 *
 * Tuning: `KERF_FUZZ_RUNS` (default 150) and `KERF_FUZZ_SEED`, as for the
 * reconciler sweep. Deterministic; a failure prints its seed and a shrunk,
 * paste-ready reproduction.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  type BindListSpec,
  type BMutation,
  formatBRepro,
  generateBindListSpec,
  generateBMutations,
  runBindListCase,
  shrinkBindListCase,
} from './fuzz/bindlist.js';
import { Rng } from './fuzz/rng.js';

const env = (
  globalThis as { process: { env: Record<string, string | undefined> } }
).process.env;
const RUNS = Number(env.KERF_FUZZ_RUNS ?? 150);
const BASE_SEED = Number(env.KERF_FUZZ_SEED ?? 20_261_107);
const MUTATIONS_PER_CASE = 12;
const MAX_REPORTS = 3;

interface SeedFailure {
  seed: number;
  signature: string;
}

function signatureOf(message: string): string {
  const first = message.split('\n')[0].replace(/^after .*?: /, '');
  return first
    .replace(/\[[^\]]*\]/g, '[…]')
    .replace(/\d+/g, '#')
    .replace(/"[^"]*"/g, '"…"');
}

function caseForSeed(seed: number): {
  spec: BindListSpec;
  mutations: BMutation[];
} {
  const rng = new Rng(seed);
  const spec = generateBindListSpec(rng);
  return { spec, mutations: generateBMutations(rng, spec, MUTATIONS_PER_CASE) };
}

function report(failures: readonly SeedFailure[], runs: number): string {
  const bySignature = new Map<string, SeedFailure[]>();
  for (const f of failures) {
    const bucket = bySignature.get(f.signature);
    if (bucket === undefined) bySignature.set(f.signature, [f]);
    else bucket.push(f);
  }
  const lines = [
    `${failures.length}/${runs} bindList fuzz seeds failed, ` +
      `${bySignature.size} distinct failure signature(s):`,
    '',
  ];
  for (const [signature, seeds] of bySignature) {
    lines.push(
      `  × ${signature}  (${seeds.length} seed(s), first ${seeds[0].seed})`,
    );
  }
  lines.push('');
  for (const [, seeds] of Array.from(bySignature).slice(0, MAX_REPORTS)) {
    const { spec, mutations } = caseForSeed(seeds[0].seed);
    lines.push(
      formatBRepro(seeds[0].seed, shrinkBindListCase(spec, mutations)),
      '',
    );
  }
  return lines.join('\n');
}

describe('bindList fuzz', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it(
    'random specs and mutation sequences hold every bindList invariant',
    () => {
      const failures: SeedFailure[] = [];
      for (let i = 0; i < RUNS; i++) {
        const seed = BASE_SEED + i;
        const { spec, mutations } = caseForSeed(seed);
        const failure = runBindListCase(spec, mutations);
        if (failure !== null)
          failures.push({ seed, signature: signatureOf(failure.message) });
      }
      if (failures.length > 0) expect.fail(report(failures, RUNS));
    },
    Math.max(30_000, RUNS * 60),
  );
});
