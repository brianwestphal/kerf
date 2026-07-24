# 16. List identity

> **Status: shipped.** `each(items, render, { key })` gives a list a stable
> identity, and an always-on dev warning names it as the fix when an identity
> shift is detected. §16.4/§16.5 record why the alternatives were rejected —
> the constraints in §16.3 are what make an *automatic* scheme unreachable
> without a reconciler restructure, so they remain the reason this is opt-in.

## 16.1 The concept that isn't named

Every `each()` list needs an identity that is **stable across renders**, so
kerf can find the same list's cache, its recorded row count, its data source,
and its DOM binding on the next render.

Today that identity is implicit: **"the n-th `each()` call this render."**
`each()` increments a counter on the render context and stringifies it
(`each.ts`), and four persistent structures are keyed on the result:

| Structure | Owner | Purpose |
| --- | --- | --- |
| `renderCtx.caches` | `each()` | per-item HTML memo |
| `renderCtx.bindingCounts` | `mount()` | drift detection |
| `renderCtx.bindingSources` | `mount()` | the source guard (§16.2) |
| `bindings` | `mount()` | the live DOM binding |

All four silently assume the counter is stable. It isn't: **any render that
changes how many `each()` calls run before a given list reassigns that list's
id**, and every structure above then associates it with a different list.

This is the third defect in the same family. Each one was an implicit concept
that the code re-derived at each use instead of naming once:

- a list's **extent** — fixed by naming it `afterListRegion()` in `morph.ts`
  (the row region is the marker through its last row).
- a list's **binding validity** — fixed by the self-heal in `mount()`.
- a list's **identity** — this document.

The pattern is worth stating plainly, because it predicts where the next one
will be: *a concept that several call sites each reconstruct from raw
materials will eventually be reconstructed differently by one of them.*

## 16.2 The two halves of the problem

**Fixed — the corruption.** `each()` records each id's data source and refuses
to emit an `arraySignal` patch queue when the id now holds a *different*
source, falling back to a snapshot rebuild. Before that, a batched
"hide one list + push to another" applied the pushed list's patch to the other
list's live rows: the second list rendered the first list's data. The DOM now
always matches the list's own signal.

**Then fixed — the cost.** Before the key existed, an id shift still made the
affected list rebuild from scratch:

- row DOM node identity is lost, taking focus, scroll position, in-progress
  IME composition, and per-row binding effects with it;
- the rebuild is O(N) instead of O(changes);
- nothing warns — the rebuild goes through the ordinary classify pass, so even
  `KERF_DEV_WARN_LIST_REBIND` is structurally blind to it.

Two shapes trigger it. A **conditional list before another list** (toggling it
in either direction shifts the later list's id), and a **nested `each()`
inside a row render** (it increments the shared counter only on cache-*miss*
renders, so the count varies with cache state).

The source guard also had one hole of its own: two `each()` calls over the
**same** `arraySignal` share a source, so a shift between those two passed the
guard undetected.

A key removes all of it — the list no longer depends on call order at all, and
two lists over one signal are trivially distinguishable. What remains is that
lists *without* a key still behave as described above, which is why the
diagnostic (§16.4 C) is part of the design rather than a nicety.

## 16.3 Constraints (verified, not assumed)

Any scheme has to survive all five of these.

1. **Two `each()` calls may share one data source, and that works today.**
   Rendering the same `arraySignal` in two places renders and updates both
   lists correctly. So "key on the data source" alone is not merely
   insufficient — it would *collide* and break a currently-working case.
2. **Plain-array lists have no stable data identity.** A constant array
   reference is stable across renders, but the common shape — an array derived
   inside the render (`src.value.filter(...)`) — is a fresh reference every
   time. Data identity therefore cannot be the general answer.
3. **Render-function identity is not available.** Keying on the row render
   function was tried and reverted, because an inline arrow row renderer is a
   fresh reference on every render. Do not re-attempt it.
4. **Marker ids are baked into HTML at `each()` call time.** `each()` emits
   `<!--kf-list:N-->` into the string it returns, so the id must exist before
   the segment tree is assembled — a structural path computed from the
   assembled tree is not available at the moment it is currently needed.
5. **The id is needed early *because* of the granular fast path.** `each()`
   consults the prior state under that id to decide whether to emit patches or
   a full snapshot. Deferring the decision to tree-assembly time would mean
   always producing the full snapshot — surrendering the O(patches) property
   that the fast path exists for, on the benchmark's hottest path.

Constraints 4 and 5 are the load-bearing ones: they are why "just use a
structural path" is a larger change than it first appears.

## 16.4 Options

### A. Explicit author-supplied key

`each()` accepts a stable key from the author; absent one, behavior is
unchanged.

- **Airtight where used.** Survives every shape in §16.2, including the
  same-source hole (constraint 1) and plain arrays (constraint 2).
- **No restructure.** The key is available at call time (constraint 4), and the
  granular decision stays where it is (constraint 5).
- **Opt-in.** Lists without a key keep today's behavior, so the fix only
  reaches authors who know to reach for it — which makes the paired diagnostic
  (option C) not optional but part of the design.
- **Costs public API surface.** `each(items, render, cacheKey?)` is already
  three positional parameters; a fourth is poor ergonomics, so this likely
  means an options object, i.e. a real API decision.

### B. Structural path identity

Derive the id from the list's position in the assembled segment tree rather
than from a call counter.

- **Automatic** — no author action, fixes every shape at once.
- **Blocked by constraints 4 and 5.** It requires either emitting markers
  without ids and patching them later, or deferring the granular/snapshot
  decision until after tree assembly. The second surrenders the fast path; the
  first needs the id-dependent state lookups to move too, which is most of the
  same restructure.
- Worth revisiting only if the reconciler is being reworked for other reasons.

### C. A diagnostic for the shift

Warn when a recorded id is adopted by a different list.

- **Cheap** — the detection point already exists in `each()` (the source
  comparison added for the corruption fix).
- **Doesn't fix anything on its own**, but converts a silent O(N) rebuild plus
  state loss into an actionable message. Under option A it is what makes the
  opt-in discoverable: the warning is where an author learns a key is needed.
- **Incomplete alone**: it can only detect the shift when the two lists have
  different sources, which is the same blind spot as the guard (constraint 1).

## 16.5 What shipped

**A + C**: an explicit optional key, plus a dev warning that names it as the
fix when a shift is detected.

The reasoning is that a fully automatic scheme is not reachable without the
restructure that constraints 4 and 5 describe, and that restructure puts cost
on the reconciler's hottest path to fix a shape that is uncommon in real
markup. An explicit key that is *airtight where used* and a diagnostic that
tells authors exactly when to use it matches how the rest of kerf handles this
class of trade-off — `data-key` is the same bargain for row identity, and the
missing-row-key warning is the same discovery mechanism.

It also closes the same-source hole (constraint 1) for free, which no
automatic scheme derived from the data can.

The API shape chosen is an **options object** in the third position —
`each(items, render, { cacheKey, key })` — with the bare `cacheKey` third
argument still supported, so no existing call changes.

Two properties fell out of the implementation that are worth stating:

- **A keyed list does not consume a call-order slot.** Keying the *conditional*
  list therefore stabilizes its unkeyed siblings as well, so a whole tree is
  usually fixed by keying the one list that comes and goes.
- **The source guard stays a routing decision, not an assertion.** The original
  plan was to demote it once identity was stable, but a keyed list may
  legitimately change source (`each(cond ? a : b, …, { key: 'x' })`) — a
  snapshot rebuild is the right answer there, not an error.

## 16.6 Acceptance — all met

- A keyed list keeps row node identity and focus across a sibling list being
  added or removed, in **both** directions.
- A nested `each()`'s id is stable across cache-hit renders.
- Two `each()` calls over one `arraySignal` remain independent and correct.
- The granular fast path still applies for unshifted lists — proven by row
  identity surviving `push`/`update`/`remove`, not just by output equality.
- The benchmark's partial-update and select-row numbers are unchanged.
- `caches`, `bindingCounts`, `bindingSources`, and `bindings` all key on the
  new identity, and the source guard becomes an assertion rather than a
  routing decision.
