// Decide which sibling-package gates a change needs, so the local `npm run
// check` fails on the same package gates CI's per-package jobs run.
//
// CI runs `ui` (`npm run check`), `eslint-plugin`, `create-kerf-component`,
// and `editor` as separate jobs. The root chain never ran them, so a core-size change that
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
    // The plugin's rules read @kerfjs/ui's shipped AI data (the component
    // catalog, composition, and profile defaults), so a ui-only change to
    // that data can break its tests: a Discouraged-list change once turned
    // both eslint-plugin CI jobs red while every local gate passed.
    triggers: ['eslint-plugin/', 'ui/ai/', 'ui/package.json'],
  },
  {
    name: 'create-kerf-component:test',
    dir: 'create-kerf-component',
    args: ['test'],
    // The scaffold bundles copies of these @kerfjs/ui contract schemas.
    triggers: [
      'create-kerf-component/',
      'ui/ai/component-composition.schema.json',
      'ui/ai/component-catalog-extension.schema.json',
    ],
  },
  {
    name: 'editor:check',
    dir: 'editor',
    args: ['run', 'check'],
    // The private Kerf UI editor renders documents through @kerfjs/ui/view
    // against the shipped catalogs. Broader ui and core changes reach it in
    // CI's editor job rather than on every local push.
    triggers: [
      'editor/',
      'ui/view/',
      'ui/ai/component-props.json',
      'ui/ai/component-props-overlay.json',
      'ui/ai/component-composition.json',
      'ui/ai/component-catalog.json',
    ],
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
 * failed, or `null`. Input is validated run summaries (newest creation first);
 * an in-progress newest run falls through to the latest completed one. The
 * I/O caller establishes remote freshness before passing these summaries.
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
