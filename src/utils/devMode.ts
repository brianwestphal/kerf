/**
 * Shared dev-mode gate. One primary export: `isDevMode()`. Every dev-only
 * behavior in kerf — the `defineStore` `get()` snapshot freeze, the each()
 * row-key warning, and the opt-in `KERF_DEV_WARN_*` warning family — routes
 * its "is this a development build?" decision through here.
 *
 * Two inputs, override-wins precedence:
 *
 *  1. `globalThis.KERF_DEV` — explicit runtime override. When set to a boolean
 *     it WINS unconditionally: `false` forces production behavior (no store
 *     freeze, no dev warnings) even under `NODE_ENV=development`; `true` forces
 *     development behavior even under `NODE_ENV=production`. Read lazily (at
 *     call time, never memoized at import) so a no-bundler consumer loading
 *     kerf from a CDN can set it once before mounting and have it take effect.
 *
 *  2. `process.env.NODE_ENV` — the default when no override is present.
 *     Development is ON unless `NODE_ENV === 'production'`. Read through
 *     `globalThis.process` so the source runs untouched in a browser that has
 *     no `process` binding. Keeping this branch is what lets a bundler that
 *     statically substitutes `NODE_ENV` continue to dead-code-eliminate the
 *     dev paths for bundled production consumers exactly as before.
 *
 * Why the override matters: a no-bundler consumer (importmap, no build step)
 * has no `process`, so without an override the NODE_ENV branch resolves to
 * development-ON — which is the correct, unchanged default. Previously that
 * consumer had NO way to turn it off, leaving the store freeze and warning
 * machinery permanently active in their production deployment. Setting
 * `globalThis.KERF_DEV = false` before mount is the escape hatch.
 *
 * Perf: the reads are a handful of optional-chained property accesses, as
 * cheap as a boolean read. Hot-path callers that ran a cached boolean before
 * (the store `get()` freeze) keep caching the first result per instance rather
 * than probing on every call.
 */
export function isDevMode(): boolean {
  const override = (globalThis as { KERF_DEV?: unknown }).KERF_DEV;
  if (typeof override === 'boolean') return override;
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return proc?.env?.NODE_ENV !== 'production';
}
