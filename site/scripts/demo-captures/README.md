# Animated demo captures

The `site/public/demos/<name>.svg` files are animated previews of the complete
example apps, embedded at the top of each app's docs page so a reader can see
what the live demo does before clicking through.

They're produced with [`domotion-svg`](https://github.com/brianwestphal/domotion)
— a DOM-to-animated-SVG renderer that drives the real app in Chromium and
serializes the result to a self-contained SVG with CSS keyframe transitions
(no JS, animates inside an `<img>`, scales crisply, ~60–100 KB each).

## Regenerate

```bash
bash site/scripts/demo-captures/capture-demos.sh
```

That script builds each app, serves them, and runs `domotion animate` over the
per-app config in this directory. Re-run it whenever an example app's UI or its
headline interaction changes.

## The configs

One `<name>.json` per app. Each frame describes a step of the headline
interaction — the same flow the app's `tests/browser/example-apps.spec.ts`
smoke spec exercises:

| App | Captured flow |
| --- | --- |
| `todomvc` | type three todos (typing overlay), each added, toggle the first done |
| `markdown-editor` | clear, then type a short doc in chunks — preview tracks live |
| `kanban` | drag two cards across columns (each card slides in; counts update) |
| `chat` | type a prompt (typing overlay), bot reply streams in token-by-token |
| `dashboard` | live ticker ticking + a continuously scrolling sparkline |
| `counter-store` | increment ×3 (number pops each beat), decrement, async fetch resolves |
| `cart-htmx` | swap in the cart island, remove an item |

A frame's `waitFor*` gates are readiness preconditions applied **before** that
frame's `actions`; the capture happens **after** the actions. So assertions about
a result go on the *next* frame's gate (or rely on a trailing `wait`), not the
same frame that triggers the change. Synchronous interactions (clicks, fills)
just use a short trailing `wait`; the dashboard trims to 10 rows via an injected
`display:none` rule so the SVG stays small.

## Conventions (learned the hard way)

- **Set `"transition": { "type": "cut" }` on every frame — never omit it.** Each
  frame is a *full* re-capture of the app, so a `crossfade` cross-dissolves the
  entire frame on every state change (two whole UI states double-exposed) and
  reads as an unnatural full-screen "flash" even when only a few elements
  changed. A `cut` is domotion's true hard cut: an instant step-end opacity flip
  with no interpolation smear and no dip-to-blank (frame *i*'s show window hands
  off to frame *i+1* with zero gap). **Do not omit the `transition` key** — an
  absent transition is NOT a hard cut; domotion defaults it to a 300 ms
  `crossfade` (`frame.transition?.type ?? "crossfade"`), so omitting it brings
  the flash right back. `tests/unit/demo-configs.test.ts` enforces an explicit
  `cut` on every frame (it fails on a missing transition, not just a literal
  `crossfade`).
- **Hold the final frame long enough to absorb the payoff.** The loop is a hard
  cut back to frame 0, so the last frame's `duration` is all the time a viewer
  gets to read the end state before it restarts. Give it a generous hold (~3 s on
  the interaction demos) so the result doesn't snap away mid-read. For an ambient
  demo with no static payoff (the dashboard), extend the *continuous motion* at
  the tail instead of freezing a still frame.
- **A `cut`'s last frame fades out unless you re-fix `step-end` after SVGO.**
  domotion emits each cut frame's opacity track as `animation: fv-N <t>s infinite;
  animation-timing-function: step-end` (the override after the shorthand is
  deliberate — the shorthand resets timing-function to `ease`). But `optimize:
  true` runs SVGO, whose CSS minifier reorders the declarations so the shorthand
  lands last and clobbers `step-end`. Interior frames are unaffected (their
  opacity 1→0 span is an instant sliver), but the LAST frame's visible window runs
  to 100% with opacity 1→0, so under `ease` it interpolates — the whole final
  frame **fades to black** over its duration (this is what "they fade out while
  the user is absorbing it" was). `fix-cut-timing.mjs` runs after capture and
  folds `step-end` back into every `fv-N` shorthand; `capture-demos.sh` invokes
  it automatically. `tests/unit/demo-configs.test.ts` guards the committed SVGs
  (every `fv-N` track must carry `step-end`).
- **Show entry/motion, don't teleport.** Text-entry demos (todomvc, chat) use a
  `typing` overlay (anchored to the input, with a `bgColor` mask over the
  placeholder) so the text is visibly typed; markdown types its source character
  by character so the preview visibly tracks each edit; the kanban cards slide
  across columns via a `magic-move` transition (below).
- **kanban uses `magic-move` for the cross-column card slides.** A `magic-move`
  transition diffs the two captured trees and slides matched elements from their
  old box to their new one — a true match cut, so the card visibly glides from
  column to column instead of cutting. Three gotchas, all learned the hard way:
  - **Pair across lists with `data-magic-key`.** kanban renders one `each()` list
    per column, so moving a card is remove-from-A + insert-into-B (different DOM
    nodes / tree paths); the fingerprint heuristic won't pair them. An `evaluate`
    action sets `data-magic-key` = the card's `data-card` id on *every* `.card`
    before each capture, which force-pairs the card across columns. domotion's
    capture reads `data-magic-key` into the tree (`el.magicKey`); the bridge
    builder (`buildMagicMove`) pairs a key present in BOTH the prev and next tree.
  - **Key the FIRST frame too.** The bridge for transition *i→i+1* is built from
    frame *i*'s tree and frame *i+1*'s tree, so frame 0 (the initial `input`
    frame) needs its own `evaluate` to set keys before its capture — otherwise the
    first magic-move has no keyed prev, `buildMagicMove` returns `null`, and the
    transition silently falls back to a crossfade with an empty-looking midpoint.
    (kerf's morph wipes the injected `data-magic-key` on each re-render, so the
    `evaluate` runs *after* the drag in every frame to re-assert it.)
  - **Key in-place elements whose text changes, too — or they cross-fade.** The
    per-column count badge (`.count`) stays put but its number changes when a card
    moves. Unkeyed, the diff treats the old/new number as remove+add, and the
    bridge fades one out while fading the other in — two overlapping digits, an
    odd "the count swaps" effect that doesn't happen in a real board. Giving the
    count a stable `data-magic-key` (`count-<col>`) force-pairs it; since it
    didn't move, it renders static at the *next* value for the whole window — a
    clean instant update with no cross-fade. (General rule: any element that
    persists in place but changes content across a magic-move should be keyed.)
- **Continuous canvas animation must be re-created as vector.** The dashboard
  sparkline is a `<canvas>`, which domotion captures as a *static raster* per
  frame (so it can't animate). For the capture it's hidden and replaced with an
  injected SVG sine `<path>` inside a clipped `<div>`; an intra-frame `translateX`
  on that div scrolls it. The path is drawn long enough to cover the whole run,
  and each frame's `translateX` *continues* where the previous frame left off
  (frame *i*: `-off[i]` → `-off[i+1]`) with `delta/duration` held constant, so the
  scroll is one smooth, constant glide across all the hard cuts — no per-frame
  reset and no wrap seam. `dashboard.json` (computed scroll offsets) and
  `markdown-editor.json` (one frame per typed chunk) are generated by
  `gen-dashboard.mjs` / `gen-markdown-editor.mjs` in this directory — tweak the
  knobs there and re-run (`node site/scripts/demo-captures/gen-dashboard.mjs`)
  rather than hand-editing the JSON. The committed JSON stays the source of truth
  for capture.
- **For "constantly changing" live data, sample often.** Each frame is a single
  DOM snapshot, so a live feed (the dashboard's ticker) only updates as often as
  you capture. Use many short frames with a real `wait` between captures so the
  app's own timer advances the data between snapshots (tick #, prices, "% up" all
  move every frame). More frames = a bigger SVG, so trim what you can (the
  dashboard table is cut to 8 rows) and stop at "reads as live."
