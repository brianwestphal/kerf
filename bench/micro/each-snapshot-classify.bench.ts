/**
 * KF-202 — cost of `eachSnapshotById`'s per-row classify loop.
 *
 * The snapshot path iterates the items array and for each item does:
 * type check → seen.add check → cacheKey eval → WeakMap.get → cached check
 * → render() (on miss) → segItems[i] alloc. KF-199 (per-row alloc reduction)
 * speculates that the per-row object alloc is a meaningful share of the
 * bulk-path cost.
 *
 * This bench measures the all-cache-hit case (1k items, all stable
 * identity, no cacheKey) — the cheapest possible classify loop. If it's
 * still measurable in absolute terms, the alloc reduction has potential
 * payoff; if it's already sub-millisecond, KF-199 is unlikely to move
 * krausest numbers.
 *
 * Run: `npm run bench:micro`.
 */

import { bench, describe } from 'vitest';

import { _setRenderContext, each, type RenderContext } from '../../src/each.js';

interface Row { id: number; label: string }

const ITEMS_1K: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  label: `row ${i}`,
}));

function makeContext(): RenderContext {
  return { counter: 0, caches: new Map(), bindingCounts: new Map() };
}

describe('each-snapshot-classify: 1k cache-hit rows (best case)', () => {
  // Pre-populate the cache by running each() once with the same context.
  const ctx = makeContext();
  _setRenderContext(ctx);
  each(ITEMS_1K, (r) => `<li data-key="${r.id}">${r.label}</li>`);
  _setRenderContext(null);
  // Reset counter for the bench iterations so the cache id stays at '0'.
  ctx.counter = 0;

  bench('each(1k items, identity-stable, all cache-hit)', () => {
    _setRenderContext(ctx);
    each(ITEMS_1K, (r) => `<li data-key="${r.id}">${r.label}</li>`);
    _setRenderContext(null);
    ctx.counter = 0;
  });
});

describe('each-snapshot-classify: 1k all-miss rows (worst case)', () => {
  // Fresh context every iteration → empty cache → every row is a miss.
  bench('each(1k items, fresh ctx, all cache-miss)', () => {
    const ctx = makeContext();
    _setRenderContext(ctx);
    each(ITEMS_1K, (r) => `<li data-key="${r.id}">${r.label}</li>`);
    _setRenderContext(null);
  });
});
