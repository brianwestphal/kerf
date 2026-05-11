# kerf

## Project Overview

kerf is a tiny reactive UI framework: fine-grained signals + a custom DOM diff specialized for keyed lists + a tiny JSX runtime. The whole runtime is roughly 6.1 KB minified + gzipped without `arraySignal`, 6.5 KB with it, including its sole runtime dependency (`@preact/signals-core`).

The name *kerf* is a woodworking term — the narrow strip a saw blade removes. The framework's job is the same: apply the smallest possible cut to update your DOM.

## Tech Stack

- **Runtime**: Browser (modern, ES2022+). Node 22.12+ for build/test (Astro requirement).
- **Language**: TypeScript (strict mode, ESM-only).
- **Build**: tsup (esbuild + tsc-emit). Outputs ESM + types.
- **Tests**: vitest with `happy-dom` as the default environment. `tests/unit/toElement.test.ts` overrides to `jsdom` (via `@vitest-environment jsdom`) because happy-dom's `DOMParser('image/svg+xml')` returns a document with `null` `documentElement` for SVG input — jsdom gets it right, and so do real browsers. Both `jsdom` and `@types/jsdom` are devDeps for that one file; do not remove them.
- **Lint**: eslint flat config + `simple-import-sort` + typescript-eslint.

## Architecture

The framework is a small set of independent modules that compose. Each one earns its keep on its own; together they're a complete UI runtime.

### Source layout

- `src/index.ts` — public entry point. Re-exports everything users need.
- `src/jsx-runtime.ts` — JSX → `SafeHtml` (HTML strings) + `SafeHtml.toString()`. Configured via `tsconfig.json` `"jsxImportSource": "kerfjs"` in user code. Imports the typed intrinsic-element table from `src/jsx-types.ts`.
- `src/jsx-types.ts` — typed JSX intrinsic-element interfaces (`KerfBaseAttrs`, per-element attribute types, the `IntrinsicElements` mapping). Catches typos on tag names + attribute names at compile time. Custom elements / web components extend this via `declare global { namespace JSX { interface IntrinsicElements { 'my-tag': KerfCustomElement & {...} } } }`.
- `src/reactive.ts` — re-export of `@preact/signals-core` (`signal`, `computed`, `effect`, `batch`). One-file abstraction layer so the underlying lib is swappable.
- `src/store.ts` — `defineStore({ initial, actions })` + global registry + `resetAllStores()`.
- `src/array-signal.ts` — `arraySignal(initial)` granular collection signal at the `kerfjs/array-signal` subpath (KF-92 / KF-95). Brand-detected by `each()` so the class only ships when the consumer actually imports it.
- `src/mount.ts` — `mount(el, render)`. Wraps `effect()` + the segment-aware morph. Bulk-renders on first paint, then on subsequent renders runs `morph()` over the static surrounds (skipping any list parents) and dispatches each list to its native keyed reconciler. Conventions for morph keys, `data-morph-skip`, focus/selection preservation.
- `src/each.ts` — `each(items, render, key?)`. Keyed list iteration. Returns a structured list segment (not a flat HTML string) so `mount()` can run a native reconciler per list — no parse-the-whole-table round trip on partial updates. Per-item memoization by object identity (+ optional `key`) skips the JSX work for unchanged rows.
- `src/list-reconcile.ts` — top-level dispatcher for the keyed list reconciler (KF-112 split). Re-exports `BoundItem` / `ListBinding` / `endAnchor()` from `list-binding.ts` and defines `reconcileList()`; the latter routes to one of the two sibling reconciler files based on whether an `arraySignal` patch queue is applicable.
- `src/list-binding.ts` — `BoundItem` / `ListBinding` interface + `endAnchor(binding)` helper (KF-116 split). Lives in its own file so the snapshot + granular reconciler files can import the binding shape without creating a circular dependency back to `list-reconcile.ts`. Internal.
- `src/list-reconcile-snapshot.ts` — snapshot reconcile path. Classify (stable/replaced/new) → bulk-parse fresh row HTML in one `innerHTML` → remove orphans/replaced → LIS pass to compute the minimum `insertBefore` set → reverse-pass move. Used for plain-array `each()` and for arraySignal-backed `each()` when the patch path can't apply (first render, post-`replace()`, post-drift). Internal.
- `src/list-reconcile-granular.ts` — KF-92 patch-driven path. Applies an `arraySignal`'s update/insert/remove/move patches directly to the live DOM in O(patches). KF-93 bulk-parses contiguous insert runs; KF-94 bulk-parses consecutive update runs at any indices. Internal.
- `src/list-reconcile-focus.ts` — focus snapshot/restore around the keyed list reconciler's move pass. Some engines (older Safari, happy-dom) blur a focused descendant on `insertBefore` even when it survives the move; this module captures and re-applies focus + selection range so the user's caret survives a row reorder uniformly. Internal.
- `src/segment.ts` — `Segment` types (`static` / `list` / `mixed`) + flatten helpers. The JSX runtime emits these from `_jsx`; `mount()` consumes them.
- `src/morph.ts` — kerf's general-purpose DOM reconciler, exported publicly as `morph(liveRoot, template)` (KF-150) and used internally by `mount()`. Accepts an `Element`, a `SafeHtml`, or a raw HTML string for the template; the optional third `ownedItems` parameter is an internal coordination channel for `mount()`'s list reconciler that public callers should omit. Replaces the prior `morphdom` dependency. Specialized: knows about `data-morph-skip`, `data-morph-skip-children` (KF-152), `data-morph-preserve` (KF-151), the focused-input/contenteditable rules, the `id`/`data-key` matching scheme, and an `ownedItems` set whose elements are owned by the keyed list reconciler (KF-102 round 2 — the morph skips owned list rows individually but still walks every parent's children so non-list siblings around an `each()` reconcile correctly). Algorithm derived from [morphdom](https://github.com/patrick-steele-idem/morphdom) (MIT, attribution in `LICENSE`).
- `src/delegate.ts` — `delegate()` (Tier 1; auto-promotes known non-bubblers to capture) + `delegateCapture()` (Tier 2 explicit-capture escape hatch).
- `src/toElement.ts` — SVG-aware JSX → DOM helper. Routes SVG content through `DOMParser('image/svg+xml')`.
- `src/testing.ts` — `kerfjs/testing` subpath. Re-exports `clearStoreRegistry` for unit-test isolation.
- `src/utils/escapeHtml.ts` — HTML / attribute escaping helpers used by the JSX runtime.
- `src/utils/jsx-attr-aliases.ts` — `ATTR_ALIASES` table mapping camelCase JSX attributes to their HTML / SVG equivalents (extracted from `jsx-runtime.ts` to keep it under the 200-LOC guideline).
- `src/utils/rowContract.ts` — shared "exactly one top-level element per row" helpers (KF-103). `ROW_HTML_SNIPPET_MAX`, `truncateRowHtml`, `parseRowTemplate`, `rowContractError`. Used by both reconcile paths and by `mount.ts`'s first-render `validateInlinedRowMatch`.
- `bench/` — local performance harness against [`krausest/js-framework-benchmark`](https://github.com/krausest/js-framework-benchmark). `bench/kerfjs-impl/` is the framework entry (PR-ready for upstream); `bench/setup.sh`, `run.sh`, `results.sh` orchestrate the benchmark. CHANGELOG perf numbers come from this harness.

### Public API surface

Everything users import lives at the top level of `kerfjs`:

```ts
import {
  signal, computed, effect, batch,
  type Signal, type ReadonlySignal,
  defineStore, resetAllStores, type Store,
  mount, each,
  delegate, delegateCapture,
  toElement,
  SafeHtml, isSafeHtml, raw, Fragment,
} from 'kerfjs';

// Optional, separate subpath — apps that don't use granular collection signals
// shed ~0.4 KB from the main barrel.
import { arraySignal, type ArraySignal, type ArrayPatch } from 'kerfjs/array-signal';
```

The JSX runtime sits at `kerfjs/jsx-runtime` (subpath export). Users configure it via `tsconfig.json`'s `"jsxImportSource": "kerfjs"`. `kerfjs/jsx-runtime` also re-exports the typed JSX building blocks (`KerfBaseAttrs`, `KerfCustomElement`, `AttrLike`, `AttrValue`, `DataAriaAttrs`) for declaration-merging custom-element types into `JSX.IntrinsicElements` (KF-100). The `kerfjs/testing` subpath exposes `clearStoreRegistry` for test isolation.

### Design rules

1. **No virtual DOM.** Render JSX to HTML strings (with structured "list" and "mixed" segments where lists appear); let `morph()` reconcile the static surrounds and the list reconciler own its rows.
2. **No compiler.** Plain JSX, plain TypeScript, plain esbuild. No special build step in the consumer's project beyond what they already use.
3. **Tier 1 / Tier 2 / Tier 3 listener model.** `delegate()` covers bubbling events and auto-promotes the well-known non-bubblers (focus, blur, scroll, load, error, mouseenter, mouseleave) to capture phase under the hood; `delegateCapture()` is the explicit-capture escape hatch with `matches()`-style direct matching; `data-morph-skip` for library-owned subtrees.
4. **One primary export per file.** Each file has one main exported function/concept.
5. **Module-level mutable state is restricted to two documented places.** (a) `store.ts:REGISTRY` — exists only to make `resetAllStores()` work. (b) `each.ts:context` — a single mutable reference to the current render context (`{ counter, caches }`) that `mount()` sets at the start of each effect run via `_setRenderContext` and clears afterwards. The cache map itself is owned by each `mount()`'s closure (not module-level), so per-mount caches are separate, per-callsite caches within a mount are separate (different list ids), and the KF-87 inline-render-fn regression that came from the previous KF-73 per-render-fn keying is gone. Everything else flows through arguments.

### What kerf is NOT

- Not a component framework — there's no `<MyComponent />` notion. Components are plain functions returning JSX.
- Not a router. Not a state-management library beyond the bare store factory. Not an SSR framework (though `SafeHtml.toString()` works server-side).
- Not opinionated about styling. Bring your own CSS.

## Build

```bash
npm run build       # tsup → dist/{index,jsx-runtime,testing,array-signal}.js + dist/chunk-*.js + .d.ts
npm run dev         # tsup --watch
```

`tsup.config.ts` runs with `splitting: true` so shared modules (`SafeHtml`, the store `REGISTRY`) live in a single chunk imported by every entry. See `docs/ai/code-summary.md` for the rationale (KF-14 / KF-15).

## Testing

```bash
npm test                  # vitest vs src/, with coverage
npm run test:watch        # vitest watch mode
npm run test:unit         # tests/unit only
npm run test:integration  # tests/integration only
npm run test:dist         # build, then targeted dist regression suite (tests/dist) vs dist/
npm run test:dist:full    # build, then full unit + integration suite remapped onto dist/
npm run test:dist:jsx-typing  # KF-123: build, then `tsc -p tests/dist/jsx-typing/tsconfig.json` — typechecks consumer .tsx against dist/jsx-runtime.d.ts
npm run test:browser      # build, then Playwright across chromium/firefox/webkit (tests/browser/) — globalSetup also rebuilds tests/dist/consumer-app/
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm run check:docs:test-inventory  # KF-109: ensures docs/ai/code-summary.md mentions every test file in tests/
npm run check             # local pre-commit gate: lint + typecheck + doc inventory + test + build + both dist:* suites + jsx-typing dist gate
npm run check:full        # KF-118: pre-push gate — `check` plus the Playwright browser suite (chromium/firefox/webkit), which exercises tests/dist/consumer-app/ end-to-end
```

`npm run check` is what the husky pre-commit hook runs — the canonical "is everything green" command for fast local turnaround. `npm run check:full` is the heavier opt-in gate: run it before `git push` to also exercise the Playwright tests (SVG/MathML namespacing, IME composition, mutation counts, stateful attributes — anything the happy-dom unit tests can't model truthfully). CI runs both on every push/PR (see `.github/workflows/ci.yml`); locally the split keeps the inner loop fast and lets you opt into the full gate when you want push-day confidence.

Coverage thresholds (`vitest.config.ts`): **100% lines / functions / statements, 99% branches** on `src/`. The branches threshold was lowered from 100% to 99% in KF-103 to accommodate a small number of documented-unreachable defensive returns (annotated with `c8 ignore`) whose loop-completion branches v8 tracks but cannot be exercised by construction. The lines / statements / functions thresholds at 100% still catch any actual unexercised code.

### Testing Philosophy

- **Unit tests** (`tests/unit/`): Test each module in isolation with `happy-dom`. Mock external state (timers, network) but exercise real logic.
- **Integration tests** (`tests/integration/`): Exercise the full pipeline — signals + stores + mount + delegate against a real DOM tree.
- **Browser tests** (`tests/browser/`): Real-browser tests via Playwright (Chromium / Firefox / WebKit) for scenarios `happy-dom` can't model truthfully — SVG/MathML namespacing, IME composition, MutationObserver counts. Run with `npm run test:browser` (builds dist first; the fixture page imports from `dist/` via importmap). Browser binaries are downloaded once via `npx playwright install`. **`tests/browser/consumer-app.spec.ts`** (KF-123) drives a real downstream-style app at `tests/dist/consumer-app/` that's bundled by esbuild against `dist/` (Playwright's `globalSetup` rebuilds it before every run); each zone exercises a public primitive end-to-end through all three engines, so a `dist/` regression that only manifests in a real-consumer bundle (KF-14 SafeHtml duplication, KF-123 IntrinsicElements self-shadow, etc.) trips the gate.
- **Dist `.d.ts` typing gate** (`tests/dist/jsx-typing/`, KF-123): `tsc -p tests/dist/jsx-typing/tsconfig.json` typechecks `consumer.tsx` + `consumer-merge.tsx` against `dist/jsx-runtime.d.ts` with `jsxImportSource: "kerfjs"`. Catches IntrinsicElements self-shadow regressions (where `dist/jsx-runtime.d.ts` emits `interface IntrinsicElements extends IntrinsicElements {}`) and declaration-merge breakage that the in-source typing tests can't see because they never look at the emitted .d.ts.
- **Coverage target**: Keep coverage above the thresholds. New code without tests fails CI.

## Code Quality Gates

- **Always fix lint and type errors before finishing work.** Run `npx tsc --noEmit` and `npm run lint` before handing work back. Both must pass with zero errors.
- **Prefer editing existing files** to creating new ones. The runtime is small on purpose.
- **One primary export per file.**
- **Files should not be excessively long.** The largest file in `src/` should stay under ~200 LOC.

## Git

- **NEVER create git commits unless the user explicitly asks.** Same rule as Hot Sheet.

## Hot Sheet integration

This project is managed via [Hot Sheet](https://github.com/brianwestphal/hotsheet). Tickets use the `KF-` prefix.

- Run `hotsheet` from the project root to launch the local UI.
- Worklists are auto-synced to `.hotsheet/worklist.md` and `.hotsheet/open-tickets.md`.
- Skill files live in `.claude/skills/kerf/` and reference the worklist for AI-driven work.

### Concerns → tickets, not ad-hoc fixes

When a review, hygiene scan, audit, or any in-flight investigation surfaces a concern that isn't part of the current ticket's scope, **always file a follow-up Hot Sheet ticket immediately rather than acting on it directly.** This applies to bugs, refactors, doc drift, design questions, and anything else that "I noticed while working on X." The current ticket stays focused on what was asked; everything else gets its own ticket so it can be prioritized, scheduled, and reviewed alongside the rest of the queue.

The only edits to make in-flight under another ticket are ones explicitly within that ticket's scope (e.g., the doc-summary fixes that the `/check-requirements-against-code` skill is itself defined to perform). Anything else — even a one-line README fix — gets a ticket.

Use the `hs-bug` / `hs-task` / `hs-issue` / `hs-feature` / `hs-investigation` / `hs-requirement-change` skills (or POST to the Hot Sheet API directly) to file. Reference the surfacing context in the ticket title so the link back is obvious (e.g. "Surfaced by /check-code-hygiene on YYYY-MM-DD").

## Conventions

- ESM modules (`"type": "module"`).
- Import paths use `.js` extension (TypeScript convention for ESM resolution).
- No transitive deps beyond `@preact/signals-core`.
- Public API is documented in `docs/8-api-reference.md`.
- **File naming**: kebab-case / lowercase by default (`jsx-runtime.ts`, `mount.ts`). camelCase is allowed when the filename matches the primary export (`toElement.ts` → `toElement`, `utils/escapeHtml.ts` → `escapeHtml`). The principle is "filename = primary export"; do not file tickets to rename files that already match this rule.
- **American English everywhere.** Prose, code comments, JSDoc, identifiers, test names, CHANGELOG entries, and docs all use American spelling (`behavior`, `optimize`, `recognize`, `memoize`, `sanitize`, `serialize`, `normalize`, `initialize`, `color`, `gray`, `analyze`, etc. — not `behaviour` / `optimise` / `colour` / `grey` / `analyse`). When in doubt, default to the form Merriam-Webster uses. Existing public-URL slugs (e.g. example directory names) are grandfathered in — don't rename them without a dedicated ticket because they change permalinks.

## Requirements Documentation

Numbered docs in `docs/` cover the design. Reading order:

1. `1-overview.md` — what kerf is, why it exists, when to use it.
2. `2-reactivity.md` — signals primitive.
3. `3-stores.md` — composable testable stores.
4. `4-render.md` — mount, segments, the native diff, and the list reconciler.
5. `5-event-delegation.md` — Tier 1 / 2 / 3 listener model.
6. `6-jsx-runtime.md` — JSX → HTML strings, server use.
7. `7-svg.md` — namespace handling.
8. `8-api-reference.md` — every export.
9. `9-live-demo.md` — the GitHub Pages deploy of `examples/reactivity-demo`.

**Keep these docs up to date.** When adding/removing/changing an API, update the matching doc + `docs/8-api-reference.md` + `CHANGELOG.md` in the same change.

### AI summaries (`docs/ai/`)

- `docs/ai/code-summary.md` — directory tree, public exports, where-to-find-X reverse index.
- `docs/ai/requirements-summary.md` — synthesized view of every numbered doc with status markers.
- `docs/ai/usage-guide.md` — consumer-facing cheat sheet for AI assistants writing apps *with* kerf (when to recommend it, public API at a glance, hard rules, common errors → fixes). Keep in sync with `docs/8-api-reference.md`.

Update all three whenever the corresponding source / design changes. The repo-root [`llms.txt`](../llms.txt) is the AI-discovery entry point and indexes the docs above — update it when the doc set changes.

## Releasing

```bash
npm run release        # interactive: bumps version, updates changelog, tags v{ver}, pushes
npm run release:beta   # tag-only: tags v{ver}-beta.{N}, publishes with --tag beta
```

The release scripts mirror Hot Sheet's flow. Beta releases skip the version-file bump and changelog write — CI bumps the version ephemerally at publish time.
