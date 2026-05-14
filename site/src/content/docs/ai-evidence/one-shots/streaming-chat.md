---
title: 'One-shot: Streaming chat (token-by-token bot reply, composer caret preserved)'
description: 'A one-shot transcript: prompt-only re-derivation of the streaming chat app. each() keyed reconcile during a stream + textarea caret survival.'
---

**[▶ Run the human-written reference](/kerf/run/chat/)** · [View reference source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/chat)

This page is one of [five one-shot transcripts](/kerf/ai-evidence/one-shots/) re-deriving the [complete example apps](/kerf/examples/) from prompt-only. The model is given the prompt below and nothing else; it fetches the cited URLs to learn kerf. What it produces is reproduced verbatim further down.

The reference implementation is in `site/src/examples/complete/chat/main.tsx` — 157 lines. The streaming chat is the most demanding of the five for the morph: every chunk of the bot's reply is a new write to the same signal, triggering a re-render of the keyed messages list — and the composer textarea must hold its caret position through every one of those re-renders.

## The prompt

````
You're writing a UI in kerf (https://github.com/brianwestphal/kerf), a ~6.5 KB
reactive framework: signals + DOM diff + JSX → HTML strings. Read
https://raw.githubusercontent.com/brianwestphal/kerf/main/llms.txt and
https://raw.githubusercontent.com/brianwestphal/kerf/main/docs/ai/usage-guide.md
once before writing any code.

Build a small streaming chat UI:
- A scrollable message list above a composer textarea + send button.
- The user types a message, presses Enter (or clicks Send), the message
  appears in the list as theirs, and a "bot" reply starts streaming in
  token-by-token (every ~30ms, ~30 tokens total — fake the streaming with
  setTimeout; no real backend needed).
- While the bot is streaming, the user must be able to type their next
  message in the composer without the caret jumping.
- Use each() with data-key on each message row. The bot's streaming reply
  is one row whose text grows over time, so the keyed reconcile must update
  that single row's text without rebuilding it.
- Apply hard rules: data-action on the send button; delegate() for Enter
  keydown on the textarea; signal reads inside the render fn; data-morph-skip
  on the composer textarea is acceptable but not required if you can keep its
  caret stable without it.

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
// site/src/ai-evidence/one-shots/streaming-chat/main.tsx
// The model's raw output goes here.
```

## Headline tests

1. **Composer caret survival during stream.** Send a message, then immediately start typing the next one while the bot streams. The textarea caret must not move as each stream chunk re-renders the message list.
2. **Single-row growth, not full-list rebuild.** Inspect the streaming bot message's DOM node identity through DevTools or a MutationObserver. The same `<div data-key="bot-N">` element must persist across the stream chunks; only its text content changes. Adjacent message rows must not be rebuilt.
3. **Scroll position.** While the stream fills the bottom bubble, the list must scroll-to-bottom (or stay at the user's scroll position if they've scrolled up). The choice is up to the model; the test is whether it picked one and applied it consistently.

## What the model got right

*TBD at capture time.*

## What the model got wrong (if anything)

*TBD at capture time. Common AI mistakes on streaming chat: missing `data-key` on message rows (every stream chunk rebuilds the entire list), reading `signal.value` outside the render fn (stream never updates the UI), putting `onClick={handler}` on the send button (JSX runtime throws — see [Rule 9 in the diagnostic-error audit](/kerf/ai-evidence/diagnostics/#rule-9--inline-onclick-function-valued-attribute--score-3)).*

## The running app

*TBD — stand up the produced code at `/kerf/run/one-shots/streaming-chat/` and link here.*
