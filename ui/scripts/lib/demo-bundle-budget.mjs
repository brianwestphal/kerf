import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export async function measureDemoBundle(assetsDir) {
  const javascript = (await readdir(assetsDir)).filter((name) =>
    name.endsWith('.js'),
  );
  const sizes = await Promise.all(
    javascript.map(async (name) => ({
      name,
      gzip: gzipSync(await readFile(resolve(assetsDir, name))).byteLength,
    })),
  );
  const largest = sizes.reduce((current, asset) =>
    asset.gzip > current.gzip ? asset : current,
  );
  return {
    chunks: javascript.length,
    totalJavaScriptGzip: sizes.reduce((sum, asset) => sum + asset.gzip, 0),
    largestJavaScriptGzip: largest.gzip,
    largestJavaScriptAsset: largest.name,
  };
}

export const roundedBudget = (bytes) => Math.ceil(bytes / 100) * 100;

export function updateDemoBundleBudget(budget, measurement, reason, at) {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 10)
    throw new Error('Bundle-budget updates require a specific review reason.');
  const nextTotalBudget = roundedBudget(measurement.totalJavaScriptGzip);
  const nextLargestBudget =
    measurement.largestJavaScriptGzip > budget.largestJavaScriptGzip
      ? roundedBudget(measurement.largestJavaScriptGzip)
      : budget.largestJavaScriptGzip;
  return {
    ...budget,
    largestJavaScriptGzip: nextLargestBudget,
    totalJavaScriptGzip: nextTotalBudget,
    measuredLargestJavaScriptGzip: measurement.largestJavaScriptGzip,
    measuredTotalJavaScriptGzip: measurement.totalJavaScriptGzip,
    history: [
      ...(budget.history ?? []),
      {
        at,
        reason: trimmedReason,
        old: {
          measuredLargestJavaScriptGzip: budget.measuredLargestJavaScriptGzip,
          measuredTotalJavaScriptGzip: budget.measuredTotalJavaScriptGzip,
          largestJavaScriptGzip: budget.largestJavaScriptGzip,
          totalJavaScriptGzip: budget.totalJavaScriptGzip,
        },
        next: {
          measuredLargestJavaScriptGzip: measurement.largestJavaScriptGzip,
          measuredTotalJavaScriptGzip: measurement.totalJavaScriptGzip,
          largestJavaScriptGzip: nextLargestBudget,
          totalJavaScriptGzip: nextTotalBudget,
        },
      },
    ],
  };
}

export function gzipDelta(measurement, budget) {
  return {
    total: measurement.totalJavaScriptGzip - budget.measuredTotalJavaScriptGzip,
    largest:
      measurement.largestJavaScriptGzip - budget.measuredLargestJavaScriptGzip,
  };
}

/**
 * Gzip output depends on the zlib bundled with Node, so byte-identical assets
 * measure differently across Node majors (Node 22's zlib and Node 26's differ
 * by ~0.8 kB on the catalog). The reviewed baseline is only comparable when it
 * is measured on the repository's pinned Node (`.nvmrc`, also CI's version).
 * Returns a human-readable mismatch message, or null when the majors agree.
 */
export function measuringNodeMismatch(nodeVersion, pinnedVersion) {
  const major = (version) =>
    String(version).trim().replace(/^v/, '').split('.')[0];
  if (major(nodeVersion) === major(pinnedVersion)) return null;
  return `UX demo gzip sizes were measured on Node ${nodeVersion}, but the reviewed baseline is recorded on the pinned Node ${String(pinnedVersion).trim()} (.nvmrc). Gzip output depends on Node's bundled zlib, so switch to the pinned Node before recording or comparing a baseline.`;
}

/**
 * KF-J1Z4VA: how far apart two Node majors' zlib can put the same bundle's
 * gzip total. Measured at 1,047 bytes between Node 22 and 26 on the catalog
 * (2026-11-12), rounded up for headroom.
 */
export const ZLIB_DRIFT_BYTES = 1500;

/**
 * Measure `assetsDir` under the pinned Node major (`.nvmrc`), the version CI
 * and the reviewed baseline use, through `npx node@<major>`. It prefers the
 * npx cache, so it works offline once that Node has been fetched. Returns
 * the measurement, or null when that Node cannot run. `run` replaces
 * `spawnSync` in tests.
 */
export function measureOnPinnedNode(assetsDir, pinnedVersion, run = spawnSync) {
  const major = String(pinnedVersion).trim().replace(/^v/, '').split('.')[0];
  const cli = fileURLToPath(
    new URL('./demo-bundle-measure.mjs', import.meta.url),
  );
  const result = run(
    'npx',
    ['--yes', '--prefer-offline', `node@${major}`, cli, assetsDir],
    { encoding: 'utf8', timeout: 180_000 },
  );
  if (result.status !== 0) return null;
  try {
    const measured = JSON.parse(
      String(result.stdout).trim().split('\n').at(-1),
    );
    return String(measured.node).replace(/^v/, '').split('.')[0] === major
      ? measured.measurement
      : null;
  } catch {
    return null;
  }
}

/**
 * When a measurement could only be taken on another Node major, whether it
 * lies within `ZLIB_DRIFT_BYTES` of a budget, where the pinned Node (and so
 * CI) may measure it over. Returns the failure message, or null.
 */
export function zlibDriftRisk(measurement, budget, nodeVersion) {
  const close = [
    ['total', measurement.totalJavaScriptGzip, budget.totalJavaScriptGzip],
    [
      'largest chunk',
      measurement.largestJavaScriptGzip,
      budget.largestJavaScriptGzip,
    ],
  ].find(([, size, limit]) => size > limit - ZLIB_DRIFT_BYTES);
  if (!close) return null;
  const [name, size, limit] = close;
  return `UX demo JavaScript ${name} measures ${size} bytes gzip on Node ${nodeVersion}, within ${ZLIB_DRIFT_BYTES} bytes of its ${limit}-byte budget, and the pinned Node could not run to measure it. CI's pinned Node may put it over budget. Install the .nvmrc Node (or let \`npx node@<major>\` fetch it once) and rerun.`;
}
