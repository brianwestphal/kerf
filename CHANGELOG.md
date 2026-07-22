# Changelog

All notable changes to **kerf** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


- Corrected the `signal` entry in the API reference: its parameter is `value?` (optional), not `initial` — matching the actual type signature. A new build-time gate now verifies every documented function signature against the emitted type declarations, so the API reference can't silently drift from the code.

## [1.0.2] - 2026-07-22



- Fixed the row-selector demo animation 404ing on the published site — the missing SVG capture is now generated and committed.

## [1.0.1] - 2026-07-22



- KF-329: pin release-workflow npm upgrade to npm@11 — npm@12 needs Node ≥ 22.22.2, above the 22.21.0 pin (`c54559f`)

## [1.0.0] - 2026-07-22



- **Fine-grained signal bindings** — pass a signal or `computed` directly into a JSX attribute or text hole (e.g. `class={computed(...)}` or `{sig}`) inside `mount()`, and that one node updates on signal change without re-running `render()` or walking the list reconciler. Opt-in per hole and non-breaking; works in static content and inside `each()` rows on both the snapshot and `arraySignal` reconcile paths, with binding effects correctly wired, carried, and disposed across row insert/update/remove/move.
- Bound values get the same safety treatment as static ones: URL screening and `SafeHtml`/`raw()` unwrapping now apply to fine-grained bound attributes.
- New interactive benchmark playground (`npm run bench:serve`) to explore kerf by hand in the standard 1k-rows benchmark app.
- New **row-selector** example app and a "Fine-grained bindings" section in the reactivity demo, both showing select-row updates with zero render re-runs and zero list reconciles.


- Hardened the dangerous-URL screen: scheme detection now normalizes away C0 control characters, DEL, and leading whitespace, so obfuscations like `java	script:` or a NUL before the colon can no longer slip `javascript:`/`vbscript:` URLs past the check.
- Attribute names are now validated — malformed names (e.g. from spreading attacker-controlled keys into JSX) throw instead of breaking out of the open tag, and inline `on*` event handlers are rejected on both the static and signal-bound attribute paths, closing an XSS vector where a bound `onclick` would have installed a live handler.
- Documented kerf's reserved marker namespace (`data-kfb`, `data-kfbrow`, `kfb:`/`kfbr:`/`kf-list:` comments) — consumer content using these can collide with binding wiring, so they're now explicitly reserved.
- Documented the trusted-input bridges (`toElement()`, `morph()` with string/Element templates, `<iframe srcdoc>`) that bypass escaping by design, and the `raw()`/`SafeHtml` trust boundary.
- Hardened the release pipeline: least-privilege OIDC scoping per job, SHA-pinned GitHub Actions with automated Dependabot bumps, and a token-holding publish job that runs with `--ignore-scripts` and no build tools.


- Reduced the per-row create cost of fine-grained row bindings from ~1.65× to ~1.15× via lazy row wiring — the common single-root-binding case now needs no subtree walk or extra allocations.
- Published cross-framework benchmark numbers now come from the official upstream krausest js-framework-benchmark run (kerf is a merged upstream entry), replacing stale local-machine measurements.


- README refreshed for the 1.0 release: fine-grained updates and safe-by-default escaping promoted to headline features, and the status line flipped from "Pre-1.0 — API may evolve" to stable 1.0.
- Fine-grained bindings documented across all consumer and AI-assistant surfaces (reactivity docs, API reference, usage guide, Cursor rules, Claude skill).

- **Signposted the raw HTML/SVG → DOM bridges as trusted-input only.** `toElement()`, `morph()` (with a string/Element template), and the `<iframe srcdoc>` attribute bypass kerf's escaping/URL-screening by design — they're the same trust model as `innerHTML` / `raw()`. The docs now call this out loudly, including that the SVG path is *more* dangerous than the HTML path (a top-level `<svg><script>`, SVG event attributes, and `xlink:href="javascript:"` execute once inserted, whereas an HTML-string `<script>` is inert), and that `srcdoc` is HTML a browser re-parses as a document (so `srcdoc={userString}` executes even though the value is escaped as an attribute). No behavior change — these are documentation + regression tests: a real-browser spec (`tests/browser/trusted-html-bridges.spec.ts`) pins the execution boundary across Chromium/Firefox/WebKit, a unit test pins that the granular list fast path keeps the URL screen's guarantee end-to-end, and another pins that SVG input isn't sanitized. See [`docs/7-svg.md`](docs/7-svg.md) § Security, [`docs/8-api-reference.md`](docs/8-api-reference.md), and [`docs/6-jsx-runtime.md`](docs/6-jsx-runtime.md) §6.4.3.
- **Documented kerf's reserved marker namespace.** Fine-grained bindings and `each()` lists coordinate through in-band markers that the wiring pass finds by scanning the mounted subtree and matching by id. A consumer element that carries one of those names can collide with a real binding's id and silently steal its update, so the names are now documented as reserved: the `data-kfb` / `data-kfbrow` attributes and HTML comments beginning `kfb:` / `kfbr:` / `kf-list:`. Don't emit them from your own markup or via `raw()`. (kerf's escaping already prevents a plain text/attribute *value* from forging one — the only ways in are hand-written markup or `raw()`.) See [`docs/2-reactivity.md`](docs/2-reactivity.md) § "Reserved marker names".
- **Attribute names are now validated, and inline event handlers are rejected outright.** The JSX runtime already escaped attribute *values*; it now also validates each attribute *name* against a safe shape (a letter/underscore/colon followed by letters, digits, or `_ . : -`) and **throws** on anything else. This closes a markup-injection vector when an object with attacker-controlled keys is spread into JSX (`<div {...untrustedObj}>`) — previously a key like `'x><img onerror=…>'` broke out of the open tag even though the value was escaped. Separately, any `on*` attribute (a function *or* a string value, in any case — e.g. `onClick={fn}` or `onclick="…"`) now throws and points at `delegate()`; previously only function-valued keys matching `/^on[A-Z]/` were caught, so a string `onclick="alert(1)"` slipped through and became a live inline handler when parsed. Both checks now cover the **fine-grained bound path** too: a signal bound straight into an attribute (`onclick={signal}`) is written with `setAttribute`, and `setAttribute('onclick', …)` installs a live inline handler just as a parsed string would — so an `on*` (or malformed) name bound as a signal is rejected at binding time, closing the same vector on the signal path. See [`docs/6-jsx-runtime.md`](docs/6-jsx-runtime.md) §6.4.2.
- **Hardened the dangerous-URL screen.** The URL-attribute filter (on `href`/`src`/`xlink:href`/`formaction`/`action`) now: (1) sees through control-character and whitespace obfuscation of the scheme — a leading ``, an in-scheme `TAB`/`LF`/`CR` (`java	script:`), or a `NUL` before the colon are all normalized away before the scheme is read, matching how a browser resolves the URL, so they can no longer slip a `javascript:` past the screen; (2) treats `data:` by subtype instead of only blocking `data:text/html` — script-executing document types (`data:text/html`, `data:image/svg+xml`, XHTML/XML) are dropped while inert media (raster images, fonts, audio, video, plain text/CSS) still pass, and any unknown subtype fails closed; and (3) also screens the `data` attribute on `<object>` (which loads its target as a document). `raw()` remains the opt-out. Both the static serializer and the fine-grained bound-attribute writer share the screen, so both paths are covered.
- **Fine-grained signal bindings.** Hand a `Signal`/`computed` *itself* (not its `.value`) into a JSX attribute (`class={someSignal}`) or a text hole (`{someSignal}`) inside a `mount()`, and kerf binds that hole directly to the signal: when the signal changes, only that attribute/text node updates — the render function does **not** re-run and the list reconciler does **not** walk. This is kerf's fine-grained update tier, sitting below the coarse `mount()` effect, for the "external state drives one spot" pattern (a `selectedId` flipping a row's class, a live status attribute, etc.). Works in static content and inside `each()` rows on both the snapshot and `arraySignal` (granular) paths, and row bindings' lifetimes track their row node (a row reorder is free; a removed row's binding is torn down). Opt-in and non-breaking: passing a raw signal into JSX previously threw, so existing apps are unchanged, and any hole that isn't a signal stringifies exactly as before. Bound URL attributes (`href`/`src`/`formaction`/`action`/`xlink:href`) get the same `javascript:`/`vbscript:`/`data:text/html` screening as static attributes (`raw()` opts out). Outside a `mount()` (SSR / `SafeHtml.toString()`) a bound signal snapshots its current value and emits no markers. See [`docs/2-reactivity.md`](docs/2-reactivity.md) §2.9.

## [0.16.0] - 2026-07-01



- Fixed keyed-list selection breaking after a row was removed: a signal read only inside `each()`'s `cacheKey` (such as a `selectedId` toggling a row's class) no longer drops out of the reactive dependency set, so later changes re-render correctly.
- Fixed appending items to a list after clearing it rendering nothing.

- `each()` on an `arraySignal`: appending rows to a list that was just emptied (e.g. **Clear** then **Append**) now renders the new rows immediately, instead of showing nothing until a second append. After the list was emptied its binding was empty but no longer in its first-render state, so the granular insert path emitted a segment the reconciler rendered as empty; repopulating an emptied list now takes the snapshot (build-from-scratch) path, the same as a first render.
- `each()` on an `arraySignal`: a signal read only inside the `cacheKey` comparator (the "external state drives the row" pattern — e.g. a `selectedId` flipping a row's class) now stays tracked across a granular structural update. Previously, after a granular insert/remove/update/move, that signal dropped out of the `mount()` effect's dependency set (the granular path never re-evaluates `cacheKey` for untouched rows), so a later change to it silently failed to re-render — e.g. row selection stopped working after a row was deleted. The granular path now re-reads every row's `cacheKey`, which both keeps those signals tracked and detects content drift the patches can't express (a selection flip batched together with a structural change), falling back to the snapshot path when it does.

## [0.15.5] - 2026-06-30



- Corrected the advertised bundle size in `llms.txt` to ~11 KB minified + gzipped (including the `@preact/signals-core` runtime dependency; ~12 KB with `arraySignal`), matching the README.

## [0.15.4] - 2026-06-30



- `llms.txt` is now published at a public docs-site URL and bundled in the npm package, making kerf's AI-assistant documentation index discoverable to llms.txt directories and tooling.

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
