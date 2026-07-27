/**
 * The switch layer for the opt-in diagnostics — the second of the two gates
 * (§11.3.1). The first gate is installation: reaching this module at all means
 * the consumer imported `kerfjs/dev`.
 *
 * Two sources feed one lookup, explicit-call-wins:
 *
 *  1. `enableWarnings({...})` — an in-memory map, set by the consumer through
 *     the `kerfjs/dev` entry. Explicit wins in BOTH directions, so
 *     `{ narrowSet: false }` silences a warning an ambient env var switched on.
 *  2. `globalThis.process?.env?.KERF_DEV_*` — the environment, kept for Node,
 *     SSR, and CI, where exporting a variable is the natural way to turn a
 *     diagnostic on for one run.
 *
 * ## Why the env var could not be the only switch
 *
 * It is unreachable in the majority case. kerf is a browser framework, and a
 * browser realm has no `process` object at all — so every one of these
 * warnings was permanently off in exactly the environment (a Vite/webpack dev
 * server) where a developer most wants them. A bundler `define` does not fix
 * it either: the read goes through `globalThis.process` into a local binding,
 * so nothing substitutes the `process.env.X` token. That indirection is not
 * incidental — reading the bare token is what made kerf infer DEVELOPMENT
 * inside production browser bundles.
 *
 * The consumer already holds the module at the moment they opt in
 * (`const dev = await import('kerfjs/dev')`), so handing them a typed function
 * there is both the most reachable and the most discoverable switch. The env
 * vars stay because kerf's own suites and any CI run use them.
 */

/**
 * Which diagnostics to switch on. Every key is off unless you name it; passing
 * `false` explicitly forces a warning off even when its env var is set.
 *
 * `invariants` is not a warning but the structural audit of kerf's own list
 * bookkeeping: `true` reports violations with `console.warn`, `'throw'` raises
 * them (what you want in a test suite, where a warning inside a passing test
 * is invisible).
 */
export interface DevWarningOptions {
  /** Imperative `addEventListener` on a node the morph later rebuilds. */
  rebuiltListeners?: boolean;
  /** A `.value` write to a signal that never had a subscriber. */
  untrackedSignals?: boolean;
  /** `defineStore` `set()` called with keys missing from the current state. */
  narrowSet?: boolean;
  /** `delegate()` called inside an `effect()` body — listeners stack up. */
  delegateInEffect?: boolean;
  /** An `each()` list under a `data-morph-skip` subtree. */
  eachInMorphSkip?: boolean;
  /** Two rows in one `each()` producing the same `cacheKey`. */
  duplicateEachKeys?: boolean;
  /** A fine-grained binding switching signal instance on the fast path. */
  staleBinding?: boolean;
  /** A re-render whose whole diff was values — candidates for bindings. */
  valueOnlyRerender?: boolean;
  /** An `each()` container rebuilt by the morph and self-healed. */
  listRebind?: boolean;
  /** A memoized row reused at a different index than it rendered at. */
  staleIndex?: boolean;
  /** Markup the HTML parser repaired (a block element inside a `<p>`). */
  parserRepair?: boolean;
  /** Structural audit of kerf's list bookkeeping: warn, or `'throw'`. */
  invariants?: boolean | 'throw';
}

/** Option key → the environment variable that means the same thing. */
const ENV_NAME: Record<keyof DevWarningOptions, string> = {
  rebuiltListeners: 'KERF_DEV_WARN_REBUILT_LISTENERS',
  untrackedSignals: 'KERF_DEV_WARN_UNTRACKED_SIGNALS',
  narrowSet: 'KERF_DEV_WARN_NARROW_SET',
  delegateInEffect: 'KERF_DEV_WARN_DELEGATE_IN_EFFECT',
  eachInMorphSkip: 'KERF_DEV_WARN_EACH_IN_MORPH_SKIP',
  duplicateEachKeys: 'KERF_DEV_WARN_DUPLICATE_EACH_KEYS',
  staleBinding: 'KERF_DEV_WARN_STALE_BINDING',
  valueOnlyRerender: 'KERF_DEV_WARN_VALUE_ONLY_RERENDER',
  listRebind: 'KERF_DEV_WARN_LIST_REBIND',
  staleIndex: 'KERF_DEV_WARN_STALE_INDEX',
  parserRepair: 'KERF_DEV_WARN_PARSER_REPAIR',
  invariants: 'KERF_DEV_INVARIANTS',
};

/** Env name → the value the call set. `false` means "explicitly off". */
const overrides = new Map<string, string | false>();

/** Apply a consumer's `enableWarnings()` options to the override map. */
export function applyWarningOptions(options: DevWarningOptions): void {
  for (const [key, value] of Object.entries(options)) {
    const envName = ENV_NAME[key as keyof DevWarningOptions];
    // Unknown keys are ignored rather than thrown on: a consumer who upgrades
    // kerf downwards should not have their app die on a key that used to exist.
    if (envName === undefined || value === undefined) continue;
    overrides.set(envName, value === false ? false : value === true ? '1' : value);
  }
}

/**
 * The value of one diagnostic switch, or `undefined` when it is off.
 * Every warner's opt-in check goes through here.
 */
export function devFlag(envName: string): string | undefined {
  const override = overrides.get(envName);
  if (override !== undefined) return override === false ? undefined : override;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[envName];
}

/** Test helper — drops every `enableWarnings()` override. */
export function _resetWarningOptionsForTests(): void {
  overrides.clear();
}
