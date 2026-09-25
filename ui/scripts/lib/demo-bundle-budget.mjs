import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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
