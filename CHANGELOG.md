# Changelog

All notable changes to **kerf** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2] - 2026-05-09


- No user-facing changes in this release.

## [0.4.1] - 2026-05-09


- Just fixing the build

## [0.4.0] - 2026-05-09


- Auto-promote known non-bubbling events (focus, blur, scroll, etc.) to capture phase in `delegate()`

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
- Added `each()` for keyed list iteration with per-item HTML memoisation by object identity

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

## [Unreleased]

### Fixed

- **Focus was sometimes lost on `each()` reorders (KF-65).** When the keyed list reconciler moved a row whose descendant held focus, `insertBefore` blurred the element on engines that don't preserve focus across DOM moves (older Safari, happy-dom). The element survived in the live tree, but `document.activeElement` reverted to `<body>` and the user's typing was interrupted. The reconciler now snapshots the active element + its selection range (when applicable) before the move pass and re-applies them after, so focus and caret position survive a reorder uniformly across engines. Engines that already preserve focus across moves see a no-op — the snapshot only takes effect when the active element changed. `docs/4-render.md` §4.4 and `docs/8-api-reference.md` updated. New regression tests in `tests/unit/mount.test.ts` cover reorder, top-insert, focused-row removal, non-text focused elements, selection-API rejection (e.g. `type=number`), and the "active element is outside the list" path.
- **`Fragment` was missing from the `kerfjs` barrel (KF-24).** `Fragment` was implemented in `src/jsx-runtime.ts`, exported from `kerfjs/jsx-runtime`, and present in the shared chunk — but the barrel `src/index.ts` didn't re-export it. Importing `Fragment` from `'kerfjs'` resolved to `undefined`, so a manual `<Fragment>...</Fragment>` rendered as `<undefined>...</undefined>`. The `<>...</>` shorthand was unaffected because the JSX transform pulls `Fragment` from `kerfjs/jsx-runtime` directly. Added `Fragment` to the barrel re-export, and pinned the entire public-API contract with a new `tests/dist/barrel-completeness.test.ts` so any future omission fails CI loudly. Docs updated to list `Fragment` in the public API surface (`CLAUDE.md`, `llms.txt`, `docs/ai/usage-guide.md`, `docs/ai/code-summary.md`, `docs/6-jsx-runtime.md`, `docs/8-api-reference.md`).
- **Focused contenteditable was being morphed, clobbering in-progress edits (KF-19).** The docs claimed contenteditable elements got focus + selection preservation alongside `<input>` and `<textarea>`, but the implementation only handled the latter two — a focused contenteditable's typed content was overwritten by morphdom on the next re-render. `mount()` now short-circuits the morph entirely when the active element is a contenteditable (same mechanism as `data-morph-skip`), so the user's edit, caret position, and any multi-range selection survive verbatim. Attribute updates are deferred until the next render after blur — that's the explicit trade-off, and matches what you want for in-progress rich-text editing. `docs/4-render.md` §4.4 and `docs/8-api-reference.md` §8.7 updated to describe the per-element-kind behaviour. The check uses the `contenteditable` attribute directly (the spec's source of truth) rather than the derived `isContentEditable` property, so test environments that don't populate the latter still get correct behaviour.
- **`clearStoreRegistry` was a no-op in the published bundle (KF-15).** `dist/testing.js` shipped an empty function body. Root cause: `tsup` bundled each entry independently with `splitting: false`, so the testing entry tree-shook the module-level `REGISTRY` array out as unreferenced — leaving `REGISTRY.length = 0` as dead code. Same root cause as KF-14. Fixed by enabling `splitting: true` in `tsup.config.ts`: shared modules now live in chunk files that all entries import, so `defineStore`'s registry and `clearStoreRegistry`'s reference are the same array. Side benefit: the duplicate `SafeHtml` class definition is gone too — there's now exactly one copy across the whole dist. Build output now includes `dist/chunk-*.js` files (covered by the existing `"files": ["dist"]` in `package.json`). New regression test in `tests/dist/store-registry-shared.test.ts` exercises the cross-entry registry from the built bundles.
- **`SafeHtml` cross-bundle identity (KF-14).** When a consumer's bundler ended up loading two copies of kerf — for example, the barrel (`kerfjs`) and the JSX-runtime entry (`kerfjs/jsx-runtime`) resolving as separate modules — `instanceof SafeHtml` failed inside the JSX runtime because the two `SafeHtml` classes were structurally identical but referentially distinct. The renderer would then throw `JSX: unsupported child of type object (SafeHtml)` on perfectly valid JSX. `SafeHtml` instances now carry a `Symbol.for('kerfjs.SafeHtml')` brand and the runtime checks for the brand instead of using `instanceof`. New unit tests simulate the duplicate-class scenario, and a new `npm run test:dist` job exercises the actual built bundles in CI.

### Changed

- **`delegate()` now auto-promotes the well-known non-bubbling event types to capture phase (KF-56).** `focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave` previously needed `delegateCapture()`; with auto-promotion the call site is identical to bubbling events. Selector matching stays `closest()`-style for every type, including the auto-promoted ones — so `delegate(root, 'focus', '.field-row', ...)` fires when a descendant `<input>` is focused, with the row as the matched element (not the input). `delegateCapture()` remains as the explicit-capture escape hatch with its `target.matches()`-style direct matching. No bundle-size change worth measuring. `docs/5-event-delegation.md` and `docs/8-api-reference.md` §8.4 updated. New unit tests in `tests/unit/delegate.test.ts` cover the `closest()` walk-up on auto-promoted events, the disposer path, and a phase-check for bubbling events to confirm the promotion is type-gated.

### Added

- **`each(items, render, key?)` list primitive** exported from `kerfjs`. Keyed list iteration with per-item memoisation: skips re-running `render` for items whose object identity (and optional `key`) are unchanged since the previous call. Targets the partial-update / select-row / swap-rows perf path, where today's `mount()` re-runs the render for the full list on any signal change. On the js-framework-benchmark suite this drops kerfjs's partial-update from 87 → 64 ms (-27%), select-row from 69 → 42 ms (-38%), swap-rows from 86 → 58 ms (-33%), and remove-row from 49 → 35 ms (-29%); creates and bundle size are unaffected (+0.2 KB gz for the WeakMap memoiser). See `docs/8-api-reference.md` §8.3 and `bench/` for the benchmark harness.
- **`isSafeHtml(value)` type guard** exported from `kerfjs`. Use this rather than `instanceof SafeHtml` when inspecting JSX values from your own code — it works across module copies.
- **End-to-end test coverage of the published bundle (KF-16).** New `npm run test:dist:full` re-runs the entire unit + integration suite against `dist/` instead of `src/` via a tiny vitest plugin that rewrites `../../src/<name>.js` imports to the equivalent dist entry point. Wired into the CI `build` job. Combined with the existing `test:dist` (focused dist regression suite), CI now proves the exact bytes we publish pass every test we have, not just the source they were built from.
- **Four behavioural-guarantee tests (KF-17)** pinning documented contracts that previously had no test: signals are not deep-reactive (§2.6), `batch()` inside an action coalesces notifications (§3.5), `mount()` disposer leaves the rendered DOM in place (§4), and direct event listeners inside `data-morph-skip` subtrees survive parent re-renders (Tier 3, §5).

### Changed

- **Render pipeline rebuilt around structured segments + a native diff.** `SafeHtml` no longer wraps a flat string; it wraps a `Segment` tree that distinguishes `static` HTML, `list` segments (from `each(...)`), and `mixed` parents containing lists. `mount()` dispatches on the segment kind: static surrounds go through a new general-purpose tree-diff (`src/diff.ts`, derived from morphdom — MIT — with attribution in `LICENSE`), and lists are reconciled directly against live children by a keyed reconciler. The reconciler bulk-parses every fresh row's HTML in one `innerHTML` call, then uses an LIS pass over old positions so the number of `insertBefore` calls is the minimum possible. `morphdom` is no longer a runtime dependency — kerf now depends only on `@preact/signals-core`. Net perf vs the prior `each` + morphdom Stage-1: partial-update 64 → 51 ms (-19%), select-row 42 → 39 ms (-9%), swap-rows 58 → 33 ms (-43%), remove-row 35 → 21 ms (-39%), append-1k 67 → 54 ms (-19%), clear 35 → 23 ms (-33%); creates roughly unchanged. Bundle gz: 6.9 → 6.6 KB. Public API and JSX usage are unchanged — the change is entirely internal.
- **Package renamed from `kerf` to `kerfjs`** on the npm registry. The `kerf` name was rejected by npm's typo-squatting heuristic ("too similar to `keyv`"). The brand is still *kerf* — only the npm identifier changed. Update imports to `from 'kerfjs'`, `tsconfig.json` to `"jsxImportSource": "kerfjs"`, and the install command to `npm install kerfjs`. The GitHub repo and Pages URL (`brianwestphal.github.io/kerf/`) are unchanged.

### Added

- Live demo published to GitHub Pages at <https://brianwestphal.github.io/kerf/>. Builds `examples/reactivity-demo/` on every push to `main` via `.github/workflows/pages.yml`. New `docs/9-live-demo.md` covers the deploy, and `examples/reactivity-demo/vite.config.ts` now sets `base: '/kerf/'` for the subpath. New `npm run example:reactivity-demo:build` script.

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
