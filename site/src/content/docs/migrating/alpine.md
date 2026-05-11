---
title: Coming from Alpine
description: A side-by-side translation of a 150-line Alpine todo list to Kerf. Bundle delta, x-data → store, directives → JSX, and the gotchas an Alpine dev hits first.
---

:::note[Work in progress]
This page's full content (the side-by-side Alpine → kerf translation, the gotchas section, and the per-op perf table) is being built under KF-157 (KF-132's per-framework follow-up). The skeleton below shows the page shape so the [migration index](/kerf/migrating/) link resolves.

In the meantime: the [TodoMVC example](/kerf/examples/complete/todomvc/) shows the same app in kerf, and the [API reference](/kerf/api/) lists every primitive an Alpine translation will use.
:::

## What this page will cover

1. **Bundle delta** — Alpine 3 (~14 KB) → kerf (~6.6 KB).
2. **Mental-model translations** — `x-data` → `defineStore`, `x-text` / `x-html` → JSX expressions, `x-model` → input + `delegate('input', ...)`, `x-for` → `each()`, `x-show` / `x-if` → ternary, `Alpine.store` → `defineStore`.
3. **Side-by-side code** — the same todo list, Alpine on the left, kerf on the right, section by section.
4. **Gotchas** — kerf has no directive system; everything is JSX expressions. The DOM doesn't drive reactivity (no proxy-on-element trick); signals do. `x-init` lifecycle has no direct equivalent — use `effect()` or call setup at module load.
5. **Perf numbers** — Alpine isn't in krausest; this section shows the kerf side and explains why the comparison was omitted.
