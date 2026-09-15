/**
 * Dev-only deep read-only guard for `defineStore`'s `get()` snapshot.
 *
 * Replaces the older `Object.freeze(get())` guard, which had three problems:
 * it mutated (froze) the LIVE state object as a side effect of a read, so
 * external references that later legitimately mutated it threw in dev but not
 * prod; it was shallow (`get().nested.x = 1` slipped through); and freezing on
 * read is surprising. This module instead wraps the returned reference in a
 * lazy `Proxy` that:
 *
 *  - throws a store-rule-specific `TypeError` on any write (`set` /
 *    `deleteProperty` / `defineProperty`) — mutating the object returned by
 *    `get()` is a Rule 8 violation (all writes go through actions), and now it
 *    is a loud throw instead of a silent desync;
 *  - lazily wraps plain-object / array property values in the SAME proxy on
 *    access (deep coverage, O(1) per access, no clones), so `get().nested.x = 1`
 *    also throws;
 *  - leaves primitives, functions, and exotic objects (Date, Map, …) as-is, so
 *    `instanceof`, `JSON.stringify`, spread, `Object.keys`, and array iteration
 *    all behave exactly as on the raw object.
 *
 * The live state object is never frozen or mutated, so an external reference to
 * it stays writable. This guard is DEV-ONLY: production returns the raw
 * reference and never constructs a proxy, so its perf and semantics are
 * byte-identical to a bare object.
 *
 * `toRaw()` reverses the wrapping so a state object DERIVED from `get()` output
 * (e.g. `set({ ...get(), count: 1 })`, whose nested values are proxies handed
 * back by the `get` trap) is stored as a plain object — the internal signal
 * must never hold a Proxy.
 */

const RULE_MESSAGE
  = 'kerf: store state is read-only — all writes must go through actions '
  + '(build a new state object and pass it to `set()`). Mutating the object '
  + 'returned by `get()` is a Rule 8 violation and never notifies subscribers.';

/** proxy → its raw target. Lets `toRaw()` unwrap a value derived from `get()`. */
const proxyToRaw = new WeakMap<object, object>();
/** raw → its proxy. Stable proxy identity + avoids re-wrapping the same object. */
const rawToProxy = new WeakMap<object, object>();

/** Only plain objects and arrays are wrapped; exotic objects pass through untouched. */
function isWrappable(v: unknown): v is object {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return true;
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
}

const handler: ProxyHandler<object> = {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver) as unknown;
    return isWrappable(value) ? devReadonlyProxy(value) : value;
  },
  set() {
    throw new TypeError(RULE_MESSAGE);
  },
  deleteProperty() {
    throw new TypeError(RULE_MESSAGE);
  },
  defineProperty() {
    throw new TypeError(RULE_MESSAGE);
  },
};

/** Wrap `obj` in the dev read-only proxy (idempotent, identity-stable per raw). */
export function devReadonlyProxy<T extends object>(obj: T): T {
  if (proxyToRaw.has(obj)) return obj; // already a proxy — don't double-wrap
  const cached = rawToProxy.get(obj);
  if (cached) return cached as T;
  const p = new Proxy(obj, handler) as T;
  rawToProxy.set(obj, p as object);
  proxyToRaw.set(p as object, obj);
  return p;
}

/**
 * Deep-unwrap any dev read-only proxies out of `value`, preserving structural
 * sharing: returns the SAME reference when nothing was a proxy, and only
 * allocates along the path to a proxy it actually replaces. Raw targets are
 * fully plain (proxies are never stored), so unwrapping one is deep-clean.
 */
export function toRaw<T>(value: T): T {
  return unwrap(value) as T;
}

function unwrap(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  const raw = proxyToRaw.get(v);
  if (raw !== undefined) return raw; // a proxy → its fully-plain raw target
  if (!isWrappable(v)) return v; // exotic object — leave as-is

  if (Array.isArray(v)) {
    let changed = false;
    const out = v.map((item) => {
      const u = unwrap(item);
      if (u !== item) changed = true;
      return u;
    });
    return changed ? out : v;
  }

  let changed = false;
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src)) {
    const u = unwrap(src[k]);
    if (u !== src[k]) changed = true;
    out[k] = u;
  }
  return changed ? out : v;
}
