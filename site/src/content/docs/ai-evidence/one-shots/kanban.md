---
title: 'One-shot: Mini Kanban (drag across columns)'
description: 'A one-shot transcript: prompt-only re-derivation of the mini-kanban app. Pointer events, delegate(), data-morph-skip on the dragging card.'
---

**[▶ Run the human-written reference](/kerf/run/kanban/)** · [View reference source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/kanban)

This page is one of [five one-shot transcripts](/kerf/ai-evidence/one-shots/) re-deriving the [complete example apps](/kerf/examples/) from prompt-only. The model is given the prompt below and nothing else; it fetches the cited URLs to learn kerf. What it produces is reproduced verbatim further down.

The reference implementation is the human-written kanban in `site/src/examples/complete/kanban/main.tsx` — 174 lines. The one-shot's job is to produce something with the same headline interaction: three columns, drag a card across columns, the drag has visual feedback, the drop lands the card.

## The prompt

````
You're writing a UI in kerf (https://github.com/brianwestphal/kerf), a ~6.5 KB
reactive framework: signals + DOM diff + JSX → HTML strings. Read
https://raw.githubusercontent.com/brianwestphal/kerf/main/llms.txt and
https://raw.githubusercontent.com/brianwestphal/kerf/main/docs/ai/usage-guide.md
once before writing any code.

Build a mini Kanban board:
- Three columns: "To do", "Doing", "Done".
- ~10 cards distributed across the columns, each card with one line of text.
- Drag a card across columns by pressing and moving the pointer. Drop lands it
  in the column under the pointer at release time.
- The dragging card has visible feedback (opacity, lift, or transform — your
  choice) and the target column shows a drop indicator.
- Apply hard rules: data-action attributes (not inline onClick); delegate()
  for clicks and pointer events; data-morph-skip on the dragging card so its
  transform/opacity isn't reverted mid-drag; signal reads inside the render fn.

Single file. Whatever line count it takes. Tailwind not allowed — emit a
CSS-friendly class structure and assume an external stylesheet handles the
look.
````

## Provenance

- **kerf version:** *TBD — pin at capture time from `package.json`*
- **Model:** *TBD — Claude Opus 4.7 (1M context) is the v1 target*
- **`llms.txt` revision:** *TBD — pin at capture time via `git rev-parse HEAD -- llms.txt`*
- **Run date:** *TBD*
- **Knowledge of kerf:** none beforehand. The prompt referenced `llms.txt` and the AI usage guide as the *only* source.
- **Edits to the produced code:** *TBD — document any cleanup edits verbatim, with a diff against the raw output. The rule is honesty.*

## The produced code

*TBD — paste the model's raw output here, then standup the running app at the bottom of the page.*

```tsx
// site/src/ai-evidence/one-shots/kanban/main.tsx
// The model's raw output goes here.
```

## What the model got right

*TBD at capture time — name the specific kerf idioms the model used correctly: data-action delegation, data-key on rows, data-morph-skip during drag, etc.*

## What the model got wrong (if anything)

*TBD at capture time — be honest. If the code didn't compile, say so and show the fix. If it compiled but the drag was glitchy, say so. If it nailed it on the first try, say that too.*

## The running app

*TBD — stand up the produced code at `/kerf/run/one-shots/kanban/` and link here.*
