/**
 * Direct unit coverage for the reified list-reconciler dispatch state machine
 * (`src/list-render-state.ts`) — every row of its transition table, including
 * the count-drift arm that was previously a `c8 ignore`d defensive branch
 * inside `each.ts` (reachable after a granular DOM reconcile fails with its
 * patch queue already drained, and pinned here as a pure function too). The side-effectful reasons
 * (cachekey-drift, render-threw) stay covered by the transition-matrix suite
 * in `tests/unit/array-signal-transition-matrix.test.ts`.
 */

import { describe,expect,it } from 'vitest';

import { _hasGranularCacheKeyDrift,_hasGranularIndexShift } from '../../src/each.js';
import { decideListPath,deriveListRenderState } from '../../src/list-render-state.js';

describe('deriveListRenderState', () => {
  it('maps the tracked binding count onto the three dispatch states', () => {
    expect(deriveListRenderState(undefined)).toBe('unbound');
    expect(deriveListRenderState(0)).toBe('empty');
    expect(deriveListRenderState(1)).toBe('bound');
    expect(deriveListRenderState(10_000)).toBe('bound');
  });
});

describe('decideListPath — the transition table', () => {
  const ins = { type: 'insert' } as const;
  const rem = { type: 'remove' } as const;
  const upd = { type: 'update' } as const;
  const mov = { type: 'move' } as const;
  const rep = { type: 'replace' } as const;

  it('unbound → snapshot (first-render), regardless of patches', () => {
    expect(decideListPath('unbound', [ins], 1, undefined))
      .toEqual({ path: 'snapshot', reason: 'first-render' });
  });

  it('empty → snapshot (empty-binding), regardless of patches', () => {
    expect(decideListPath('empty', [ins, ins], 2, 0))
      .toEqual({ path: 'snapshot', reason: 'empty-binding' });
  });

  it('bound + no patches → snapshot (no-patches)', () => {
    expect(decideListPath('bound', [], 3, 3))
      .toEqual({ path: 'snapshot', reason: 'no-patches' });
  });

  it('bound + a replace patch → snapshot (replace), even mid-queue', () => {
    expect(decideListPath('bound', [ins, rep, rem], 5, 3))
      .toEqual({ path: 'snapshot', reason: 'replace' });
  });

  it('bound + count/netΔ mismatch → snapshot (count-drift)', () => {
    // 3 recorded rows + 1 insert should mean 4 — a snapshot of 5 means a
    // prior granular reconcile failed after draining or an external party
    // mutated/drained behind the signal's back.
    expect(decideListPath('bound', [ins], 5, 3))
      .toEqual({ path: 'snapshot', reason: 'count-drift' });
  });

  it('bound + consistent structural delta → granular', () => {
    expect(decideListPath('bound', [ins, rem, ins], 4, 3))
      .toEqual({ path: 'granular' });
  });

  it('update and move patches do not contribute to the structural delta', () => {
    expect(decideListPath('bound', [upd, mov, upd], 3, 3))
      .toEqual({ path: 'granular' });
    // …but they also don't mask a genuine drift.
    expect(decideListPath('bound', [upd, mov], 9, 3))
      .toEqual({ path: 'snapshot', reason: 'count-drift' });
  });

  it('stays total when a defensive caller passes bound with no recorded count', () => {
    // Contradictory input (bound implies a positive count) — the `?? 0`
    // fallback keeps the function total instead of NaN-poisoning the drift
    // arithmetic.
    expect(decideListPath('bound', [ins], 1, undefined))
      .toEqual({ path: 'granular' });
  });
});

describe('eachGranular — pure transition stages', () => {
  it('detects only structural patch sequences that leave a row at a stale rendered index', () => {
    expect(_hasGranularIndexShift(2, [
      { type: 'insert', index: 0, item: {} },
    ])).toBe(true);
    expect(_hasGranularIndexShift(2, [
      { type: 'insert', index: 0, item: {} },
      { type: 'remove', index: 0 },
    ])).toBe(false);
    expect(_hasGranularIndexShift(1, [
      { type: 'insert', index: 1, item: {} },
      { type: 'insert', index: 1, item: {} },
    ])).toBe(true);
    expect(_hasGranularIndexShift(2, [
      { type: 'update', index: 1, item: {} },
    ])).toBe(false);
  });

  it('re-evaluates cache keys and reports drift only for an already-cached row', () => {
    const a = { id: 'a' };
    const fresh = { id: 'fresh' };
    const cache = new WeakMap<object, { cacheKey: unknown }>([[a, { cacheKey: 'a:0' }]]);
    const evaluated: string[] = [];
    const cacheKey = (item: { id: string }, index: number): string => {
      evaluated.push(item.id);
      return `${item.id}:${index}`;
    };

    expect(_hasGranularCacheKeyDrift([a, fresh], cacheKey, cache)).toBe(false);
    expect(evaluated).toEqual(['a', 'fresh']);
    expect(_hasGranularCacheKeyDrift([fresh, a], cacheKey, cache)).toBe(true);
  });
});
