// KF-YN8JNT: an interim guard on local Playwright WebKit runs, until a
// machine-wide browser slot pool exists. One Playwright WebKit page holds
// roughly 500-800 macOS IOSurfaces, and several WebKit browsers running at
// once across agent sessions and repositories exhausted the system limit and
// crashed WindowServer (logging the session out). Nothing limits WebKit
// across sessions yet, so a local run:
//
// - refuses `--repeat-each` above 1 when it includes the WebKit project,
//   unless KERF_ALLOW_WEBKIT_REPEAT=1 is set;
// - warns on any WebKit run.
//
// CI is unaffected. Each Playwright config calls `guardWebkitRun()` with its
// project names; it acts once, in the runner process (a worker has
// TEST_WORKER_INDEX set), and throws before any browser starts.

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
 * What a run with `argv` and `env` over a config's `projects` (names) should
 * do: `{ error }` to refuse it, `{ warning }` to warn, or `{}`.
 */
export function webkitGuard({ argv, env, projects }) {
  if ((env.CI ?? '') !== '') return {};
  if (!projects.includes('webkit')) return {};
  const chosen = flagValues(argv, '--project').flatMap((value) =>
    value.split(','),
  );
  const webkit =
    chosen.length === 0 ||
    chosen.some((name) => name.trim().toLowerCase() === 'webkit');
  if (!webkit) return {};
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
