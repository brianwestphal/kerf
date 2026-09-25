import { delimiter, dirname, resolve } from 'node:path';

/**
 * The step plan and child-process environment for `npm run check:change`.
 *
 * Two invariants keep its demo-bundle measurement identical to
 * `npm run demo:build`'s:
 *
 * 1. The demo is built and measured by the same package scripts demo:build
 *    runs (`demo:bundle` followed by `check-demo-bundle.mjs`), never by a
 *    hand-copied command sequence that can drift from it.
 * 2. Every child runs on the Node that invoked check:change. Gzip sizes depend
 *    on the zlib bundled with Node, so a child that resolves a different
 *    `node` (an interactive shell re-reading the user's profile, for example)
 *    measures byte-identical assets as a different total.
 */

export const DEMO_BUNDLE_COMMAND = 'npm run demo:bundle';
export const DEMO_CHECK_COMMAND = 'node scripts/check-demo-bundle.mjs';

export const uiChangeSyncSteps = () => [
  { label: 'synchronize v1/v2 catalogs', command: 'npm run catalog:sync' },
  {
    label: 'build declarations and browser/CSS entries',
    command: 'npm run build',
  },
  {
    label: 'synchronize AI public signatures',
    command: 'node scripts/sync-ai-public-signatures.mjs',
  },
  {
    label: 'synchronize reviewed AI compatibility digests',
    command: 'node scripts/sync-ai-compatibility.mjs --write',
  },
];

export function uiChangeGateSteps({ updateBundleBudget = false, reason } = {}) {
  return [
    {
      label: 'validate catalog and integration projections',
      command: 'npm run check:catalog',
    },
    {
      label: 'validate public component surfaces',
      command: 'npm run check:component-integrations',
    },
    {
      label: 'run unit and component-contract coverage',
      command: 'npm run test:unit',
    },
    {
      label: 'run consumer bundle coverage',
      command: 'npx vitest run tests/bundle',
    },
    {
      label: 'run source consumer type contracts',
      command: 'npm run test:contract-types:source',
    },
    {
      label: 'run Web Awesome consumer typing',
      command:
        'node node_modules/typescript7/bin/tsc -p tests/consumer-types/webawesome/tsconfig.json',
    },
    {
      label: 'run packed type contracts',
      command: 'npm run test:contract-types:packed',
    },
    {
      label: 'rebuild the package and the production UX demo (as demo:build)',
      command: DEMO_BUNDLE_COMMAND,
    },
    updateBundleBudget
      ? {
          label: 'record reviewed bundle budget update',
          command: `${DEMO_CHECK_COMMAND} --update-budget`,
          env: { KERF_UI_BUNDLE_REASON: reason },
        }
      : {
          label: 'report exact demo gzip delta',
          command: DEMO_CHECK_COMMAND,
        },
  ];
}

/** Child environment that pins `node`/`npm` to the invoking Node binary. */
export function commandEnvironment(baseEnv, { execPath, root, extra = {} }) {
  const path = [
    dirname(execPath),
    resolve(root, 'node_modules/.bin'),
    baseEnv.PATH,
  ]
    .filter(Boolean)
    .join(delimiter);
  return { ...baseEnv, ...extra, PATH: path };
}
