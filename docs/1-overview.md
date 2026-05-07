# 1. Overview

## 1.1 What kerf is

A tiny reactive UI framework. Roughly 5 KB minified + gzipped including its two runtime dependencies (`@preact/signals-core`, `morphdom`). Four primitives:

- **Signals** — fine-grained reactive values. `signal()`, `computed()`, `effect()`, `batch()`.
- **Stores** — composable testable units of state. `defineStore()`, `resetAllStores()`.
- **Render** — `mount(rootEl, () => jsx)`. JSX renders to an HTML string; morphdom diffs it against the live DOM and applies the minimum mutations.
- **Event delegation** — `delegate()` (Tier 1, bubble) and `delegateCapture()` (Tier 2, capture) replace per-element listeners with one root-level listener per event type.

Plus a JSX runtime (`kerf/jsx-runtime`) and an SVG-aware `toElement()` for direct JSX-to-DOM conversion.

## 1.2 What kerf is NOT

- Not a component framework. There's no `<MyComponent />` notion. Components are plain functions returning JSX.
- Not a router. Not a build tool. Not an SSR framework (though `SafeHtml.toString()` works server-side if you want it).
- Not opinionated about styling. Bring your own CSS.
- Not magical. There's no compiler, no virtual DOM, no scheduler, no concurrent rendering, no hooks model, no lifecycle.

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

1. **WHEN do we re-render?** Answered by signals: an `effect()` re-runs whenever any signal it read during its last run changes. `mount()` wraps `effect()` so that re-renders happen automatically when the JSX you return depends on a signal that changes.

2. **HOW do we re-render?** Answered by morphdom: render JSX to an HTML string, parse it into a template, then diff the template against the live tree and apply the minimum mutations. Element identity is preserved wherever the diff matches by key (`id`, `data-key`) or position.

Everything else is detail.

## 1.5 The architecture in one diagram

```
   user code
   ─────────────────────────────────────────────
   const count = signal(0);

   mount(rootEl, () => (                        ← effect() wrapper
     <div>
       <button data-action="inc">+</button>     ← Tier 1 delegation target
       <span>{count.value}</span>               ← signal read tracked
     </div>
   ));

   delegate(rootEl, 'click', '[data-action="inc"]', () => {
     count.value += 1;                           ← signal write triggers re-run
   });
   ─────────────────────────────────────────────
                      │
                      │  count.value++
                      ▼
   ┌─────────────────────────────────────────┐
   │ effect() fires the render fn             │
   │   → SafeHtml string                      │
   │   → template.innerHTML                   │
   │   → morphdom.diff(live, template)        │
   │   → minimal DOM mutations applied        │
   └─────────────────────────────────────────┘
```

## 1.6 Reading order for the rest of the docs

- [§2 Reactivity](2-reactivity.md) — signals primitive.
- [§3 Stores](3-stores.md) — composable testable stores.
- [§4 Render](4-render.md) — mount and morphdom.
- [§5 Event delegation](5-event-delegation.md) — Tier 1 / Tier 2 / Tier 3.
- [§6 JSX runtime](6-jsx-runtime.md) — JSX → HTML strings, server-side use.
- [§7 SVG](7-svg.md) — namespace handling and the `toElement()` escape hatch.
- [§8 API reference](8-api-reference.md) — every export, every option.
