# 11. Dev-mode warnings (opt-in)

A family of opt-in runtime warnings that surface common kerf misuse at the
moment the developer makes the wrong call. Each warning is gated by both
`NODE_ENV !== 'production'` *and* a feature-specific environment variable, so
production behavior is unchanged for zero runtime cost; existing dev
environments aren't surprised either (every warn is off by default).

This doc is the canonical statement of what the family is for, when each
member fires, and the rules that keep them coherent. New dev-warnings added
in the future must follow the same shape.

## 11.1 Why opt-in

The warnings here surface real misuse patterns, but each one has a
non-trivial false-positive surface in real codebases:

- A third-party widget that legitimately calls `addEventListener` on a node
  the consumer forgot to wrap in `data-morph-skip`.
- A purely-imperative `signal()` used as a mutable cell with no UI consumer.
- A store action that intentionally replaces state with a smaller shape (a
  `reset()` that drops keys, a feature-flag-driven schema change).

A warning that fires on every render in a real project is a warning that
gets disabled and ignored. Opt-in lets CI and dev environments that *want*
the diagnostic enable it explicitly while leaving the rest of the world
untouched.

The opt-in shape also means production bundles can short-circuit before any
per-call work runs — the env-var read is the first thing each warner does,
so the production-mode cost is one truthy-check at instantiation.

### Relationship to the static-check layer

The dev-warns are the runtime layer. Two earlier layers catch related misuse
before the program runs:

- **Strict TS** — `tsc --noEmit` against properly-typed store state catches
  Hard Rule 8 partial-set bugs as type errors. All complete example apps in
  this repo are under that gate.
- **`eslint-plugin-kerfjs`** — a separate publishable package, in
  [`eslint-plugin/`](../eslint-plugin/README.md), with four AST-only rules
  that fire at edit time for hard-rule violations the dev-warns can't see
  syntactically: `no-inline-jsx-event-handlers` (Rule 9),
  `require-data-key-in-each` (Rule 2), `no-nested-mount` (Rule 5),
  `prefer-module-jsx-augmentation` (Rule 11).

The three layers are complementary, not redundant. Lint catches AST-shaped
antipatterns at edit time; tsc catches type-shaped bugs at build time; the
dev-warns catch the runtime patterns that need flow / call-graph
information no static checker has.

## 11.2 The three warnings

### 11.2.1 `KERF_DEV_WARN_REBUILT_LISTENERS=1` (Rule 4)

**Module:** [`src/dev-listener-warn.ts`](../src/dev-listener-warn.ts) (KF-174).
**Trigger:** a node carrying an imperative `addEventListener` listener is
removed from a `mount()`-managed tree (by the morph, by an explicit
`each()` removal, or by a parent re-render). **What it catches:** Rule 4
violations — `el.addEventListener('click', fn)` on a node inside a mount
tree, whose listener is lost the next time the morph rebuilds that subtree.

**Mechanism.** When `mount()` runs with the env var set, it installs (once
per realm) a monkey-patch on `EventTarget.prototype.addEventListener` that
marks each Element receiver with a `Symbol.for("kerfjs.devListener")` flag.
A `MutationObserver` on the mount root watches for `childList` / `subtree`
removals; any removed Element (or descendant of a removed subtree) carrying
the marker fires the one-shot warning. The fix message points at
`delegate()` and `data-morph-skip` as the canonical fixes.

**Why opt-in.** The monkey-patch is realm-wide — every imperative listener
gets marked, including third-party widget code paths the consumer is using
correctly. False-positive surface includes custom elements that attach
listeners in their constructor and library-owned subtrees the consumer
forgot to wrap in `data-morph-skip`.

### 11.2.2 `KERF_DEV_WARN_UNTRACKED_SIGNALS=1` (Rule 7)

**Module:** [`src/dev-signal.ts`](../src/dev-signal.ts) (KF-176).
**Trigger:** a signal's `.value` is written when no subscriber has ever
attached to that signal. **What it catches:** Rule 7 violations — reading
`signal.value` outside a render fn or `effect()` callback (so the read
doesn't subscribe), then writing to it later and being surprised the UI
doesn't update.

**Mechanism.** With the env var set, `signal()` returns a `DevSignal<T>`
subclass instead of the bare `Signal<T>`. The subclass uses
signals-core's `SignalOptions.watched` callback to set a per-instance
`__hasSubscriber` flag — fired the first time any subscriber attaches.
Writes to `.value` check the flag; if it's still false on the first write,
the one-shot warning fires. The flag is sticky — once set, it never
clears, so a signal that *was* subscribed at some point won't warn even
after its subscribers detach.

**Why opt-in.** Purely imperative signals (used as mutable cells with no
UI consumer) are legitimate and would always warn under this heuristic.
The opt-in keeps the diagnostic available for UI-shaped projects without
penalising data-pipeline-shaped projects.

### 11.2.3 `KERF_DEV_WARN_NARROW_SET=1` (Rule 8)

**Module:** [`src/dev-store-warn.ts`](../src/dev-store-warn.ts) (KF-212).
**Trigger:** `defineStore.set(next)` is called with at least one key from
the current state missing in `next`. **What it catches:** Rule 8
violations — `set()` REPLACES state, so a partial-set call wipes any keys
not in `next`. The canonical bug shape is `set({ filter })` against a
3-key state of `{items, filter, editingId}` — the next read of `items`
returns `undefined` and the next action that calls `items.map(...)` throws.

**Mechanism.** Each `defineStore` carries a per-instance one-shot context
object (`{ warned: boolean }`). On every `set()` call,
`maybeWarnNarrowSet(prev, next, ctx)` runs the gate: short-circuit on
NODE_ENV / env var, short-circuit on non-plain-object state (arrays, null,
primitives), then check `Object.keys(prev).some(k => !(k in next))`. If
any key is missing, the warning fires once for this store and the context
flips to `warned: true`. The warning message names the missing keys (e.g.,
`` `items`, `editingId` ``) and points at `set({ ...get(), ...next })` as
the canonical merge fix.

**Why opt-in.** Narrow-set IS legal — a `reset()` action that drops keys,
a feature-flag-driven schema change, a state shape that genuinely needs to
shrink. The warn would fire on every legitimate shape-shrinking call
otherwise. Opt-in lets dev/CI environments that want the diagnostic enable
it without penalising consumers who use the shape-shrinking pattern
intentionally.

**Trigger semantics — "any missing key," not "fewer total keys."** A
`set({ a, c })` against `{ a, b }` (same count, different keys) also wipes
`b`, so the warner fires. The bug-shape is "at least one key from current
is missing in next"; key-count is just an implementation detail that
would have missed same-count-different-keys cases.

## 11.3 Design rules for the family

Every dev-warning in this family follows the same shape. New warnings
added to the family must too.

### 11.3.1 Gating

1. **Production short-circuit.** The first thing every warner does is read
   `process.env.NODE_ENV`. If it's `'production'`, return without any
   further work. The cost in production is one property read.
2. **Per-warning env var.** Each warning has its own
   `KERF_DEV_WARN_<NOUN>=1` env var. There is intentionally no umbrella
   `KERF_DEV_WARN=1` flag — opt-in is per-warning, so a consumer can
   enable the Rule 4 warner while leaving the Rule 8 warner off.
3. **Default off.** Every warning is off by default. The env-var
   `=0` and the unset state both mean off.

### 11.3.2 One-shot dedup

Each warning fires at most once per "owner": once per `mount()` for
KF-174, once per signal for KF-176, once per store for KF-212. The dedup
scope is the smallest unit that meaningfully represents "the developer
has now seen this warning for this owner" — not module-global (which
would make a second buggy store invisible after the first warns) and not
per-call (which would spam every render).

For testability, each warner exports a `_resetWarnedForTests()` /
`_resetWarnContext(ctx)` helper that re-arms the first-warning path.
These are not on the public dist barrel; tests import them via the
relative `../../src/dev-...-warn.js` path. Test files that exercise this
state are named `*.internal.test.ts` so the dist-full suite excludes
them.

### 11.3.3 Warning message shape

Every warning message ends with:

```
Set KERF_DEV_WARN_<NOUN>=0 (or unset it) to silence this warning.
```

This is the consumer's escape hatch — they can disable the warning
without rolling back the env var entirely. The message also names the
canonical fix (e.g., "Use `delegate()`," "Use `set({ ...get(), ...next })`")
so the developer doesn't need to fetch additional docs to act on it.

### 11.3.4 No public-API surface

None of the warners are re-exported from the main `kerfjs` barrel.
Consumers don't import them; the warning is a runtime behavior of the
host primitive (`signal()`, `mount()`, `defineStore`) when the env var
is set. The internal modules (`src/dev-listener-warn.ts`,
`src/dev-signal.ts`, `src/dev-store-warn.ts`) are not in
`src/index.ts`.

This keeps the public surface small and means a consumer's IDE
autocomplete doesn't suggest dev-warning APIs they shouldn't touch.

### 11.3.5 Zero production cost

The combined effect of the rules above is that a production bundle pays
nothing for the dev-warn family. The env-var read short-circuits before
any per-call work; tree-shaking can also drop the warner modules entirely
if nothing imports them in a particular consumer's bundle. The fast-path
benchmark numbers in `bench/results.md` are taken with `NODE_ENV=production`
so production behavior is what's measured.

## 11.4 Where each warning is referenced

| Surface | KF-174 (rebuilt listeners) | KF-176 (untracked signals) | KF-212 (narrow set) |
| --- | --- | --- | --- |
| Source module | `src/dev-listener-warn.ts` | `src/dev-signal.ts` | `src/dev-store-warn.ts` |
| Wired in | `src/mount.ts` | `src/reactive.ts` | `src/store.ts` |
| Numbered doc | `docs/5-event-delegation.md` (Rule 4) | `docs/2-reactivity.md` (Rule 7) | `docs/3-stores.md` (Rule 8) |
| AI usage guide | `docs/ai/usage-guide.md` "Hard rules" | same | same |
| Test fixture | `tests/unit/dev-listener-warn.internal.test.ts` | covered in `tests/unit/reactive.test.ts` | `tests/unit/dev-store-warn.internal.test.ts` |

## 11.5 Adding a new warning

If a future Hard Rule violation lands a similar "silent until later" failure
mode, the right shape is another env-var-gated, opt-in, one-shot warner in
this family. To add one:

1. Create `src/dev-<area>-warn.ts` exporting `isOptedIn()`, a
   warning-emitter function, and `_resetWarnedForTests()` /
   `_resetWarnContext(ctx)`.
2. Wire it into the host primitive's module (e.g., `src/mount.ts` for the
   rebuilt-listeners warner, `src/store.ts` for the narrow-set warner).
3. Write `tests/unit/dev-<area>-warn.internal.test.ts` exercising the
   opt-out / opt-in / dedup paths.
4. Update this doc with a new §11.2.N subsection and a row in §11.4.
5. Add the env var to `docs/ai/usage-guide.md` and the relevant numbered
   doc.
6. CHANGELOG entry naming the ticket and the env var.

The shape is rigid on purpose — every new warning should be a
copy-paste-and-modify of an existing one, not a fresh design.
