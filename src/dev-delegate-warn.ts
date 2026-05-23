/**
 * Dev-mode warning for `delegate()` / `delegateCapture()` calls that run
 * inside an `effect()` body (KERF_DEV_WARN_DELEGATE_IN_EFFECT=1).
 *
 * Why the pattern matters: every effect re-run executes its body fresh, which
 * means a `delegate()` call inside the body installs a NEW root listener on
 * each re-run. The effect's disposer cleans up the reactive subscription but
 * not the side-effects the body produced — so previous listeners stay
 * attached, the per-listener closure pins `rootEl` / `handler` / everything
 * the handler closes over, and listener count grows linearly with signal
 * churn. Structurally identical to the addEventListener-inside-mount foot-gun
 * (Hard Rule 4) but doesn't *look* like it.
 *
 * Static analysis can't reliably detect "inside an effect" without flow
 * information (effect() is just a function call), so the canonical defense
 * is this runtime opt-in warning. When enabled, `reactive.ts`'s `effect()`
 * wrapper increments a module-level counter before invoking the user body
 * and decrements after; `delegate.ts` checks the counter and fires the
 * warning once total.
 *
 * Production behavior is unchanged for zero runtime cost — the env-var check
 * short-circuits before any state is touched, and the wrapper in
 * `reactive.ts` only wraps when the gate is on.
 */

let depth = 0;
let warned = false;

function isOptedIn(): boolean {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (proc?.env?.NODE_ENV === 'production') return false;
  return proc?.env?.KERF_DEV_WARN_DELEGATE_IN_EFFECT === '1';
}

/** Called by the `effect()` wrapper in `reactive.ts` before running the user body. */
export function enterEffect(): void {
  depth++;
}

/** Called by the `effect()` wrapper in `reactive.ts` after the user body returns or throws. */
export function exitEffect(): void {
  depth--;
}

/** Public re-export of the env-var check so `reactive.ts` can decide whether to wrap. */
export function isDevWarnDelegateInEffectEnabled(): boolean {
  return isOptedIn();
}

/**
 * Called at the top of `delegate()` and `delegateCapture()`. If the call is
 * happening inside an `effect()` body (depth > 0) AND the env var is on, fire
 * a one-shot warning. The `fn` argument is the name of the caller for the
 * message ("delegate" vs "delegateCapture").
 */
export function warnIfInsideEffect(fn: 'delegate' | 'delegateCapture'): void {
  if (!isOptedIn()) return;
  if (depth === 0) return;
  if (warned) return;
  warned = true;
  console.warn(
    `kerf: ${fn}() was called inside an effect() body. `
    + 'Every effect re-run installs a fresh root listener; the effect disposer cleans up the '
    + 'reactive subscription but not the listeners, so listener count grows linearly with signal '
    + 'churn and each listener pins its handler closure. Register the delegate once at module '
    + 'or setup scope and gate behavior on the signal *inside the handler* where the read is free. '
    + 'See docs/5-event-delegation.md §5.3 "When capturing the disposer still isn\'t enough". '
    + 'Set KERF_DEV_WARN_DELEGATE_IN_EFFECT=0 (or unset it) to silence this warning.',
  );
}

/** Test helper — resets the one-shot dedup flag and depth counter for unit tests. */
export function _resetWarnedForTests(): void {
  warned = false;
  depth = 0;
}
