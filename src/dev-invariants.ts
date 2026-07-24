/**
 * Dev-mode structural invariant checks for the list bindings
 * (`KERF_DEV_INVARIANTS=1` to warn, `=throw` to throw).
 *
 * Every reconciler defect found so far shared one property: **kerf kept running
 * happily in a corrupt state.** A binding pointed at rows no longer in the
 * document; a list's rows sat inside a neighbouring list's region; an id
 * referred to a different list than its binding did. Nothing threw. The damage
 * surfaced several operations later as a wrong render, which is precisely what
 * made those bugs expensive to find — the symptom and the cause were nowhere
 * near each other.
 *
 * This module makes the corrupt *state* the error, at the render that created
 * it. Each invariant below is the negation of a defect that actually shipped:
 *
 *  - **marker-live / marker-id** — a binding whose marker left the tree, or
 *    whose id is carried by a different marker node. The latter is how a
 *    call-order id handed to a different list pointed the arriving list at the
 *    previous occupant's container.
 *  - **row-parent / row-live** — a binding holding rows that are detached, or
 *    attached somewhere other than its own parent. This is the shape of every
 *    "stranded rows" defect.
 *  - **row-order** — a binding's rows must follow its marker in document order
 *    and be strictly increasing. Rows that jumped their own marker looked
 *    correct on screen while leaving the region bookkeeping wrong.
 *  - **row-alias** — one row node claimed by two bindings.
 *  - **region-overlap** — one list's rows sitting between another list's first
 *    and last row. Two sibling lists interleaving their rows is exactly this.
 *
 * Off by default and dev-only, so production is untouched. `throw` mode exists
 * because a warning inside a passing test is invisible: kerf's own suites can
 * turn corruption into a failure rather than a line in the log.
 */

import type { ListBinding } from './list-binding.js';
import { LIST_MARKER_PREFIX } from './segment.js';
import { isDevMode } from './utils/devMode.js';

type Mode = 'off' | 'warn' | 'throw';

function mode(): Mode {
  if (!isDevMode()) return 'off';
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const value = proc?.env?.KERF_DEV_INVARIANTS;
  if (value === 'throw') return 'throw';
  return value === '1' ? 'warn' : 'off';
}

/**
 * Child-position lookup for one parent, built once and reused for every node
 * asked about.
 *
 * Scanning `childNodes` per row would make the whole audit O(rows²) — which is
 * not a theoretical concern: it timed out a 1000-row stress test the first time
 * this shipped. A dev check that is quadratic in list length would only be
 * usable on the lists least likely to need it.
 */
function childIndexer(): (parent: Element, node: Node) => number {
  const cache = new Map<Element, Map<Node, number>>();
  return (parent, node) => {
    let index = cache.get(parent);
    if (index === undefined) {
      index = new Map<Node, number>();
      const kids = parent.childNodes;
      for (let i = 0; i < kids.length; i++) index.set(kids[i], i);
      cache.set(parent, index);
    }
    return index.get(node) ?? -1;
  };
}

function describe(id: string, problem: string): string {
  return `kerf invariant violated after reconcile — each() list '${id}': ${problem}`;
}

/**
 * Check every list binding against the live DOM. Returns the violations found
 * (empty when healthy) so `mount()` can report them; exported separately from
 * the reporting so tests can assert on the findings directly.
 */
export function findListInvariantViolations(
  rootEl: Element,
  bindings: ReadonlyMap<string, ListBinding>,
): string[] {
  const problems: string[] = [];
  const owners = new Map<Node, string>();
  const indexIn = childIndexer();
  // Per binding: [firstRowIndex, lastRowIndex] within its parent, for the
  // region-overlap pass below.
  const spans: { id: string; parent: Element; from: number; to: number }[] = [];

  for (const [id, binding] of bindings) {
    const { marker, liveParent, items } = binding;

    if (!rootEl.contains(marker)) {
      problems.push(describe(id, 'its marker comment is no longer inside the mount root, so every '
        + 'future reconcile would mutate a detached tree'));
      continue;
    }
    if (marker.data !== `${LIST_MARKER_PREFIX}${id}`) {
      problems.push(describe(id, `its marker reads '${marker.data}' — the id is carried by a `
        + 'different marker node, so this binding describes another list'));
    }

    const markerIndex = indexIn(liveParent, marker);
    if (markerIndex === -1) {
      problems.push(describe(id, 'its marker is not a child of the parent the binding records'));
      continue;
    }

    let previousIndex = markerIndex;
    let first = -1;
    for (let i = 0; i < items.length; i++) {
      const node = items[i].node;
      const index = indexIn(liveParent, node);
      if (index === -1) {
        problems.push(describe(id, `bound row ${i} is not a child of the list's parent `
          + `(<${liveParent.tagName.toLowerCase()}>)${node.isConnected ? ' — it is attached elsewhere in the document' : ' — it is detached'}`));
        continue;
      }
      if (index <= previousIndex) {
        problems.push(describe(id, `bound row ${i} appears at child position ${index}, which is not `
          + `after the previous one (${previousIndex}) — the rows are out of order or have crossed the marker`));
      }
      previousIndex = index;
      if (first === -1) first = index;

      const owner = owners.get(node);
      if (owner !== undefined) {
        problems.push(describe(id, `bound row ${i} is also claimed by list '${owner}'`));
      } else {
        owners.set(node, id);
      }
    }
    if (first !== -1) spans.push({ id, parent: liveParent, from: first, to: previousIndex });
  }

  // Region overlap: two lists sharing a parent must occupy disjoint stretches of
  // it. Interleaved rows render in the wrong order and make each list's extent
  // unknowable.
  for (let a = 0; a < spans.length; a++) {
    for (let b = a + 1; b < spans.length; b++) {
      if (spans[a].parent !== spans[b].parent) continue;
      if (spans[a].from <= spans[b].to && spans[b].from <= spans[a].to) {
        problems.push(describe(spans[a].id, `its rows (child positions ${spans[a].from}-${spans[a].to}) `
          + `overlap those of list '${spans[b].id}' (${spans[b].from}-${spans[b].to}) in the same parent`));
      }
    }
  }

  return problems;
}

/**
 * Run the checks if opted in, and report anything found. No-op — and no DOM
 * walking at all — when the env var is unset.
 */
export function maybeCheckListInvariants(
  rootEl: Element,
  bindings: ReadonlyMap<string, ListBinding>,
): void {
  const level = mode();
  if (level === 'off') return;
  const problems = findListInvariantViolations(rootEl, bindings);
  if (problems.length === 0) return;
  const report = `${problems.join('\n')}\n`
    + 'This is a kerf bug, not an application one — please report it with the markup that produced it. '
    + 'Set KERF_DEV_INVARIANTS=1 to warn instead of throw, or unset it to disable these checks.';
  if (level === 'throw') throw new Error(report);
  console.warn(report);
}
