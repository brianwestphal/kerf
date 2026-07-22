/**
 * Shared dev-mode gate. One primary export: `isDevMode()`.
 *
 * Two inputs, override-wins precedence:
 *
 *  1. `globalThis.KERF_DEV` — explicit runtime override. When set to a boolean
 *     it WINS unconditionally: `false` forces production behavior even under a
 *     development `NODE_ENV`; `true` forces development behavior even under
 *     `NODE_ENV=production`. Read lazily (at call time, never memoized at
 *     import) so a no-bundler consumer loading kerf from a CDN can set it once
 *     before mounting and have it take effect.
 *
 *  2. `process.env.NODE_ENV` — the default when no override is present.
 *     Development is ON unless `NODE_ENV === 'production'`. Read through
 *     `globalThis.process` so the source runs untouched in a browser that has
 *     no `process` binding, and so a bundler that statically substitutes
 *     `NODE_ENV` continues to dead-code-eliminate the dev paths for bundled
 *     production consumers.
 *
 * Perf: the reads are a handful of optional-chained property accesses, as
 * cheap as a boolean read. Hot-path callers cache the first result per
 * instance rather than probing on every call.
 */
export function isDevMode(): boolean {
  const override = (globalThis as { KERF_DEV?: unknown }).KERF_DEV;
  if (typeof override === 'boolean') return override;
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return proc?.env?.NODE_ENV !== 'production';
}
