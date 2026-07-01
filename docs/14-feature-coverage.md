# Feature Coverage

> **Status: first increment (seeded).** The index below covers the list-reconciler
> state machine (the highest-risk area) and the core public API. Expanding it to
> every documented behavior across `docs/1`…`docs/13` is tracked as a follow-up.

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
parses the *Guarding test(s)* column and fails if any referenced test file is
missing or any referenced test title no longer appears in that file — so a
renamed/deleted guarding test trips the gate instead of silently un-covering a
feature. Run it with `npm run check:features` (wired into `npm run check`).

The **stateful** rows (the `FC-R*` reconciler-state and `FC-T*` transition rows)
are the point: they assert not just each operation but the *transitions between
reconciler states*, which is exactly what line coverage cannot see.

### Reconciler state machine — states

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

### Reconciler transitions — the gap line coverage can't see

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-T1 | Selection still works after a granular remove (`cacheKey` signal stays tracked across a granular render) | `src/each.ts` | `tests/unit/array-signal.test.ts` › "select-row keeps working after a granular remove (cacheKey signal stays tracked)" |
| FC-T2 | A selection flip batched with a structural change falls back to the snapshot path | `src/each.ts` | `tests/unit/array-signal.test.ts` › "a selection flip batched with a granular remove falls back to the snapshot path" |
| FC-T3 | Appending to a just-emptied list renders the rows (empty-binding transition) | `src/each.ts` | `tests/unit/array-signal.test.ts` › "append after clear renders the rows (empty-binding insert)" |
| FC-T4 | Adversarial transition-matrix suite walks multi-step sequences across reconciler states | `src/each.ts`, `src/list-reconcile*.ts` | `tests/unit/array-signal.test.ts` › "arraySignal — reconciler transition matrix (adversarial)" |

### Core public API

| ID | Behavior | Implements | Guarding test(s) |
| --- | --- | --- | --- |
| FC-A1 | Signals: `signal` / `computed` / `effect` / `batch` reactivity | `src/reactive.ts` | `tests/unit/reactive.test.ts` › "signal()" |
| FC-A2 | Stores: `defineStore` + registry + `resetAllStores` | `src/store.ts` | `tests/unit/store.test.ts` › "defineStore()" |
| FC-A3 | `mount()` renders and re-renders against a live DOM | `src/mount.ts` | `tests/unit/mount.test.ts` › "mount()" |
| FC-A4 | `each()` per-item memoization by identity + `cacheKey` | `src/each.ts` | `tests/unit/each.test.ts` › "each — basics (no mount context)" |
| FC-A5 | Event delegation: `delegate()` Tier 1 bubbling | `src/delegate.ts` | `tests/unit/delegate.test.ts` › "delegate() — Tier 1 bubbling" |
| FC-A6 | `morph()` general-purpose DOM reconcile | `src/morph.ts` | `tests/unit/morph.internal.test.ts` › "morph()" |
| FC-A7 | `toElement()` SVG-aware JSX → DOM | `src/toElement.ts` | `tests/unit/toElement.test.ts` › "toElement() — HTML" |
| FC-A8 | JSX runtime → `SafeHtml` (escaping, `raw`, `Fragment`) | `src/jsx-runtime.ts` | `tests/unit/jsx-runtime.test.ts` › "SafeHtml" |

## How this complements the existing guards

- **`scripts/check-doc-api-coverage.mjs`** already asserts the *public export
  surface* matches `docs/8-api-reference.md` (the apple-fm "conventions" export
  guard, already enforced here).
- **`scripts/check-doc-test-inventory.mjs`** asserts `docs/ai/code-summary.md`
  names every test file.
- **This report** adds the missing axis: every *behavior* (and *transition*) in
  the index maps to a live guarding test.

## Adding to the index

When you add or change a behavior — **especially a new reconciler state or
transition** — add a row here in the same diff, mapping it to the test that
asserts it. If no such test exists, that is the signal to write one (the
transition rows exist precisely because writing them surfaced the two bugs
above). For stateful modules, prefer an entry that references an adversarial
transition-matrix test rather than a single-operation test.
