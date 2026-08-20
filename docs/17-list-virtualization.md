# 17. List virtualization — variable row heights

> **Status: design only.** What ships today (in the 4.2 beta line) is
> **fixed-height** virtualization: `bindList(parent, source, { virtualize: {
> rowHeight: number } })`. This document specifies the extension to
> **variable / dynamic** row heights. Nothing here is implemented yet; §17.7
> lists the follow-up tickets that build it.

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

| `rowHeight` | Height model | Who measures | Cost | Unit-testable in happy-dom |
| --- | --- | --- | --- | --- |
| `number` *(shipped)* | fixed | nobody | O(1), no cumulative model | yes |
| `(item, index) => number` | variable, **app-declared** | app (knows from data) | prefix sum + binary search, no reflow, no observers | **yes** |
| `{ estimate: number \| ((item, index) => number) }` + imperative `setHeight` | variable, **app-measured** | **app** (its own read / observer) | + estimate fallback + anchor correction | no (needs real layout) |

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

Open API questions (to settle during implementation, §17.7):

- **`setHeight` surface.** A method on the returned handle vs. a `measure`
  callback passed into `render(item, { measure })`. The handle method keeps
  `render` a pure projection (which `bindList` already requires); the callback
  is closer to where the element is.
- **Keying reported heights.** By the list `key` (survives reorders — preferred)
  vs. by index (simpler, but wrong under reordering).
- **Helper naming / packaging.** `observeRowHeights` and whether it lives in the
  `kerfjs/list` subpath or its own, given the `ResizeObserver` dependency.
- **`estimate` re-runs.** Whether `estimate` is read once per row or may be a
  function re-evaluated as `source` changes.

## 17.7 Sequencing and follow-up tickets

This is a design-then-build feature; it lands in two shippable increments.

1. **Tiers 1 + 2, fully unit-testable.** Refactor the windowing to a
   cumulative-offset (prefix-sum) model with a binary-search `scrollTop → start`
   lookup and padding derived from the prefix sum; keep `number` as an O(1) fast
   path; add `(item, index) => number` declared heights. No layout reads, no
   observers — all of it tested in happy-dom.
2. **Tier 3 + the optional helper, browser-tested.** Add `{ estimate }` with the
   imperative `setHeight` channel and the scroll-anchor correction (unit-tested
   with synthetic heights), then the separable `observeRowHeights` helper
   (Playwright-tested for real layout).

Each increment gets its own Hot Sheet ticket filed off this document.

## 17.8 Interim: the shipped prose must say "fixed"

Until the above lands, every place that advertises virtualization must state that
it is **fixed-height**: the `src/list.ts` JSDoc, `docs/8-api-reference.md` §8.11,
and the `CHANGELOG` entry. "Renders only visible rows" on its own reads as more
general than the shipped behavior actually is.
