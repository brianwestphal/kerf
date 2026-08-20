---
title: Complete apps
description: Seven small but real apps, each exercising the patterns kerf is built around.
---

Eight runnable showcase apps, each with its own page and animated preview below. They live under [`site/src/examples/complete/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete) as real projects (drop into a fresh project with `kerfjs` installed and they run — seven are Vite projects; the live poll is served as authored source with no build at all). Two more complete apps in that directory — an htmx-style cart island and a Redux-style counter store — are demonstrated inside the [htmx](/kerf/migrating/htmx/) and [Redux](/kerf/migrating/redux/) migration guides instead.

| App | Demonstrates |
| --- | --- |
| [TodoMVC](/kerf/examples/complete/todomvc/) | `defineStore` · `each` · `delegate` · `delegateCapture` · `localStorage` round-trip via `effect` |
| [Live Markdown editor](/kerf/examples/complete/markdown-editor/) | `computed` (memoized render) · `raw()` + DOMPurify · `data-morph-skip` for the editor pane |
| [Mini Kanban](/kerf/examples/complete/kanban/) | Keyed `each` across multiple parents · `delegateCapture` for `pointerdown` · `data-morph-skip` on the dragging card |
| [Chat UI](/kerf/examples/complete/chat/) | Streaming via one signal write per chunk · `each` memo key per chunk · `data-morph-skip` on the composer textarea · Tier 1 `delegate()` everywhere |
| [Realtime dashboard](/kerf/examples/complete/dashboard/) | `each` perf at scale (500 rows) · `batch` · `data-morph-skip` for a chart canvas · `effect` for WS lifecycle |
| [Row selector](/kerf/examples/complete/row-selector/) | Fine-grained signal bindings — a bound `class` + bound detail pane update on select with no render re-run and no list reconcile |
| [Live poll (no build step)](/kerf/examples/complete/live-poll/) | The `html` tagged template + an importmap — a complete app served as authored source; fully-bound mount (the render runs once, forever) |
| [Virtual list](/kerf/examples/complete/virtual-list/) | The companion subpaths — `bindList` viewport virtualization (10,000 rows, ~a screenful in the DOM) · `debouncedSignal` search · `confirm()` + `toast()` |

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

#### [Row selector](/kerf/examples/complete/row-selector/)

[![Animated preview: clicking rows in a host list; the highlight and detail pane follow while the "list renders" counter stays at 1](/kerf/demos/row-selector.svg)](/kerf/run/row-selector/)

#### [Live poll (no build step)](/kerf/examples/complete/live-poll/)

[![Animated preview: voting in a poll; counts pop and bars slide while the "renders" counter stays at 1](/kerf/demos/live-poll.svg)](/kerf/run/live-poll/)

#### [Virtual list](/kerf/examples/complete/virtual-list/)

[![Animated preview: scrolling a 10,000-row list while the "in the DOM" count stays flat, filtering by name down to one row, then deleting it through a confirm dialog and a toast](/kerf/demos/virtual-list.svg)](/kerf/run/virtual-list/)
