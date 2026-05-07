# Requirements summary — kerf

Synthesised view of every numbered doc in `docs/`, with status markers. Read this for a quick "what does kerf do" overview without opening every file.

Status markers:
- **Shipped** — implemented in `src/`, tested in `tests/`, documented in `docs/`.
- **Partial** — partially implemented; called out in the entry.
- **Design-only** — described in docs, not yet implemented.
- **Deferred** — explicitly out of scope for now.

## Dashboard

| Doc | Topic | Status |
| --- | --- | --- |
| §1 | Overview / philosophy | Shipped |
| §2 | Reactivity (`signal` / `computed` / `effect` / `batch`) | Shipped |
| §3 | Stores (`defineStore` / `resetAllStores`) | Shipped |
| §4 | Render (`mount` + morphdom) | Shipped |
| §5 | Event delegation (Tier 1 / 2 / 3) | Shipped |
| §6 | JSX runtime (`SafeHtml` / `raw` / `Fragment`) | Shipped |
| §7 | SVG (`toElement` SVG-aware) | Shipped |
| §8 | API reference | Shipped |
| §9 | Live demo (GitHub Pages deploy of `examples/reactivity-demo`) | Shipped |

Everything in the v0.1 design is shipped. No partial / design-only / deferred entries yet — those will accumulate as the project evolves.

## Per-doc summary

### §1 Overview

States kerf's positioning: tiny reactive UI framework, ~5 KB, no virtual DOM, no compiler, no component lifecycle. Four primitives (signals / stores / render / delegation) plus a JSX runtime and an SVG-aware `toElement`. Rules out: routing, full SSR, styling opinions, ecosystem.

### §2 Reactivity

Documents `signal()`, `computed()`, `effect()`, `batch()`. Notes that signals are NOT deep-reactive (mutating a value in-place doesn't notify). `Signal<T>` allows writes; `ReadonlySignal<T>` is what `computed()` returns. Closing rule: one consumer = signal, two+ = store.

### §3 Stores

`defineStore({ initial, actions })` produces a `{ state, actions, reset }`. Three rules: read-only state, actions-only mutation, always-reset. Module-level registry powers `resetAllStores()`. Multi-step actions use `batch()` for atomic notification. Derived state via `computed()` next to the store.

### §4 Render

`mount(rootEl, render)` wraps `effect()` + morphdom. Diff keys: `id` then `data-key`. `data-morph-skip` for library-owned subtrees. Focus + selection preservation for active text-entry inputs. Multiple `mount()` calls compose; each tracks its own signals. `SafeHtml.toString()` is server-safe.

### §5 Event delegation

Three-tier model:
- **Tier 1** (bubbling) → `delegate()`. Walk-up via `closest()`.
- **Tier 2** (non-bubbling: focus/blur/scroll/load/error) → `delegateCapture()`. `target.matches()` only.
- **Tier 3** (library-owned subtrees) → `data-morph-skip` + manual lifecycle.

### §6 JSX runtime

JSX renders to `SafeHtml` strings via `kerf/jsx-runtime`. Configured via `tsconfig` `"jsxImportSource": "kerf"`. Attribute aliases for HTML + SVG camelCase → kebab-case. Boolean attribute semantics. Children: strings escaped, `SafeHtml` injected raw, DOM nodes throw, arrays joined. `raw(html)` wraps pre-escaped strings.

### §7 SVG

Common case (`<svg>` root in JSX) works via the HTML5 parser's foreign-content mode. Edge case: orphan SVG fragments without `<svg>` wrapper need explicit namespace propagation. `toElement()` detects SVG content and routes through `DOMParser('image/svg+xml')`. Tag set: `g`, `path`, `circle`, `rect`, etc. (full list in `src/toElement.ts`).

### §8 API reference

Every export, every option, every conventional attribute. Comprehensive — use this as the canonical lookup.

### §9 Live demo

`examples/reactivity-demo/` is published to GitHub Pages at `brianwestphal.github.io/kerf/`. Deploy is `.github/workflows/pages.yml` on push-to-main: build kerf, build the example with `base: '/kerf/'`, upload `examples/reactivity-demo/dist/`, deploy via `actions/deploy-pages@v4`. Single static SPA, no docs site (KF-11). Pages source must be set to "GitHub Actions" in repo settings once.

## Update triggers

Update this doc whenever you:

1. Add a new numbered doc under `docs/`.
2. Implement a previously-design-only feature.
3. Defer / supersede a doc.
4. Add a significant feature to an existing doc.
