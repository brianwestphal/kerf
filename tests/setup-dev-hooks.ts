/**
 * Global test setup: install kerf's dev hooks for every suite.
 *
 * kerf no longer infers development mode — the consumer opts in by importing
 * `kerfjs/dev` (see `src/dev-hooks.ts`). kerf's OWN suites are development by
 * definition, so installing here keeps every existing assertion about warnings,
 * list invariants, the read-only store snapshot, and the throw-on-dangerous-URL
 * screen behaving exactly as it did when the gate was an ambient `NODE_ENV`
 * read. Individual warners still consult their own `KERF_DEV_WARN_*` env vars,
 * so per-test opt-in continues to work as before.
 *
 * Tests that need the production shape (no hooks installed) call
 * `clearDevHooks()` from `src/dev-hooks.ts` and reinstall afterwards — see
 * `tests/unit/dev-hooks.internal.test.ts`.
 */

import '../src/dev.js';
