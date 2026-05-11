---
title: Coming from vanjs
description: A side-by-side translation of a 150-line vanjs todo list to Kerf. Bundle delta, hyperscript → JSX, list reconciliation, and the gotchas a vanjs dev hits first.
---

:::note[Work in progress]
This page's full content (the side-by-side vanjs → kerf translation, the gotchas section, and the per-op perf table) is being built under KF-159 (KF-132's per-framework follow-up). The skeleton below shows the page shape so the [migration index](/kerf/migrating/) link resolves.

In the meantime: the [TodoMVC example](/kerf/examples/complete/todomvc/) shows the same app in kerf, and the [API reference](/kerf/api/) lists every primitive a vanjs translation will use.
:::

## What this page will cover

1. **Bundle delta** — vanjs (~1.6 KB) → kerf (~6.6 KB). Kerf is bigger; the trade is JSX, focus survival, keyed-list reconciliation, and `morph()`.
2. **Mental-model translations** — `van.state` → `signal`, `van.derive` → `computed` / `effect`, `van.tags.div(...)` → JSX, vanX `reactive` arrays → `arraySignal`, direct DOM appends → `mount()` + `each()`.
3. **Side-by-side code** — the same todo list, vanjs on the left, kerf on the right, section by section.
4. **Gotchas** — kerf renders JSX to HTML strings then morphs, where vanjs returns live DOM nodes from the factory call. The mental switch is "what does my render function return" — DOM in vanjs, `SafeHtml` in kerf. Event handling differs: vanjs sets per-node handlers; kerf uses `delegate()` once on the root.
5. **Perf numbers** — krausest deltas. Both frameworks land in the same cluster on the lookup-heavy ops; kerf wins on `swap rows` and `remove row` because of the LIS-based move pass.
