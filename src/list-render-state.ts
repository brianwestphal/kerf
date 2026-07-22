/**
 * The list reconciler's dispatch state machine, reified (KF-336: the states
 * and transitions were previously implicit — inferred from `bindingCounts`
 * presence, `count === 0` sentinels, and patch-queue scans scattered across
 * `each.ts` and the reconciler files; a shipped transition bug (select-after-
 * delete / append-after-clear) motivated making them explicit and walkable).
 *
 * ## States (per list id, derived from the tracked binding count)
 *
 *   - `unbound` — no successful reconcile recorded for this list id yet
 *     (first render of the list, or the record was cleared by throw recovery).
 *   - `empty`   — the last reconcile left the binding with zero rows
 *     (cleared / emptied list). Repopulating is structurally a first render.
 *   - `bound`   — the binding holds ≥ 1 live row the granular path can patch.
 *
 * ## Transition table (what the next render does)
 *
 *   state    + input                                     → path      (reason)
 *   ─────────────────────────────────────────────────────────────────────────
 *   unbound  + anything                                  → snapshot  first-render
 *   empty    + anything                                  → snapshot  empty-binding
 *   bound    + no queued patches                         → snapshot  no-patches
 *   bound    + queue contains a `replace`                → snapshot  replace
 *   bound    + count + netΔ(inserts−removes) ≠ snapshot  → snapshot  count-drift
 *   bound    + a bound row's `cacheKey` changed          → snapshot  cachekey-drift †
 *   bound    + a patch row's render() threw              → snapshot  render-threw †
 *   bound    + otherwise                                 → granular
 *
 *   † decided in `each.ts:eachGranular` after this module's structural
 *     decision, because both require side effects the pure function must not
 *     own: the `cacheKey` scan doubles as the dependency-tracking read that
 *     keeps external selection signals subscribed, and the pre-render
 *     try/catch drives throw recovery (which also resets the list to
 *     `unbound` via `bindingCounts.delete(id)` so the NEXT render snapshot-
 *     rebuilds instead of trusting a stale count).
 *
 * After every successful reconcile, `mount()` records the binding's row count,
 * which is what `deriveListRenderState` reads next render. `reconcileList`'s
 * routing (`list-reconcile.ts`) is the same machine observed from the DOM
 * side: a granular segment only applies when the live binding is non-empty —
 * `each()` guarantees that by never emitting patches from a non-`bound` state.
 */

/** Per-list dispatch state, derived from the tracked post-reconcile row count. */
export type ListRenderState = 'unbound' | 'empty' | 'bound';

/** Derive the list's dispatch state from `mount()`'s recorded binding count. */
export function deriveListRenderState(bindingCount: number | undefined): ListRenderState {
  if (bindingCount === undefined) return 'unbound';
  return bindingCount === 0 ? 'empty' : 'bound';
}

/** Why a render was routed to the snapshot path (see the transition table). */
export type SnapshotReason =
  | 'first-render'
  | 'empty-binding'
  | 'no-patches'
  | 'replace'
  | 'count-drift'
  | 'cachekey-drift'
  | 'render-threw';

export type ListPathDecision =
  | { path: 'snapshot'; reason: SnapshotReason }
  | { path: 'granular' };

/**
 * The structural half of the dispatch: everything decidable from the state +
 * the drained patch queue + the snapshot length, with no side effects. The
 * two side-effectful reasons (`cachekey-drift`, `render-threw`) are layered
 * on by `eachGranular` after a `granular` decision here — see the † note in
 * the transition table above.
 *
 * `patches` must be the fully-drained queue for this render (drained BEFORE
 * deciding, so a snapshot route still consumes them — the snapshot already
 * reflects every queued mutation).
 */
export function decideListPath(
  state: ListRenderState,
  patches: ReadonlyArray<{ type: string }>,
  snapshotLength: number,
  previousBindingCount: number | undefined,
): ListPathDecision {
  if (state === 'unbound') return { path: 'snapshot', reason: 'first-render' };
  if (state === 'empty') return { path: 'snapshot', reason: 'empty-binding' };
  if (patches.length === 0) return { path: 'snapshot', reason: 'no-patches' };
  // One pass: a `replace` wins immediately (wholesale reset — granular can't
  // help), otherwise accumulate the net structural delta for drift detection.
  let netDelta = 0;
  for (const p of patches) {
    if (p.type === 'insert') netDelta += 1;
    else if (p.type === 'remove') netDelta -= 1;
    else if (p.type === 'replace') return { path: 'snapshot', reason: 'replace' };
  }
  // `state === 'bound'` implies the count is a positive number; the cast-free
  // fallback keeps the function total for defensive callers.
  const count = previousBindingCount ?? 0;
  // Drift: after a clean prior reconcile, count + netΔ must equal the
  // snapshot. A mismatch means a prior render threw mid-reconcile or an
  // external party drained/mutated behind the signal's back — rebuild.
  if (count + netDelta !== snapshotLength) {
    return { path: 'snapshot', reason: 'count-drift' };
  }
  return { path: 'granular' };
}
