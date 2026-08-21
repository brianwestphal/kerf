# 17. List virtualization — variable row heights

> **Status: shipped.** `bindList` virtualization accepts all three height
> models — a fixed `rowHeight: number`, an app-declared `rowHeight: (item, index)
> => number`, and a **measured** `rowHeight: { estimate }` where the app reports
> real heights via the handle's `setHeight` (or the `observeRowHeights` helper)
> and kerf anchor-corrects `scrollTop`. §17.6 records the API decisions. A second
> virtualization *strategy* — `mode: 'content-visibility'` (§17.11) — keeps every
> row in the DOM (full find-in-page / a11y) and lets the browser skip off-screen
> layout instead of kerf windowing rows out; `mode: 'window'` (the default) is the
> behavior in §17.1–17.10.

## 17.1 The problem

`bindList`'s virtualization ([`docs/8-api-reference.md`](8-api-reference.md)
§8.11) renders only the rows in (and near) the viewport, using a single fixed
`rowHeight`. The windowing math in `src/list.ts` is purely uniform-height:

```ts
const start = Math.max(0, Math.floor(parent.scrollTop / rowHeight) - overscan);
const end   = Math.min(total, Math.ceil((parent.scrollTop + parent.clientHeight) / rowHeight) + overscan);
container.style.paddingTop    = `${start * rowHeight}px`;
container.style.paddingBottom = `${Math.max(0, total - end) * rowHeight}px`;
```

It does not merely *assume* uniform rows — it **enforces** them: every row's
`style.height` is hard-set to `rowHeight`. Variable content is clamped, and the
`scrollTop → index` mapping and the padding both break the moment a row's real
height differs from the constant.

That covers dense tables and equal-height cards, but it misses the *common*
case: chat messages, feeds, comment threads, cards with wrapping text — anything
whose height depends on its content. Fixed-height-only virtualization is of
limited general usefulness, so variable height is the headline gap.

## 17.2 Design principle — the height source is pluggable; kerf owns the math

"How tall is row N?" is just a **source** feeding one piece of machinery that
kerf owns and that never needs to know *where* a height came from:

- a **cumulative-offset model** (a prefix sum of row heights),
- a **`scrollTop → start index`** lookup (binary search over the prefix sum),
- the **top / bottom padding** that keeps `scrollHeight` honest,
- and **scroll anchoring** (§17.4), the one genuinely hard part.

Keep all of that in kerf, and make the height *source* a three-way option. The
fixed-height fast path is preserved exactly — it is the degenerate case where
the cumulative model isn't even needed.

### The three height sources

| `rowHeight` | Height model | Who measures | Cost | Status |
| --- | --- | --- | --- | --- |
| `number` | fixed | nobody | O(1), no cumulative model | **shipped** |
| `(item, index) => number` | variable, **app-declared** | app (knows from data) | prefix sum + binary search, no reflow, no observers (unit-testable) | **shipped** |
| `{ estimate: number \| ((item, index) => number) }` + imperative `setHeight` | variable, **app-measured** | **app** (its own read / observer) | + estimate fallback + anchor correction (needs real layout) | **shipped** |

- **`number`** stays byte-for-byte the current behavior.
- **`(item, index) => number`** is for heights the app can compute up front — a
  known line count, an image's intrinsic aspect ratio, a server-provided height.
  kerf builds the prefix sum from the function and recomputes it when the
  `source` array changes. No layout read, no observer — so the whole windowing
  path is exercised in happy-dom with plain numbers.
- **`{ estimate }` + `setHeight`** is for heights only known after layout. kerf
  uses `estimate` for rows it has not been told a real height for; the app
  reports real heights through an imperative channel (§17.3) whenever it has
  them, and kerf recomputes the window and anchor-corrects (§17.4).

## 17.3 Why user-owned measurement (not a kerf-owned ResizeObserver)

The measured tier deliberately does **not** put a `ResizeObserver` inside kerf.
Heights enter through an imperative `handle.setHeight(key, px)` channel (or a
`measure` callback handed to `render`), and the app owns the measurement. Three
reasons:

1. **Testability.** Because heights arrive as numbers through `setHeight`, the
   entire windowing + anchoring algorithm is unit-testable in happy-dom by
   feeding fake heights and asserting the window, the padding, and the corrected
   `scrollTop`. happy-dom does no layout, so a kerf-owned *measured* tier could
   only ever be tested in the Playwright suite. This design shrinks the
   browser-only surface to a tiny forwarding shim (§17.5).
2. **On-brand.** It mirrors kerf's established core+convenience split — the
   overlay core vs. the standalone `positionAnchored` / `autoReposition`; the
   `attach` seam; `scope`'s `observeRemovals`. kerf owns the algorithm; the
   imperative wiring is the consumer's (or an opt-in helper's).
3. **The app often measures better.** An intrinsic image height, a known line
   count, or a server-provided height is cheaper and more accurate than a
   generic observer, and needs no `ResizeObserver` at all.

## 17.4 Scroll anchoring — the part kerf must own

The hard part of measured virtualization is **not** the measurement — it is what
happens when a row *above* the viewport turns out to differ from its estimate.
Its real height shifts the cumulative offset of everything below it, so total
height changes and the content under the user's eyes would visibly jump unless
`scrollTop` is compensated by the same delta.

Only kerf knows the cumulative-offset model, so **kerf owns this correction**:
when a `setHeight(key, px)` report changes the offset of a row that sits before
the current scroll position, kerf adjusts `parent.scrollTop` by the delta in the
same frame. The app owning *measurement* does not mean the app owns *anchoring* —
that stays in the algorithm, which is exactly why it must be unit-testable.

## 17.5 The optional measurement helper

For consumers who don't want to hand-wire measurement, kerf ships a thin,
**separable** helper — working name `observeRowHeights(handle, options?)` — that
installs a single `ResizeObserver` over the visible rows and forwards each row's
`offsetHeight` into `handle.setHeight(key, px)`, returning a disposer. It is the
batteries-included path, it is the **only** piece that needs the Playwright
suite, and the core does not depend on it. The docs then show all three
patterns: *declare* heights, *measure with the helper*, or *measure yourself*.

## 17.6 API shape (proposed)

```ts
// Tier 2 — app-declared heights
bindList(parent, source, {
  key: (m) => m.id,
  render: (m) => <li>{m.text}</li>,
  virtualize: { rowHeight: (m) => 24 + estimateLines(m.text) * 20, overscan: 4 },
});

// Tier 3 — app-measured heights (kerf estimates until told; app reports real px)
const list = bindList(parent, source, {
  key: (m) => m.id,
  render: (m) => <li>{m.text}</li>,
  virtualize: { rowHeight: { estimate: 64 } },
});
// …app measures however it likes and reports:
list.setHeight(msg.id, el.offsetHeight);

// Tier 3 with the optional helper (one ResizeObserver → setHeight for you)
const stop = observeRowHeights(list); // returns a disposer
```

API decisions (settled at implementation):

- **`setHeight` surface — a method on the handle.** `bindList` now returns a
  `BindListHandle` = `(() => void) & { setHeight(key, px) }`: still the disposer
  (so `const dispose = bindList(...); dispose()` is unchanged), plus `setHeight`.
  Chosen over a `measure` callback into `render` so `render` stays a pure
  projection (which `bindList` already requires).
- **Keying reported heights — by the list `key`.** Reports are stored keyed by
  `key`, so a height survives a reorder; `setHeight` locates the row's current
  index through a `key → index` map rebuilt with the prefix sum.
- **Helper packaging — in the `kerfjs/list` subpath.** `observeRowHeights` ships
  from `kerfjs/list`, not a separate subpath: it's a few lines, tree-shakes away
  when unused, and the `ResizeObserver` reference only lands in a bundle that
  imports it. The core never references `ResizeObserver`. The handle↔helper
  coordination lives in a module-level `WeakMap` (GC-tied) so the public handle
  type stays `(() => void) & { setHeight }`.
- **`estimate` re-runs.** `estimate` is evaluated per row each time the prefix sum
  is (re)built — i.e. when the source changes or a height is reported — not
  cached, so a function estimate that reads the item stays correct across
  updates.

## 17.7 Sequencing and follow-up tickets

This is a design-then-build feature; it lands in two shippable increments.

1. **Tiers 1 + 2, fully unit-testable — shipped.** The windowing is a
   cumulative-offset (prefix-sum) model with a binary-search `scrollTop → start`
   lookup and padding derived from the prefix sum; `number` stays an O(1) fast
   path; `(item, index) => number` declared heights build the prefix sum
   (rebuilt only when the source changes, not per scroll frame). No layout reads,
   no observers — all of it tested in happy-dom (`tests/unit/list.test.ts` ›
   "variable-height virtualization").
2. **Tier 3 + the optional helper — shipped.** `{ estimate }` with the imperative
   `setHeight` channel and the scroll-anchor correction are unit-tested with
   synthetic heights (`tests/unit/list.test.ts` › "measured-height virtualization"),
   and the separable `observeRowHeights` helper's forwarding is unit-tested via a
   stubbed `ResizeObserver` (its real-layout behavior belongs to the Playwright
   suite).

## 17.8 The shipped prose must say what it does

Virtualization prose must distinguish the height models: `number` is fixed
height, `(item, index) => number` is app-declared variable height, and
`{ estimate }` is measured height (app reports via `setHeight`). The
`src/list.ts` JSDoc, `docs/8-api-reference.md` §8.11, and the `CHANGELOG` entry
all say this — "renders only visible rows" on its own reads as more general than
what actually ships.

## 17.9 Adoption ergonomics — threshold, container handle, resize

**Status: shipped.** Three refinements from adopting `bindList({ virtualize })`
in a real app (Hot Sheet's ticket list), each removing a workaround the caller
otherwise had to write.

### `minRows` — render-all below a threshold

A list often wants to render *everything* when it's short and virtualize only
when it's long: a fully-rendered short list is visible to find-in-page (Cmd+F),
to screen readers, and to DOM-count tests, all of which only see rows actually in
the DOM. Without a built-in, the caller branches on length between a plain
`bindList` (rows mount into *their* container) and a virtualized one (kerf creates
and owns an *inner* container) — two different DOM shapes, so the branch leaks
into the caller and both paths must converge on the same hooks by hand.

`virtualize: { rowHeight, minRows }` handles it inside kerf: below `minRows` it
renders **every** row with no windowing and zero padding; at or above it, it
windows. **The DOM structure — the inner sizer — is identical either way**, so the
call site is one call with one shape, and crossing the threshold in either
direction switches automatically.

### `containerClass` / `containerId` + `handle.container`

The inner sizer kerf creates in virtualize mode was previously unclassed and
unreachable, forcing callers to tag `parent.lastElementChild` (fragile: it
assumes kerf's div is last and nothing else was appended). Now `containerClass` /
`containerId` set it declaratively at creation, and the returned
`BindListHandle` exposes it as `handle.container` (an `HTMLElement` for a
virtualized list, `undefined` otherwise) for anything else — a detachment marker,
an imperative reference, an e2e hook.

### Resize handling

kerf reads `parent.clientHeight` at mount and previously re-windowed only on
`scroll`. A list mounted before layout (`clientHeight` 0 — a hidden tab, pre-first
paint) rendered just `overscan` rows and never grew until the user scrolled; a
container resized while open was missed entirely. kerf now also observes `parent`
with a `ResizeObserver` (where available) and re-windows on resize. Because a
`ResizeObserver` delivers an initial callback on observe, the 0-height case
self-heals once layout settles — no synthetic scroll needed. Where
`ResizeObserver` is absent (older runtimes / SSR), behavior is scroll-only as
before, so a laid-out (non-zero-height) scroll parent at mount is required there.

## 17.10 Virtualization tradeoffs — findability & accessibility

**Status: shipped.** Virtualization buys a bounded DOM node count by a real
tradeoff the app must weigh: **off-window rows are not in the DOM at all.**
`src/list.ts` removes them during its "remove rows that are gone from the window"
pass and re-creates them only when the window scrolls over them, so at any moment
only the visible window (plus `overscan`) exists as elements. That has three
user-visible consequences, none of which a virtualized list can paper over:

- **Find-in-page (Cmd/Ctrl+F) matches only the visible window.** The browser's
  search walks the live DOM; a match in a row that has been windowed out simply
  isn't there to find. A user searching a 10,000-row virtualized feed for text in
  row 8,000 gets no hit until they've scrolled it into the window themselves.
- **Screen readers and the accessibility tree see only the visible window.** The
  a11y tree is built from live DOM, so assistive tech perceives a list of
  `window + overscan` rows, not the true total. If the total count matters to the
  experience, the **app** must convey it — e.g. `role="grid"` with
  `aria-rowcount`, or `aria-setsize` / `aria-posinset` on the rows — because kerf
  cannot infer it for you.
- **In-page anchor links and `scrollIntoView` to an off-window row fail.**
  `document.getElementById('row-8000')` (or an `#row-8000` fragment link, or
  `el.scrollIntoView()`) returns nothing when that row is outside the window —
  the element doesn't exist yet. Deep-linking to a specific row requires the app
  to first scroll the window to that row's computed offset, then locate it.

**Guidance — pick by what the list needs:**

- When **full findability / a11y / anchor-linking matters more than the node
  ceiling**, don't virtualize: render a plain (non-virtualized) `bindList`, or set
  `minRows` above the list's length so kerf renders every row (§17.9 — same DOM
  shape, no windowing). This keeps all rows live and findable at the cost of an
  unbounded node count, which is fine for small-to-medium lists.
- When the **node ceiling matters more** (tens of thousands of rows, where
  keeping them all live would bloat the DOM and layout), virtualize and accept the
  findability tradeoff — conveying totals and enabling deep links through ARIA and
  app-driven scrolling as above.

The `content-visibility` virtualization mode (§17.11) keeps **all** rows in the
DOM — the browser skips *rendering* off-screen rows rather than kerf *removing*
them — so it preserves find-in-page, the a11y tree, and anchor links at the cost
of an unbounded node count. It targets exactly the medium-list case where
findability outweighs the node ceiling; the windowing described here stays the
right choice for very large lists.

## 17.11 The `content-visibility` mode — keep every row findable

**Status: shipped.** `virtualize: { rowHeight, mode: 'content-visibility' }` is a
second virtualization *strategy*, chosen against the default `mode: 'window'`
(§17.1–17.9, today's JS windowing). It trades the node ceiling for full
findability: **every** row stays in the DOM, and the browser — not kerf — skips
the layout and paint of the off-screen ones via two CSS properties kerf sets on
each row:

```css
content-visibility: auto;
contain-intrinsic-size: 0 <rowHeight>px;
```

`content-visibility: auto` tells the engine it may skip rendering a row that is
off-screen; `contain-intrinsic-size` gives it a placeholder height so the
scrollbar stays accurate *before* a row has ever been rendered (the engine
remembers the real size once it renders the row). Because the row is present the
whole time, **find-in-page, the accessibility tree, and anchor links /
`scrollIntoView` all work on any row** — the browser renders an off-screen row on
demand the moment the user searches for it or a screen reader reaches it. That is
the entire point of the mode, and it is exactly the guarantee `mode: 'window'`
cannot give (§17.10).

### 17.11.1 The `mode` choice is the app's, and it is about list size

`mode` is an **explicit app decision**, never auto-selected by browser support.
The two modes make opposite tradeoffs, and which one is right depends on the
*list*, not the engine:

<div class="kerf-compare">

| | `mode: 'window'` (default) | `mode: 'content-visibility'` |
| --- | --- | --- |
| DOM nodes | **bounded** (visible window + overscan) | all N rows |
| Find-in-page / a11y / anchor links | visible window only | **every row** |
| Best for | very large lists (100k rows) | medium lists where findability wins |
| Scroll handling | kerf windows on scroll/resize | browser skips off-screen layout |
| Works on every engine | yes | yes (CSS inert where unsupported — see below) |

</div>

- **content-visibility** keeps all N nodes live — great for a 2,000-row list you
  want fully searchable, wrong for a 100,000-row list (100k live nodes bloat the
  DOM).
- **window** keeps the node count bounded — the opposite tradeoff.

Auto-picking the strategy by `CSS.supports` would be a trap: it would make the
findability *guarantee* vary silently by browser (holds in Chrome, not in an
engine without `content-visibility`), and make the DOM shape / row count differ
per engine. So kerf never does that. **The app picks the guarantee; the mode is
constant across every browser.**

### 17.11.2 Feature-detection gates the speed, never the guarantee

There is deliberately **no** feature detection inside the mode. `content-visibility:
auto` is simply *inert* on an engine that doesn't support it (early-2026 Firefox,
say): kerf still renders every row and still sets both CSS properties, the row is
still fully findable, and the only thing missing is the off-screen-skip
*optimization*. So:

- **Supporting engines** (Chromium, Safari 18) skip off-screen layout/paint — the
  performance win.
- **Non-supporting engines** render everything — correct, fully findable, just
  without the skip.

The findability guarantee holds identically everywhere; only the speed is
capability-gated, degrading gracefully to "renders all rows." That is fine for
the mode's sweet spot (medium lists); a 100k-row app should be on `mode: 'window'`
regardless of engine.

### 17.11.3 How the mode interacts with the rest of the API

- **`rowHeight` is the `contain-intrinsic-size` hint only.** There is no windowing
  math in this mode, so all three height sources collapse to "what placeholder
  size should the browser reserve for an unrendered row?": a fixed `number`
  applies to every row; an `(item, index) => number` gives each row its own
  intrinsic size; `{ estimate }` uses its estimate (number or function). The
  browser measures the *real* height itself once a row renders.
- **`setHeight` and `observeRowHeights` are no-ops.** The measured tier's imperative
  channel exists to feed kerf's cumulative-offset model; there is no such model
  here (no rows are removed, so there is nothing to anchor-correct), and the
  browser owns real measurement. Calling `setHeight` does nothing;
  `observeRowHeights` returns a disposer that observes nothing.
- **`minRows` is ignored.** It exists to render every row below a threshold — which
  this mode already does unconditionally.
- **`handle.container` / `containerClass` / `containerId` still work.** kerf renders
  the rows into the same inner container as `mode: 'window'` (so the DOM shape and
  `handle.container` are consistent across modes), just with no padding — every row
  is present, so there is nothing to pad.
- **No scroll listener and no `ResizeObserver` are installed.** There is no window to
  recompute; the browser handles off-screen skipping on its own.

### 17.11.4 Testability

happy-dom does not honor `content-visibility` (it does no layout), so unit tests
(`tests/unit/list.test.ts` › "content-visibility virtualization mode") assert the
**correctness** surface, which is engine-independent: every row is present in the
DOM, `content-visibility: auto` and the right `contain-intrinsic-size` are set per
row (fixed / declared / estimate), `setHeight` and `observeRowHeights` are inert,
`minRows` is ignored, no scroll listener fires, and the default mode stays
`'window'`. The actual off-screen skip is a rendering-engine behavior and belongs
to the Playwright suite (Chromium / WebKit), which asserts the rows exist and stay
findable while scrolled.
