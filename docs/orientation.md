# kerf — orientation for new developers

> One-pager. **Hard cap: 500 words.** Assumes you've used a reactive UI library like React, Vue, or Solid. You don't need to know their internals. The `check-requirements-against-code` skill keeps this in sync.

## Mental model

kerf is **signals + a DOM-string render + a morph diff**. There is no virtual DOM, no compiler, no fiber tree, no scheduler.

`mount(rootEl, () => jsx)` runs your render function inside an `effect()` from `@preact/signals-core`. The render function returns a `SafeHtml` — an HTML string for static markup, plus structured "list" segments where `each()` was called. On a signal write, the effect re-fires; `morph()` reconciles the static parts against the live DOM in place; the keyed list reconciler patches each `each()` list against its live children in O(changes). Coming from React: there is no in-memory tree to diff — kerf re-reads the live DOM and writes only what changed.

![Render pipeline](./diagrams/render-pipeline.svg)

## Where to look first

If you're trying to **understand the public API**, start at `src/index.ts` (16 exports) and `docs/8-api-reference.md`.

If you're trying to **change how rendering wires up or schedules**, look at `src/mount.ts` — it owns the effect, the first-render bulk insert, and the dispatch to morph + list reconciler.

If you're trying to **fix a static-element diff bug** (attributes, text, focus preservation, `data-morph-*`), look at `src/morph.ts`.

If you're trying to **fix a keyed-list bug** (rows not moving, focus loss, duplicate keys), look at `src/list-reconcile.ts` and its two siblings: `list-reconcile-snapshot.ts` (default LIS path) and `list-reconcile-granular.ts` (the `arraySignal` patch path).

If you're trying to **add or debug a reactive primitive**, see `src/reactive.ts` (re-export of signals-core), `src/store.ts` (`defineStore`), `src/array-signal.ts` (granular collection signal).

If you're trying to **wire an event handler**, do NOT use inline `onClick={fn}` — the JSX runtime renders to strings and will throw. Use `delegate(rootEl, 'click', '[data-action="..."]', handler)` from `src/delegate.ts`.

If you need to **opt a subtree out of the diff** (third-party widget, imperative DOM), put `data-morph-skip` / `data-morph-skip-children` / `data-morph-preserve` on the host. See `docs/4-render.md` §4.3.

## What surprises React people

- **JSX renders to strings, not DOM nodes.** Passing an element as a child throws. `toElement()` is the one-shot string-to-Element bridge.
- **Components are plain functions.** `<MyComponent props />` calls `MyComponent(props)` and uses the returned JSX — no hooks, no lifecycle, no per-instance state. State lives in module-scope signals or stores.
- **Lists require `id` or `data-key` per row.** Without one, rows match positionally; focus and selection swap on insert/delete.
- **No synthetic event system.** You opt into delegation via `delegate()`.

## Conventions

One primary export per file, files under ~200 LOC, ESM-only, kebab-case filenames. `npm run check` is the fast gate (lint + typecheck + tests + build + dist suite); `npm run check:full` adds Playwright. Coverage is enforced at 100% lines/functions/statements, 99% branches on `src/`. Ticket numbers (`KF-NN`) are local-only — always include a self-contained summary when referencing them. See `CLAUDE.md` § Hot Sheet integration.

## Deeper reading

`docs/1-overview.md` → `docs/10-migrating.md` (design); `docs/ai/usage-guide.md` (AI-first reference); `CLAUDE.md` (canonical agent doc).
