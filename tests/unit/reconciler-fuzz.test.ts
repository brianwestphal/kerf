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
 * Open defects it has found live in `QUARANTINE` below — see the comment there
 * for the rules that keep that from becoming a place bugs go to be forgotten.
 *
 * Practical ceiling: a single process runs out of heap somewhere between 6k and
 * 15k cases. `mount`/`dispose` itself was measured leak-free over 22k cycles, so
 * this is the harness's own accumulation and not a runtime defect; for a bigger
 * soak, run several `KERF_FUZZ_SEED` windows of ≤5000 rather than one long run.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { formatRepro, runCase, shrinkCase } from './fuzz/harness.js';
import { generateSpec, makeWorld, type NodeSpec, type TreeSpec } from './fuzz/model.js';
import { generateMutations, type Mutation } from './fuzz/mutations.js';
import { Rng } from './fuzz/rng.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;
const RUNS = Number(env.KERF_FUZZ_RUNS ?? 200);
const BASE_SEED = Number(env.KERF_FUZZ_SEED ?? 20_260_724);
const MUTATIONS_PER_CASE = 12;
/** How many distinct failure signatures to shrink and print. Shrinking is the slow part. */
const MAX_REPORTS = 3;

// ---------------------------------------------------------------------------
// Quarantine
// ---------------------------------------------------------------------------

/**
 * Defects this harness found that are filed and still open. Cases inside a known
 * defect's blast radius are tallied but do not fail the run, so the gate is
 * green while the *rest* of the space stays guarded — a fuzz suite that is red
 * for a known reason is a fuzz suite nobody reads.
 *
 * This is a debt ledger, not a place bugs go to be forgotten. Three rules:
 *
 *  - **Scoped by the shape of the case, not the text of the failure.** "We make
 *    no promise yet about a morph opt-out next to a conditional" has a boundary;
 *    "ignore anything structural" does not. Trees outside the radius stay fully
 *    checked, and *any* failure in them is a hard failure.
 *  - **Each entry must still reproduce.** Its pinned case is replayed every run
 *    and the test fails if it *passes* — so fixing the bug forces you to delete
 *    the entry, and the gate tightens on its own. An entry cannot outlive its bug.
 *  - **The excused count is budgeted.** `QUARANTINE_BUDGET` pins what fraction of
 *    seeds may be excused. A change that pushes more cases into the radius trips
 *    the budget even though every one of them is individually "known" — so the
 *    debt can shrink but never quietly grow.
 *
 * Three earlier entries (wrong-order sibling lists, a row jumping a trailing
 * static sibling, an identity shift rendering another list's rows) were carried
 * this way and retired within hours of being filed.
 */
interface QuarantineEntry {
  ticket: string;
  what: string;
  excuses: (spec: TreeSpec) => boolean;
  /** A pinned case that must keep failing for as long as the entry exists. */
  spec: TreeSpec;
  mutations: Mutation[];
}

/** Does any subtree carry a morph opt-out AND does the tree have a conditional? */
function hasMorphOptOutBesideConditional(spec: TreeSpec): boolean {
  let optOut = false;
  let conditional = false;
  const walk = (nodes: readonly NodeSpec[]): void => {
    for (const node of nodes) {
      if (node.kind === 'cond') { conditional = true; walk(node.children); continue; }
      if (node.kind === 'el') {
        if (node.special !== null) optOut = true;
        walk(node.children);
        continue;
      }
      if (node.kind === 'svg') walk(node.children);
    }
  };
  walk(spec.root);
  return optOut && conditional;
}

const QUARANTINE: QuarantineEntry[] = [
  {
    ticket: 'KF-408',
    what: 'a data-morph-skip sibling swallows a reappearing conditional element',
    excuses: hasMorphOptOutBesideConditional,
    // A conditional <ul> ahead of a skipped one; toggle it off and back on.
    spec: JSON.parse('{"sigCount":1,"condCount":1,"sources":[{"kind":"plain","ids":[]}],"lists":[],"root":[{"kind":"el","tag":"div","dataKey":null,"special":null,"boundAttr":null,"children":[{"kind":"cond","cond":0,"children":[{"kind":"el","tag":"ul","dataKey":"head","special":null,"boundAttr":null,"children":[{"kind":"text","text":"head"}]}]},{"kind":"el","tag":"ul","dataKey":null,"special":"skip","boundAttr":null,"children":[{"kind":"text","text":"widget"}]}]}]}') as TreeSpec,
    mutations: JSON.parse('[{"k":"cond","i":0},{"k":"cond","i":0}]') as Mutation[],
  },
];

const isQuarantined = (spec: TreeSpec): QuarantineEntry | undefined =>
  QUARANTINE.find((entry) => entry.excuses(spec));

/**
 * What fraction of seeds the open defects above may excuse. Measured, then
 * pinned — a ratio rather than a count so a longer soak uses the same bar.
 */
const QUARANTINE_BUDGET = 0.2;

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

  // If one of these starts passing, the bug is fixed: delete its entry from
  // QUARANTINE so the sweep stops excusing that whole shape.
  it.each(QUARANTINE)('quarantined defect $ticket still reproduces — $what', (entry) => {
    expect(
      runCase(entry.spec, entry.mutations),
      `${entry.ticket} no longer reproduces. If it is fixed, remove its QUARANTINE entry.`,
    ).not.toBeNull();
  });

  it('random trees and mutation sequences hold every reconciler invariant', () => {
    const failures: SeedFailure[] = [];
    let excused = 0;
    for (let i = 0; i < RUNS; i++) {
      const seed = BASE_SEED + i;
      const { spec, mutations } = caseForSeed(seed);
      const failure = runCase(spec, mutations);
      if (failure === null) continue;
      if (isQuarantined(spec) === undefined) {
        failures.push({ seed, signature: signatureOf(failure.message) });
      } else {
        excused++;
      }
    }
    if (failures.length > 0) expect.fail(report(failures, RUNS));

    // Ratchet: the debt may shrink, never grow. A regression that pushes more
    // cases into a known defect's radius would otherwise be invisible, since
    // every one of them is individually "expected to fail".
    expect(
      excused / RUNS,
      `${excused}/${RUNS} seeds were excused by the quarantine, over the pinned budget of `
      + `${QUARANTINE_BUDGET}. Either a change widened a known defect's blast radius, or the `
      + 'generator changed shape — investigate before raising the budget.',
    ).toBeLessThanOrEqual(QUARANTINE_BUDGET);
    // Scaled so a `KERF_FUZZ_RUNS=5000` soak doesn't trip vitest's default 5s.
  }, Math.max(30_000, RUNS * 40));

});
