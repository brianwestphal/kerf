---
title: Coming from React
description: A side-by-side translation of a 150-line React todo list to Kerf. Bundle delta, hooks → signals, and the gotchas a React dev hits first.
---

:::note[Work in progress]
This page's full content (the side-by-side React → kerf translation, the gotchas section, and the per-op perf table) is being built under KF-156 (KF-132's per-framework follow-up). The skeleton below shows the page shape so the [migration index](/kerf/migrating/) link resolves.

In the meantime: the [TodoMVC example](/kerf/examples/complete/todomvc/) shows the same app in kerf, and the [API reference](/kerf/api/) lists every primitive a React translation will use.
:::

## What this page will cover

1. **Bundle delta** — react + react-dom (~45 KB) → kerf (~6.6 KB).
2. **Mental-model translations** — `useState` → `signal`, `useEffect` → `effect`, `useMemo` → `computed`, Context → `defineStore`, `key` prop → `each(... , key)`.
3. **Side-by-side code** — the same todo list, React on the left, kerf on the right, section by section.
4. **Gotchas** — `<Component />` semantics don't exist in kerf; closure capture rules are different; refs are usually unnecessary because focus survives morph; no Strict Mode double-invocation.
5. **Perf numbers** — krausest deltas (create 1k, swap rows, partial update, select row).
