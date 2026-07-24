/**
 * The mutation alphabet the fuzz harness walks a mounted tree through.
 *
 * Each mutation is plain data so a failing sequence can be printed and replayed.
 * The two source flavors are driven through the *same* alphabet on purpose: a
 * `plain` source rewrites its whole array (snapshot reconcile), a `granular`
 * one calls the matching `arraySignal` method (patch reconcile). Any behavioral
 * difference between the two paths for the same logical edit is a bug, and
 * expressing them as one alphabet is what makes that difference observable.
 */
import { ArraySignal } from '../../../src/array-signal.js';
import { batch } from '../../../src/index.js';
import type { Item, World } from './model.js';
import type { Rng } from './rng.js';

export type Mutation =
  | { k: 'cond'; i: number }
  | { k: 'sig'; i: number; v: string }
  | { k: 'insert'; s: number; at: number; id: string }
  | { k: 'remove'; s: number; at: number }
  | { k: 'move'; s: number; from: number; to: number }
  | { k: 'update'; s: number; at: number; t: string }
  | { k: 'replace'; s: number; ids: string[] }
  | { k: 'batch'; ms: Mutation[] };

export function describeMutation(m: Mutation): string {
  return m.k === 'batch'
    ? `batch(${m.ms.map(describeMutation).join(', ')})`
    : JSON.stringify(m);
}

function itemsOf(world: World, s: number): readonly Item[] {
  return world.sources[s].value;
}

/** Generate one mutation that is valid against the world's CURRENT state. */
function genOne(rng: Rng, world: World, allowBatch: boolean): Mutation {
  const roll = rng.next();
  if (allowBatch && roll < 0.18) {
    // Batched multi-source edits are where a shared render context can leak
    // one list's patch queue into another list's DOM.
    const n = rng.range(2, 3);
    return { k: 'batch', ms: Array.from({ length: n }, () => genOne(rng, world, false)) };
  }
  if (roll < 0.30) return { k: 'cond', i: rng.int(world.conds.length) };
  if (roll < 0.42) {
    const i = rng.int(world.sigs.length);
    return { k: 'sig', i, v: `v${rng.int(1000)}` };
  }

  const s = rng.int(world.sources.length);
  const len = itemsOf(world, s).length;
  if (roll < 0.48 || len === 0) {
    const ids = Array.from({ length: rng.range(0, 4) }, (_, i) => `s${s}r${rng.int(1000)}_${i}`);
    return { k: 'replace', s, ids };
  }
  const op = rng.next();
  if (op < 0.34) return { k: 'insert', s, at: rng.int(len + 1), id: `s${s}n${rng.int(10000)}` };
  if (op < 0.55) return { k: 'remove', s, at: rng.int(len) };
  if (op < 0.78) return { k: 'update', s, at: rng.int(len), t: `T${rng.int(1000)}` };
  return { k: 'move', s, from: rng.int(len), to: rng.int(len) };
}

export function generateMutations(rng: Rng, world: World, count: number): Mutation[] {
  // Generated against a *simulated* world so indices stay in range: we apply
  // each mutation for real as we go, then reset the world before the run.
  return Array.from({ length: count }, () => {
    const m = genOne(rng, world, true);
    applyMutation(m, world);
    return m;
  });
}

/**
 * Apply a mutation, clamping indices to the current state. Clamping (rather
 * than skipping) matters for shrinking: dropping an earlier mutation changes
 * later lengths, and a shrunk sequence must still run rather than throw.
 */
export function applyMutation(m: Mutation, world: World): void {
  switch (m.k) {
    case 'batch':
      batch(() => { for (const sub of m.ms) applyMutation(sub, world); });
      return;
    case 'cond': {
      const c = world.conds[m.i % world.conds.length];
      c.value = !c.value;
      return;
    }
    case 'sig':
      world.sigs[m.i % world.sigs.length].value = m.v;
      return;
    default:
      break;
  }

  const s = m.s % world.sources.length;
  const src = world.sources[s];
  const current = src.value;
  const len = current.length;

  if (m.k === 'replace') {
    const items = m.ids.map((id) => ({ id, t: id.toUpperCase() }));
    if (src instanceof ArraySignal) src.replace(items);
    else src.value = items;
    return;
  }
  if (len === 0) return;

  if (src instanceof ArraySignal) {
    switch (m.k) {
      case 'insert': src.insert(Math.min(m.at, len), { id: m.id, t: m.id.toUpperCase() }); return;
      case 'remove': src.remove(m.at % len); return;
      case 'move': src.move(m.from % len, m.to % len); return;
      case 'update': src.update(m.at % len, (it) => ({ ...it, t: m.t })); return;
    }
  }

  const next = current.slice();
  switch (m.k) {
    case 'insert': next.splice(Math.min(m.at, len), 0, { id: m.id, t: m.id.toUpperCase() }); break;
    case 'remove': next.splice(m.at % len, 1); break;
    case 'move': {
      const [moved] = next.splice(m.from % len, 1);
      next.splice(m.to % len, 0, moved);
      break;
    }
    case 'update': next[m.at % len] = { ...next[m.at % len], t: m.t }; break;
  }
  (src as { value: Item[] }).value = next;
}
