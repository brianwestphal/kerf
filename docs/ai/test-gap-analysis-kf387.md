# Test-gap analysis — KF-387 (second sweep)

> **Third sweep:** [`test-gap-analysis-kf393.md`](test-gap-analysis-kf393.md)
> audits the 24-hour fix cadence that answered this sweep (KF-385…KF-392) as a
> body of new code — and found four more defects, three of them *inside or
> between the fixes themselves* (KF-394/KF-395/KF-396/KF-397).

Sibling of [`test-gap-analysis-kf380.md`](test-gap-analysis-kf380.md). KF-380
swept ONE seam — morph × bindings × owned rows — and the 24 hours after it
produced KF-381/KF-383/KF-385/KF-386 inside that same seam. KF-387 asked the
next question: **is that seam uniquely fragile, or just the only one anyone
swept?** AI-facing; written 2026-07-24 under KF-387 (test-and-analysis only —
runtime frozen; every defect filed as its own ticket).

## The answer: it was just the only one swept

Four previously-unswept seams were probed; **four new defects** came out of
three of them on the first pass (KF-388, KF-389, KF-390, KF-391) — including
one silent data-corruption bug (KF-388 shape A) at least as severe as anything
in the KF-374…KF-386 run. The morph seam is not uniquely fragile; it is where
the flashlight was pointed. The predictor from the KF-380 method note held
exactly: defects live wherever one subsystem's **template/live asymmetry**
(live-only nodes, template-only markers, parse-context differences, implicit
identity) is walked over by another subsystem that doesn't know about it.

## Seam inventory + ranking

Ranked by how much template/live asymmetry crosses the seam. "Swept" = has an
adversarial multi-step suite after this ticket.

| # | Seam | Asymmetry crossing it | Verdict |
| --- | --- | --- | --- |
| 1 | morph × mount × list-reconcile × bindings | live-only rows + inserted text nodes vs. marker-only templates | Swept (KF-380/KF-384); all known defects fixed |
| 2 | **`each()` identity × varying call count** (conditional `each()`, nested `each()` in rows) | a list's identity is the IMPLICIT call-order index; caches / bindingCounts / bindings all assume it stable | **BROKEN — KF-388** (wrong-list granular patches; silent sibling rebuild; nested-each counter drift). The "unnamed implicit concept" pattern again: KF-385 named a list's *extent* (`afterListRegion()`); nothing names a list's *identity* |
| 3 | **row re-parse × parse context** (SVG namespace, table foster-parenting) | first-render rows parse inside the real container's context; every later parse happens in a detached HTML `<template>` with no context | **BROKEN twice — KF-389** (SVG rows come back HTML-namespaced) and **KF-391** (`<tr>` under `<table>` foster-parents a tbody, misbinding silently past the KF-103 guard) |
| 4 | **form-state sync × list fast paths** | the property/attribute detachment (dirty controls) is compensated by `syncFormProp` in exactly two writers; the KF-198 fast path is a third writer | **BROKEN — KF-390** (attr-only fast path mutates raw; dirty rows go visibly stale; morph route behaves) |
| 5 | `html` tagged template × everything | same machinery as JSX, but its own chunk/marker-injection front-end; had never seen a single structural-shift shape | Swept — **no defects found**; 8 round-trip tests pin the shared-machinery claim (`kf387-html-seam.test.tsx`) |
| 6 | bindings × `data-morph-skip` | markers inside a subtree the morph never visits, re-wired by a pass that visits everything | Swept — correct; pinned |
| 7 | delegate × morph node replacement/moves | listeners on the stable root vs. rebuilt/moved descendants | Swept — correct; pinned (rebuild + lookahead-move + both directions) |
| 8 | store × mount | none beyond plain signals (store is a signal wrapper) | Low value; existing integration suite covers it |
| 9 | SSR `toString()` × bindings/each | markerless flatten vs. marker-carrying mount path | Existing `html.test.ts`/`each` snapshots cover the seam's contract |

The severity gradient tracks the asymmetry gradient almost perfectly. Seams 8–9
(no live-only state crossing) yielded nothing; seams 2–4 (asymmetry that no
test had ever crossed) each yielded a defect immediately.

## Defects found (all filed, all pinned asserting)

- **KF-388 (high)** — `each()` list identity is its call-order index. A
  conditional `each()` (or a nested one whose call count varies with cache
  hits) shifts every later list's id. Three manifestations, worst first:
  `batch(cond off + b.push(...))` applies B's granular patch against **A's
  binding** — `ul.b` renders `A1 A2 B3` (verified); unbatched toggles silently
  rebuild the sibling list in both directions (content correct, identity/focus
  lost, `KERF_DEV_WARN_LIST_REBIND` blind to it — it routes through classify,
  not self-heal); nested `each()` drifts the counter via cache hits. Pinned in
  `kf387-seam-sweep.test.tsx` › "each() list identity across a varying call
  count".
- **KF-389 (high)** — `each()` rows inside `<svg>` lose the SVG namespace on
  every post-first-render parse (granular insert, snapshot append, structural
  update) because `parseRowTemplate` uses an HTML `<template>`. New rows never
  paint in a real browser. First render is correct, which makes it look like a
  flake. The static-surrounds morph is NOT affected (verified — its template
  carries the `<svg>` context).
- **KF-390** — `tryAttributeOnlyFastPath` mutates `checked`/`value`/`selected`
  attributes without `syncFormProp`, so a dirty row control goes visibly stale
  on an arraySignal update whenever the row's top-level element IS the control.
  The identical operation through the morph route syncs correctly (verified
  side by side) — route-dependent behavior, the exact class KF-335 eliminated.
- **KF-391** — `each()` of `<tr>` directly under `<table>`: the parser's
  implicit `<tbody>` defeats `validateInlinedRowMatch` (the row-alone re-parse
  counts 1 element, so the mismatch is misread as browser normalization), row 0
  binds to the tbody, the reconcile duplicates rows outside it, and the
  missing-row-key warning fires **falsely** (it inspects the tbody). Should be
  a loud KF-103-style contract error.

## Documented-claim audit (checked by execution, not by reading)

| Claim | Where | Verdict |
| --- | --- | --- |
| "**mount() is enough** when your SVG has an `<svg>` root tag" | `docs/7-svg.md` | **Half-true.** True for the static-surrounds morph (verified + pinned). False for `each()` rows after first render — KF-389. Doc caveat/fix rides that ticket |
| "whenever the diff … actually mutates a `checked`/`value`/`selected` attribute, the matching property is synced too" | `docs/4-render.md` § Form-state properties | **Half-true.** True for the morph route and bindings; false for the attribute-only row fast path — KF-390. Doc stays as-is only if the fix lands (it states the intended invariant) |
| Stale-binding hazard is confined to the byte-equal fast path; a surrounds-changed render re-wires cleanly | `docs/2-reactivity.md` §2.9 / `mount.ts` KF-299 note | **True, was untested in the re-wire direction.** Now pinned (new instance live, old instance detached — no ghost writes) |
| `html` is "a thin front-end over the exact JSX machinery — the runtime paths are IDENTICAL" | `src/html.ts` header, `docs/6-jsx-runtime.md` §6.11 | **True for every swept shape, previously never asserted structurally.** 8 round-trip tests now pin it (FC-H10) |
| Delegated listeners survive re-renders because they live on the stable root | `docs/5-event-delegation.md` | **True**, now pinned across a replaceChild rebuild AND a lookahead move, both directions (FC-EV8) |
| Keying the LIST container fixes the same-tag-hijack shape in both directions | `docs/4-render.md` §4.2 (the KF-383 correction) | **True through `html` templates too** — the corrected guidance holds on the second front-end (pinned) |
| `KERF_DEV_WARN_LIST_REBIND` fires when a list's container is rebuilt | `docs/11-dev-warnings.md` §11.2.9 | **Accurate as scoped** (self-heal branch only — the doc says so explicitly), but note the blind spot: the KF-388 id-shift rebuild never reaches the self-heal, so THAT rebuild class is invisible to the whole warning family. Recorded on KF-388 |
| `each()` rows in `<tbody>` reconcile cleanly (the krausest shape) | implied everywhere tables appear | **True**, now pinned as the KF-391 counterpart |

Claims NOT audited this round (deliberately): the eslint-plugin rule docs
(static analysis, no runtime claim), `docs/13` packaging patterns (typing-level,
covered by the scaffold gate), `docs/15` no-build vendor contract (covered by
the example-apps browser suite), and the migration pages' qualitative
comparisons (no runnable assertion).

## Dev-warning accuracy pass

Read every `KERF_DEV_WARN_*` message against its current trigger:

- `LIST_REBIND` — message and §11.2.9 both accurate post-KF-383 rewrite
  (trigger scoped to the self-heal branch; the marker-unit-move exemption is
  stated). Gap, not drift: the KF-388 rebuild class bypasses it (above).
- `STALE_BINDING` — accurate; the complement behavior (re-wire on a changed
  surrounds render) is now pinned so the message's scoping claim stays true.
- `EACH_IN_MORPH_SKIP`, `DUPLICATE_EACH_KEYS`, `DELEGATE_IN_EFFECT`,
  `REBUILT_LISTENERS`, `NARROW_SET`, `UNTRACKED_SIGNALS`,
  `VALUE_ONLY_RERENDER` — messages match their triggers; no drift found.
- **False positive found (always-on warning):** the missing-row-key warning
  (`utils/rowContract.ts`) fires claiming rows lack `id`/`data-key` when the
  real problem is the KF-391 tbody misbind — it inspects the mis-bound tbody.
  An actively misleading diagnostic; folded into KF-391.
- Dedup-scope footnote: `LIST_REBIND`/`EACH_IN_MORPH_SKIP` dedup "per list id"
  — under KF-388 id shifts, ids are not stable per callsite, so "one warning
  per callsite" is best-effort until KF-388 lands. Recorded on KF-388.

## What this round adds to the method

1. **Sweep the seam, not the module — and sweep every seam once before
   re-sweeping any.** Three of four never-probed seams were broken on first
   contact; the heavily-swept seam yielded nothing new.
2. **Parse context is a template/live asymmetry.** KF-389/KF-391 are the same
   bug shape as KF-374/KF-377 one level down: the row's HTML string is
   context-free, but its live parse target is not. Anywhere kerf re-parses a
   fragment detached from its eventual parent (rowContract's `<template>`),
   ask "what does the real parent's parser context add or remove?"
3. **Hunt unnamed implicit concepts by asking what an id/index MEANS.** KF-385
   named a list's extent; KF-388 shows nothing names a list's identity. The
   remaining candidates worth a look when KF-388 is fixed: global binding-hole
   ids (registration order — same varying-call-count exposure, currently
   mitigated because the surrounds string changes whenever the hole set does)
   and row-local binding ids (reset per row — safe by construction).
4. **Pin both routes of a route-dependent operation side by side.** KF-390 was
   only provable because the same user operation was asserted through the fast
   path AND the morph path in adjacent tests. A single-route test would have
   read as "works" or "fails" with no signal that the ROUTING is the bug.

## Outcome

- 22 new tests: 8 in `tests/unit/kf387-html-seam.test.tsx` (all asserting;
  load-bearing verified — 5/8 fail on pre-KF-377 morph/mount, the unit-move
  test fails on pre-KF-382 morph), 14 in `tests/unit/kf387-seam-sweep.test.tsx`
  (7 asserting true claims, 7 KNOWN BUG pins across KF-388/389/390/391 that
  fail loudly in either direction of change).
- Index rows FC-T20, FC-T21, FC-RN13d, FC-B24, FC-EV8, FC-H10, FC-SV6 in
  `docs/14-feature-coverage.md` (157 rows, gate green).
- Tickets filed: KF-388 (high), KF-389 (high), KF-390, KF-391.
