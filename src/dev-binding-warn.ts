/** Opt-in report of changed global signal instances on a byte-equal render.
 * Kerf retargets these automatically. Stable references avoid effect churn.
 */
import type { Binding } from './bindings.js';
import { devFlag, silenceHint } from './dev-warn-config.js';

/** Per-hole one-shot dedup — keyed by the stable per-hole binding id. */
const warnedHoles = new Set<string>();

export function isOptedIn(): boolean {
  return devFlag('KERF_DEV_WARN_STALE_BINDING') === '1';
}

function describeHole(b: Binding): string {
  return b.kind === 'attr'
    ? `attr '${b.attr}' (id '${b.id}')`
    : `text (id '${b.id}')`;
}

/**
 * Compare this render's registered holes against the previously-wired holes,
 * in registration order, and warn once per hole whose signal instance changed
 * on a fast-path (byte-equal-surrounds) render. On the fast path the two lists
 * describe the same holes in the same order, so a per-index compare suffices;
 * the `Math.min` guard is defensive against a length skew that can't occur when
 * the surrounds are byte-equal.
 */
export function maybeWarnStaleBinding(
  prevWired: readonly Binding[],
  current: readonly Binding[],
): void {
  const n = Math.min(prevWired.length, current.length);
  for (let i = 0; i < n; i++) {
    const cur = current[i];
    if (prevWired[i].signal === cur.signal) continue;
    if (warnedHoles.has(cur.id)) continue;
    warnedHoles.add(cur.id);
    console.warn(
      `kerf: fine-grained binding ${describeHole(cur)} switched to a different signal instance ` +
        'on a byte-equal render. Kerf retargeted this hole. If the source changes unnecessarily, ' +
        'reuse a stable signal or computed to avoid restarting its effect (docs/2-reactivity §2.9). ' +
        silenceHint('staleBinding'),
    );
  }
}

/**
 * Test helper — resets the one-shot dedup set so a subsequent test in the same
 * module can re-exercise the first-warning path. Not exported from the public
 * barrel; the unit-test file imports it directly via the relative path.
 */
export function _resetWarnedForTests(): void {
  warnedHoles.clear();
}
