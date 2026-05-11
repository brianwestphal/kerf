---
title: Coming from Lit
description: A side-by-side translation of a 150-line Lit todo list to Kerf. Bundle delta, LitElement → mount, reactive properties → signals, and the gotchas a Lit dev hits first.
---

:::note[Work in progress]
This page's full content (the side-by-side Lit → kerf translation, the gotchas section, and the per-op perf table) is being built under KF-158 (KF-132's per-framework follow-up). The skeleton below shows the page shape so the [migration index](/kerf/migrating/) link resolves.

In the meantime: the [TodoMVC example](/kerf/examples/complete/todomvc/) shows the same app in kerf, and the [API reference](/kerf/api/) lists every primitive a Lit translation will use.
:::

## What this page will cover

1. **Bundle delta** — lit-html + lit-element (~6 KB) → kerf (~6.6 KB). Roughly a wash on size; the trade is what the bytes buy you.
2. **Mental-model translations** — `LitElement` → `mount`, `@property` / `@state` → `signal`, `html\`...\`` tagged template → JSX, `repeat(items, key, render)` → `each(items, render, key)`, `@click=` → `delegate(root, 'click', ...)`, `:host` styling → drop into the consumer's stylesheet.
3. **Side-by-side code** — the same todo list, Lit on the left, kerf on the right, section by section.
4. **Gotchas** — no Shadow DOM, no slot composition, no element registration. CSS scoping is the consumer's problem. Reactive properties were per-instance; signals are module-scoped (or store-scoped) by default.
5. **Perf numbers** — krausest deltas (create 1k, swap rows, partial update, select row). Both frameworks land in the keyed cluster; the gaps and overlaps live here.
