/**
 * Shared dev-mode detection, used by the diagnostics that behave differently at
 * a developer's desk than in a shipped app (e.g. the URL screen's throw-in-dev /
 * warn-in-prod split — KF-340).
 *
 * A `globalThis.KERF_DEV` boolean override wins when set, so a host or a test
 * can force dev/prod regardless of the ambient `NODE_ENV`; otherwise the mode is
 * `NODE_ENV !== 'production'` (undefined `NODE_ENV`, `'development'`, `'test'`
 * all read as dev). Keep this the single probe — call it rather than re-deriving
 * `NODE_ENV` inline, so the override applies uniformly.
 */
export function isDevMode(): boolean {
  const override = (globalThis as { KERF_DEV?: unknown }).KERF_DEV;
  if (typeof override === 'boolean') return override;
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return proc?.env?.NODE_ENV !== 'production';
}
