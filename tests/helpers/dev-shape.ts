/**
 * Switch a suite between kerf's development and production SHAPES.
 *
 * kerf no longer infers development mode from `NODE_ENV` / `globalThis.KERF_DEV`
 * — the consumer opts in by importing `kerfjs/dev`, and "production" simply
 * means no dev hooks are installed. Tests that assert production behavior (the
 * URL screen warning instead of throwing, the store `get()` snapshot handed back
 * raw) therefore uninstall the hooks rather than flipping a global.
 *
 * `tests/setup-dev-hooks.ts` installs the hooks for every suite, so the default
 * state is development. Pair these in `beforeEach` / `afterEach`.
 */

import { clearDevHooks, DEV_HOOKS, installDevHooks } from '../../src/dev.js';

/** Uninstall every dev hook — kerf behaves exactly as it does in a production bundle. */
export function enterProductionShape(): void {
  clearDevHooks();
}

/** Reinstall the standard dev bundle, undoing `enterProductionShape()`. */
export function restoreDevelopmentShape(): void {
  installDevHooks(DEV_HOOKS);
}
