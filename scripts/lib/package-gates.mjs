// Decide which sibling-package gates a change needs, so the local `npm run
// check` fails on the same package gates CI's per-package jobs run.
//
// CI runs `ui` (`npm run check`), `eslint-plugin`, and `create-kerf-component`
// as separate jobs. The root chain never ran them, so a core-size change that
// pushed the @kerfjs/ui demo bundle over budget passed every local push while
// CI stayed red. The browser-heavy CI gates (ui `test:e2e`, the design-template
// drift render, the root Playwright matrix) stay CI-only by design: each takes
// minutes and needs installed browser engines.

/**
 * @typedef {{ name: string, dir: string, args: string[], triggers: string[] }} PackageGate
 */

/** @type {PackageGate[]} */
export const PACKAGE_GATES = [
  {
    name: 'ui:check',
    dir: 'ui',
    args: ['run', 'check'],
    // @kerfjs/ui bundles kerf's core, so a core change can move its budgets.
    triggers: ['ui/', 'src/', 'package.json', 'package-lock.json'],
  },
  {
    name: 'eslint-plugin:test',
    dir: 'eslint-plugin',
    args: ['test'],
    triggers: ['eslint-plugin/'],
  },
  {
    name: 'create-kerf-component:test',
    dir: 'create-kerf-component',
    args: ['test'],
    triggers: ['create-kerf-component/'],
  },
];

/**
 * The gates whose triggers match any changed path. `null` means the changed
 * set is unknown (no upstream to compare against), which selects every gate.
 *
 * @param {readonly string[] | null} changedPaths repository-relative paths
 * @param {readonly PackageGate[]} [gates]
 * @returns {PackageGate[]}
 */
export function selectPackageGates(changedPaths, gates = PACKAGE_GATES) {
  if (changedPaths === null) return [...gates];
  return gates.filter((gate) =>
    changedPaths.some((path) =>
      gate.triggers.some((trigger) =>
        trigger.endsWith('/') ? path.startsWith(trigger) : path === trigger,
      ),
    ),
  );
}

/**
 * A warning line when the most recent completed CI run on the default branch
 * failed, or `null`. Input is `gh run list --json status,conclusion,headSha,url`
 * output (newest first); an in-progress newest run falls through to the latest
 * completed one.
 *
 * @param {ReadonlyArray<{ status?: string, conclusion?: string, headSha?: string, url?: string }>} runs
 * @returns {string | null}
 */
export function ciStatusWarning(runs) {
  const latest = runs.find((run) => run.status === 'completed');
  if (latest === undefined) return null;
  if (latest.conclusion === 'success' || latest.conclusion === 'skipped')
    return null;
  const sha = (latest.headSha ?? '').slice(0, 8);
  return `CI on main is ${latest.conclusion ?? 'not green'} at ${sha}${
    latest.url ? ` (${latest.url})` : ''
  } — local checks passing does not mean CI will; fix or ticket the red build.`;
}
