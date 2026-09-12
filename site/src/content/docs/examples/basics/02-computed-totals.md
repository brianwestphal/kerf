---
title: 2 · Computed totals
description: signal + computed — three inputs derive three live totals.
---


`computed()` derives a value from other signals. It's lazy and memoized — recomputes only when its dependencies change, and only when a consumer reads it.

**What to look at:** three inputs (bill, tip %, party size), three derived values (tip, total, per-person). The `total` computed depends on the `tip` computed, which depends on `bill` and `tipPct` — that chain re-derives only what changed. Edit the bill: `tip`, `total`, and `perPerson` all update; edit just party size and `tip` is *not* recomputed.

<LiveExample />

<Code lang="tsx" code={source} title="src/main.tsx" />
