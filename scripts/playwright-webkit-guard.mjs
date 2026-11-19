// KF-YN8JNT: an interim guard on local Playwright WebKit runs. One Playwright
// WebKit page holds roughly 500-800 macOS IOSurfaces, and several WebKit
// browsers running at once across agent sessions and repositories exhausted
// the system limit and crashed WindowServer (logging the session out).
//
// KF-5YWM5X: a local run that includes WebKit now first holds slots of the
// machine-wide `browser-engines` pool (`./browser-slots.mjs`), one per WebKit
// worker, and runs only as many WebKit workers as it holds. The guard below
// applies only when that pool is unavailable (no `hotsheet-cli`) or turned
// off (`HOTSHEET_BROWSER_SLOTS=off`):
//
// - refuses `--repeat-each` above 1 when it includes the WebKit project,
//   unless KERF_ALLOW_WEBKIT_REPEAT=1 is set;
// - warns on any WebKit run.
//
// CI is unaffected. Each Playwright config calls `prepareWebkitRun()` with its
// project names; it acts once, in the runner process (a worker has
// TEST_WORKER_INDEX set), and throws before any browser starts.

import { holdRunnerWebkitSlots } from './browser-slots.mjs';

export const OVERRIDE = 'KERF_ALLOW_WEBKIT_REPEAT';

/** The values given to `--name=value` / `--name value` in `argv`. */
function flagValues(argv, name) {
  const values = [];
  argv.forEach((token, index) => {
    if (token.startsWith(`${name}=`)) values.push(token.slice(name.length + 1));
    else if (token === name && index + 1 < argv.length)
      values.push(argv[index + 1]);
  });
  return values;
}

/**
 * Whether a run with `argv` over a config's `projects` (names) launches
 * WebKit: the config has a `webkit` project and `--project` names it or
 * names nothing.
 */
export function runIncludesWebkit({ argv, projects }) {
  if (!projects.includes('webkit')) return false;
  const chosen = flagValues(argv, '--project').flatMap((value) =>
    value.split(','),
  );
  return (
    chosen.length === 0 ||
    chosen.some((name) => name.trim().toLowerCase() === 'webkit')
  );
}

/**
 * What a run with `argv` and `env` over a config's `projects` (names) should
 * do: `{ error }` to refuse it, `{ warning }` to warn, or `{}`.
 */
export function webkitGuard({ argv, env, projects }) {
  if ((env.CI ?? '') !== '') return {};
  if (!runIncludesWebkit({ argv, projects })) return {};
  const repeat = Math.max(
    1,
    ...flagValues(argv, '--repeat-each').map((value) => Number(value) || 1),
  );
  if (repeat > 1 && env[OVERRIDE] !== '1') {
    return {
      error:
        `Refusing a local Playwright run with --repeat-each=${repeat} that includes WebKit. ` +
        'Concurrent WebKit browsers can exhaust macOS IOSurfaces and crash WindowServer, ' +
        'and nothing limits them across sessions yet. Repeat in Chromium ' +
        `(--project=chromium), let CI cover WebKit, or set ${OVERRIDE}=1 when no other ` +
        'browser suite is running.',
    };
  }
  return {
    warning:
      'Local Playwright WebKit run: nothing limits WebKit browsers across sessions, and ' +
      'concurrent ones can exhaust macOS IOSurfaces. Prefer --project=chromium locally; ' +
      'CI covers WebKit.',
  };
}

/**
 * Applies `webkitGuard` to this process: in the runner, throws on a refused
 * run and prints a warning once; in a worker, does nothing.
 */
export function guardWebkitRun(
  projects,
  { argv = process.argv.slice(2), env = process.env, log = console.warn } = {},
) {
  if (env.TEST_WORKER_INDEX !== undefined) return;
  const { error, warning } = webkitGuard({ argv, env, projects });
  if (error) throw new Error(error);
  if (warning) log(`[playwright-webkit-guard] ${warning}`);
}

/**
 * KF-5YWM5X: prepares this process's run before any browser starts. In the
 * runner of a local run that includes WebKit, holds machine-wide WebKit slots
 * (one per wanted WebKit worker, up to the pool size) and returns
 * `{ webkitWorkers }`, the worker limit for the `webkit` project. Without the
 * pool (no `hotsheet-cli`, or `HOTSHEET_BROWSER_SLOTS=off`) it applies the
 * interim guard instead and returns `{}`. A worker, CI, `--list`, or a run
 * without WebKit returns `{}` and takes nothing.
 */
export async function prepareWebkitRun(
  projects,
  {
    workers,
    argv = process.argv.slice(2),
    env = process.env,
    log = console.warn,
    hold = holdRunnerWebkitSlots,
  } = {},
) {
  if (env.TEST_WORKER_INDEX !== undefined) return {};
  if ((env.CI ?? '') !== '' || argv.includes('--list')) return {};
  if (!runIncludesWebkit({ argv, projects })) return {};
  const held = await hold({ env, workers });
  if (held.workers) return { webkitWorkers: held.workers };
  if (held.reason === 'held') return {};
  if (held.reason === 'no-cli')
    log(
      '[playwright-webkit-guard] hotsheet-cli is not installed, so no machine-wide WebKit slot was taken.',
    );
  guardWebkitRun(projects, { argv, env, log });
  return {};
}
