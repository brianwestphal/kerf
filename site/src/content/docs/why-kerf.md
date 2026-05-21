---
title: Why Kerf
description: What kerf optimizes for, and the tradeoffs that come with it.
---

Four things kerf optimizes for. In order.

## 1. Smallest cut

**~11 KB minified + gzipped, signals included.** That's the whole runtime — reactivity, render, diff, list reconciler, JSX runtime, event helpers — minus your app code.

Fine-grained reactivity (signals from `@preact/signals-core`) means the render fn re-runs only when a value it actually read changed. No tree-walking to detect changes. No "hey, did anything change?" pass.

Then the diff: when the render fn does run, kerf compares the new HTML against the live DOM and applies the *minimum* set of DOM operations to make them match. A 1000-row table where one row changed runs ~1 cache miss and ~0 unrelated DOM ops — not 1000 reconciliation checks.

## 2. No virtual DOM, no compiler

JSX renders to **HTML strings** (wrapped in `SafeHtml` for type safety). There is no virtual element tree, no reconciliation tree, no fiber, no scheduler. The diff operates on real DOM nodes vs. a freshly-parsed HTML fragment.

This means:

- **DevTools shows the real DOM** because it *is* the DOM.
- **Server-side rendering is trivial** — `SafeHtml.toString()` returns the string. Hand it to Express, Hono, Rails, anything.
- **No build step beyond what you already have.** Vite, esbuild, tsup all handle the JSX import out of the box.

## 3. Focus, selection, listeners survive re-renders

Most UI bugs in handwritten reactive code come from the same root cause: re-rendering blew away the user's in-progress state. Cursor jumped. Selection cleared. Pointer-down handler vanished mid-drag.

kerf morphs. The diff identifies the same node across renders by `id` or `data-key`, preserves it, and updates only its differing attributes / children. For focused inputs and contenteditables it goes further: the user's typed value, cursor position, and multi-range selection are preserved verbatim across the morph.

The delegated event listeners you bind with `delegate()` and `delegateCapture()` live on the morph root, not on rendered nodes — so they survive every re-render automatically. No "did I forget to re-bind that handler?" bugs.

## 4. Plain TS, plain JSX, plain ESM

No custom file extensions. No DSL. No template language. No required compiler plugin. No virtual modules. Standard `tsconfig.json` with `"jsx": "react-jsx"` and `"jsxImportSource": "kerfjs"` — that's the whole setup.

If your toolchain can build a React app, it can build a kerf app, with **less** configuration, not more.

---

## What kerf is *not*

- **Not a component framework.** `<MyComponent props />` works as JSX sugar — the runtime calls `MyComponent(props)` and uses the returned JSX — but there's no hooks, no lifecycle, no per-instance state. Components are plain functions; state lives in module-scope signals or stores.
- **Not a router.** Use `wouter`, `nanoroute`, the URL bar, your server, whatever you like.
- **Not a state-management library** beyond `defineStore`. The bare store factory is enough for most use cases; if you need Redux DevTools, integrate it yourself.
- **Not an SSR framework.** `SafeHtml.toString()` works server-side, but there's no streaming, no hydration mismatch detection, no islands runtime baked in.

If you need any of those, see [when to reach for something else](/kerf/alternatives/).
