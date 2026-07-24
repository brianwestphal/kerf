# Test-gap analysis — KF-393 (third sweep)

Sibling of [`test-gap-analysis-kf380.md`](test-gap-analysis-kf380.md) and
[`test-gap-analysis-kf387.md`](test-gap-analysis-kf387.md). KF-380 swept one
seam; KF-387 swept the seams nobody had looked at (3 of 4 broke on first
contact). KF-393 targets something different: the **large body of brand-new
runtime code written in a single 24-hour fix cadence** (KF-385, KF-388, KF-389,
KF-390, KF-391, KF-392), tested until now only by the author, in the same
sitting — plus the brand-new `each(items, render, { cacheKey, key })` public
surface, never adversarially probed. AI-facing; written 2026-07-24 under
KF-393 (test-and-analysis only — runtime frozen; every defect filed as its own
ticket).

## The headline: four defects, and three of the four live in the NEWEST code

The prediction held again, with a twist. The prior sweeps found defects in
old seams nobody had crossed; this sweep found them **inside the fixes
themselves and in their crossings**:

- **KF-394 (high)** — the KF-392 always-on identity-shift warning
  false-positives on correct code, in two flavors.
- **KF-395 (high)** — the KF-392 `each({ key })` string flows unvalidated into
  an HTML comment; `-->` in a key injects live markup and crashes with an
  internal TypeError.
- **KF-396 (high)** — the KF-391 tag check × the KF-389 SVG territory: two
  fixes that each work alone **regress a previously-working shape when
  crossed** (verified against pre-KF-391 `mount.ts`).
- **KF-397** — the KF-390 rule ("every form-state writer syncs") has a FOURTH
  writer nobody audited: the text-content fast path vs `<textarea>` child text.

Plus one diagnostics issue: **KF-398** — a keyed `each()` nested in a row
render throws the misleading "duplicate list key" error instead of naming the
real boundary (nested lists degrade to static HTML).

## Area-by-area findings

### Area 2 (verified FIRST, per the ticket) — the suspected warning false positive

**Verdict: CONFIRMED, and broader than suspected.** Ran, not read:

| Shape | Id | Warning fires? | Verdict |
| --- | --- | --- | --- |
| `each(cond ? a : b, r, { key: 'x' })` — keyed, source swap | `k:x`, stable | **YES** | **False positive** — tells the author to add the key they already have; leaks the internal `k:` namespace in the quoted id |
| `each(cond ? a : b, r)` — unkeyed SOLE list, source swap | `0`, stable — no call-count change anywhere | **YES** | **False positive** — the "identified by call order" message fires although call order never changed (everyday filter/tab swap) |
| `cond ? each(a, rA, {key:'x'}) : each(b, rB, {key:'x'})` — branch swap, one identity | `k:x`, stable | **YES** | False positive (same trigger) |
| Genuine id shift (conditional list ahead of an unkeyed one) | shifted | YES | Correct |

Root cause: the trigger `bindingSources.has(id) && previousSource !== sig`
detects "this id's source changed," which conflates two different events —
"the id was adopted by a different list" (warn) and "the same list swapped its
data source" (never warn; the snapshot rebuild is correct and unavoidable).
The ROUTING is right in every case; only the diagnostic is wrong. Bonus
finding while in there: the one-shot dedup set is module-level but ids are
per-mount, so mount #2's *genuine* shift on an id mount #1 already warned for
is silent forever. All filed as KF-394; pinned asserting in
`kf393-new-code-audit.test.tsx`.

The existing `dev-list-key-warn.internal.test.tsx` asserts "a KEYED list never
triggers it" — with a keyed list whose source is *stable*. The
keyed-with-changing-source neighbor fires. The KF-387 method question ("what
neighboring shape would this test NOT catch?") answered itself.

### Area 1 — the `each()` options API, probed as an adversary

- `{}`, `{ key: '' }`, author key `'0'` vs call-order id `0`, `'k:0'` — all
  correct; the `k:` prefix is injective, so author keys cannot collide with
  call-order ids or each other. Pinned.
- **`{ key: 'x--><b>pwn</b>' }` — broken (KF-395).** `claimKey` validates
  nothing; the id lands verbatim in `<!--kf-list:{id}-->`. Measured: the
  `<b>` is a LIVE element in the mount root, then `bindListsFromMarkers`
  crashes on the truncated id with `TypeError: Cannot read properties of
  undefined (reading 'items')` (the `lists.get(id) as ListSegment` cast).
  A key containing `<!--` works by accident (longer comment). Pinned.
- Non-string keys from JS: `{ key: 42 }` → key `'42'`, `{ key: null }` → key
  `'null'` (only `!== undefined` is checked). Noted on KF-395 (types prevent
  it from TS; runtime validation should decide deliberately).
- Reused/mutated options object: the key is read per call, so mutating
  `opts.key` between renders is a deliberate identity change — old binding
  cleaned up (marker gone, no leak), content correct, identity lost. Pinned
  as intended semantics.
- Keys outside a mount (`'orphan'` path / SSR `toString()`): markerless,
  keyless output, no throw. Pinned.
- Keys under `html`` templates: identical behavior to JSX (identity kept
  across a sibling toggle, granular push works). Pinned.
- Later-render duplicate key: throws out of the signal write with the
  actionable message, previous render's DOM intact, and the mount RECOVERS on
  the next good render. Pinned — this is the transition the first-render
  duplicate test could not see.
- Keyed conditional list hidden → mutated (batched AND unbatched) → re-shown:
  renders its own current rows (`cleanupOrphanBindings` deletes counts/
  sources/caches, so reappearance is a clean first render). Pinned.
- **Nested keyed `each()` in a row render — misleading throw (KF-398).**
  Every row's render claims the same key → "duplicate list key" at 2+ rows.
  Following the error's advice (per-row keys) silences the throw and lands in
  the silent nested-list degradation. Pinned.

### Area 3 — focus capture/restore wrapping every `morph()`

All probed edges are **correct**; pinned asserting:

- Focused element removed by the same morph → `isConnected` guard skips the
  restore; focus falls to body, no crash, no ghost restore.
- Focus the app moves AFTER a synchronous re-render (the delegate-handler
  shape: signal write → sync render+restore → handler `.focus()`) is never
  stolen back — the restore has already run by the time the handler moves
  focus. Deliberate moves win by construction (mount renders synchronously).
- Focus + selection inside `data-morph-skip` survive a surrounds change
  untouched (restore no-ops on `activeElement === snap.el`).
- Focus inside a row the granular path structurally REPLACES (top-level tag
  change → `replaceChild`) is released — the node is gone, nothing to restore.
  Documented consequence of losing node identity; pinned.
- Nesting with the list reconciler's own capture/restore is sequential, not
  nested (morph completes, then each `reconcileList` snapshots independently);
  the inner 2.6 run-move capture is redundant with the whole-morph one but
  harmless.

### Area 4 — the six fixes crossed with each other

- **Namespaced parsing (KF-389) × the row-structure tag check (KF-391) —
  BROKEN (KF-396).** The ticket's own suggested cross ("does an SVG row hit
  the new tag comparison?") — yes, and it throws falsely. Trigger: any SVG
  row whose emitted HTML differs from serialized `outerHTML` (an apostrophe in
  any attribute is the everyday case: `&#39;` emitted, `'` serialized). The
  mismatch fallback re-parses WITHOUT the live parent (namespace-blind →
  `'CIRCLE'`), compared case-sensitively against the live SVG `'circle'` →
  `rowStructureError` whose message is self-contradictory ("renders
  `<circle>` but wrapped in `<circle>`"). Verified regression: pre-KF-391
  `mount.ts` mounts the same tree fine (`git checkout ab76f9a~1 -- src/mount.ts`).
  HTML rows with the same apostrophe pass (tags match in any casing) —
  which is why KF-391's own void-element normalization control missed it.
- **`syncFormProp` (KF-390) × the fast-path ladder — the FOURTH writer is
  BROKEN (KF-397).** KF-390 fixed the attribute writer; the sibling
  `tryTextContentFastPath` patches a `<textarea>` row's child text raw, so a
  dirty unfocused textarea goes visibly stale on a granular text-only update.
  The identical update forced through the morph route syncs
  (`syncTextareaValue`), and the FOCUSED case is already consistent on both
  routes — the exact route-dependence class KF-335/KF-390 exist to eliminate,
  provable only because both routes are asserted side by side (the KF-387
  method note, applied again). The in-place snapshot route's `checked` sync
  (the other caller of the same ladder) was verified working and pinned.
- Keys (KF-392) × the row-region move (KF-385): a `k:`-namespaced marker
  moves as a unit — interloper carried, rows ahead of the trailing sibling,
  identity kept, both directions. Correct; pinned.
- Source guard (KF-388) × keys (KF-392) × `replace()`: keyed list through
  `replace()` → snapshot → back onto granular with identity kept. Correct;
  pinned.

### Area 5 — coverage-shaped blind spots in the new code

- `afterListRegion()` bounds: empty list (region = bare marker) at the very
  end of a parent across a toggle + refill — correct. Two ADJACENT lists with
  nothing between: the next-marker stop keeps each region its own; after the
  move both lists still reconcile against their own signals — correct.
  Pinned.
- `claimKey` per-render scope: same key on two mounts = two identities
  (per-mount `RenderContext`s) — correct, pinned. Same key across renders —
  already covered by KF-392's suite. The per-render reset happens in
  `mount()`'s effect prologue (`keysThisRender.clear()`).
- The blind spot that WAS found by asking the neighboring-shape question:
  the warning suite's "keyed lists never trigger it" (stable source only —
  KF-394 above), and the fast-path suites' "attribute writer synced" (text
  writer unaudited — KF-397 above).

## What this round adds to the method

1. **A fix cadence is itself a seam.** Six fixes landing in one subsystem in
   24 hours crossed each other unreviewed: KF-391 added a check on exactly the
   parse KF-389 had left namespace-blind, and the KF-392 warning rode the
   KF-388 guard's predicate without inheriting its "routing, not identity"
   nuance. After any dense fix run, cross the fixes pairwise before calling
   the subsystem stable.
2. **Any author-supplied string that lands in markup is an injection surface**
   — even a "developer-only" one like a list key. The comment grammar
   (`-->`, `--`) is part of the contract the moment the string enters a
   comment. Grep for template interpolations of new API inputs first.
3. **A guard's warning and a guard's routing need separate predicates.** The
   same condition can be simultaneously correct as a routing decision (any
   source change → snapshot) and wrong as a diagnostic (only an identity
   adoption deserves a warning). KF-392's completion note even identified the
   legitimate case for routing — and the warning still shipped on the shared
   predicate.
4. **"All writers sync" claims need a writer INVENTORY, not a fix-site test.**
   KF-390 fixed the third attribute writer; nobody enumerated writers of the
   OTHER form-state channel (textarea child text). When a rule is "every X
   does Y," the test is the enumeration of X, not the Y at one site.

## Outcome

- 31 new tests, all asserting (never `.skip`), in
  `tests/unit/kf393-new-code-audit.test.tsx`: 22 pin correct behavior, 9 are
  KNOWN BUG pins across KF-394/395/396/397 (+ the KF-398 diagnostics pin).
- Index rows FC-T22…FC-T25, FC-RN13e, FC-SV7 added and FC-DW11 amended in
  `docs/14-feature-coverage.md` (166 rows, gate green).
- Tickets filed: KF-394 (high), KF-395 (high), KF-396 (high), KF-397,
  KF-398 (low, issue).
- Deliberately left un-probed: the disabled-while-focused morph edge (engine-
  specific blur behavior happy-dom cannot model truthfully — a browser-suite
  candidate if it ever matters), and re-verification of seams the KF-380/387
  suites already pin (no changes landed there this cadence).
