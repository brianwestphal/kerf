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
| §10 | Migrating hub (`/kerf/migrating/` — coming-from-React/Alpine/Lit/vanjs pages) | Shipped |
| §11 | Dev-mode warnings (opt-in env-gated warns for Rules 4 / 7 / 8) | Shipped |
| §12 | AI-assistant configs (Claude skill + Cursor rules bundled in npm; eslint drift-check rule) | Shipped |
| §13 | Component packages (authoring/publishing reusable kerf components as npm packages) | Doc only — no first-party component packages shipped yet |

Everything in the v0.1–v0.3 design is shipped (each / native diff / list reconciler / `isSafeHtml` / `Fragment` barrel re-export all landed in 0.2–0.3). No partial / design-only / deferred entries.

## Per-doc summary

### §1 Overview

States kerf's positioning: tiny reactive UI framework, ~11 KB (~12 KB with `arraySignal`), no virtual DOM, no compiler, no component lifecycle, no third-party DOM-diff dependency. Four primitives (signals / stores / render / delegation) plus a JSX runtime and an SVG-aware `toElement`. Rules out: routing, full SSR, styling opinions, ecosystem.

### §2 Reactivity

Documents `signal()`, `computed()`, `effect()`, `batch()`. Notes that signals are NOT deep-reactive (mutating a value in-place doesn't notify). `Signal<T>` allows writes; `ReadonlySignal<T>` is what `computed()` returns. Closing rule: one consumer = signal, two+ = store.

§2.9 **Fine-grained signal bindings** (Shipped) — passing a `signal`/`computed` itself (not `.value`) into a JSX attribute or text hole inside a `mount()` binds that hole fine-grained: on change, only that node updates, with no render re-run and no list reconcile. Opt-in per hole, non-breaking (raw signals previously threw). Implemented in `src/bindings.ts` (marker-in-string → wire-after-parse, reusing the keyed-list marker mechanism) across static content and `each()` rows on both reconcile paths; bound URL attributes get the same screening as static ones (`src/utils/urlScreen.ts`); SSR/`.toString()` snapshots the value. Positioning: "bind the hot hole" for an external/shared signal (a `selectedId` flipping a row class). Known limit: a bound hole depending on the row's OWN mutated data goes stale across a granular in-place update (id-based select-row unaffected).

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
- **Tier 2** (`delegateCapture()`) — explicit-capture escape hatch. Use when the auto-promotion list doesn't cover your event type (custom non-bubbling events) or when you want capture-phase interception. Matches via `closest()` walk-up by default (unified with `delegate()`, passing the matched ancestor); pass `{ match: 'direct' }` for strict `target.matches()` matching. Both helpers accept the `{ match?: 'closest' | 'direct' }` options argument (`DelegateOptions`).
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

### §10 Migrating hub

Pillar page set at `/kerf/migrating/` that translates a single classic-todo-list reference app from React, Alpine, Lit, and vanjs into kerf, side by side. Five pages total: an index with the cross-framework comparison matrix + perf snapshot, plus one page per source framework. Four separate pages (not tabs, not one long page) so each "coming from X" headline matches the real search query and gets its own indexable URL. Each per-framework page has the same five-section shape: bundle delta, mental-model translations table, side-by-side code, gotchas, perf numbers. Linked from the sidebar nav (a `Migrating` section) and from the homepage hero (a `Coming from React?` CTA that links to the index, not framework-detected). KF-132 shipped the skeleton; KF-156/157/158/159 filled in the per-framework page content (React / Alpine / Lit / vanjs respectively); KF-189 expanded the set to 14 source frameworks. KF-259 added a framework-agnostic `/kerf/migrating/incremental/` page (coexistence / island-at-a-time adoption, the per-file `jsxImportSource` pragma, `mount()` teardown, signal/store state bridging) — it intentionally does not follow the five-section per-framework shape.

### §11 Dev-mode warnings

Three opt-in runtime warnings gated by `NODE_ENV !== 'production'` + a per-warning `KERF_DEV_WARN_<NOUN>=1` env var: `KERF_DEV_WARN_REBUILT_LISTENERS` (Rule 4 — MutationObserver-based detection of imperative listeners being discarded by the morph; KF-174), `KERF_DEV_WARN_UNTRACKED_SIGNALS` (Rule 7 — `DevSignal` subclass that fires on writes to signals with no subscribers; KF-176), `KERF_DEV_WARN_NARROW_SET` (Rule 8 — `defineStore.set(next)` is missing keys from the current state; KF-212). All three follow the same family contract: production short-circuit, env-var gate, default off, one-shot dedup per "owner" (mount / signal / store), message ending with the canonical fix + how to silence, and no public-API surface. Lint + strict-TS + the dev-warns form a three-tier defence stack (lint at edit time, tsc at build time, dev-warns at runtime).

### §12 AI-assistant configs

How the drop-in Claude Code skill (`kerf.claude-skill.md`) and Cursor rules (`kerf.cursorrules`) ship to consumers and stay in sync as kerfjs evolves. Three components in one feature: (a) **bundling** — the canonical files ship inside the `kerfjs` npm package at `ai/skill.md` / `ai/cursorrules` / `ai/manifest.json`, regenerated from the repo-root source-of-truth by `scripts/sync-ai-bundle.mjs` and gated by `check:ai-bundle-in-sync`; (b) **canonical-file contract** — each bundled file carries a `kerf-skill-version: <semver>` line (the staleness signal) and a `<!-- KERF-APP-CANONICAL-END · your customizations below -->` marker that delimits kerf's section from the consumer's append zone; (c) **eslint rule** — `kerfjs/ai-assistant-configs` in `eslint-plugin-kerfjs` v0.9.0 (`warn` in `recommended`), once per lint run, resolves `kerfjs/ai/manifest.json` from the consumer's installed kerfjs, reports missing/stale/forked drop-ins, and `eslint --fix` replaces only the section above the marker so customisations below survive. KF-215 shipped (a) + (b); KF-216 shipped (c) with the versioned-section preservation strategy from KF-217 baked into v1.

### §13 Component packages

KF-254 investigation outcome: shipping reusable kerf components as npm packages is **already fully doable** with no runtime changes. A component is a plain `(props) => SafeHtml` function (the JSX runtime invokes function-valued tags directly), so a package just exports such functions and the consumer renders them with no extra toolchain. The doc records the kerf-specific considerations: (a) **state** — components have no per-instance state, so module-scope signals are singletons shared across all instances; per-instance state must come from a factory + props; (b) **events/cleanup** — components are pure builders with no lifecycle, so wire events via `delegate()` at the host root (or a companion `wire(root)` disposer) and wrap library-owned DOM with `data-morph-skip` + a create/dispose pair; (c) **packaging** — `kerfjs` MUST be a `peerDependency` and `external` in the build (never bundled, to avoid the SafeHtml/signals cross-bundle duplication hazard the `tests/dist/safe-html-cross-bundle.test.ts` gate guards), modeled on the sibling `eslint-plugin-kerfjs` package. KF-255 follow-up shipped the **`create-kerf-component`** initializer (sibling sub-package, published in lockstep): `npm create kerf-component@latest <dir>` scaffolds a component package that already encodes all the above rules, with a `node --test` scaffold suite and a `tests/dist/scaffold-typing` gate that typechecks the generated template against built `dist/`. No first-party *component* packages are shipped yet; candidate packages remain follow-up tickets.

### §14 Feature coverage

**Shipped.** KF-284 added a coverage axis orthogonal to v8 line/branch coverage: a per-behavior index (`docs/14-feature-coverage.md`) mapping each behavior — the list-reconciler state machine (`first-render ↔ granular ↔ snapshot ↔ empty-binding ↔ drift-recovery`), its *transitions*, and the public API — to the test that would fail if it regressed. `scripts/check-feature-coverage.mjs` (`npm run check:features`, wired into `npm run check`) fails if any indexed row's guarding test (file + title, double-quoted or backtick-wrapped for `<…>` titles) no longer resolves, so a renamed/deleted guarding test trips the gate. Rationale: two critical KF-125 reconciler bugs (select-after-delete, append-after-clear) shipped under 100% line coverage because the *transitions between states* were never asserted — line coverage is structurally blind to a missing transition. **KF-286** expanded the index to **78 rows** covering every documented behavior area across §2–§7, §11, integration, and real-browser (`(browser)`-marked) specs, and added **`tests/conventions.test.ts`** pinning in-suite invariants line coverage can't express (the barrel exports exactly the documented surface, no default export, the `each()` row contract). Complements the existing `check-doc-api-coverage` (export surface) and `check-doc-test-inventory` (test-file inventory) guards. **KF-289** resolved the completeness question: the tractable half — *every public value export must be named by an index row* — is now automated in the same script (adding a public export forces a behavior row); the intractable half — enumerating every documented prose behavior — is intentionally left to the periodic `/analyze-code-quality` behavioral audit + `/check-requirements-against-code` + the "Adding to the index" discipline, with the reasoning recorded in the doc's "Completeness" section (tagging every behavior would be circular + high-maintenance).

## Update triggers

Update this doc whenever you:

1. Add a new numbered doc under `docs/`.
2. Implement a previously-design-only feature.
3. Defer / supersede a doc.
4. Add a significant feature to an existing doc.
