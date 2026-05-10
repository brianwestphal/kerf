/**
 * Playwright globalSetup: ensure the consumer-app fixture is freshly bundled
 * against the current `dist/` build before any spec runs. The build step is
 * cheap (~15 ms via esbuild) so doing it on every test run keeps the spec
 * honest — the assertions always reflect the latest source + dist.
 *
 * Skipped if `KERF_SKIP_CONSUMER_BUILD=1` is set (useful during iteration on
 * a non-consumer-app spec).
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export default async function globalSetup() {
  if (process.env.KERF_SKIP_CONSUMER_BUILD === '1') return;
  const here = dirname(fileURLToPath(import.meta.url));
  const buildScript = resolve(here, '../dist/consumer-app/build.mjs');
  const result = spawnSync(process.execPath, [buildScript], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('consumer-app build failed; aborting Playwright run');
  }
}
