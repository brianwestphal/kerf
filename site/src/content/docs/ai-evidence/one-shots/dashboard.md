---
title: 'One-shot: Dashboard (live-updating ticker grid)'
description: 'A one-shot transcript: prompt-only re-derivation of the dashboard ticker grid. signal + computed + effect + batch against a deterministic tick.'
---

**[▶ Run the human-written reference](/kerf/run/dashboard/)** · [View reference source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/dashboard)

This page is one of [five one-shot transcripts](/kerf/ai-evidence/one-shots/) re-deriving the [complete example apps](/kerf/examples/) from prompt-only. The model is given the prompt below and nothing else; it fetches the cited URLs to learn kerf. What it produces is reproduced verbatim further down.

The reference implementation is in `site/src/examples/complete/dashboard/main.tsx` — 118 lines. The dashboard's role in the portfolio is to exercise the "many small reads, one batched write per tick" path — the shape kerf wins on against frameworks that re-render per-write.

## The prompt

````
You're writing a UI in kerf (https://github.com/brianwestphal/kerf), a ~6.5 KB
reactive framework: signals + DOM diff + JSX → HTML strings. Read
https://raw.githubusercontent.com/brianwestphal/kerf/main/llms.txt and
https://raw.githubusercontent.com/brianwestphal/kerf/main/docs/ai/usage-guide.md
once before writing any code.

Build a live-updating ticker dashboard:
- A grid of ~12 ticker tiles, each showing: symbol, current price, % change
  vs the previous tick, volume.
- A "Tick now" button that advances every ticker by a small deterministic
  delta (price ±2%, volume up by a random amount).
- Auto-tick toggle: when on, ticks fire once per second.
- A summary row at the top: total volume across all tickers, count of tickers
  that ticked up vs down on the most recent tick. These derive from the
  ticker signals.
- Apply hard rules: signal reads inside the render fn; computed() for the
  derived summary values; batch() inside the tick action so all per-ticker
  writes coalesce into one re-render; data-action attributes for buttons.

Single file. Tailwind not allowed — emit a CSS-friendly class structure and
assume an external stylesheet handles the look.
````

## Provenance

- **kerf version:** *TBD — pin at capture time from `package.json`*
- **Model:** *TBD — Claude Opus 4.7 (1M context) is the v1 target*
- **`llms.txt` revision:** *TBD — pin at capture time*
- **Run date:** *TBD*
- **Knowledge of kerf:** none beforehand.
- **Edits to the produced code:** *TBD — document any cleanup edits verbatim.*

## The produced code

*TBD — paste the model's raw output here.*

```tsx
// site/src/ai-evidence/one-shots/dashboard/main.tsx
// The model's raw output goes here.
```

## Headline tests

1. **batch()-correctness.** Press "Tick now" once. The 12 tile re-renders + the summary row's two computeds must produce exactly one observable render pass — not 12 + 2. (A mutation-count Playwright probe verifies this in the empirical benchmark.)
2. **Computed-on-signal correctness.** The summary "tickers up vs down" count must reflect the most recent tick, not the previous one. Watch the up/down counts shift as you tick.
3. **Auto-tick cleanup.** Toggle auto-tick on, then off. The internal `setInterval` must be cleared. Toggle on again — only one interval, not two.

## What the model got right

*TBD at capture time.*

## What the model got wrong (if anything)

*TBD at capture time. Common AI mistakes on dashboard: forgetting `batch()` and triggering per-ticker re-renders, leaking the `setInterval` on auto-tick toggle, putting derived summary in a signal instead of a computed.*

## The running app

*TBD — stand up the produced code at `/kerf/run/one-shots/dashboard/` and link here.*
