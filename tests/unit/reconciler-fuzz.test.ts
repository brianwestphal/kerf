/**
 * Property-based (fuzz) testing for the render pipeline.
 *
 * Three hand-directed adversarial sweeps found nine defects, and every one was
 * an unexpected *combination* of shapes rather than a wrong line of code. That
 * is the limit of enumerating cases by hand: the enumeration is steered by the
 * same priors that wrote the code, so it is blind in the same places. This
 * harness searches the shape space instead of sampling remembered points.
 *
 * It generates a random-but-valid tree — nested elements, keyed and unkeyed
 * lists, conditionals wrapping and preceding lists, two lists over one source,
 * fine-grained text and attribute holes, `<svg>` subtrees, `data-morph-skip`
 * islands — then walks it through a random mutation sequence, checking the
 * invariants in `fuzz/invariants.ts` after every single step. On failure it
 * shrinks to a minimal case and prints it as paste-ready code.
 *
 * **Why hand-rolled instead of `fast-check`.** Two reasons, in order of weight.
 * First, essentially none of a generic property library's value would apply
 * here: its arbitraries can't produce a valid kerf tree, so the generator would
 * be custom anyway, and its structural shrinker can't know that "remove a
 * mutation" and "prune a subtree" are the reductions that matter — that shrinker
 * would be custom too. What's left to reuse is the run loop, which is six lines.
 * Second, kerf holds a hard line on dependencies (one runtime dep, and a
 * devDependency set small enough to audit), and a dependency that carries no
 * weight is the easiest kind to decline.
 *
 * Tuning: `KERF_FUZZ_RUNS` (default 200) and `KERF_FUZZ_SEED` for a longer soak,
 * e.g. `KERF_FUZZ_RUNS=5000 npm run test:unit -- reconciler-fuzz`. The default
 * is deliberately modest and fully deterministic so the pre-commit gate stays
 * fast and can never flake. `KERF_FUZZ_DIFF=0` drops the differential check for
 * triage, leaving only the checks a user would actually see fail.
 *
 * There is currently no quarantine: every generated case is expected to hold.
 * When this harness finds a defect that isn't fixed in the same change, hold it
 * in a quarantine scoped by the SHAPE of the case (not the text of the failure),
 * pin a reproduction that must keep failing so the entry cannot outlive its bug,
 * and budget the excused fraction so the debt can shrink but never quietly grow.
 * That is how the three defects it found on day one were carried and retired;
 * see the KF-399/KF-402 history if you need the pattern again.
 *
 * Practical ceiling: a single process runs out of heap somewhere between 6k and
 * 15k cases. `mount`/`dispose` itself was measured leak-free over 22k cycles, so
 * this is the harness's own accumulation and not a runtime defect; for a bigger
 * soak, run several `KERF_FUZZ_SEED` windows of ≤5000 rather than one long run.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { formatRepro, runCase, shrinkCase } from './fuzz/harness.js';
import { generateSpec, makeWorld, type TreeSpec } from './fuzz/model.js';
import { generateMutations, type Mutation } from './fuzz/mutations.js';
import { Rng } from './fuzz/rng.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;
const RUNS = Number(env.KERF_FUZZ_RUNS ?? 200);
const BASE_SEED = Number(env.KERF_FUZZ_SEED ?? 20_260_724);
const MUTATIONS_PER_CASE = 12;
/** How many distinct failure signatures to shrink and print. Shrinking is the slow part. */
const MAX_REPORTS = 3;

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------

interface SeedFailure {
  seed: number;
  signature: string;
}

/**
 * Collapse a failure message to a signature, so twenty seeds tripping one bug
 * report as one finding rather than twenty. Sizing the finding *set* is the
 * question a fuzz run should answer; a single fast-fail can't.
 */
function signatureOf(message: string): string {
  // Drop the "after <mutation>:" prefix — the invariant that broke is the
  // finding; which mutation happened to trip it is incidental.
  const first = message.split('\n')[0].replace(/^after .*?: /, '');
  return first.replace(/\[[^\]]*\]/g, '[…]').replace(/\d+/g, '#').replace(/"[^"]*"/g, '"…"');
}

function caseForSeed(seed: number): { spec: TreeSpec; mutations: Mutation[] } {
  const rng = new Rng(seed);
  const spec = generateSpec(rng);
  // Mutations are generated against a throwaway world so their indices are
  // valid at the point they run; `runCase` then replays them on a fresh one.
  return { spec, mutations: generateMutations(rng, makeWorld(spec), MUTATIONS_PER_CASE) };
}

function report(failures: readonly SeedFailure[], runs: number): string {
  const bySignature = new Map<string, SeedFailure[]>();
  for (const f of failures) {
    const bucket = bySignature.get(f.signature);
    if (bucket === undefined) bySignature.set(f.signature, [f]);
    else bucket.push(f);
  }
  const lines = [
    `${failures.length}/${runs} fuzz seeds failed outside the quarantine, `
    + `${bySignature.size} distinct failure signature(s):`,
    '',
  ];
  for (const [signature, seeds] of bySignature) {
    lines.push(`  × ${signature}  (${seeds.length} seed(s), first ${seeds[0].seed})`);
  }
  lines.push('');
  for (const [, seeds] of Array.from(bySignature).slice(0, MAX_REPORTS)) {
    const { spec, mutations } = caseForSeed(seeds[0].seed);
    lines.push(formatRepro(seeds[0].seed, shrinkCase(spec, mutations)), '');
  }
  return lines.join('\n');
}

describe('reconciler fuzz', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('random trees and mutation sequences hold every reconciler invariant', () => {
    const failures: SeedFailure[] = [];
    for (let i = 0; i < RUNS; i++) {
      const seed = BASE_SEED + i;
      const { spec, mutations } = caseForSeed(seed);
      const failure = runCase(spec, mutations);
      if (failure !== null) failures.push({ seed, signature: signatureOf(failure.message) });
    }
    if (failures.length > 0) expect.fail(report(failures, RUNS));
    // Scaled so a `KERF_FUZZ_RUNS=5000` soak doesn't trip vitest's default 5s.
  }, Math.max(30_000, RUNS * 40));

});
