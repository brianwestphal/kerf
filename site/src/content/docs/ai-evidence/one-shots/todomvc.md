---
title: 'One-shot: TodoMVC (the canonical reactive-UI test bed)'
description: 'A one-shot transcript: prompt-only re-derivation of TodoMVC. defineStore, each(), filter/clear, focus survival.'
---

**[▶ Run the human-written reference](/kerf/run/todomvc/)** · [View reference source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/todomvc)

This page is one of [five one-shot transcripts](/kerf/ai-evidence/one-shots/) re-deriving the [complete example apps](/kerf/examples/) from prompt-only. The model is given the prompt below and nothing else; it fetches the cited URLs to learn kerf. What it produces is reproduced verbatim further down.

The reference implementation is in `site/src/examples/complete/todomvc/main.tsx` — 158 lines. TodoMVC is the canonical reactive-UI test bed precisely because it covers the failure modes that trip frameworks up: focus survival on insert/delete at the head of a list, filter-then-clear correctness, double-click-to-edit caret position.

## The prompt

````
You're writing a UI in kerf (https://github.com/brianwestphal/kerf), a ~6.5 KB
reactive framework: signals + DOM diff + JSX → HTML strings. Read
https://raw.githubusercontent.com/brianwestphal/kerf/main/llms.txt and
https://raw.githubusercontent.com/brianwestphal/kerf/main/docs/ai/usage-guide.md
once before writing any code.

Build the canonical TodoMVC:
- Add a todo by typing in the header input and pressing Enter.
- Toggle done with a checkbox per row.
- Double-click a row to edit; Enter or blur saves; Esc cancels.
- Filter footer: All / Active / Completed.
- "Clear completed" button removes all done todos.
- Persist to localStorage so a refresh keeps the list.
- Apply hard rules: data-action attributes; delegate() everywhere (no inline
  onClick); data-key={id} on each todo row; signal reads inside the render fn;
  defineStore for the todos collection.

Single file. Tailwind not allowed — emit a CSS-friendly class structure and
assume an external stylesheet handles the look.
````

## Provenance

- **kerf version:** *TBD — pin at capture time from `package.json`*
- **Model:** *TBD — Claude Opus 4.7 (1M context) is the v1 target*
- **`llms.txt` revision:** *TBD — pin at capture time*
- **Run date:** *TBD*
- **Knowledge of kerf:** none beforehand.
- **Edits to the produced code:** *TBD — document any cleanup edits verbatim, with a diff against the raw output.*

## The produced code

*TBD — paste the model's raw output here.*

```tsx
// site/src/ai-evidence/one-shots/todomvc/main.tsx
// The model's raw output goes here.
```

## Headline tests

Three behaviors a TodoMVC must get right; the one-shot's value depends on whether the model satisfies all three:

1. **Focus survival on insert-at-head.** While typing in the input, add a new todo programmatically (or via a delegated event from elsewhere). The textarea's caret must not move.
2. **Filter-then-clear-completed.** Set the filter to Active, then click Clear Completed. The visible list must update; the underlying done todos must be removed even though they weren't in the visible filter.
3. **Edit-on-double-click caret position.** Double-click a row to edit. The caret must land where the double-click happened, not at the start or end of the text.

## What the model got right

*TBD at capture time.*

## What the model got wrong (if anything)

*TBD at capture time. Common AI mistakes on TodoMVC: missing `data-key`, using inline `onClick`, reading signal value outside render fn for the filter, forgetting to handle Esc-to-cancel.*

## The running app

*TBD — stand up the produced code at `/kerf/run/one-shots/todomvc/` and link here.*
