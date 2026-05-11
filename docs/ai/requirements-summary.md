# Requirements summary — kerf

Synthesised view of every numbered doc in `docs/`, with status markers. Read this for a quick "what does kerf do" overview without opening every file.

Status markers:
- **Shipped** — implemented in `src/`, tested in `tests/`, documented in `docs/`.
- **Partial** — partially implemented; called out in the entry.
- **Design-only** — described in docs, not yet implemented.
- **Deferred** — explicitly out of scope for now.

> **Scope note — tooling / CI tickets are not tracked here.** This summary mirrors the numbered docs in `docs/`, which describe runtime behavior and the public API. Tooling-meta tickets — coverage thresholds, test-suite tiering, lint config, build-pipeline tweaks (e.g. KF-103's branch-threshold tweak, KF-109's tiered gate, KF-118's pre-push contract) — change `CLAUDE.md`, `vitest.config.ts`, `package.json`, or the husky hooks; their canonical record lives in `CLAUDE.md` (the "Code Quality Gates" / "Testing" sections) and `CHANGELOG.md`. They are intentionally absent from this dashboard so it stays a behavior-and-API view.

## Dashboard

| Doc | Topic | Status |
| --- | --- | --- |
| §1 | Overview / philosophy | Shipped |
| §2 | Reactivity (`signal` / `computed` / `effect` / `batch`) | Shipped |
| §3 | Stores (`defineStore` / `resetAllStores`) | Shipped |
| §4 | Render (`mount` + native diff + list reconciler) | Shipped |
| §5 | Event delegation (Tier 1 / 2 / 3) | Shipped |
| §6 | JSX runtime (`SafeHtml` / `raw` / `Fragment`) | Shipped |
| §7 | SVG (`toElement` SVG-aware) | Shipped |
| §8 | API reference | Shipped |
| §9 | Live demo (GitHub Pages deploy of `examples/reactivity-demo`) | Shipped |

Everything in the v0.1–v0.3 design is shipped (each / native diff / list reconciler / `isSafeHtml` / `Fragment` barrel re-export all landed in 0.2–0.3). No partial / design-only / deferred entries yet — those will accumulate as the project evolves.

## Per-doc summary

### §1 Overview

States kerf's positioning: tiny reactive UI framework, ~6.1 KB (6.5 KB with `arraySignal`), no virtual DOM, no compiler, no component lifecycle, no third-party DOM-diff dependency. Four primitives (signals / stores / render / delegation) plus a JSX runtime and an SVG-aware `toElement`. Rules out: routing, full SSR, styling opinions, ecosystem.

### §2 Reactivity

Documents `signal()`, `computed()`, `effect()`, `batch()`. Notes that signals are NOT deep-reactive (mutating a value in-place doesn't notify). `Signal<T>` allows writes; `ReadonlySignal<T>` is what `computed()` returns. Closing rule: one consumer = signal, two+ = store.

Also covers `arraySignal()` (KF-92) — a granular collection signal at the `kerfjs/array-signal` subpath (KF-95). Mutators (`update` / `insert` / `push` / `remove` / `move` / `replace`) emit typed patch events; when bound to `each(...)` inside a `mount()`, the keyed list reconciler applies just the patches against the live DOM in O(patches) instead of O(N). `arraySig.value` is a tracking read so `computed()` / `effect()` over it still works. Class detected via brand symbol (KF-95) so multiple bundle copies interoperate. Gotchas: only one `each()` callsite per render gets the granular benefit; `replace()` falls back to snapshot; throws fall back to snapshot (KF-99); pre-mount mutations route to snapshot for first render (KF-98).

### §3 Stores

`defineStore({ initial, actions })` produces a `{ state, actions, reset }`. Three rules: read-only state, actions-only mutation, always-reset. Module-level registry powers `resetAllStores()`. Multi-step actions use `batch()` for atomic notification. Derived state via `computed()` next to the store.

### §4 Render

`mount(rootEl, render)` wraps `effect()` + kerf's native segment-aware morph. Static surrounds reconcile through `src/morph.ts` (also exported publicly as `morph(liveRoot, template)` — KF-150 — for SSR-hydration / page-refresh consumers; accepts `Element`, `SafeHtml`, or raw HTML string); lists from `each(...)` go through a keyed reconciler that operates on live children directly (O(changes), not O(rows)). Match keys: `id` then `data-key`. Three morph escape hatches: `data-morph-skip` (element + subtree both skipped — library-owned hosts like Monaco / xterm / D3), `data-morph-skip-children` (KF-152 — host attrs morph normally, subtree left alone — client-hydrated slots whose loading/state classes still need to flow through), and `data-morph-preserve` (KF-151 — element is exempt from the morph's trailing-removal pass, so imperatively-injected nodes like autoplay videos, tooltip overlays, and analytics pixels survive across renders even though the template never emits them; scope is end-of-list-discard only, keyed-match moves still apply). Focus + selection preservation for active text-entry inputs; **focused `[contenteditable]` short-circuits the entire subtree on the morph (same mechanism as `data-morph-skip`)** — attribute updates deferred until the next render after blur. User-agent-owned `open` on `<details>` / `<dialog>` is never removed by the morph (KF-84) so user-driven expansion survives re-renders. Multiple `mount()` calls compose; each tracks its own signals. `SafeHtml.toString()` is server-safe. The render function may also return `null` / `undefined` / `false` / `true` — they coerce to "render nothing" so `() => cond ? <jsx/> : null` and `() => cond && <jsx/>` patterns work without sentinels (matches React / Solid).

When `each()` is bound to an `arraySignal`, the reconciler takes a granular path (KF-92): drains the patch queue, pre-renders insert/update HTML inside try/catch (KF-99), and applies patches directly — bulk-parsing contiguous insert runs (KF-93) and consecutive update runs (KF-94). Drift between the binding and the signal triggers a snapshot rebuild on the next render. First render of a list always takes the snapshot path (KF-98) — there's no binding yet to apply patches against. The granular path is also wrapped by `captureFocus`/`restoreFocus` (mirroring the snapshot path) so a focused descendant survives `replaceChild`/`insertBefore` on engines that drop focus across DOM ops.

KF-102 round 2 changed the diff signature from `listParents` (skip a parent's whole children subtree) to `ownedItems` (skip individual list-row elements). The diff still walks every parent's children to reconcile non-list siblings, but never disturbs rows owned by `each()`. List markers stay in the live DOM as comment-node anchors; `bindListsFromMarkers(rootEl, segment, bindings, inlinedItems)` distinguishes the first-render inlined-items path from subsequent renders that newly introduce a list. `cleanupOrphanBindings` drops binding entries (and their items) for lists that disappear from the segment between renders. `endAnchor(binding)` is exported from `list-binding.ts` (extracted in KF-116 to break a circular import; re-exported via `list-reconcile.ts`) and dynamically derives the "after the last item" anchor from `marker.nextElementSibling` (empty list) or `items[last].node.nextElementSibling` (non-empty), so non-list siblings the diff inserted between the list and the parent's tail still anchor moves correctly.

KF-103 enforces "exactly one top-level element per row" with row-precise diagnostics: `validateInlinedRowMatch` (mount.ts) checks first-render inlined rows by `outerHTML` equality (fast path) and falls back to a per-row parse only on mismatch; `buildFreshNodes` (list-reconcile-snapshot.ts) checks the bulk-parse count and dispatches to `findOffendingRow` on mismatch; `applyBulkInsert` / `applyBulkUpdate` (list-reconcile-granular.ts) have analogous helpers; `parseSingleRow` rejects the multi-root case in the granular path. The shared row-contract helpers (`ROW_HTML_SNIPPET_MAX`, `truncateRowHtml`, `parseRowTemplate`, `rowContractError`) live in `src/utils/rowContract.ts` (KF-111 / KF-115 extraction). The error message names the offending row index, the actual element count, and shows the row's HTML.

KF-117 documented kerf's no-op-render fast path as a contract: when the static-surrounds HTML is byte-for-byte identical to the previous render, `mount()` skips the diff entirely. Any attribute / child set imperatively on a kerf-managed element (`el.setAttribute(...)`, `el.appendChild(...)`) survives across no-op re-renders; when surrounds DO change, the diff runs and `morphAttributes` removes anything the JSX didn't authorise. The fast path saves ~8 ms per partial-update / select-row / swap-rows render in the krausest harness. See `docs/4-render.md` §4.4.2 for the full rationale + practical guidance (use `data-morph-skip` for stable library-owned subtrees, drive imperative state from signals where possible).

### §5 Event delegation

Three-tier model:
- **Tier 1** (`delegate()`) — bubbling events plus the well-known non-bubblers (`focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave`) auto-promoted to capture phase under the hood. Walk-up via `closest()` for every event type.
- **Tier 2** (`delegateCapture()`) — explicit-capture escape hatch. Use when the auto-promotion list doesn't cover your event type (custom non-bubbling events) or when you want capture-phase semantics with strict element-match (`target.matches()`) instead of walk-up.
- **Tier 3** (library-owned subtrees) → `data-morph-skip` + manual lifecycle.

### §6 JSX runtime

JSX renders to `SafeHtml` strings via `kerfjs/jsx-runtime`. Configured via `tsconfig` `"jsxImportSource": "kerfjs"`. Attribute aliases for HTML + SVG camelCase → kebab-case. Boolean attribute semantics. Children: strings escaped, `SafeHtml` injected raw, DOM nodes throw, arrays joined. `raw(html)` wraps pre-escaped strings.

Typed `IntrinsicElements` (KF-75) catches misspelled tags + attribute typos at compile time. Custom elements / web components extend the table via declaration merging into `kerfjs/jsx-runtime`'s JSX namespace (KF-100): `IntrinsicElements` is exposed as an `interface extends`, and `KerfCustomElement` / `KerfBaseAttrs` / `AttrLike` / `AttrValue` / `DataAriaAttrs` are re-exported from `kerfjs/jsx-runtime` for project-side composition.

### §7 SVG

Common case (`<svg>` root in JSX) works via the HTML5 parser's foreign-content mode. Edge case: orphan SVG fragments without `<svg>` wrapper need explicit namespace propagation. `toElement()` detects SVG content and routes through `DOMParser('image/svg+xml')`. Tag set: `g`, `path`, `circle`, `rect`, etc. (full list in `src/toElement.ts`).

### §8 API reference

Every export, every option, every conventional attribute. Comprehensive — use this as the canonical lookup.

### §9 Live demo

A single GitHub Pages artifact bundles two independent builds: the Astro + Starlight marketing/docs site at `brianwestphal.github.io/kerf/` (built from `site/`) and the seven-section reactivity demo at `brianwestphal.github.io/kerf/demo/` (built from `examples/reactivity-demo/` with `base: '/kerf/demo/'`). Deploy is `.github/workflows/pages.yml` on push-to-main: `npm ci` → `npm run build` (kerf package) → `npm run site:build` (runs `sync-docs` + `build-examples` in `prebuild`, then `astro build`), upload `site/dist/`, deploy via `actions/deploy-pages@v4`. Pages source must be set to "GitHub Actions" in repo settings once.

## Update triggers

Update this doc whenever you:

1. Add a new numbered doc under `docs/`.
2. Implement a previously-design-only feature.
3. Defer / supersede a doc.
4. Add a significant feature to an existing doc.
