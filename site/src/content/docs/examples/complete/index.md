---
title: Complete apps
description: Five small but real apps, each exercising the patterns kerf is built around.
---

Five complete apps. Each one lives under [`site/src/examples/complete/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete) as a runnable Vite project (drop into a fresh project with `kerfjs` installed and they run).

| App | Demonstrates |
| --- | --- |
| [TodoMVC](/kerf/examples/complete/todomvc/) | `defineStore` · `each` · `delegate` · `delegateCapture` · `localStorage` round-trip via `effect` |
| [Live Markdown editor](/kerf/examples/complete/markdown-editor/) | `computed` (memoized render) · `raw()` + DOMPurify · `data-morph-skip` for the editor pane |
| [Mini Kanban](/kerf/examples/complete/kanban/) | Keyed `each` across multiple parents · `delegateCapture` for `pointerdown` · `data-morph-skip` on the dragging card |
| [Chat UI](/kerf/examples/complete/chat/) | Streaming via one signal write per chunk · `each` memo key per chunk · `data-morph-skip` on the composer textarea · Tier 1 `delegate()` everywhere |
| [Realtime dashboard](/kerf/examples/complete/dashboard/) | `each` perf at scale (500 rows) · `batch` · `data-morph-skip` for a chart canvas · `effect` for WS lifecycle |

## Previews

Each thumbnail is an animated capture of the real app running — click through to the live demo. (Captured with [`domotion-svg`](https://github.com/brianwestphal/domotion); they animate inside the page and scale crisply.)

#### [TodoMVC](/kerf/examples/complete/todomvc/)

[![Animated preview: adding three todos and toggling one complete](/kerf/demos/todomvc.svg)](/kerf/run/todomvc/)

#### [Live Markdown editor](/kerf/examples/complete/markdown-editor/)

[![Animated preview: editing the Markdown source and the sanitized preview updating live](/kerf/demos/markdown-editor.svg)](/kerf/run/markdown-editor/)

#### [Mini Kanban](/kerf/examples/complete/kanban/)

[![Animated preview: dragging cards across columns, with the per-column counts updating](/kerf/demos/kanban.svg)](/kerf/run/kanban/)

#### [Chat UI](/kerf/examples/complete/chat/)

[![Animated preview: sending a prompt and watching the bot reply stream in token-by-token](/kerf/demos/chat.svg)](/kerf/run/chat/)

#### [Realtime dashboard](/kerf/examples/complete/dashboard/)

[![Animated preview: the live ticker table updating at 30 Hz with a sparkline in the header](/kerf/demos/dashboard.svg)](/kerf/run/dashboard/)
