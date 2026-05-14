---
title: 'One-shot: Markdown editor (live preview with caret survival)'
description: 'A one-shot transcript: prompt-only re-derivation of the markdown editor. raw() + sanitization + caret survival across re-renders.'
---

**[▶ Run the human-written reference](/kerf/run/markdown-editor/)** · [View reference source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/markdown-editor)

This page is one of [five one-shot transcripts](/kerf/ai-evidence/one-shots/) re-deriving the [complete example apps](/kerf/examples/) from prompt-only. The model is given the prompt below and nothing else; it fetches the cited URLs to learn kerf. What it produces is reproduced verbatim further down.

The reference implementation is in `site/src/examples/complete/markdown-editor/main.tsx` — 64 lines (the smallest of the five). The markdown editor's role is to exercise two things at once: the `raw()` + sanitization contract for trusted HTML injection, and the focus-survival contract for inputs the user is actively typing into.

## The prompt

````
You're writing a UI in kerf (https://github.com/brianwestphal/kerf), a ~6.5 KB
reactive framework: signals + DOM diff + JSX → HTML strings. Read
https://raw.githubusercontent.com/brianwestphal/kerf/main/llms.txt and
https://raw.githubusercontent.com/brianwestphal/kerf/main/docs/ai/usage-guide.md
once before writing any code.

Build a split-pane markdown editor:
- Left pane: a textarea where the user types markdown.
- Right pane: live-rendered HTML preview of the markdown.
- Use `marked` for parsing (https://www.npmjs.com/package/marked) and
  `DOMPurify` for sanitization (https://www.npmjs.com/package/dompurify).
- The preview must update on every keystroke without disturbing the textarea's
  caret position. Typing in the middle of a long document must not jump the
  caret.
- Apply hard rules: signal reads inside the render fn; raw() to inject the
  sanitized HTML (the JSX runtime escapes by default); the textarea must NOT
  be re-rendered on every keystroke — only the preview side.

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
// site/src/ai-evidence/one-shots/markdown-editor/main.tsx
// The model's raw output goes here.
```

## Headline tests

1. **Caret survival under typing.** Type "the quick brown" in the middle of an existing 5-paragraph document. The caret must stay between "quick" and "brown" as the preview re-renders for each keystroke.
2. **Sanitization in place.** Paste `<script>alert(1)</script>` into the textarea. The preview must render the literal text without executing the script. (DOMPurify defaults handle this; the test is whether the model wired DOMPurify in correctly.)
3. **No textarea re-render on preview update.** Inspect the textarea node identity (via DevTools or a MutationObserver probe). The same `<textarea>` DOM element must persist across many preview re-renders — the model must use `data-morph-skip` on the textarea or otherwise structure the markup so the preview re-render doesn't touch the input side.

## What the model got right

*TBD at capture time.*

## What the model got wrong (if anything)

*TBD at capture time. Common AI mistakes on markdown editor: forgetting `raw()` (preview shows escaped HTML as text), skipping DOMPurify (XSS), putting the textarea in the same re-rendering subtree as the preview (caret jumps).*

## The running app

*TBD — stand up the produced code at `/kerf/run/one-shots/markdown-editor/` and link here.*
