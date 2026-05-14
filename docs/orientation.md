# kerf — 5-minute orientation

> A one-pager for humans new to the codebase. **Hard cap: 500 words.** For deeper material follow the links at the bottom. The `check-requirements-against-code` skill keeps this in sync.

## What kerf is

A ~6.1 KB reactive UI framework: fine-grained signals (`@preact/signals-core`) + a custom DOM morph + a keyed list reconciler + a JSX-to-HTML-string runtime. No virtual DOM, no compiler, no scheduler.

## How the source is organized

`src/` follows one rule: **one primary export per file**, files under ~200 LOC.

- `index.ts` — public barrel. 16 runtime exports.
- `jsx-runtime.ts` + `jsx-types.ts` — JSX → `SafeHtml` (string + structured "list"/"mixed" segments).
- `reactive.ts`, `store.ts`, `array-signal.ts` — reactivity primitives.
- `mount.ts` — binds a render function to a DOM root via `effect()`.
- `morph.ts` — kerf's general-purpose DOM diff (forked from morphdom, attribution in `LICENSE`).
- `each.ts` + `list-reconcile*.ts` + `list-binding.ts` — keyed list reconciler. Snapshot path (default) and granular-patch path (when fed an `arraySignal`).
- `segment.ts` — types for the structured render output.
- `delegate.ts` — Tier-1 / Tier-2 event delegation.
- `toElement.ts` — SVG-aware JSX → DOM Element.
- `utils/` — `escapeHtml`, JSX-attr aliases, row-contract helpers.

## The render pipeline

![Render pipeline](./diagrams/render-pipeline.svg)

A `signal` write re-runs the render fn → it produces a `SafeHtml` (an HTML string for the static surrounds plus tagged "list" segments where `each()` was called) → `morph()` reconciles the static surrounds → the list reconciler patches each list directly against live DOM children. Partial updates on a 1000-row table are O(changes), not O(rows).

## Things to be aware of

- **Two documented module-level mutable spots, no others.** `store.ts:REGISTRY` (so `resetAllStores()` works) and `each.ts:context` (the per-render render-context reference, set by `mount()`). Everything else flows through arguments.
- **Components are plain functions returning JSX.** No hooks, no lifecycle, no `<MyComponent />` semantics. State lives in module-scope signals/stores.
- **JSX renders to HTML *strings*, not DOM nodes.** Passing a DOM node into JSX throws. `toElement()` is the bridge for the one-shot SVG/HTML → Element case.
- **Diff keys are `id` first, then `data-key`.** Without one of these, list rows match by position — focus and selection swap on insert/delete.
- **`data-morph-skip` (+ `-children`, + `data-morph-preserve`) are escape hatches.** Mark third-party widgets (Monaco, charts) so the diff leaves them alone.
- **Coverage gates.** `vitest.config.ts` enforces 100% lines / functions / statements, 99% branches on `src/`. `npm run check` runs the full lint + typecheck + tests + build + dist suite. `npm run check:full` adds Playwright across Chromium / Firefox / WebKit.
- **Ticket numbers (`KF-NN`) are local-only** — outside readers can't look them up, so always include a self-contained summary. See `CLAUDE.md` § Referencing tickets.

## Where to look next

- `CLAUDE.md` — agent-facing canonical reference; source-of-truth for the export list, file map, test scripts.
- `docs/1-overview.md` through `docs/10-migrating.md` — numbered design docs.
- `docs/ai/usage-guide.md` — the AI-first reference (hard rules, four core patterns, common errors → fixes).
- `docs/ai/code-summary.md` — reverse index of every public export.
