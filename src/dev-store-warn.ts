/**
 * Dev-mode warning for partial-set violations of Hard Rule 8 (KF-212). When
 * the opt-in env var `KERF_DEV_WARN_NARROW_SET=1` is set in a non-production
 * build, `defineStore`'s `set()` calls `maybeWarnNarrowSet(prev, next, ctx)`
 * before assigning. If `next` is a plain object whose own-keys are a strict
 * subset of `prev`'s own-keys, a one-shot `console.warn` fires naming the
 * missing keys and pointing at the canonical `set({ ...get(), ...next })`
 * merge fix.
 *
 * Why opt-in: narrow-set IS legal — sometimes you want to replace state with
 * a smaller shape (a reset() that drops keys, a feature-flag-driven schema
 * change). The warn is the right shape for the canonical bug ("I wrote
 * `set({filter})` against a replace-semantics store and wiped items+editingId")
 * but produces false positives for intentional shape changes. Opt-in keeps
 * the warning available to dev/CI environments that want the diagnostic
 * without surprising existing projects.
 *
 * Trigger condition: ANY key in `prev` missing from `next` — strictly broader
 * than "fewer keys total." A `set({a, c})` against `cur = {a, b}` (same count,
 * different keys) also wipes `b`, so it warns. The original partial-set bug
 * shape was always "at least one key from current is missing in next"; the
 * key-count check in the original ticket sketch was an early-exit
 * optimization, not the semantic gate.
 *
 * Skips: non-object cur/next (booleans, numbers, strings — no "keys" to
 * miss), null/undefined either side, and arrays either side (shrinking-array
 * replacement is normal, not a partial set).
 *
 * Per-store one-shot dedup: each store warns at most once across its
 * lifetime — matches the KF-174 / KF-176 pattern of "tell the developer
 * about the rule violation once, then trust them to fix it." The dedup
 * scope is the store, not the module, so a second store can still warn
 * if it independently hits the same bug.
 *
 * Production behavior is unchanged for zero runtime cost (the env-var read
 * short-circuits before any per-set work runs).
 */

import { isDevMode } from './utils/devMode.js';

export interface NarrowSetWarnContext {
  /** Set once per store; the warner reads/writes this to enforce the per-store one-shot dedup. */
  warned: boolean;
}

const WARNING_PREFIX
  = 'kerf: defineStore.set() called with keys missing from the current state — ';
const WARNING_SUFFIX
  = '. set() REPLACES state; the missing keys will be undefined after this call. '
  + 'Use `set({ ...get(), ...next })` to merge instead, or update each call site to pass the full state. '
  + 'Set KERF_DEV_WARN_NARROW_SET=0 (or unset it) to silence this warning.';

export function isOptedIn(): boolean {
  if (!isDevMode()) return false;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.KERF_DEV_WARN_NARROW_SET === '1';
}

function isPlainObjectState(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return false;
  return true;
}

export function maybeWarnNarrowSet(
  prev: unknown,
  next: unknown,
  ctx: NarrowSetWarnContext,
): void {
  if (ctx.warned) return;
  if (!isOptedIn()) return;
  if (!isPlainObjectState(prev) || !isPlainObjectState(next)) return;

  const missing: string[] = [];
  for (const k of Object.keys(prev)) {
    if (!(k in next)) missing.push(k);
  }
  if (missing.length === 0) return;

  ctx.warned = true;
  const keysList = missing.map((k) => `\`${k}\``).join(', ');
  console.warn(`${WARNING_PREFIX}${keysList}${WARNING_SUFFIX}`);
}

/**
 * Test helper — resets the per-store `warned` flag on a context so a
 * subsequent test in the same module can re-exercise the first-warning
 * path. Not exported from the public barrel; the unit-test file imports it
 * directly via the relative path.
 */
export function _resetWarnContext(ctx: NarrowSetWarnContext): void {
  ctx.warned = false;
}
