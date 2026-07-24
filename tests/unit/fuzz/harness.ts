/**
 * Runs a generated case and, on failure, shrinks it to something a human can
 * read.
 *
 * The shrinker is the part that decides whether this harness is usable. A raw
 * failing case is a forty-node tree and twenty mutations, which tells you
 * nothing; the same failure reduced to two elements and one mutation is a bug
 * report. Everything here is greedy and repeated to a fixpoint — cheap, and for
 * tree-plus-sequence shapes it reliably lands on a minimal case.
 */
import { mount } from '../../../src/index.js';
import { checkInvariants, rowIdentityMap, type ViolationClass } from './invariants.js';
import { makeRender, makeWorld, type NodeSpec, type TreeSpec } from './model.js';
import { applyMutation, describeMutation, type Mutation } from './mutations.js';

export interface CaseFailure {
  /** -1 for the initial mount, otherwise the index of the mutation that broke it. */
  step: number;
  message: string;
  kind: ViolationClass;
  /**
   * Whether kerf's always-on list-identity warning fired during this case, i.e.
   * an unkeyed list changed which call-order slot it occupies. That is a
   * documented state in which kerf discards a list's rows wholesale, so a
   * failure carrying this flag is a different (and already-known) claim than
   * one without it.
   */
  identityShift: boolean;
}

const IDENTITY_SHIFT_WARNING = 'is now a different list than it was last render';

/**
 * Swallow console warnings for the duration of a case and report whether an
 * identity shift was among them. The generator deliberately builds shifting
 * trees, so the advisory would otherwise drown every run.
 */
function withWarningCapture<T>(fn: (sawShift: () => boolean) => T): T {
  const original = console.warn;
  let shifted = false;
  console.warn = (...args: unknown[]): void => {
    if (args.some((a) => typeof a === 'string' && a.includes(IDENTITY_SHIFT_WARNING))) {
      shifted = true;
    }
  };
  try {
    return fn(() => shifted);
  } finally {
    console.warn = original;
  }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Mount the spec, walk the mutations, check the invariants after each.
 * Returns null when the case holds.
 */
export function runCase(spec: TreeSpec, mutations: readonly Mutation[]): CaseFailure | null {
  return withWarningCapture((sawShift) => runCaseInner(spec, mutations, sawShift));
}

function runCaseInner(
  spec: TreeSpec,
  mutations: readonly Mutation[],
  sawShift: () => boolean,
): CaseFailure | null {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const world = makeWorld(spec);
  let dispose: (() => void) | null = null;
  try {
    try {
      dispose = mount(root, makeRender(world));
    } catch (err) {
      return {
        step: -1,
        message: `mount() threw: ${String(err)}`,
        kind: 'content',
        identityShift: sawShift(),
      };
    }
    const initial = checkInvariants(root, world);
    if (initial !== null) {
      return { step: -1, ...initial, identityShift: sawShift() };
    }

    for (let i = 0; i < mutations.length; i++) {
      const before = rowIdentityMap(root, world);
      try {
        applyMutation(mutations[i], world);
      } catch (err) {
        return {
          step: i,
          message: `${describeMutation(mutations[i])} threw: ${String(err)}`,
          kind: 'content',
          identityShift: sawShift(),
        };
      }
      const violation = checkInvariants(root, world);
      if (violation !== null) {
        return {
          step: i,
          kind: violation.kind,
          message: `after ${describeMutation(mutations[i])}: ${violation.message}`,
          identityShift: sawShift(),
        };
      }
      // A write to a signal that only feeds fine-grained holes must not re-run
      // the render, so no row may be rebuilt. Losing a row node here is exactly
      // the silent identity loss that costs focus, scroll, and IME state.
      if (mutations[i].k === 'sig') {
        const after = rowIdentityMap(root, world);
        for (const [key, node] of before) {
          if (after.get(key) !== node) {
            return {
              step: i,
              kind: 'content',
              identityShift: sawShift(),
              message: `after ${describeMutation(mutations[i])}: row ${key} was rebuilt, but a`
                + ' fine-grained signal write must not re-render a list',
            };
          }
        }
      }
    }
    return null;
  } finally {
    dispose?.();
    root.remove();
  }
}

// ---------------------------------------------------------------------------
// Shrinking
// ---------------------------------------------------------------------------

function childrenOf(node: NodeSpec): NodeSpec[] | null {
  return node.kind === 'el' || node.kind === 'cond' || node.kind === 'svg' ? node.children : null;
}

/** Every node position in the tree, deepest-last so removals stay valid. */
function nodePaths(nodes: readonly NodeSpec[], prefix: number[] = []): number[][] {
  const out: number[][] = [];
  nodes.forEach((node, i) => {
    const path = [...prefix, i];
    out.push(path);
    const kids = childrenOf(node);
    if (kids !== null) out.push(...nodePaths(kids, path));
  });
  return out;
}

function siblingsAt(spec: TreeSpec, path: readonly number[]): NodeSpec[] {
  let nodes = spec.root;
  for (const index of path.slice(0, -1)) {
    nodes = childrenOf(nodes[index]) as NodeSpec[];
  }
  return nodes;
}

type Fails = (spec: TreeSpec, mutations: Mutation[]) => boolean;

/**
 * A shrink step is only valid if it preserves the finding. Without this the
 * shrinker happily reduces a severe failure into an unrelated milder one that
 * also happens to fail, and the report then describes the wrong bug.
 */
function sameFinding(original: CaseFailure, candidate: CaseFailure | null): boolean {
  return candidate !== null
    && candidate.kind === original.kind
    && candidate.identityShift === original.identityShift;
}

/** One greedy pass; returns true when it managed to make the case smaller. */
function shrinkOnce(state: { spec: TreeSpec; mutations: Mutation[] }, fails: Fails): boolean {
  let improved = false;

  // 1. Drop mutations, latest first — the tail is usually irrelevant.
  for (let i = state.mutations.length - 1; i >= 0; i--) {
    const candidate = state.mutations.filter((_, j) => j !== i);
    if (fails(state.spec, candidate)) { state.mutations = candidate; improved = true; }
  }

  // 2. Unwrap a batch to a single member — "these two together" is a much
  //    stronger claim than "one of these", so only keep it if it still fails.
  for (let i = 0; i < state.mutations.length; i++) {
    const m = state.mutations[i];
    if (m.k !== 'batch') continue;
    for (const sub of m.ms) {
      const candidate = state.mutations.slice();
      candidate[i] = sub;
      if (fails(state.spec, candidate)) { state.mutations = candidate; improved = true; break; }
    }
  }

  // 3. Remove tree nodes, deepest-last order reversed so indices stay valid.
  for (const path of nodePaths(state.spec.root).reverse()) {
    const candidate = clone(state.spec);
    siblingsAt(candidate, path).splice(path[path.length - 1], 1);
    if (fails(candidate, state.mutations)) { state.spec = candidate; improved = true; }
  }

  // 4. Shrink initial source contents.
  for (let s = 0; s < state.spec.sources.length; s++) {
    while (state.spec.sources[s].ids.length > 0) {
      const candidate = clone(state.spec);
      candidate.sources[s].ids.pop();
      if (!fails(candidate, state.mutations)) break;
      state.spec = candidate;
      improved = true;
    }
  }

  return improved;
}

export interface ShrunkCase {
  spec: TreeSpec;
  mutations: Mutation[];
  failure: CaseFailure;
}

export function shrinkCase(spec: TreeSpec, mutations: readonly Mutation[]): ShrunkCase {
  const original = runCase(spec, mutations) as CaseFailure;
  const fails: Fails = (s, ms) => sameFinding(original, runCase(s, ms));
  const state = { spec: clone(spec), mutations: clone(mutations) as Mutation[] };
  for (let round = 0; round < 6; round++) {
    if (!shrinkOnce(state, fails)) break;
  }
  return {
    spec: state.spec,
    mutations: state.mutations,
    // Non-null by construction: the caller only shrinks a case that failed, and
    // every accepted shrink step re-verified the failure.
    failure: runCase(state.spec, state.mutations) as CaseFailure,
  };
}

/** A paste-ready reproduction, so a fuzz failure becomes a regression test. */
export function formatRepro(seed: number, shrunk: ShrunkCase): string {
  const step = shrunk.failure.step === -1
    ? 'the initial mount'
    : `mutation #${shrunk.failure.step}`;
  const shift = shrunk.failure.identityShift ? ', with a list-identity shift' : '';
  return [
    `Reconciler fuzz failure (seed ${seed}) at ${step} [${shrunk.failure.kind}${shift}]:`,
    '',
    `  ${shrunk.failure.message}`,
    '',
    'Shrunk reproduction — paste into a regression test:',
    '',
    `  const spec = ${JSON.stringify(shrunk.spec)};`,
    `  const mutations = ${JSON.stringify(shrunk.mutations)};`,
    '  expect(runCase(spec, mutations)).toBeNull();',
  ].join('\n');
}
