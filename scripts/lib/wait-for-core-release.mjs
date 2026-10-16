// Release ordering gate: the three lockstep dependents (eslint-plugin-kerfjs,
// create-kerf-component, @kerfjs/ui) must never reach npm before the kerfjs
// version they name. Their workflows fire on the same tag as the core
// release.yml, so each one's publish job waits on this poll instead of a
// cross-workflow `needs:` (npm trusted publishing binds each package to its own
// workflow file, so the four cannot be merged into one).

/**
 * Poll until `isPublished()` reports the core version on npm.
 *
 * Fails fast when `coreRunConclusion()` reports a finished core release run
 * that did not succeed, and fails once `timeoutMs` elapses without the version
 * appearing. A finished, successful core run whose version is not visible yet
 * keeps polling — registry reads can lag the publish by a few seconds.
 */
export async function waitForCoreRelease({
  version,
  isPublished,
  coreRunConclusion,
  sleep,
  now,
  timeoutMs,
  intervalMs,
  log = () => {},
}) {
  const startedAt = now();
  for (;;) {
    if (await isPublished(version)) {
      log(`kerfjs@${version} is on npm`);
      return;
    }
    const conclusion = await coreRunConclusion();
    if (conclusion !== null && conclusion !== 'success') {
      throw new Error(
        `the core kerfjs release run for ${version} finished as "${conclusion}" without publishing; ` +
          'fix and re-run it, then re-run this job',
      );
    }
    const elapsed = now() - startedAt;
    if (elapsed >= timeoutMs) {
      throw new Error(
        `kerfjs@${version} did not appear on npm within ${Math.round(timeoutMs / 60_000)} minutes`,
      );
    }
    log(
      `waiting for kerfjs@${version} (core run: ${conclusion ?? 'in progress'})`,
    );
    await sleep(Math.min(intervalMs, timeoutMs - elapsed));
  }
}

/**
 * The conclusion of the newest core `release.yml` run for `sha`, or `null`
 * while it is still running (or when no run is visible yet).
 */
export function latestRunConclusion(runs) {
  const newest = [...runs].sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)),
  )[0];
  if (newest === undefined || newest.status !== 'completed') return null;
  return newest.conclusion ?? 'unknown';
}
