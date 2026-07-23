/**
 * Dev-mode warning for silently-stale fine-grained bindings on the fast path
 * (KERF_DEV_WARN_STALE_BINDING=1).
 *
 * `mount()` has a fast path: when a re-render produces byte-for-byte identical
 * static-surrounds HTML (`nextStaticHtml === prevStaticHtml`), the morph AND the
 * binding re-wiring are both skipped and the existing per-hole binding effects
 * stay live — each bound to the FIRST signal instance registered for its hole.
 *
 * That is correct for the canonical pattern `class={computed(() => sig.value)}`:
 * the fresh computed each render reads the same underlying signal(s), so the
 * original effect keeps firing. A hole goes silently STALE only when a render
 * switches which signal INSTANCE it binds while the surrounds string is
 * unchanged — `class={cond ? sigA : sigB}`. kerf keeps the original effect bound
 * to `sigA` and never re-binds to `sigB`, so the hole freezes with no error: the
 * UI just stops updating. See docs/2-reactivity §2.9.
 *
 * This warner detects that: on a fast-path render `mount()` calls
 * `maybeWarnStaleBinding(prevWired, current)`, comparing — per hole, in
 * registration order — the signal instance this render registered
 * (`bindingCtx.list`) against the signal instance that is actually wired (the
 * previously-wired list retained by `mount()`). A per-hole difference fires a
 * one-shot warning naming the hole (kind / attr / id) and pointing at the "bind
 * one computed that switches internally" fix.
 *
 * Why opt-in: the comparison is raw signal identity, so a GLOBAL (static-
 * surround) hole bound with a *fresh inline* `computed(() => …)` — a new
 * instance every render, but reading the same signals, hence safe — also differs
 * on the fast path and would warn. Binding a STABLE signal / computed reference
 * for global holes (the idiomatic shape) avoids that; the opt-in gate keeps the
 * diagnostic available for projects that want it without penalizing ones that
 * pass a fresh inline computed into a global hole. (Row holes inside `each()` are
 * wired per-row-node and disposed on row removal, so they are not subject to
 * this fast-path staleness and never reach this warner.)
 *
 * Production behavior is unchanged for zero runtime cost — the env-var read
 * short-circuits before any per-render comparison work runs, and `mount()` gates
 * the previously-wired-list retention on the same opt-in so the fast path stays
 * allocation-free when the warning is off.
 */

import type { Binding } from './bindings.js';
import { isDevMode } from './utils/devMode.js';

/** Per-hole one-shot dedup — keyed by the stable per-hole binding id. */
const warnedHoles = new Set<string>();

export function isOptedIn(): boolean {
  // Route the dev decision through the shared gate (family contract, docs/11
  // §11.3.1 rule 1) so the `globalThis.KERF_DEV` boolean override governs this
  // warner like every other member of the KERF_DEV_WARN_* family.
  if (!isDevMode()) return false;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.KERF_DEV_WARN_STALE_BINDING === '1';
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
  if (!isOptedIn()) return;
  const n = Math.min(prevWired.length, current.length);
  for (let i = 0; i < n; i++) {
    const cur = current[i];
    if (prevWired[i].signal === cur.signal) continue;
    if (warnedHoles.has(cur.id)) continue;
    warnedHoles.add(cur.id);
    console.warn(
      `kerf: fine-grained binding ${describeHole(cur)} switched to a different signal instance `
      + 'on a render whose static-surrounds HTML was byte-for-byte unchanged. On that fast path kerf '
      + 'keeps the original binding effect and does NOT re-bind, so this hole is now stale — it still '
      + 'tracks the FIRST signal instance and will not reflect the new one. Bind one computed that '
      + 'switches internally (e.g. class={computed(() => cond.value ? sigA.value : sigB.value)}) instead '
      + 'of switching which signal instance you bind (see docs/2-reactivity §2.9). '
      + 'Set KERF_DEV_WARN_STALE_BINDING=0 (or unset it) to silence this warning.',
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
