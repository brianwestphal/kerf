# 1. Overview

## 1.1 What kerf is

A tiny reactive UI framework. Roughly 11 KB minified + gzipped including its sole runtime dependency (`@preact/signals-core`); ~12 KB if you also import `arraySignal` from the optional `kerfjs/array-signal` subpath. Four primitives:

- **Signals** — fine-grained reactive values. `signal()`, `computed()`, `effect()`, `batch()`.
- **Stores** — composable testable units of state. `defineStore()`, `resetAllStores()`.
- **Render** — `mount(rootEl, () => jsx)`. JSX renders to a structured `SafeHtml`; kerf's segment-aware diff reconciles static surrounds while a keyed list reconciler owns rows from `each(...)`. The split keeps partial-update / select-row / swap-rows costs at O(changes), not O(rows).
- **Event delegation** — `delegate()` (Tier 1, bubble + auto-capture for the known non-bubblers like focus/blur/scroll) and `delegateCapture()` (Tier 2, explicit capture) replace per-element listeners with one root-level listener per event type.

Plus a JSX runtime (`kerfjs/jsx-runtime`), the `html` tagged template (`kerfjs/html` — identical runtime semantics with no JSX transform, so a CDN / importmap project needs no build step at all), and an SVG-aware `toElement()` for direct JSX-to-DOM conversion.

## 1.2 What kerf is NOT

- Not a component framework. `<MyComponent props />` works as JSX sugar — the runtime calls `MyComponent(props)` and uses the returned JSX — but there's no per-instance state, no hooks, and no lifecycle. Components are plain functions; state lives in module-scope signals or stores.
- Not a router. Not a build tool. Not an SSR framework (though `SafeHtml.toString()` works server-side if you want it).
- Not opinionated about styling. Bring your own CSS.
- Not magical. There's no compiler, no virtual DOM, no scheduler, no concurrent rendering, no hooks model, no lifecycle. The "no compiler" rule is non-negotiable — kerf will not ship an opt-in codegen package either. If you want compile-time fine-grained reactivity, pick Solid; that's Solid's value proposition, and Solid does it better than a kerf-compiler ever could. Kerf's positioning is "the fastest framework that needs no build step beyond your existing one," which means accepting Solid's architectural-floor numbers on update-path benchmarks (~6ms select-row, ~20ms partial-update) as the ceiling. The goal is to close the runtime-vs-compiled gap on every benchmark kerf can close without a compiler — not to match Solid on the ones that require one.

## 1.3 When to reach for kerf

kerf is a good fit when:

- You want fine-grained reactivity without buying into a framework's full mental model.
- Your app is server-rendered HTML + interactive islands, and you want a tiny client-side enhancement layer.
- You care about preserving live DOM identity across re-renders (focus, selection, in-flight pointer interactions, third-party widget instances).
- Your users include people who run with assistive tech, where DOM identity preservation matters more than it does in benchmark loops.

It's a poor fit when:

- You need a full ecosystem of components, routers, devtools, SSR primitives. Use React / Vue / Solid.
- Your team is heavily invested in a framework's conventions. The cost of switching outweighs the runtime size win.
- You want compile-time JSX transforms that produce optimal DOM ops directly. Use Solid.

## 1.4 Mental model

The runtime answers two questions:

1. **WHEN do we update?** Answered by signals — and by the single most important idiom choice in kerf: **values bind, structure re-renders.** Pass a signal *itself* into a JSX hole (`{count}`, `class={sig}`) and kerf binds that one hole — a change writes straight to that text node or attribute with **no render re-run at all**. Read `.value` inside the render function (`cond ? <a/> : <b/>`) and the read is tracked by `mount()`'s wrapped `effect()`, so a change re-runs the render — the tool for *structural* changes, where what exists depends on the signal.

2. **HOW do we re-render (when structure changes)?** Answered by kerf's morph: render JSX to a `SafeHtml` (which is a string for static content and a structured tree where lists or list-containing parents appear), then walk the live DOM in lock-step. Static surrounds go through a general-purpose tree-morph (`src/morph.ts`, also exported as `morph()` for one-shot consumer use); list contents go through a keyed reconciler (`each(...)`'s side of `mount`) that operates directly on live children — no parse-the-whole-list step. Element identity is preserved wherever the morph matches by key (`id`, `data-key`) or position.

Everything else is detail.

## 1.5 The architecture in one diagram

[![Animated architecture diagram: a signal write flows down two paths — a bound value hole updates one node directly with no re-render, while a .value read in the render re-fires the effect through SafeHtml, morph(), and the each() reconciler down to minimal DOM mutations](https://brianwestphal.github.io/kerf/demos/architecture.svg)](https://brianwestphal.github.io/kerf/)

In prose: a `count.value += 1` write reaches the DOM down one of two paths. A **bound value hole** (`{count}`, `class={sig}` — the signal itself in the hole, not `.value`) has one binding effect that writes the text node or attribute directly: no render re-run, no morph, no reconcile. A **`.value` read inside the render function** (structural — conditionals, list shape) re-fires the `effect()` wrapper: the render produces a `SafeHtml` segment tree, `morph()` reconciles the static surrounds in place, the `each()` keyed reconciler patches list rows, and the minimum set of DOM mutations lands — element identity and focus preserved.

## 1.6 Reading order for the rest of the docs

- [§2 Reactivity](2-reactivity.md) — signals primitive.
- [§3 Stores](3-stores.md) — composable testable stores.
- [§4 Render](4-render.md) — mount, segments, the native diff, and the list reconciler.
- [§5 Event delegation](5-event-delegation.md) — Tier 1 / Tier 2 / Tier 3.
- [§6 JSX runtime](6-jsx-runtime.md) — JSX → HTML strings, server-side use.
- [§7 SVG](7-svg.md) — namespace handling and the `toElement()` escape hatch.
- [§8 API reference](8-api-reference.md) — every export, every option.
- [§9 Live demo](9-live-demo.md) — the GitHub Pages deploy of the reactivity demo.
- [§10 Migrating](10-migrating.md) — the coming-from-React/Vue/Lit/… comparison hub.
- [§11 Dev-mode warnings](11-dev-warnings.md) — the opt-in `KERF_DEV_WARN_*` family.
- [§12 AI-assistant configs](12-ai-assistant-configs.md) — the drop-in Claude Code skill + Cursor rules.
- [§13 Component packages](13-component-packages.md) — publishing reusable kerf components to npm.
- [§14 Feature coverage](14-feature-coverage.md) — the per-behavior test index.
- [§15 No-build example](15-no-build-example.md) — the served-as-source `live-poll` app (importmap + `html` tagged template).
