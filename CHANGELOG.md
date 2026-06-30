# Changelog

All notable changes to **kerf** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The `kerfjs` package now bundles `llms.txt` (the AI-discovery index) at the package root, and the docs site serves it at `https://brianwestphal.github.io/kerf/llms.txt`. Its links are now absolute GitHub URLs so the file is portable across GitHub, the site, and the installed package.

## [0.15.3] - 2026-06-30



- `npm create kerf-component` with no directory argument now prompts for the target directory (defaulting to `my-kerf-component`, with a `.` hint for the current directory) instead of printing usage text and exiting with an error.

## [0.15.2] - 2026-06-30



- Added the `create-kerf-component` initializer — scaffold a ready-to-publish kerf component package with `npm create kerf-component@latest <dir>`, no need to reverse-engineer the packaging rules.

## [0.15.1] - 2026-06-30



- README refresh + eslint rule-count fixes + CHANGELOG hygiene (`cfbaef3`)

## [0.15.0] - 2026-06-30



- List updates now morph same-identity rows in place instead of recreating their DOM nodes, avoiding full-table relayout on large lists and preserving DOM identity, focus, and IME composition across re-renders.


- New guide on incremental migration: kerf can own a single DOM subtree and coexist with React (or any framework), letting you migrate one island at a time.
- New guide on building and publishing reusable kerf components as npm packages.
- Example app documentation pages now open with an animated SVG preview of the real app in action, plus a gallery on the complete-examples index.

## [0.14.0] - 2026-05-27


- Fix `toElement()` first-paint divergence in WebKit by adopting its result into the live document
- Fix `mount()` first render in WebKit by adopting an inert `rootEl` into the live document

## [0.13.0] - 2026-05-23


- Add `KERF_DEV_WARN_DELEGATE_IN_EFFECT` dev warning to catch `delegate()` calls inside reactive effects
- New `require-delegate-disposer` ESLint rule flags `delegate()` calls whose disposer is discarded
- Document `delegate()` disposer gotchas and canonical cleanup patterns

## [0.12.1] - 2026-05-22


- Add GitHub Sponsors link to README, homepage, and npm `funding` field

## [0.12.0] - 2026-05-22


- `toElement` now returns `Element | DocumentFragment` to support multi-root inputs

## [0.11.1] - 2026-05-21


- `attr()` redesign: typed `AttrSpec<N, V>` exposes `.attrs` with dual overloads for cleaner attribute handling

## [0.11.0] - 2026-05-21


- `attr()` redesigned with `AttrSpec<N,V>` shape, `.attrs` accessor, and dual overloads
- Hardened defensive programming across the runtime for safer edge-case handling
- Refreshed published performance numbers from a fresh cross-framework benchmark run

## [0.10.0] - 2026-05-20


- Expose `kerfjs/ai/*` subpaths via package `exports` so the bundled skill/cursorrules files are resolvable
- Add a defensive fallback in `kerfjs/ai-assistant-configs` ESLint rule so it fires against installed kerfjs versions whose `exports` block subpath resolution

## [0.9.1] - 2026-05-20


- Bundle the kerf-app Claude Code skill and Cursor rules inside the npm package at `ai/skill.md`, `ai/cursorrules`, and `ai/manifest.json`
- Add `kerfjs/ai-assistant-configs` rule to `eslint-plugin-kerfjs` (warn in recommended) to flag drift in installed AI assistant configs
- `eslint --fix` now replaces only the canonical section above the `KERF-APP-CANONICAL-END` marker, preserving consumer customizations below it

## [0.9.0] - 2026-05-20


- Bundle the kerf-app Claude Code skill and Cursor rules inside the npm package at `ai/skill.md`, `ai/cursorrules`, and `ai/manifest.json`
- Add `kerfjs/ai-assistant-configs` rule (warn in recommended) to `eslint-plugin-kerfjs` v0.9.0 to surface AI-config drift on every lint pass
- Canonical-file contract (`kerf-skill-version` + `KERF-APP-CANONICAL-END` marker) lets `eslint --fix` refresh the canonical section while preserving consumer customizations below the marker

## [0.8.2] - 2026-05-19


- Package `homepage` fields now point to the published docs site, with prominent links in both READMEs

## [0.8.1] - 2026-05-19


- New `eslint-plugin-kerfjs` with four AST rules enforcing kerf Hard Rules

## [0.8.0] - 2026-05-18


- Add opt-in dev warning `KERF_DEV_WARN_NARROW_SET=1` that fires when `set()` is called with a partial-state object (replace semantics would silently drop missing keys); names the missing keys and points at the `set({ ...get(), ...next })` merge fix
- Widen `KerfBaseAttrs.contentEditable` to accept `'plaintext-only'` and add the lowercase `contenteditable` alias
- Expand the `/kerf/migrating/` hub to 13 frameworks — adds Vue 3, Svelte 5, Solid, Preact, htmx, Angular, jQuery, Redux, and Astro pages alongside a refreshed 8-framework comparison matrix
- New runnable example apps: `cart-htmx` (htmx swap → kerf island mount pattern) and `counter-store` (sync + async + persisted store)
- Fix TodoMVC example: store actions now spread `get()` into `set()` so filter/edit interactions no longer wipe state
- Drop AI-evidence pages, the AI marketing page, the blog, and the built-by-an-AI example; remaining docs re-toned to verifiable claims only
- New `scripts/check-docs-examples.mjs` doc/example consistency gate (wired into `npm run check`): verifies every example linked from a migration page is built + tested, and typechecks self-contained doc code blocks against `dist/`

## [0.7.0] - 2026-05-18


- Granular list updates now preserve DOM identity, focus, scroll, IME state, `<details open>`/`<dialog open>`, and `data-morph-skip` subtrees across in-place row updates
- Two new fast paths in the granular reconciler cut krausest select-row by 71% (27.8 → 8.2 ms) and partial-update by 28% (46.8 → 33.8 ms)
- `each()`'s third parameter renamed from `key` to `cacheKey` to clarify it's a passive cache-invalidation comparator, not a React-style reconciliation identity; positional callers unaffected
- JSX types now accept lowercase HTML attribute names (`class`, `for`, `tabindex`, `autofocus`, `autocomplete`, `spellcheck`) alongside the camelCase forms
- New public `morph(liveRoot, template)` export — kerf's general-purpose DOM reconciler, replacing the prior morphdom dependency
- `mount()` now throws if called on an element already inside (or containing) a mounted tree
- New `defineStore` dev-mode safety: `get()` snapshots are frozen so accidental mutations throw a `TypeError` instead of silently desyncing reactive consumers
- Clearer JSX runtime error for inline `onClick={handler}`-style attributes that points at `delegate()` as the fix
- Two opt-in dev warnings via env vars: `KERF_DEV_WARN_REBUILT_LISTENERS=1` flags rebuilt listener-bearing nodes; `KERF_DEV_WARN_UNTRACKED_SIGNALS=1` flags signal writes with no subscribers; `each()` now warns once per binding when the first row has no `id` or `data-key`
- New `kerfjs/jsx-runtime` re-exports of `KerfBaseAttrs`, `KerfCustomElement`, `AttrLike`, `AttrValue`, `DataAriaAttrs` for declaration-merging custom-element types
- New `bench/micro/` Vitest bench-mode harness (`npm run bench:micro`) for primitive-level perf questions that don't need the full krausest run
- Docs: the AI usage-guide gains a decision-making-axes section and an explicit antipattern callout for `each(STATIC_ARRAY, …)` rows that read dynamic signals

## [0.6.0] - 2026-05-11


- Public `morph(liveRoot, template)` export for standalone DOM reconciliation
- New `data-morph-preserve` attribute to opt elements out of morphing
- New `data-morph-skip-children` attribute — morph host attrs but leave subtree intact
- Drop-in AI-tool config files (`kerf.cursorrules`, `kerf.claude-skill.md`) for Cursor and Claude Code
- Adopt American-English spelling everywhere — prose, comments, identifiers, and test names; the existing codebase was swept in the same change

## [0.5.1] - 2026-05-11


- Fix `dist/jsx-runtime.d.ts` IntrinsicElements self-shadow that broke JSX typing in consumer apps

## [0.5.0] - 2026-05-10


- Add `arraySignal` (`kerfjs/array-signal` subpath) — granular collection signal that drives O(patches) DOM updates for keyed lists
- Faster keyed-list updates: bulk-parse contiguous insert runs and consecutive update patches in the granular reconcile path
- Perf optimizations on the `each()` / `mount()` update path; benchmarks now competitive with Solid/Vue on swap/remove/clear
- Preserve uncontrolled `<details open>` and `<dialog open>` state across re-renders
- `each()` now reconciles correctly when list rows have non-list siblings under the same parent
- Enforce the "exactly one top-level element per row" contract in `each()` with clearer errors
- Typed JSX `IntrinsicElements` table; custom elements extend it via declaration merging
- JSX runtime hardens URL attributes against `javascript:` XSS
- Widen `mount()` return type for better tooling/typed usage
- Add `kerfjs/testing` subpath exposing `clearStoreRegistry` for unit-test isolation

## [0.4.2] - 2026-05-09


- No user-facing changes in this release.

## [0.4.1] - 2026-05-09


- Just fixing the build

## [0.4.0] - 2026-05-09


- `delegate()` now auto-promotes the seven well-known non-bubbling events (`focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave`) to capture phase, with `closest()`-style selector matching preserved
- Fixed focus and caret position loss when reordering keyed `each()` rows on engines that drop focus on `insertBefore` (older Safari, happy-dom)
- `mount()` now throws a descriptive error when the root element is null/undefined instead of a generic "Cannot set properties of null"
- `each()` now throws a descriptive error naming the offending index when an item is a primitive (per-item cache requires objects)
- Minimum Node version bumped to 22.12+
- New Starlight-powered docs site at `/kerf/` with inline live examples and runnable complete apps; the reactivity demo moved to `/kerf/demo/`
- New kerf brand identity: production logo, full favicon set (SVG + PNG + ICO + Apple touch icon), and PWA manifest

## [0.3.1] - 2026-05-08


- Removed stale `morphdom` references; the bundled native diff is now the only reconciler

## [0.3.0] - 2026-05-08


- Rebuilt render pipeline with structured segments and a native keyed-list diff, replacing the morphdom dependency
- Added `each()` for keyed list iteration with per-item HTML memoization by object identity
- Renamed the npm package from `kerf` to `kerfjs` (the `kerf` name tripped npm's typo-squatting heuristic); the brand, GitHub repo, and Pages URL are unchanged
- Add `isSafeHtml(value)` type guard for checking JSX values across module copies (works where `instanceof SafeHtml` can't)
- New `npm run test:dist:full` runs the full unit + integration suite against the built `dist/` bundle in CI
- Add behavioral-guarantee tests pinning documented contracts (non-deep-reactivity, `batch()` coalescing, the `mount()` disposer, Tier-3 listener survival)
- Publish the live reactivity demo to GitHub Pages via `.github/workflows/pages.yml`

## [0.2.1] - 2026-05-07


- Add `Fragment` export to the `kerfjs` barrel for explicit JSX fragment usage

## [0.2.0] - 2026-05-07


- Fix focused contenteditable losing focus/caret during morph
- Fix `SafeHtml` identity mismatch across entry points caused by dist bundling
- Fix `clearStoreRegistry` no-op in built output, restoring test isolation

## [0.1.2] - 2026-05-07


- No user-facing changes; release tooling fixes only.

## [0.1.1] - 2026-05-07


- This is just a publication script test

## [0.1.0] - 2026-05-07

### Added

- Initial release.
- `signal`, `computed`, `effect`, `batch` (re-exported from `@preact/signals-core`).
- `defineStore({ initial, actions })` factory + `resetAllStores()` lifecycle hook.
- `mount(el, () => jsx)` — morphdom-driven render with focus / selection / `data-morph-skip` preservation.
- `delegate(el, type, selector, handler)` and `delegateCapture(...)` for Tier 1 / Tier 2 event delegation.
- `toElement(jsx)` — SVG-aware JSX → DOM helper (handles `<svg>` root and orphan SVG fragments).
- JSX runtime at `kerfjs/jsx-runtime` with `SafeHtml`, `raw`, attribute aliases for HTML + SVG.
- Numbered design docs under `docs/`.
- 7-section live demo under `examples/reactivity-demo/`.
