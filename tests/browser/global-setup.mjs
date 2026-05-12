/**
 * Playwright globalSetup:
 *  1. Bundle the consumer-app fixture against the current `dist/` build (~15 ms).
 *  2. KF-165: Bundle each `site/src/examples/complete/<name>/` app with
 *     `base: './'` to `tests/dist/example-apps/<name>/` so the example-apps
 *     spec can drive them through Playwright. ~2 s for all six apps.
 *
 * Skipped when `KERF_SKIP_CONSUMER_BUILD=1` (consumer-app) or
 * `KERF_SKIP_EXAMPLE_APPS_BUILD=1` (example-apps) is set — useful while
 * iterating on an unrelated spec.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export default async function globalSetup() {
  const here = dirname(fileURLToPath(import.meta.url));

  if (process.env.KERF_SKIP_CONSUMER_BUILD !== '1') {
    const buildScript = resolve(here, '../dist/consumer-app/build.mjs');
    const result = spawnSync(process.execPath, [buildScript], { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error('consumer-app build failed; aborting Playwright run');
    }
  }

  if (process.env.KERF_SKIP_EXAMPLE_APPS_BUILD !== '1') {
    const buildScript = resolve(here, '../dist/example-apps/build.mjs');
    const result = spawnSync(process.execPath, [buildScript], { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error('example-apps build failed; aborting Playwright run');
    }
  }
}
