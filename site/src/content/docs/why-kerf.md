---
title: Why Kerf
description: The five pillars — what kerf optimizes for, and why.
---

Five things kerf optimizes for. In order.

## 1. Built for the AI-assisted era

The way people write UI is changing. AI assistants generate the first draft. Pair-programmers, agents, and code-completion models do meaningful work *inside* your codebase. Frameworks designed in the early 2010s assume a single human developer with infinite patience for ceremony.

kerf inverts that. The whole public surface is **15 exports**. There is no compiler magic, no hidden lifecycle, no implicit context. An LLM can hold the entire framework in its context window and predict behavior from API names alone — which means your AI agent generates code that works the first time, and your AI reviewer can reason about whether the code is correct.

The user-side framing: *predictable, debuggable performance; fast; easy for humans to read & write; easy for AI to read, write, and reason about.*

We ship [`llms.txt`](https://github.com/brianwestphal/kerf/blob/main/llms.txt) and a dedicated [AI usage guide](/kerf/ai/) so any assistant can come up to speed in one document.

## 2. Smallest cut

**6.6 KB gzipped, signals included.** That's the whole runtime — reactivity, render, diff, list reconciler, JSX runtime, event helpers — minus your app code.

Fine-grained reactivity (signals from `@preact/signals-core`) means the render fn re-runs only when a value it actually read changed. No tree-walking to detect changes. No "hey, did anything change?" pass.

Then the diff: when the render fn does run, kerf compares the new HTML against the live DOM and applies the *minimum* set of DOM operations to make them match. A 1000-row table where one row changed runs ~1 cache miss and ~0 unrelated DOM ops — not 1000 reconciliation checks.

## 3. No virtual DOM, no compiler

JSX renders to **HTML strings** (wrapped in `SafeHtml` for type safety). There is no virtual element tree, no reconciliation tree, no fiber, no scheduler. The diff operates on real DOM nodes vs. a freshly-parsed HTML fragment.

This means:

- **DevTools shows the real DOM** because it *is* the DOM.
- **Server-side rendering is trivial** — `SafeHtml.toString()` returns the string. Hand it to Express, Hono, Rails, anything.
- **No build step beyond what you already have.** Vite, esbuild, tsup all handle the JSX import out of the box.

## 4. Focus, selection, listeners survive re-renders

Most UI bugs in handwritten reactive code come from the same root cause: re-rendering blew away the user's in-progress state. Cursor jumped. Selection cleared. Pointer-down handler vanished mid-drag.

kerf morphs. The diff identifies the same node across renders by `id` or `data-key`, preserves it, and updates only its differing attributes / children. For focused inputs and contenteditables it goes further: the user's typed value, cursor position, and multi-range selection are preserved verbatim across the morph.

The delegated event listeners you bind with `delegate()` and `delegateCapture()` live on the morph root, not on rendered nodes — so they survive every re-render automatically. No "did I forget to re-bind that handler?" bugs.

## 5. Plain TS, plain JSX, plain ESM

No custom file extensions. No DSL. No template language. No required compiler plugin. No virtual modules. Standard `tsconfig.json` with `"jsx": "react-jsx"` and `"jsxImportSource": "kerfjs"` — that's the whole setup.

If your toolchain can build a React app, it can build a kerf app, with **less** configuration, not more.

---

## What kerf is *not*

- **Not a component framework.** There's no `<MyComponent />` notion with hooks or lifecycle. Components are plain functions returning JSX.
- **Not a router.** Use `wouter`, `nanoroute`, the URL bar, your server, whatever you like.
- **Not a state-management library** beyond `defineStore`. The bare store factory is enough for most use cases; if you need Redux DevTools, integrate it yourself.
- **Not an SSR framework.** `SafeHtml.toString()` works server-side, but there's no streaming, no hydration mismatch detection, no islands runtime baked in.

If you need any of those, see [when to reach for something else](/kerf/alternatives/).
