import { availableParallelism, cpus, loadavg } from 'node:os';
import process from 'node:process';

/** The most a timeout is stretched for machine load. */
const MAX_SCALE = 4;

/**
 * How much to stretch a fixed timeout on a busy machine. Integration tests
 * that pack, install, build, or drive a browser run whole subprocesses, so a
 * timeout sized for an idle machine fails for load rather than for a
 * regression when other suites share the CPU. `KERF_TEST_TIMEOUT_SCALE`
 * sets the factor explicitly; otherwise the factor is the one-minute load
 * average per core, clamped to 1..4, and stays 1 in CI unless overridden.
 */
export function timeoutScale(
  env: Readonly<Record<string, string | undefined>> = process.env,
  load: number = loadavg()[0] ?? 0,
  cores: number = typeof availableParallelism === 'function'
    ? availableParallelism()
    : cpus().length,
): number {
  const requested = Number.parseFloat(env.KERF_TEST_TIMEOUT_SCALE ?? '');
  if (Number.isFinite(requested) && requested > 0)
    return Math.min(MAX_SCALE, requested);
  if ((env.CI ?? '') !== '') return 1;
  if (!(cores > 0)) return 1;
  return Math.min(MAX_SCALE, Math.max(1, load / cores));
}

/** `ms` stretched by {@link timeoutScale}, measured once per test file. */
const scale = timeoutScale();
export function loadScaledTimeout(ms: number): number {
  return Math.round(ms * scale);
}
