# Feature Coverage

> **Status: index covers every documented behavior area across `docs/1`…`docs/13`.**
> Each behavior maps to a live guarding test (unit/integration), or is marked
> **(browser)** with the real-browser spec that asserts it. `scripts/check-feature-coverage.mjs`
> keeps the mapping load-bearing.

## Why this exists

kerf enforces **100% line / branch / function / statement coverage** on `src/`
(`vitest.config.ts`). That is necessary but **not sufficient**, and treating it as
sufficient shipped two basic, critical bugs back-to-back:

- **select-after-delete** — selecting a row stopped working after a *different*
  row was deleted (a `cacheKey` signal dependency was dropped after a granular
  render).
- **append-after-clear** — appending rows to a just-cleared list rendered
  nothing until a second append (an empty-binding transition mis-routed).

Both shipped under a green 100% coverage report. Line coverage proves every line
**executed**; it says nothing about whether every **behavior** — or every
**sequence** of behaviors — is **asserted**. It is structurally blind to a
*missing state transition*: if the test that would walk the transition doesn't
exist, that path combination never runs, yet every individual line is still hit
by the isolated single-operation tests, and the report stays green.

Feature coverage is the orthogonal axis: a per-behavior map that answers *"is
there a test that would fail if this behavior regressed?"* — modeled on the
`~/Documents/apple-fm` "coverage-by-feature" exercise.

## The index

Each row names a **behavior**, the **code** that implements it, and the
**test(s)** that would catch its regression. `scripts/check-feature-coverage.mjs`
(`npm run check:features`, wired into `npm run check`) parses the *Guarding test(s)*
column and fails if any referenced test file is missing or any referenced test
title (double-quoted, or a backtick span for titles containing `<…>`) no longer
appears in that file — so a renamed/deleted guarding test trips the gate instead
of silently un-covering the feature.

The **stateful** rows (the `FC-R*` reconciler-state and `FC-T*` transition rows)
are the point: they assert not just each operation but the *transitions between
reconciler states*, which is exactly what line coverage cannot see.

### §4 Reconciler state machine — states

States: `first-render` → `granular` (arraySignal patch queue applied directly) →
`snapshot` (full keyed diff) → `empty-binding` → `drift-recovery`. The selection
axis (`cacheKey` reading an external signal) crosses all of them.

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-R1 | First render of a list takes the snapshot path (no patches yet) | `src/each.ts`, `src/list-reconcile-snapshot.ts` | `tests/unit/array-signal.test.ts` › "first render emits the snapshot path (no patches yet)" |
| FC-R2 | Granular single insert applies without re-rendering siblings | `src/list-reconcile-granular.ts` | `tests/unit/array-signal.test.ts` › "insert patch adds a single row without re-rendering siblings" |
| FC-R3 | Granular contiguous insert run bulk-parses in one pass | `src/list-reconcile-granular.ts` | `tests/unit/array-signal.test.ts` › "KF-93 bulk-insert: contiguous run of inserts is parsed once and inserted as a fragment" |
| FC-R4 | Granular update applies to the live row, preserving siblings | `src/list-reconcile-granular.ts` | `tests/unit/array-signal.test.ts` › "update patch applies via reconcileGranular and preserves siblings" |
| FC-R5 | Granular single remove deletes one row without re-rendering siblings | `src/list-reconcile-granular.ts` | `tests/unit/array-signal.test.ts` › "remove patch deletes a single row without re-rendering siblings" |
| FC-R6 | Granular move reorders via `insertBefore`, preserving node identity | `src/list-reconcile-granular.ts` | `tests/unit/array-signal.test.ts` › "move patch reorders a single row via insertBefore (preserves node identity)" |
| FC-R7 | `replace()` falls through to the snapshot reconciler | `src/each.ts`, `src/list-reconcile.ts` | `tests/unit/array-signal.test.ts` › "replace patch falls through to the snapshot reconciler" |
| FC-R8 | Selection via `cacheKey` updates rows in place (no node swap) | `src/list-reconcile-inplace.ts` | `tests/unit/list-reconcile-inplace.test.ts` › "snapshot in-place content-update fast path" |
| FC-R9 | A throwing row render recovers by falling back to the snapshot path | `src/each.ts` | `tests/unit/array-signal.test.ts` › "KF-99: a thrown render in a single insert falls back to snapshot — DOM matches signal" |
| FC-R10 | Pre-mount mutations render correctly on first mount | `src/each.ts`, `src/array-signal.ts` | `tests/unit/array-signal.test.ts` › "KF-98: pre-mount push mutations render correctly on first mount" |
| FC-R11 | Granular attribute-only update fast path (class flip, no parse) | `src/list-reconcile-fast-paths.ts` | `tests/unit/list-reconcile-fast-paths.test.ts` › "class flip on top-level element: fast path fires, no parse, identity preserved" |
| FC-R12 | Granular text-content-only update fast path (no parse) | `src/list-reconcile-fast-paths.ts` | `tests/unit/list-reconcile-fast-paths.test.ts` › "text node inside a child element: fast path fires, no parse, text node identity preserved" |

### §4 Reconciler transitions — the gap line coverage can't see

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-T1 | Selection still works after a granular remove (`cacheKey` signal stays tracked across a granular render) | `src/each.ts` | `tests/unit/array-signal.test.ts` › "select-row keeps working after a granular remove (cacheKey signal stays tracked)" |
| FC-T2 | A selection flip batched with a structural change falls back to the snapshot path | `src/each.ts` | `tests/unit/array-signal.test.ts` › "a selection flip batched with a granular remove falls back to the snapshot path" |
| FC-T3 | Appending to a just-emptied list renders the rows (empty-binding transition) | `src/each.ts` | `tests/unit/array-signal.test.ts` › "append after clear renders the rows (empty-binding insert)" |
| FC-T4 | Adversarial transition-matrix suite walks multi-step sequences across reconciler states | `src/each.ts`, `src/list-reconcile*.ts` | `tests/unit/array-signal.test.ts` › "arraySignal — reconciler transition matrix (adversarial)" |
| FC-T5 | `each()` introduced by a re-render (not present on first render) reconciles with trailing siblings intact | `src/mount.ts`, `src/each.ts` | `tests/unit/kf102-each-after-transition.test.tsx` › "KF-102: each() introduced via re-render with trailing siblings" |

### `arraySignal` collection signal (`kerfjs/array-signal`)

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-AS1 | `arraySignal()` standalone API — `update`/`insert`/`push`/`remove`/`move`/`replace` mutators + tracked `.value` | `src/array-signal.ts` | `tests/unit/array-signal.test.ts` › "arraySignal — standalone API" |
| FC-AS2 | `ArraySignal` class exposed for `instanceof` checks | `src/array-signal.ts` | `tests/unit/array-signal.test.ts` › "exposes ArraySignal class for instanceof checks" |

### §2 Reactivity

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-RE1 | `signal()` read/write + dependency tracking | `src/reactive.ts` | `tests/unit/reactive.test.ts` › "signal()" |
| FC-RE2 | `computed()` derives + updates from its sources | `src/reactive.ts` | `tests/unit/reactive.test.ts` › "computed()" |
| FC-RE3 | `effect()` runs on create + on dependency change only | `src/reactive.ts` | `tests/unit/reactive.test.ts` › "effect()" |
| FC-RE4 | `batch()` coalesces writes into one effect run | `src/reactive.ts` | `tests/unit/reactive.test.ts` › "batch()" |
| FC-RE5 | Signals are shallow (not deep-reactive) | `src/reactive.ts` | `tests/unit/reactive.test.ts` › "signals are NOT deep-reactive" |

### §2.9 Fine-grained signal bindings

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-B1 | Signal in a text hole updates the node without re-running render | `src/bindings.ts`, `src/jsx-runtime.ts`, `src/mount.ts` | `tests/unit/bindings.test.ts` › "updates a bound text node without re-running render" |
| FC-B2 | Signal in an attribute updates the node without re-running render | `src/bindings.ts`, `src/jsx-runtime.ts` | `tests/unit/bindings.test.ts` › "updates a bound class without re-running render" |
| FC-B3 | Select-row: a selection flip fires only the bound effects (no render, no reconcile) | `src/bindings.ts`, `src/each.ts` | `tests/unit/bindings.test.ts` › "selects a row without re-running render or reconciling the list" |
| FC-B4 | Row binding wired on a granular (`arraySignal`) append | `src/list-reconcile-granular.ts`, `src/bindings.ts` | `tests/unit/bindings.test.ts` › "wires a row appended via a granular insert patch" |
| FC-B5 | Row binding disposed on a granular remove | `src/list-reconcile-granular.ts` | `tests/unit/bindings.test.ts` › "disposes a bound row removed via a granular remove patch" |
| FC-B6 | Row binding survives a granular move (node reused) | `src/list-reconcile-granular.ts` | `tests/unit/bindings.test.ts` › "keeps bindings across a granular move (swap)" |
| FC-B7 | Bound class survives a granular in-place update (reuseBound) | `src/list-reconcile-granular.ts` | `tests/unit/bindings.test.ts` › "preserves a bound class across a granular label update" |
| FC-B8 | Bound URL attribute is screened (javascript: dropped + warns) | `src/bindings.ts`, `src/utils/urlScreen.ts` | `tests/unit/bindings.test.ts` › "drops a bound href that resolves to a javascript: URL, and warns" |
| FC-B9 | SSR / `.toString()` snapshots a bound signal, no markers | `src/jsx-runtime.ts`, `src/bindings.ts` | `tests/unit/bindings.test.ts` › "snapshots a signal text child to its current value with no marker" |
| FC-B10 | Bindings torn down on unmount (detached node stops updating) | `src/mount.ts`, `src/bindings.ts` | `tests/unit/bindings.test.ts` › "tears down row bindings on unmount (no update to detached rows)" |
| FC-B11 | Transition: create → select → remove-selected → select | `src/bindings.ts`, `src/list-reconcile-snapshot.ts` | `tests/unit/bindings.test.ts` › "adversarial: create → select → remove selected → select another" |
| FC-B12 | Transition: clear → repopulate → select rebinds fresh rows | `src/bindings.ts`, `src/list-reconcile-snapshot.ts` | `tests/unit/bindings.test.ts` › "adversarial: clear → repopulate → select rebinds fresh rows" |

### §3 Stores

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-ST1 | `defineStore({ initial, actions })` + `reset()` | `src/store.ts` | `tests/unit/store.test.ts` › "defineStore()" |
| FC-ST2 | `reset()` returns state to `initial()` (fresh each reset) | `src/store.ts` | `tests/unit/store.test.ts` › "reset() returns state to initial()" |
| FC-ST3 | `resetAllStores()` resets every registered store | `src/store.ts` | `tests/unit/store.test.ts` › "resetAllStores()" |
| FC-ST4 | Multiple consumers share one state, update in lockstep | `src/store.ts` | `tests/unit/store.test.ts` › "multiple consumers see the same state and update in lockstep" |
| FC-ST5 | `get()` snapshot is frozen in dev mode (mutation throws) | `src/store.ts` | `tests/unit/store.test.ts` › "dev-mode freeze of get() snapshot (KF-177)" |

### §4 Render — mount / morph / each / segment

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-RN1 | `mount()` renders initial JSX and re-renders on tracked-signal change | `src/mount.ts` | `tests/unit/mount.test.ts` › "mount()" |
| FC-RN2 | `mount()` does NOT re-render on an unread signal change | `src/mount.ts` | `tests/unit/mount.test.ts` › "does NOT re-render when an unread signal changes" |
| FC-RN3 | Keyed row DOM identity preserved across re-renders | `src/mount.ts`, `src/list-reconcile*.ts` | `tests/unit/mount.test.ts` › "preserves element identity across re-renders for keyed list rows" |
| FC-RN4 | Focused text input value + cursor preserved across re-render | `src/mount.ts`, `src/list-reconcile-focus.ts` | `tests/unit/mount.test.ts` › "preserves cursor position in a focused text input across an attribute-changing re-render" |
| FC-RN5 | Stateful attributes (`<details open>`) preserved across re-render unless the template changes | `src/morph.ts` | `tests/unit/mount.test.ts` › `preserves user-set <details open> across re-renders (KF-84)` |
| FC-RN6 | `raw()` injects HTML through mount without escaping | `src/jsx-runtime.ts`, `src/mount.ts` | `tests/unit/mount.test.ts` › "raw() injects HTML through mount without escaping" |
| FC-RN7 | Tier 3 direct listeners inside `data-morph-skip` survive re-renders | `src/morph.ts` | `tests/unit/mount.test.ts` › "direct event listeners inside data-morph-skip subtrees survive parent re-renders (Tier 3)" |
| FC-RN8 | `morph()` inserts / removes / reorders keyed children | `src/morph.ts` | `tests/unit/morph.internal.test.ts` › "reorders children matched by id" |
| FC-RN9 | `morph()` matches by `data-key` when ids are absent | `src/morph.ts` | `tests/unit/morph.internal.test.ts` › "matches by data-key when ids are absent" |
| FC-RN10 | `morph()` adds / removes / updates attributes | `src/morph.ts` | `tests/unit/morph.internal.test.ts` › "adds attributes that are new on the template" |
| FC-RN11 | `data-morph-preserve` survives the trailing-removal pass | `src/morph.ts` | `tests/unit/morph.internal.test.ts` › "KF-151: data-morph-preserve survives the trailing-removal pass" |
| FC-RN12 | A focused contenteditable subtree is skipped entirely | `src/morph.ts` | `tests/unit/morph.internal.test.ts` › "skips a focused contenteditable subtree entirely" |
| FC-RN13 | `morph()` public surface accepts a `SafeHtml` template | `src/morph.ts` | `tests/unit/morph.internal.test.ts` › "accepts a SafeHtml as the template" |
| FC-RN14 | `each()` per-item HTML memoization across renders within a mount | `src/each.ts` | `tests/unit/each.test.ts` › "caches HTML across renders within a mount, even with inline render arrows (KF-87 regression test)" |
| FC-RN15 | `each()` passes the index to the render fn | `src/each.ts` | `tests/unit/each.test.ts` › "passes the index to render" |
| FC-RN16 | `each()` rejects duplicate object references (keyed-cache invariant) | `src/each.ts` | `tests/unit/each.test.ts` › "throws when the same object reference appears at multiple indices" |
| FC-RN17 | Segment flatten indexes every list segment by id | `src/segment.ts` | `tests/unit/segment.internal.test.ts` › "walks mixed trees and indexes every list by id" |

### §5 Event delegation

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-EV1 | `delegate()` Tier 1 bubbling fires on selector match | `src/delegate.ts` | `tests/unit/delegate.test.ts` › "delegate() — Tier 1 bubbling" |
| FC-EV2 | `delegate()` passes the matched element (not the raw target) | `src/delegate.ts` | `tests/unit/delegate.test.ts` › "passes the matched element (not the original target) as the second arg" |
| FC-EV3 | `delegate()` survives DOM rebuilds (newly-inserted matches still fire) | `src/delegate.ts` | `tests/unit/delegate.test.ts` › "survives DOM rebuilds — newly-inserted matching elements still fire" |
| FC-EV4 | `delegate()` disposer removes the listener | `src/delegate.ts` | `tests/unit/delegate.test.ts` › "disposer removes the listener" |
| FC-EV5 | Tier 1 auto-promotes known non-bubblers to capture | `src/delegate.ts` | `tests/unit/delegate.test.ts` › "delegate() — auto-promotion to capture for known non-bubblers (KF-56)" |
| FC-EV6 | `delegateCapture()` uses `matches()` (NOT `closest()`) direct matching | `src/delegate.ts` | `tests/unit/delegate.test.ts` › "uses closest()-style matching, NOT direct matches() — selector matches a wrapper of the focused element" |
| FC-EV7 | Invalid selector throws immediately (no silent listener) | `src/delegate.ts` | `tests/unit/delegate.test.ts` › "delegate throws immediately on an invalid selector" |

### §6 JSX runtime

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-JX1 | `jsx()` renders elements with HTML-escaped text children | `src/jsx-runtime.ts` | `tests/unit/jsx-runtime.test.ts` › "renders a basic element with text children (HTML-escaped)" |
| FC-JX2 | Attribute values are escaped | `src/jsx-runtime.ts`, `src/utils/escapeHtml.ts` | `tests/unit/jsx-runtime.test.ts` › "escapes attribute values" |
| FC-JX3 | `raw()` bypasses escaping for pre-trusted HTML | `src/jsx-runtime.ts` | `tests/unit/jsx-runtime.test.ts` › "returns a SafeHtml that bypasses escaping when used as a child" |
| FC-JX4 | `isSafeHtml()` recognizes SafeHtml, including cross-bundle by brand | `src/jsx-runtime.ts` | `tests/unit/jsx-runtime.test.ts` › "recognizes an instance from a separate SafeHtml class that uses the same brand symbol" |
| FC-JX5 | `null` / `undefined` / boolean children are omitted | `src/jsx-runtime.ts` | `tests/unit/jsx-runtime.test.ts` › "omits null / undefined / boolean children" |
| FC-JX6 | `attr()` static + dynamic overloads (camelCase → HTML/SVG aliasing) | `src/jsx-runtime.ts`, `src/utils/jsx-attr-aliases.ts` | `tests/unit/attr.test.ts` › "attr — static overload", `tests/unit/attr.test.ts` › "attr — dynamic overload" |
| FC-JX7 | `Fragment` groups children with no wrapper element | `src/jsx-runtime.ts` | `tests/unit/jsx-runtime.test.ts` › "Fragment" |

### §7 SVG

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-SV1 | `toElement()` HTML → DOM | `src/toElement.ts` | `tests/unit/toElement.test.ts` › "toElement() — HTML" |
| FC-SV2 | `toElement()` routes SVG through `DOMParser('image/svg+xml')` | `src/toElement.ts` | `tests/unit/toElement.test.ts` › "toElement() — SVG" |
| FC-SV3 | `toElement()` handles fragments mixing `<svg>` and siblings | `src/toElement.ts` | `tests/unit/toElement.test.ts` › "toElement() — fragments with <svg> and siblings (KF-232)" |
| FC-SV4 | `toElement()` returns nodes adopted into the live document | `src/toElement.ts` | `tests/unit/toElement.test.ts` › "toElement() — returned node is adopted into the live document (KF-240)" |

### §11 Dev-mode warnings (opt-in, env-gated)

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-DW1 | `KERF_DEV_WARN_UNTRACKED_SIGNALS` untracked-write warning | `src/dev-signal.ts` | `tests/unit/reactive.test.ts` › "dev-mode untracked-write warning (KF-176, opt-in)" |
| FC-DW2 | `KERF_DEV_WARN_NARROW_SET` partial-set store warning | `src/dev-store-warn.ts` | `tests/unit/dev-store-warn.internal.test.ts` › "dev-store-warn (KF-212, opt-in)" |
| FC-DW3 | `KERF_DEV_WARN_REBUILT_LISTENERS` rebuilt-listener warning | `src/dev-listener-warn.ts` | `tests/unit/dev-listener-warn.internal.test.ts` › "dev-listener-warn (KF-174, opt-in)" |
| FC-DW4 | `KERF_DEV_WARN_EACH_IN_MORPH_SKIP` each()-in-morph-skip warning | `src/dev-each-warn.ts` | `tests/unit/dev-each-warn.internal.test.ts` › "dev-each-warn (KERF_DEV_WARN_EACH_IN_MORPH_SKIP=1)" |
| FC-DW5 | `KERF_DEV_WARN_DUPLICATE_EACH_KEYS` duplicate-cacheKey warning | `src/dev-each-warn.ts` | `tests/unit/dev-each-warn.internal.test.ts` › "dev-each-warn duplicate cacheKey (KERF_DEV_WARN_DUPLICATE_EACH_KEYS=1)" |
| FC-DW6 | `delegate()` dev warning (opt-in) | `src/dev-delegate-warn.ts` | `tests/unit/dev-delegate-warn.internal.test.ts` › "dev-delegate-warn (KF-238, opt-in)" |

### Integration (full pipeline)

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-IT1 | End-to-end signals + stores + mount + delegate cart flow | (all) | `tests/integration/full-pipeline.test.ts` › "end-to-end cart" |
| FC-IT2 | Event delegation drives store actions through a live tree | `src/delegate.ts`, `src/store.ts` | `tests/integration/full-pipeline.test.ts` › "event delegation drives store actions correctly" |
| FC-IT3 | Focus + cursor survive a store tick that re-renders the parent | `src/mount.ts` | `tests/integration/full-pipeline.test.ts` › "focus + cursor survives a tick that triggers a parent rerender" |

### Real-browser behaviors — **(browser)**

These assert engine-specific behavior `happy-dom` can't model truthfully (SVG/MathML
namespacing, IME composition, exact MutationObserver counts, stateful-attribute
paint, real-consumer bundling). Guarded by Playwright specs under `tests/browser/`.

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-BR1 | SVG gets the correct namespace via `mount()` + JSX in real engines | `src/toElement.ts`, `src/mount.ts` | `tests/browser/svg-mathml.spec.ts` › `renders <svg> with correct namespace via mount() + JSX` |
| FC-BR2 | IME composition survives a parent morph mid-composition | `src/mount.ts`, `src/list-reconcile-focus.ts` | `tests/browser/ime-composition.spec.ts` › `focused <input> value + cursor survive a parent morph mid-composition` |
| FC-BR3 | A deep text change produces exactly 1 MutationObserver record | `src/morph.ts` | `tests/browser/mutation-count.spec.ts` › "text node update deep in a static tree → exactly 1 characterData mutation" |
| FC-BR4 | Imperatively-set `<details open>` survives a morph in real engines | `src/morph.ts` | `tests/browser/stateful-attrs.spec.ts` › `<details open> set imperatively survives a morph (KF-84)` |
| FC-BR5 | `toElement()` nodes are owned by the live document (WebKit adoption) | `src/toElement.ts` | `tests/browser/toelement-adopt.spec.ts` › `toElement() returns nodes owned by the live document, not a <template>/DOMParser inert doc` |
| FC-BR6 | Real-consumer bundle exercises each public primitive end-to-end | (all, via `dist/`) | `tests/browser/consumer-app.spec.ts` › "counter — signal + computed + delegate increments and re-renders" |
| FC-BR7 | The seven complete example apps run their headline interaction | (all) | `tests/browser/example-apps.spec.ts` › "drag updates the card transform during pointermove (KF-163 regression)" |
| FC-BR8 | krausest-style 1k-row perf scenarios (create/update/select/swap/clear) | `src/list-reconcile*.ts` | `tests/browser/perf-1k.spec.ts` › "1000-row keyed list — create / partial-update / select / swap / clear timings" |

## Completeness — two directions, two mechanisms

The index can be under-covered in two ways. They are guarded differently on
purpose (KF-289 investigation outcome):

1. **A row points at a test that no longer exists.** Fully scripted —
   `check-feature-coverage.mjs` fails on any broken file/title mapping. Load-bearing.
2. **A behavior exists but has no row at all.** This is the hard direction,
   because "every documented behavior" has no clean machine-readable boundary —
   prose describes behaviors at wildly varying granularity. It is split:
   - **Public *value* exports → automated.** Every user-facing export from
     `kerfjs` / `kerfjs/array-signal` must be named by at least one index row
     (the same script enforces this). Adding a public export therefore forces a
     behavior row. This is the tractable, high-value slice — a new API can't ship
     un-indexed.
   - **Prose-level behaviors → the periodic audit exercise, deliberately not a
     script.** Tagging every documented behavior with a stable ID (or deriving
     one from headings) was evaluated and rejected: the marker set would *be* the
     index (circular + duplicative), the maintenance cost is high, and
     heading-derived sets are too coarse to be trustworthy. Instead, behavior
     completeness is owned by (a) the `/analyze-code-quality` **behavioral /
     state-transition audit** step, which walks the stateful modules and flags
     untested transitions; (b) `/check-requirements-against-code`, which diffs
     the numbered docs against the implementation; and (c) the **"Adding to the
     index" discipline** below, applied in the same diff as any behavior change.
     A brittle "did you document a behavior without indexing it" script would be
     noisy and low-value; the human/AI audit is the right tool for the fuzzy half.

## How this complements the existing guards

- **`scripts/check-doc-api-coverage.mjs`** asserts the *public export surface*
  matches `docs/8-api-reference.md`.
- **`scripts/check-doc-test-inventory.mjs`** asserts `docs/ai/code-summary.md`
  names every test file.
- **`tests/conventions.test.ts`** pins in-suite invariants line coverage can't
  express: the barrel exports exactly the documented surface, no accidental
  default export, and the `each()` one-top-level-element-per-row contract.
- **This report** adds the missing axis: every *behavior* (and *transition*) in
  the index maps to a live guarding test, and every public value export is
  represented by at least one index row.

## Adding to the index

When you add or change a behavior — **especially a new reconciler state or
transition** — add a row here in the same diff, mapping it to the test that
asserts it. If no such test exists, that is the signal to write one (the
transition rows exist precisely because writing them surfaced the two bugs
above). For stateful modules, prefer an entry that references an adversarial
transition-matrix test rather than a single-operation test. Behaviors that only
reproduce in a real engine are marked **(browser)** and reference their
`tests/browser/*.spec.ts` guard.
