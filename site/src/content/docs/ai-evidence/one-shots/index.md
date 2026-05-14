---
title: 'AI evidence: one-shot transcript portfolio'
description: 'Five reproducible one-shot transcripts re-deriving the complete/ example apps from prompt-only. The model sees only the URLs cited in the prompt; the produced code is what runs on the page.'
---

This page is the **operational** layer of kerf's AI evidence: a portfolio of one-shot transcripts that re-derive the [complete example apps](/kerf/examples/) from a one-paragraph prompt and nothing else. The model is pointed at [`llms.txt`](https://github.com/brianwestphal/kerf/blob/main/llms.txt) and the AI usage guide — no kerf code in its context window beforehand. The transcripts are the experiment; the running apps at the bottom of each page are that exact code.

The precedent is [Built by an AI · Pomodoro](/kerf/examples/complete/built-by-an-ai/) — the original proof that the docs kerf ships are sufficient for an off-the-shelf model to produce a working app. This portfolio extends that to five more shapes covering the harder cases: drag-and-drop interaction, focus survival across re-renders, streaming list updates, caret preservation during contenteditable diff, and a multi-region store-backed UI.

## The transcripts

- **[Kanban](/kerf/ai-evidence/one-shots/kanban/)** — three columns, ten cards, drag across columns. Exercises pointer events + `delegate()` + `data-morph-skip` on the dragging card.
- **[TodoMVC](/kerf/ai-evidence/one-shots/todomvc/)** — the canonical reactive-UI test bed. Exercises `defineStore` + `each` + filter/clear actions + focus survival on insert/delete.
- **[Dashboard](/kerf/ai-evidence/one-shots/dashboard/)** — a live-updating ticker grid with one tick per second. Exercises `signal` + `computed` + `effect` + `batch` against a deterministic update loop.
- **[Markdown editor](/kerf/ai-evidence/one-shots/markdown-editor/)** — split-pane editor with live preview. Exercises `raw()` + sanitization + caret survival in a `contenteditable`-adjacent re-render.
- **[Streaming chat](/kerf/ai-evidence/one-shots/streaming-chat/)** — token-by-token bot reply with composer caret preservation. Exercises `each()` keyed-list reconcile during a stream + the textarea caret-survival contract.

## Honest accounting

Each page follows the same rule the Pomodoro precedent set: **show what the model produced, as it produced it.** When the produced code has bugs or needs cleanup, the diff is documented verbatim. The page does not pretend the model is infallible — it documents what an off-the-shelf model with kerf's published docs can do, and what it can't.

## How a transcript is produced

The reproducibility recipe is identical for every page:

1. **Pin the kerf version.** Recorded in the page frontmatter so future readers know which `llms.txt` revision the model saw.
2. **Pin the model.** Currently [Claude Opus 4.7](https://www.anthropic.com/news/claude-opus-4-7) with the 1M-context variant where it matters. Future runs against new models append rather than replace, so the portfolio doubles as a regression suite when a model gets better or worse at kerf.
3. **Pin the prompt.** A single paragraph that names the app, the interaction, and the doc URLs the model should fetch. No kerf-specific identifiers in the prompt itself — the prompt could be given to any reactive framework's docs.
4. **Run the prompt in a clean session.** No prior kerf context in the model's conversation. The model has only what it learned at pretraining time plus whatever the cited URLs fetch.
5. **Capture the raw output verbatim.** If the model produced something that doesn't compile or doesn't run, the page documents that and shows the minimum diff that made it run.
6. **Stand the running app up at the bottom of the page** from the produced code.

## Status

| App | Prompt drafted | Transcript captured | Page published |
| --- | :-: | :-: | :-: |
| Kanban | ✅ | ✅ (2026-05-15) | transcript published, build-and-run verification pending |
| TodoMVC | ✅ | ⏳ | scaffold |
| Dashboard | ✅ | ⏳ | scaffold |
| Markdown editor | ✅ | ⏳ | scaffold |
| Streaming chat | ✅ | ⏳ | scaffold |

The five prompts are drafted in their respective pages; the transcript capture is the remaining work — each one is its own sub-ticket of the AI-evidence epic.

## Caveats

- **Model behavior drifts.** Each transcript records its model + run date so the reader can interpret. When a new frontier model lands, the experiment gets re-run; older runs are kept in a history section per page rather than overwritten.
- **The prompts are not blind.** They name the app shape and the doc URLs. They do not name the framework as "kerf" beyond the URL — but a clever model could infer from the URLs themselves. The blind-prompt question is the harder operational measurement, tracked separately under the empirical-benchmark sub-ticket (the krausest-style cross-framework grid).
- **One run per cell ≠ statistical significance.** A single one-shot is an existence proof, not a sampling distribution. The portfolio shows the model *can* do this; the empirical benchmark establishes *how often* it does.
