# Test-gap analysis — KF-380

Why KF-374 and KF-377 shipped under the 100%-line / 99%-branch coverage gate,
which interaction axes were untested, and what the KF-380 interaction-matrix
suite (`tests/unit/kf380-interaction-matrix.test.tsx`) now covers. AI-facing;
written 2026-07-24 under KF-380 (test-and-analysis only — runtime frozen).

## Why the suite missed both bugs

Both bugs live in the seams **between** three subsystems that were each fully
covered in isolation:

1. **The morph's child pairing** (`src/morph.ts`) assumes the template and the
   live tree describe the same content. Its unit tests
   (`tests/unit/morph.internal.test.ts`) hand it hand-built templates that
   satisfy that assumption.
2. **Fine-grained bindings** (`src/bindings.ts`) deliberately break it: the
   wiring pass inserts a live text node the template never contains (templates
   carry only the `<!--kfb:N-->` marker comment).
3. **The list reconciler** breaks it the same way: owned rows exist only in
   the live tree; templates carry only the `<!--kf-list:N-->` marker.

Every individual line of all three modules was executed by isolated tests, so
line coverage stayed green. What did not exist was any test that put a
**template/live asymmetry** (2 or 3) **inside a structural re-render** (1):

- **KF-374**: every pre-fix binding test used a bound hole as the *only*
  child, or asserted a single render pass. No test combined *mixed content*
  (hole + static sibling in one parent) with a *subsequent structural morph*.
  The morph's positional pairing matched a template static against the
  binding-inserted node — a sequence bug invisible to any single-operation
  test.
- **KF-377**: every pre-fix mount/each test either kept the surrounds stable
  while mutating the list, or mutated the surrounds *away from* the list
  (trailing siblings, `data-morph-skip`). No test *removed an element sibling
  positioned before the list container*, so the shift-left re-pairing (clone
  fresh container → trailing pass removes the original with its rows → the
  binding points at a detached tree forever) never ran. Silent because every
  step is individually "correct."

Named untested axes (pre-KF-380):

- **Positional shift** — a removed/inserted sibling shifting later live
  children relative to the template — crossed with anything stateful to
  rebuild (bound holes, list containers, list markers).
- **Marker-owned live nodes vs. template pairing** — the binding text node
  and the owned rows are live-only; nothing walked the morph across them.
- **Binding-containment transitions** — a `ListBinding`/hole surviving vs.
  being rebuilt (`lookahead-move` vs. `replaceChild` vs. `self-heal`) and
  what each does to the *next* reconcile/write.
- **Cross-subsystem sequences** — morph ↔ granular ↔ snapshot ↔ empty/refill
  interleavings (the arraySignal adversarial suite walks reconciler states,
  but never toggles the *surrounds* mid-walk).

## Prioritized gap list (status vs. the current suite, post-KF-380)

Highest first. "Covered" = an asserting test exists; "Partial" = some shapes
asserted, neighbors open; "Gap" = no asserting test.

| # | Interaction / transition | Pre-380 | Now | Where |
| --- | --- | --- | --- | --- |
| 1 | Conditional element sibling before the **list marker inside the same parent** (comment shift — elements-only lookahead can't protect it) | Gap | **Bug found — KF-381 shape 1**, pinned `.skip` | `kf380-interaction-matrix` |
| 2 | **Same-tag** conditional sibling before the list container (positional hijack strands owned rows) | Gap | **Bug found — KF-381 shape 2**, pinned `.skip` | `kf380-interaction-matrix` |
| 3 | Conditional sibling removed before a **bound-hole element** (KF-374 × KF-377 cross: identity + statics + live binding across cycles) | Gap | Covered | `kf380-interaction-matrix` |
| 4 | Conditional element sharing a parent with a **global text-hole marker + static tail** (marker rebuilt, re-wire with current value) | Gap | Covered | `kf380-interaction-matrix` |
| 5 | arraySignal **granular patches after a self-heal rebuild** (bound → rebuilt → granular again) | Gap (self-heal tested with plain array only) | Covered | `kf380-interaction-matrix` |
| 6 | **Empty-binding list shifted by the lookahead, then refilled** (empty ↔ morph-move ↔ refill) | Gap | Covered | `kf380-interaction-matrix` |
| 7 | Row-scoped mixed-content holes + external row signal across surrounds toggles + granular re-wire | Partial (each axis alone) | Covered | `kf380-interaction-matrix` |
| 8 | Row select-binding across morph toggle + granular remove (render count pinned) | Partial | Covered | `kf380-interaction-matrix` |
| 9 | **Multiple** leading conditionals removed in one render (multi-slot lookahead scan) | Gap | Covered | `kf380-interaction-matrix` |
| 10 | Conditional **between two lists** (second list's container shift with two live bindings) | Gap | Covered | `kf380-interaction-matrix` |
| 11 | **Container tag swap** with the list present on both sides (ul ↔ ol on the container itself, not an ancestor) | Gap | Covered | `kf380-interaction-matrix` |
| 12 | Long adversarial walk: surrounds morph × granular ops × cacheKey selection × empty/refill in one sequence | Gap | Covered | `kf380-interaction-matrix` |
| 13 | Kitchen-sink tree (leading + trailing conditionals, hole element, list) with full-state assertions per step | Gap | Covered | `kf380-interaction-matrix` |
| 14 | Bound attr + text holes on the same shifted element (bound-attr strip + re-wire after a lookahead move) | Partial (re-wire tested without a shift) | Covered | `kf380-interaction-matrix` |
| 15 | Mixed content orderings under repeated morphs (lead/trail/both/separator) | Covered (KF-374 fix) | Covered | `bindings.test.ts` "mixed content" |
| 16 | Direct sibling / nested / trailing conditionals around a list; `''` + `null` branches; ancestor-tag-swap self-heal | Covered (KF-377 fix) | Covered | `kf377-conditional-sibling-before-each` |
| 17 | Reconciler state matrix without surrounds changes (granular ↔ snapshot ↔ empty ↔ drift) | Covered | Covered | `array-signal.test.ts` adversarial suite |

Remaining open (candidates for a follow-up after KF-381): a conditional
*text* node (not element) before a marker; nested `each()` inside a shifted
container; `data-morph-preserve`d siblings interleaved with owned rows during
a shift; focus survival across a lookahead move of the focused element's
container.

## Outcome

- 14 new tests (12 asserting, 2 `.skip` known-bug pins) in
  `tests/unit/kf380-interaction-matrix.test.tsx`; index rows FC-T9…FC-T12 and
  FC-B22/FC-B23 in `docs/14-feature-coverage.md`.
- **KF-381 filed**: stranded `each()` rows duplicate when a conditional
  sibling shares (shape 1) or shadows (shape 2) the list container. Both are
  silent, trivially triggered through the public API, and are the exact class
  this analysis predicted (marker comments are invisible to the elements-only
  lookahead; the self-heal never removes still-attached stale row nodes).
- Method note for future audits: enumerate each subsystem's *invariant
  violations of the shared DOM* (live-only nodes, template-only markers),
  then write sequences where another subsystem walks over them. That is where
  both shipped bugs and both new ones live — not inside any one module.
