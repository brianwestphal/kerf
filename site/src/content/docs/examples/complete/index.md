---
title: Complete apps
description: Five small but real apps, each exercising the patterns kerf is built around.
---

Five complete apps. Each one lives under [`site/src/examples/complete/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete) as a runnable Vite project (drop into a fresh project with `kerfjs` installed and they run).

| App | Demonstrates |
| --- | --- |
| [TodoMVC](/kerf/examples/complete/todomvc/) | `defineStore` · `each` · `delegate` · `delegateCapture` · `localStorage` round-trip via `effect` |
| [Live Markdown editor](/kerf/examples/complete/markdown-editor/) | `computed` (memoised render) · `raw()` + DOMPurify · `data-morph-skip` for the editor pane |
| [Mini Kanban](/kerf/examples/complete/kanban/) | Keyed `each` across multiple parents · `delegateCapture` for `pointerdown` · `data-morph-skip` on the dragging card |
| [Realtime dashboard](/kerf/examples/complete/dashboard/) | `each` perf at scale (500 rows) · `batch` · `data-morph-skip` for a chart canvas · `effect` for WS lifecycle |
| [Built by an AI](/kerf/examples/complete/built-by-an-ai/) | The exact prompt + the produced code + the running app — concrete proof of the AI-first pillar |
