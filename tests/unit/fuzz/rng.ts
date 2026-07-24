/**
 * Seeded PRNG for the reconciler fuzz harness.
 *
 * Determinism is the whole point: a failing run reports its seed, and re-running
 * with that seed reproduces the exact tree and mutation sequence. xorshift32 is
 * plenty for choosing shapes — this is a search over structures, not a source of
 * statistical randomness.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // A zero state is a fixed point for xorshift, so map it to something else.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    this.state = x;
    return x / 0x1_0000_0000;
  }

  /** Uniform integer in [0, n). Returns 0 for n <= 0. */
  int(n: number): number {
    return n <= 0 ? 0 : Math.floor(this.next() * n);
  }

  /** Uniform integer in [lo, hi] inclusive. */
  range(lo: number, hi: number): number {
    return lo + this.int(hi - lo + 1);
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }
}
